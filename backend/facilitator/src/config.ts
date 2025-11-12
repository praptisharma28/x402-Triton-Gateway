import dotenv from "dotenv";
import path from "path";

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const config = {
  // Server
  port: parseInt(process.env.FACILITATOR_PORT || "3000", 10),
  host: process.env.FACILITATOR_HOST || "0.0.0.0",

  // Network
  network: (process.env.NETWORK || "devnet") as "devnet" | "mainnet-beta",

  // Solana RPC (for transaction broadcasting)
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",

  // Payment recipient address
  feePayerAddress: process.env.RECIPIENT_WALLET || "62pyPYsdSLah2vDSeenEep2R2hP9jz98eDbnz4Zyb1Lf",
};

export default config;
