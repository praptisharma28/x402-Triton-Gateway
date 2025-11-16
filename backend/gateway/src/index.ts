import express, { Request, Response } from "express";
import cors from "cors";
import config from "./config";
import { x402PaymentMiddleware } from "./middleware";
import { proxyToUpstream, validateJsonRpcRequest } from "./proxy";
import { receiptStore } from "./receipts";
import { generateRangeToken, calculateRangePrice, PurchaseRangeRequest } from "./range-auth";
import { getCachedResponse, generateCacheKey } from "./response-cache";

const app = express();

app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'http://localhost:3002'],
  credentials: true,
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-PAYMENT, X-Range-Token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    upstreamUrl: config.upstreamRpcUrl,
    network: config.network,
  });
});

app.get("/receipts", (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const receipts = receiptStore.getRecent(limit);
  res.json(receipts);
});

app.get("/stats", (req: Request, res: Response) => {
  const stats = receiptStore.getStats();
  res.json(stats);
});

// Purchase range access endpoint
app.post("/purchase-range", async (req: Request, res: Response) => {
  try {
    const { startSlot, endSlot, duration, paymentTxSignature, payer } = req.body;

    // Validate input
    if (!startSlot || !endSlot || !duration || !paymentTxSignature || !payer) {
      return res.status(400).json({
        error: "Missing required fields: startSlot, endSlot, duration, paymentTxSignature, payer"
      });
    }

    if (startSlot >= endSlot) {
      return res.status(400).json({
        error: "startSlot must be less than endSlot"
      });
    }

    if (endSlot - startSlot > 10000) {
      return res.status(400).json({
        error: "Range too large. Maximum 10,000 blocks per purchase"
      });
    }

    // Calculate price
    const price = calculateRangePrice(startSlot, endSlot);
    const priceInLamports = Math.floor(price * 1_000_000); // Convert to USDC lamports (6 decimals)

    // TODO: Verify payment transaction signature matches the calculated price
    // For now, we'll trust the client (in production, verify via facilitator)

    const purchaseRequest: PurchaseRangeRequest = {
      startSlot,
      endSlot,
      duration,
      paymentTxSignature,
      payer,
    };

    // Generate JWT token
    const token = generateRangeToken(purchaseRequest);

    res.json({
      success: true,
      token,
      range: {
        startSlot,
        endSlot,
        blockCount: endSlot - startSlot + 1,
      },
      pricing: {
        totalPrice: price,
        priceUSD: `$${price.toFixed(8)}`,
        priceInLamports,
      },
      access: {
        duration,
        expiresAt: Date.now() + (duration * 1000),
        expiresAtISO: new Date(Date.now() + (duration * 1000)).toISOString(),
      },
      usage: `Include this token in X-Range-Token header for subsequent queries`,
    });

  } catch (error) {
    console.error("[RANGE] Error purchasing range:", error);
    res.status(500).json({
      error: "Failed to purchase range",
      message: error instanceof Error ? error.message : String(error),
    });
  }
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

    // Check if we have a cached response (for bandwidth-based pricing)
    const receipt = (req as any).paymentReceipt;
    let response;

    if (receipt && receipt.invoiceId) {
      const cacheKey = generateCacheKey(receipt.invoiceId);
      const cachedResponse = getCachedResponse(cacheKey);

      if (cachedResponse) {
        response = cachedResponse;
      } else {
        response = await proxyToUpstream(req.body);
      }
    } else {
      // No payment receipt (e.g., free method or range token), proxy directly
      response = await proxyToUpstream(req.body);
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

Server running at: http://${config.host}:${config.port}
Network: ${config.network}
Upstream: ${config.upstreamRpcUrl}
Recipient: ${config.recipientWallet}
Facilitator: ${config.facilitatorUrl}

Endpoints:
  POST /rpc              - JSON-RPC endpoint (x402 protected)
  POST /purchase-range   - Purchase range access (NEW!)
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
  console.log("\n\nShutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\nShutting down gracefully...");
  process.exit(0);
});

// Start the server
start();
