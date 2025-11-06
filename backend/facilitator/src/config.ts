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

  // Kora RPC
  koraRpcUrl: process.env.KORA_RPC_URL || "http://localhost:8080",
  koraApiKey: process.env.KORA_API_KEY || "",

  // Solana RPC (for verification)
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",

  // Fee payer (Kora's signer address)
  feePayerAddress: process.env.KORA_PAYER_ADDRESS || "",
};

export default config;
