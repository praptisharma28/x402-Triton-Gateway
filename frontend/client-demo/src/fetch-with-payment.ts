import { Connection, Keypair } from "@solana/web3.js";
import axios, { AxiosError } from "axios";
import { JsonRpcRequest, JsonRpcResponse, PaymentRequirements } from "@x402-gateway/types";
import { createPaymentTransaction, createPaymentPayload } from "./payment";
import config from "./config";

export interface FetchWithPaymentOptions {
  maxRetries?: number;
  debug?: boolean;
}

/**
 * Fetch wrapper that automatically handles 402 Payment Required responses
 */
export class FetchWithPayment {
  private connection: Connection;
  private payer: Keypair;
  private gatewayUrl: string;
  private options: FetchWithPaymentOptions;

  constructor(
    payer: Keypair,
    gatewayUrl: string = config.gatewayUrl,
    options: FetchWithPaymentOptions = {}
  ) {
    this.payer = payer;
    this.gatewayUrl = gatewayUrl;
    this.connection = new Connection(config.solanaRpcUrl, "confirmed");
    this.options = {
      maxRetries: 1,
      debug: false,
      ...options,
    };
  }

  /**
   * Make JSON-RPC request with automatic payment handling
   */
  async request(method: string, params: any[] = []): Promise<JsonRpcResponse> {
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    };

    this.log(`🚀 Requesting: ${method}`);

    try {
      // First attempt without payment
      const response = await this.makeRequest(request);

      if (response.status === 200) {
        this.log("✅ Request successful (no payment required)");
        return response.data;
      }

      // If 402, handle payment and retry
      if (response.status === 402) {
        this.log("💳 Payment required, processing payment...");
        return await this.handlePaymentRequired(request, response.data);
      }

      // Other error
      throw new Error(`Unexpected status: ${response.status}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.response?.status === 402) {
          this.log("💳 Payment required, processing payment...");
          return await this.handlePaymentRequired(request, axiosError.response.data);
        }
      }

      throw error;
    }
  }

  /**
   * Handle 402 Payment Required response
   */
  private async handlePaymentRequired(
    request: JsonRpcRequest,
    paymentResponse: any
  ): Promise<JsonRpcResponse> {
    // Extract payment requirements
    const requirements: PaymentRequirements = paymentResponse.payment;

    if (!requirements) {
      throw new Error("No payment requirements in 402 response");
    }

    this.log(`💰 Payment required: ${requirements.amount} ${requirements.currency}`);
    this.log(`📝 Invoice ID: ${requirements.invoiceId}`);
    this.log(`👛 Recipient: ${requirements.recipient}`);

    // Create payment transaction
    const paymentTransaction = await createPaymentTransaction(
      this.connection,
      this.payer,
      requirements
    );

    // Create payment payload
    const paymentPayload = createPaymentPayload(
      paymentTransaction,
      config.network
    );

    this.log("🔄 Retrying request with payment...");

    // Retry with payment
    const paidResponse = await this.makeRequest(request, paymentPayload);

    if (paidResponse.status === 200) {
      this.log("✅ Payment successful!");

      // Extract payment receipt from headers
      const paymentResponseHeader = paidResponse.headers["x-payment-response"];
      if (paymentResponseHeader) {
        const receipt = JSON.parse(paymentResponseHeader);
        this.log(`📝 Transaction signature: ${receipt.signature}`);
        this.log(`🔍 View on Solana Explorer: https://explorer.solana.com/tx/${receipt.signature}?cluster=${config.network}`);
      }

      return paidResponse.data;
    }

    throw new Error(`Payment failed with status: ${paidResponse.status}`);
  }

  /**
   * Make HTTP request to gateway
   */
  private async makeRequest(
    request: JsonRpcRequest,
    paymentPayload?: string
  ): Promise<any> {
    const headers: any = {
      "Content-Type": "application/json",
    };

    if (paymentPayload) {
      headers["X-PAYMENT"] = paymentPayload;
    }

    return await axios.post(`${this.gatewayUrl}/rpc`, request, {
      headers,
      validateStatus: (status) => status === 200 || status === 402,
    });
  }

  /**
   * Log message if debug is enabled
   */
  private log(message: string): void {
    if (this.options.debug) {
      console.log(message);
    }
  }
}

/**
 * Create a fetch-with-payment instance
 */
export function createFetchWithPayment(
  payer: Keypair,
  gatewayUrl?: string,
  options?: FetchWithPaymentOptions
): FetchWithPayment {
  return new FetchWithPayment(payer, gatewayUrl, options);
}
