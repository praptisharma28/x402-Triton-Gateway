import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { PaymentRequirements, PaymentPayload } from "@x402-gateway/types";

/**
 * Create payment transaction for x402 requirements
 */
export async function createPaymentTransaction(
  connection: Connection,
  payer: Keypair,
  requirements: PaymentRequirements
): Promise<string> {
  console.log("📝 Creating payment transaction...");

  const {
    recipient,
    mint,
    amount,
    network,
  } = requirements;

  // Create public keys
  const recipientPubkey = new PublicKey(recipient);
  const mintPubkey = new PublicKey(mint);

  // Get or create associated token accounts
  const sourceTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    payer.publicKey
  );

  const destinationTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    recipientPubkey
  );

  console.log(`💰 Source token account: ${sourceTokenAccount.toBase58()}`);
  console.log(`💰 Destination token account: ${destinationTokenAccount.toBase58()}`);

  // Check if source account exists and has sufficient balance
  try {
    const sourceAccount = await getAccount(connection, sourceTokenAccount);
    const balance = Number(sourceAccount.amount);
    const requiredAmount = parseInt(amount);

    console.log(`💵 Current balance: ${balance}`);
    console.log(`💵 Required amount: ${requiredAmount}`);

    if (balance < requiredAmount) {
      throw new Error(
        `Insufficient USDC balance: ${balance} < ${requiredAmount}\n` +
        `Please fund your wallet with devnet USDC from https://faucet.circle.com/`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("could not find account")) {
      throw new Error(
        `No USDC token account found. Please fund your wallet with devnet USDC from https://faucet.circle.com/`
      );
    }
    throw error;
  }

  // Create transaction
  const transaction = new Transaction();

  // Check if destination token account exists
  try {
    await getAccount(connection, destinationTokenAccount);
  } catch (error) {
    // Destination account doesn't exist, create it
    console.log("📦 Creating destination token account...");
    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer.publicKey,
        destinationTokenAccount,
        recipientPubkey,
        mintPubkey
      )
    );
  }

  // Add transfer instruction
  transaction.add(
    createTransferInstruction(
      sourceTokenAccount,
      destinationTokenAccount,
      payer.publicKey,
      BigInt(amount),
      [],
      TOKEN_PROGRAM_ID
    )
  );

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer.publicKey;

  // Sign transaction
  transaction.sign(payer);

  // Serialize transaction
  const serializedTransaction = transaction.serialize();
  const base64Transaction = serializedTransaction.toString("base64");

  console.log("✅ Payment transaction created and signed");
  console.log(`📄 Transaction size: ${serializedTransaction.length} bytes`);

  return base64Transaction;
}

/**
 * Create payment payload for X-PAYMENT header
 */
export function createPaymentPayload(
  transaction: string,
  network: "devnet" | "mainnet-beta"
): string {
  const payload: PaymentPayload = {
    version: 1,
    scheme: "exact",
    network,
    transaction,
  };

  const payloadJson = JSON.stringify(payload);
  const base64Payload = Buffer.from(payloadJson).toString("base64");

  return base64Payload;
}
