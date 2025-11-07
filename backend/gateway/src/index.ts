import express, { Request, Response } from "express";
import cors from "cors";
import config from "./config";
import { x402PaymentMiddleware } from "./middleware";
import { proxyToUpstream, validateJsonRpcRequest } from "./proxy";
import { receiptStore } from "./receipts";

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
}));

// Enable CORS for dashboard
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-PAYMENT');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    upstreamUrl: config.upstreamRpcUrl,
    network: config.network,
  });
});

// Get receipts (for dashboard)
app.get("/receipts", (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const receipts = receiptStore.getRecent(limit);
  res.json(receipts);
});

// Get statistics (for dashboard)
app.get("/stats", (req: Request, res: Response) => {
  const stats = receiptStore.getStats();
  res.json(stats);
});

// Main RPC endpoint with x402 middleware
app.post("/rpc", x402PaymentMiddleware(), async (req: Request, res: Response) => {
  try {
    // Validate JSON-RPC request
    if (!validateJsonRpcRequest(req.body)) {
      return res.status(400).json({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32600,
          message: "Invalid JSON-RPC request",
        },
      });
    }

    // Proxy to upstream
    const response = await proxyToUpstream(req.body);

    // Log successful request
    const receipt = (req as any).paymentReceipt;
    if (receipt) {
      console.log(
        `[GATEWAY] Successful paid request: ${receipt.method} - ${receipt.txSignature}`
      );
    }

    res.json(response);
  } catch (error) {
    console.error("[GATEWAY] Error processing request:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      id: req.body.id,
      error: {
        code: -32603,
        message: "Internal error",
      },
    });
  }
});

// Start server
async function start() {
  try {
    // Initialize receipt store
    await receiptStore.init();

    app.listen(config.port, config.host, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║   x402 Old Faithful Access Gateway                    ║
╚═══════════════════════════════════════════════════════╝

🚀 Server running at: http://${config.host}:${config.port}
🌐 Network: ${config.network}
📡 Upstream: ${config.upstreamRpcUrl}
💰 Recipient: ${config.recipientWallet}
🔧 Facilitator: ${config.facilitatorUrl}

Endpoints:
  POST /rpc              - JSON-RPC endpoint (x402 protected)
  GET  /health           - Health check
  GET  /receipts         - Recent receipts
  GET  /stats            - Usage statistics

Ready to accept requests!
      `);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n👋 Shutting down gracefully...");
  process.exit(0);
});

// Start the server
start();
