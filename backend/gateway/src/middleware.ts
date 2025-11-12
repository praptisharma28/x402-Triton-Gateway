import { Request, Response, NextFunction } from "express";
import {
  PaymentRequirements,
  PaymentPayload,
  Receipt,
} from "@x402-gateway/types";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import config from "./config";
import { getPricing, usdToUsdcLamports } from "./pricing";
import { receiptStore } from "./receipts";
import { getTokenAccountAddress } from "./token";
import { Transaction } from "@solana/web3.js";

/**
 * x402 Payment Middleware
 * Checks for payment, returns 402 if unpaid, verifies/settles if paid
 */
export function x402PaymentMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    try {
      const { method } = req.body;
      if (!method) {
        return res.status(400).json({
          error: "Invalid JSON-RPC request: missing method",
        });
      }

      const pricing = getPricing(method);
      const requiresPayment = pricing.priceUSD > 0;

      if (!requiresPayment) {
        return next();
      }

      const paymentHeader = req.headers["x-payment"];

      if (!paymentHeader) {
        return send402Response(res, method, pricing.priceUSD);
      }

      let payment: PaymentPayload;
      try {
        const paymentJson = Buffer.from(
          paymentHeader as string,
          "base64"
        ).toString("utf-8");
        payment = JSON.parse(paymentJson);
      } catch (error) {
        return res.status(400).json({
          error: "Invalid X-PAYMENT header: failed to parse",
        });
      }

      const invoiceId = extractInvoiceId(payment);
      let receipt = receiptStore.getByInvoiceId(invoiceId);

      if (!receipt) {
        receipt = {
          id: uuidv4(),
          invoiceId,
          txSignature: "",
          method,
          endpoint: req.path,
          amountUSD: pricing.priceUSD,
          currency: "USDC",
          status: "pending",
          payloadSize: JSON.stringify(req.body).length,
          latencyMs: 0,
          timestamp: Date.now(),
          payer: extractPayerFromTransaction(payment.transaction),
          recipient: config.recipientWallet,
          network: config.network,
        };
        await receiptStore.save(receipt);
      }

      const tokenAccount = await getTokenAccountAddress(
        config.recipientWallet,
        config.usdcMint
      );

      const requirements: PaymentRequirements = {
        version: 1,
        recipient: config.recipientWallet,
        tokenAccount,
        mint: config.usdcMint,
        amount: usdToUsdcLamports(pricing.priceUSD),
        currency: "USDC",
        network: config.network,
        invoiceId,
      };

      try {
        const verifyResponse = await axios.post(
          `${config.facilitatorUrl}/verify`,
          {
            payment,
            requirements,
          }
        );

        if (!verifyResponse.data.isValid) {
          await receiptStore.update(receipt.id, {
            status: "failed",
            error: "Payment verification failed",
            latencyMs: Date.now() - startTime,
          });

          return res.status(402).json({
            error: "Payment verification failed",
            details: verifyResponse.data.error,
          });
        }

        const settleResponse = await axios.post(
          `${config.facilitatorUrl}/settle`,
          {
            payment,
            requirements,
          }
        );

        const txSignature = settleResponse.data.signature;

        await receiptStore.update(receipt.id, {
          status: "settled",
          txSignature,
          latencyMs: Date.now() - startTime,
        });

        res.setHeader(
          "X-PAYMENT-RESPONSE",
          JSON.stringify({
            signature: txSignature,
            amount: pricing.priceUSD,
            invoiceId,
          })
        );

        (req as any).paymentReceipt = receipt;

        next();
      } catch (error) {
        console.error("[MIDDLEWARE] Payment processing error:", error);

        await receiptStore.update(receipt.id, {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          latencyMs: Date.now() - startTime,
        });

        return res.status(402).json({
          error: "Payment processing failed",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      console.error("[MIDDLEWARE] Unexpected error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  };
}

/**
 * Send 402 Payment Required response
 */
function send402Response(
  res: Response,
  method: string,
  priceUSD: number
): void {
  const invoiceId = uuidv4();

  const requirements: PaymentRequirements = {
    version: 1,
    recipient: config.recipientWallet,
    mint: config.usdcMint,
    amount: usdToUsdcLamports(priceUSD),
    currency: "USDC",
    network: config.network,
    invoiceId,
    timeout: 60, // 60 seconds to pay
  };

  res.status(402).json({
    error: "Payment Required",
    message: `This endpoint requires payment: ${priceUSD} USDC`,
    method,
    payment: requirements,
  });
}

/**
 * Extract invoice ID from payment
 * (In a real implementation, this would be embedded in the transaction)
 */
function extractInvoiceId(payment: PaymentPayload): string {
  return payment.invoiceId;
}

/**
 * Extract payer address from transaction
 */
function extractPayerFromTransaction(transactionBase64: string): string {
  try {
    // Decode transaction and extract fee payer (first signer)
    const txBuffer = Buffer.from(transactionBase64, "base64");
    const transaction = Transaction.from(txBuffer);

    if (transaction.feePayer) {
      return transaction.feePayer.toBase58();
    }

    // Fallback: get first signature's public key
    if (transaction.signatures && transaction.signatures.length > 0) {
      const firstSigner = transaction.signatures[0].publicKey;
      if (firstSigner) {
        return firstSigner.toBase58();
      }
    }

    return "unknown";
  } catch (error) {
    console.error("[EXTRACT_PAYER] Error extracting payer:", error);
    return "unknown";
  }
}
