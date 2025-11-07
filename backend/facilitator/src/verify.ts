import {
  VerifyRequest,
  VerifyResponse,
  PaymentPayload,
  PaymentRequirements,
} from "@x402-gateway/types";
import { Transaction, PublicKey } from "@solana/web3.js";
import { koraClient } from "./kora";

/**
 * Verify payment transaction against requirements
 */
export async function verifyPayment(
  request: VerifyRequest
): Promise<VerifyResponse> {
  const { payment, requirements } = request;

  // Mock mode - skip validation for testing
  if (process.env.MOCK_KORA === "true") {
    console.log("[VERIFY] Mock mode: Payment validation passed");
    return { isValid: true };
  }

  try {
    // 1. Validate transaction structure
    const validationResult = await koraClient.validateTransaction(
      payment.transaction
    );
    if (!validationResult.isValid) {
      return {
        isValid: false,
        error: `Invalid transaction: ${validationResult.error}`,
      };
    }

    // 2. Decode transaction and verify instructions
    const txBuffer = Buffer.from(payment.transaction, "base64");
    const transaction = Transaction.from(txBuffer);

    // 3. Verify payment details match requirements
    const verificationResult = verifyTransactionInstructions(
      transaction,
      requirements
    );
    if (!verificationResult.isValid) {
      return {
        isValid: false,
        error: verificationResult.error,
      };
    }

    // 4. Sign transaction with Kora (simulation/verification)
    const koraSignResult = await koraClient.signTransaction(
      payment.transaction
    );
    if (!koraSignResult) {
      return {
        isValid: false,
        error: "Kora rejected the transaction (policy violation)",
      };
    }

    // All checks passed
    return { isValid: true };
  } catch (error) {
    console.error("[VERIFY] Error verifying payment:", error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

/**
 * Verify transaction instructions match payment requirements
 */
function verifyTransactionInstructions(
  transaction: Transaction,
  requirements: PaymentRequirements
): { isValid: boolean; error?: string } {
  try {
    // Look for SPL token transfer instruction
    const TOKEN_PROGRAM_ID = new PublicKey(
      "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
    );

    const transferInstruction = transaction.instructions.find((ix) =>
      ix.programId.equals(TOKEN_PROGRAM_ID)
    );

    if (!transferInstruction) {
      return {
        isValid: false,
        error: "No token transfer instruction found",
      };
    }

    // Decode instruction data to verify amount
    // Instruction layout: [instruction_type (1 byte), amount (8 bytes)]
    const instructionData = transferInstruction.data;

    if (instructionData.length < 9) {
      return {
        isValid: false,
        error: "Invalid transfer instruction data",
      };
    }

    // Instruction type should be 3 for Transfer or 12 for TransferChecked
    const instructionType = instructionData[0];
    if (instructionType !== 3 && instructionType !== 12) {
      return {
        isValid: false,
        error: "Not a token transfer instruction",
      };
    }

    // Read amount (8 bytes, little-endian)
    const amount = instructionData.readBigUInt64LE(1);
    const requiredAmount = BigInt(requirements.amount);

    if (amount < requiredAmount) {
      return {
        isValid: false,
        error: `Insufficient payment: ${amount} < ${requiredAmount}`,
      };
    }

    // Verify recipient (destination token account is in accounts)
    // For a token transfer: [source, destination, owner]
    if (transferInstruction.keys.length < 2) {
      return {
        isValid: false,
        error: "Invalid transfer instruction accounts",
      };
    }

    const destination = transferInstruction.keys[1].pubkey.toBase58();

    // If tokenAccount is provided, verify it matches
    if (requirements.tokenAccount && destination !== requirements.tokenAccount) {
      return {
        isValid: false,
        error: `Wrong recipient: ${destination} != ${requirements.tokenAccount}`,
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Instruction verification failed",
    };
  }
}
