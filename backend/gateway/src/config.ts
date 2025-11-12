import dotenv from "dotenv";
import path from "path";

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const config = {
  // Server
  port: parseInt(process.env.GATEWAY_PORT || "4021", 10),
  host: process.env.GATEWAY_HOST || "0.0.0.0",

  // Network
  network: (process.env.NETWORK || "devnet") as "devnet" | "mainnet-beta",
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",

  // Upstream RPC (supports Old Faithful integration)
  // For Old Faithful: Set UPSTREAM_RPC_URL to your Old Faithful RPC endpoint
  // Example: http://localhost:8899 (Old Faithful default port)
  // Or use any Solana RPC provider (ParaFi, Helius, Triton, etc.)
  upstreamRpcUrl:
    process.env.UPSTREAM_RPC_URL || "https://solana-rpc.parafi.tech",
  upstreamGrpcUrl:
    process.env.UPSTREAM_GRPC_URL || "https://solana-rpc.parafi.tech:10443",

  // Facilitator
  facilitatorUrl:
    process.env.FACILITATOR_URL || "http://localhost:3000",

  // Payment
  recipientWallet:
    process.env.RECIPIENT_WALLET ||
    "62pyPYsdSLah2vDSeenEep2R2hP9jz98eDbnz4Zyb1Lf",
  usdcMint:
    process.env.NETWORK === "mainnet-beta"
      ? process.env.USDC_MINT_MAINNET ||
        "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      : process.env.USDC_MINT_DEVNET ||
        "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",

  // Pricing (in USD)
  pricing: {
    getTransaction: parseFloat(process.env.PRICE_GET_TRANSACTION || "0.00002"),
    getBlock: parseFloat(process.env.PRICE_GET_BLOCK || "0.00005"),
    getSignaturesForAddress: parseFloat(
      process.env.PRICE_GET_SIGNATURES || "0.0001"
    ),
    // Default price for other methods
    default: 0.00001,
  },

  // Subscription NFT (optional)
  subscriptionNftCollection: process.env.SUBSCRIPTION_NFT_COLLECTION,

  // Metrics
  enableMetrics: process.env.ENABLE_METRICS === "true",
  metricsPort: parseInt(process.env.METRICS_PORT || "9090", 10),
};

export default config;
