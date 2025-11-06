import {
  SettleRequest,
  SettleResponse,
} from "@x402-gateway/types";
import { koraClient } from "./kora";

/**
 * Settle payment by broadcasting transaction to Solana
 */
export async function settlePayment(
  request: SettleRequest
): Promise<SettleResponse> {
  const { payment } = request;

  try {
    console.log("[SETTLE] Broadcasting transaction to Solana via Kora...");

    // Sign and send transaction via Kora (gasless)
    const signature = await koraClient.signAndSendTransaction(
      payment.transaction
    );

    console.log(`[SETTLE] Transaction settled: ${signature}`);

    return {
      signature,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("[SETTLE] Error settling payment:", error);
    throw error;
  }
}
