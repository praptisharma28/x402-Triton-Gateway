import axios from "axios";
import { Transaction, Connection } from "@solana/web3.js";
import config from "./config";

/**
 * Kora RPC Client for gasless transaction signing
 */
export class KoraClient {
  private rpcUrl: string;
  private apiKey: string;
  private connection: Connection;
  private mockMode: boolean;

  constructor(rpcUrl: string, apiKey: string, solanaRpcUrl: string) {
    this.rpcUrl = rpcUrl;
    this.apiKey = apiKey;
    this.connection = new Connection(solanaRpcUrl, "confirmed");
    this.mockMode = process.env.MOCK_KORA === "true";

    if (this.mockMode) {
      console.log("[KORA] Running in MOCK MODE - simulating successful responses");
    }
  }

  /**
   * Get the fee payer signer address
   */
  async getPayerSigner(): Promise<string> {
    try {
      const response = await this.request("getPayerSigner", []);
      return response.result;
    } catch (error) {
      console.error("[KORA] Error getting payer signer:", error);
      throw error;
    }
  }

  /**
   * Sign transaction (verify without broadcasting)
   */
  async signTransaction(transactionBase64: string): Promise<boolean> {
    if (this.mockMode) {
      console.log("[KORA] Mock: Transaction validation passed");
      return true;
    }

    try {
      const response = await this.request("signTransaction", [
        {
          transaction: transactionBase64,
        },
      ]);

      // If Kora successfully signs, the transaction is valid
      return !!response.result;
    } catch (error) {
      console.error("[KORA] Error signing transaction:", error);
      return false;
    }
  }

  /**
   * Sign and send transaction (broadcast to network)
   */
  async signAndSendTransaction(transactionBase64: string): Promise<string> {
    if (this.mockMode) {
      // Generate a realistic mock signature
      const mockSignature = Buffer.from(
        Array.from({ length: 64 }, () => Math.floor(Math.random() * 256))
      ).toString("base64").replace(/[+/=]/g, (c) =>
        c === '+' ? 'A' : c === '/' ? 'B' : ''
      ).substring(0, 88);
      console.log(`[KORA] Mock: Transaction broadcasted with signature: ${mockSignature}`);
      return mockSignature;
    }

    try {
      const response = await this.request("signAndSendTransaction", [
        {
          transaction: transactionBase64,
        },
      ]);

      return response.result.signature;
    } catch (error) {
      console.error("[KORA] Error signing and sending transaction:", error);
      throw error;
    }
  }

  /**
   * Make RPC request to Kora
   */
  private async request(method: string, params: any[]): Promise<any> {
    const response = await axios.post(
      this.rpcUrl,
      {
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params,
      },
      {
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey && { "X-Api-Key": this.apiKey }),
        },
        timeout: 30000,
      }
    );

    if (response.data.error) {
      throw new Error(`Kora RPC error: ${response.data.error.message}`);
    }

    return response.data;
  }

  /**
   * Validate transaction structure and instructions
   */
  async validateTransaction(transactionBase64: string): Promise<{
    isValid: boolean;
    error?: string;
  }> {
    try {
      // Decode transaction
      const txBuffer = Buffer.from(transactionBase64, "base64");
      const transaction = Transaction.from(txBuffer);

      // Basic validation
      if (!transaction.instructions || transaction.instructions.length === 0) {
        return { isValid: false, error: "Transaction has no instructions" };
      }

      // Verify transaction is signed
      if (!transaction.signatures || transaction.signatures.length === 0) {
        return { isValid: false, error: "Transaction is not signed" };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// Export singleton instance
export const koraClient = new KoraClient(
  config.koraRpcUrl,
  config.koraApiKey,
  config.solanaRpcUrl
);
