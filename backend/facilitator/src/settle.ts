import {
  SettleRequest,
  SettleResponse,
} from "@x402-gateway/types";
import { Connection } from "@solana/web3.js";
import config from "./config";

/**
 * Settle payment by broadcasting transaction to Solana
 */
export async function settlePayment(
  request: SettleRequest
): Promise<SettleResponse> {
  const { payment } = request;

  try {
    console.log("[SETTLE] Broadcasting user-signed transaction to Solana...");

    // User has already signed the transaction - we just broadcast it
    const connection = new Connection(config.solanaRpcUrl, "confirmed");

    const txBuffer = Buffer.from(payment.transaction, "base64");
    const signature = await connection.sendRawTransaction(txBuffer, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });

    console.log(`[SETTLE] Transaction broadcast: ${signature}`);

    // Wait for confirmation (using newer API)
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, "confirmed");
    console.log(`[SETTLE] Transaction confirmed: ${signature}`);

    return {
      signature,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("[SETTLE] Error settling payment:", error);
    throw error;
  }
}
