import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

export const config = {
  gatewayUrl: process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:4021",
  network: (process.env.NETWORK || "devnet") as "devnet" | "mainnet-beta",
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  payerPrivateKey: process.env.TEST_PAYER_PRIVATE_KEY || "",
};

export default config;
