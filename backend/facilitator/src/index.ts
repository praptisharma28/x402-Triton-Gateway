import express, { Request, Response } from "express";
import {
  FacilitatorSupportedResponse,
  VerifyRequest,
  SettleRequest,
} from "@x402-gateway/types";
import config from "./config";
import { verifyPayment } from "./verify";
import { settlePayment } from "./settle";

const app = express();

app.use(express.json());

/**
 * GET /supported
 * Advertise facilitator capabilities
 */
app.get("/supported", async (req: Request, res: Response) => {
  try {
    const feePayer = config.feePayerAddress || "62pyPYsdSLah2vDSeenEep2R2hP9jz98eDbnz4Zyb1Lf";

    const response: FacilitatorSupportedResponse = {
      version: 1,
      scheme: ["exact"],
      network: [config.network],
      feePayer,
    };

    res.json(response);
  } catch (error) {
    console.error("[SUPPORTED] Error:", error);
    res.status(500).json({
      error: "Failed to get supported capabilities",
    });
  }
});

/**
 * POST /verify
 * Verify payment transaction without broadcasting
 */
app.post("/verify", async (req: Request, res: Response) => {
  try {
    const verifyRequest = req.body as VerifyRequest;

    if (!verifyRequest.payment || !verifyRequest.requirements) {
      return res.status(400).json({
        error: "Missing payment or requirements",
      });
    }

    const result = await verifyPayment(verifyRequest);

    res.json(result);
  } catch (error) {
    console.error("[VERIFY] Error:", error);
    res.status(500).json({
      error: "Verification failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /settle
 * Settle payment by broadcasting to Solana
 */
app.post("/settle", async (req: Request, res: Response) => {
  try {
    const settleRequest = req.body as SettleRequest;

    if (!settleRequest.payment || !settleRequest.requirements) {
      return res.status(400).json({
        error: "Missing payment or requirements",
      });
    }

    const result = await settlePayment(settleRequest);

    res.json(result);
  } catch (error) {
    console.error("[SETTLE] Error:", error);
    res.status(500).json({
      error: "Settlement failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /health
 * Health check
 */
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    network: config.network,
    solanaRpcUrl: config.solanaRpcUrl,
  });
});

// Start server
function start() {
  app.listen(config.port, config.host, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║   x402 Facilitator Service                            ║
╚═══════════════════════════════════════════════════════╝

Server running at: http://${config.host}:${config.port}
Network: ${config.network}
Solana RPC: ${config.solanaRpcUrl}

Endpoints:
  GET  /supported          - Facilitator capabilities
  POST /verify             - Verify payment transaction
  POST /settle             - Settle payment (broadcast to Solana)
  GET  /health             - Health check

Ready to facilitate payments!
    `);
  });
}

// Handle shutdown
process.on("SIGINT", () => {
  console.log("\n\nShutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\nShutting down gracefully...");
  process.exit(0);
});

// Start the server
start();
