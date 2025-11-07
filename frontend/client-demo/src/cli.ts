#!/usr/bin/env node

import { Keypair } from "@solana/web3.js";
import { createFetchWithPayment } from "./fetch-with-payment";
import config from "./config";

/**
 * CLI Demo: Fetch historical transaction with auto-payment
 */
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   x402 Client Demo - Auto-Pay on 402                  ║  
╚═══════════════════════════════════════════════════════╝
  `);
  // lovellllly box no? huhuhehuhueee XD

  // Load payer keypair
  let payer: Keypair;

  if (!config.payerPrivateKey) {
    console.error("❌ Error: TEST_PAYER_PRIVATE_KEY not set in .env");
    console.log("\nTo generate a keypair:");
    console.log("  solana-keygen new --outfile ~/.config/solana/test-wallet.json");
    console.log("\nThen add to .env:");
    console.log("  TEST_PAYER_PRIVATE_KEY=[1,2,3,...]");
    console.log("\nFund with devnet USDC:");
    console.log("  https://faucet.circle.com/");
    process.exit(1);
  }

  try {
    const secretKey = JSON.parse(config.payerPrivateKey);
    payer = Keypair.fromSecretKey(Uint8Array.from(secretKey));
    console.log(`👛 Payer wallet: ${payer.publicKey.toBase58()}`);
  } catch (error) {
    console.error("❌ Error: Invalid TEST_PAYER_PRIVATE_KEY format");
    console.log("Expected format: [1,2,3,4,...] (array of 64 numbers)");
    process.exit(1);
  }

  console.log(`🌐 Gateway: ${config.gatewayUrl}`);
  console.log(`📡 Network: ${config.network}`);
  console.log("");

  // Create client with auto-payment
  const client = createFetchWithPayment(payer, config.gatewayUrl, {
    debug: true,
  });

  // Example 1: Get a historical transaction
  console.log("═══════════════════════════════════════════════════════");
  console.log("Example 1: Fetching historical transaction");
  console.log("═══════════════════════════════════════════════════════\n");

  try {
    // Real devnet transaction from slot 419800000
    const signature = "48xStxW3Z39DmnxNGkhTCpYiQVqf96tALiQm2qdfRrERkUD6GcigHcR92NUVb9ebZyVFRMd3mbWDngJSfZ2T44gF";

    const response = await client.request("getTransaction", [
      signature,
      { encoding: "json", maxSupportedTransactionVersion: 0 },
    ]);

    if (response.result) {
      console.log("\n📦 Transaction Data:");
      console.log(JSON.stringify(response.result, null, 2).slice(0, 500) + "...");
    } else if (response.error) {
      console.log("\n❌ Error:", response.error.message);
    }
  } catch (error) {
    console.error("\n❌ Error fetching transaction:", error);
  }

  // Example 2: Get a historical block
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("Example 2: Fetching historical block");
  console.log("═══════════════════════════════════════════════════════\n");

  try {
    // Real devnet historical block
    const response = await client.request("getBlock", [
      419800000,
      { encoding: "json", maxSupportedTransactionVersion: 0 },
    ]);

    if (response.result) {
      console.log("\n📦 Block Data:");
      console.log(`  Block Height: ${response.result.blockHeight}`);
      console.log(`  Block Time: ${new Date(response.result.blockTime * 1000).toISOString()}`);
      console.log(`  Transactions: ${response.result.transactions?.length || 0}`);
    } else if (response.error) {
      console.log("\n❌ Error:", response.error.message);
    }
  } catch (error) {
    console.error("\n❌ Error fetching block:", error);
  }

  console.log("\n✨ Demo complete!\n");
}

// Run the demo
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
