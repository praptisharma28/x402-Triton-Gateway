/**
 * x402 Protocol Types
 */

export interface PaymentRequirements {
  version: number;
  recipient: string;
  tokenAccount?: string;
  mint?: string;
  amount: string;
  currency: string;
  network: "devnet" | "mainnet-beta";
  invoiceId: string;
  timeout?: number;
}

export interface PaymentPayload {
  version: number;
  scheme?: "exact" | "quote";
  network: "devnet" | "mainnet-beta";
  transaction: string; // base64 encoded signed transaction
  invoiceId: string; // Invoice ID from payment requirements
}

export interface FacilitatorSupportedResponse {
  version: number;
  scheme: string[];
  network: string[];
  feePayer: string;
}

export interface VerifyRequest {
  payment: PaymentPayload;
  requirements: PaymentRequirements;
}

export interface VerifyResponse {
  isValid: boolean;
  error?: string;
}

export interface SettleRequest {
  payment: PaymentPayload;
  requirements: PaymentRequirements;
}

export interface SettleResponse {
  signature: string;
  timestamp: number;
}

/**
 * Gateway Types
 */

export interface PricingPolicy {
  method: string;
  priceUSD: number;
  description?: string;
}

export interface Receipt {
  id: string;
  invoiceId: string;
  txSignature: string;
  method: string;
  endpoint: string;
  amountUSD: number;
  currency: string;
  status: "pending" | "verified" | "settled" | "failed";
  payloadSize: number;
  latencyMs: number;
  timestamp: number;
  payer: string;
  recipient: string;
  network: "devnet" | "mainnet-beta";
  error?: string;
}

export interface UsageStats {
  totalRequests: number;
  totalRevenue: number;
  methodBreakdown: Record<string, { count: number; revenue: number }>;
  averageLatency: number;
  failureRate: number;
}

/**
 * JSON-RPC Types (Solana)
 */

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: any[];
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: any;
}

/**
 * Old Faithful / Historical Data Types
 */

export interface HistoricalQueryContext {
  slot?: number;
  blockHeight?: number;
  signature?: string;
  address?: string;
  commitment?: "finalized" | "confirmed" | "processed";
}

export interface ProxyConfig {
  upstreamUrl: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}

/**
 * Subscription NFT Types (Optional)
 */

export interface SubscriptionNFT {
  mint: string;
  owner: string;
  collection?: string;
  tier: "basic" | "premium" | "enterprise";
  expiresAt?: number;
  discount: number; // percentage discount (0-100)
}

export interface SubscriptionCheckResult {
  isSubscribed: boolean;
  subscription?: SubscriptionNFT;
  discount: number;
}

/**
 * Dashboard Types
 */

export interface DashboardStats {
  receipts: Receipt[];
  usage: UsageStats;
  recentTransactions: Receipt[];
  revenue: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  topMethods: Array<{
    method: string;
    count: number;
    revenue: number;
  }>;
}

/**
 * Client Demo Types
 */

export interface FetchWithPaymentOptions {
  network: "devnet" | "mainnet-beta";
  payerKeypair: any; // Solana Keypair
  maxRetries?: number;
  timeout?: number;
}

export interface PaymentReceipt {
  signature: string;
  amount: number;
  currency: string;
  recipient: string;
  timestamp: number;
  invoiceId: string;
}
