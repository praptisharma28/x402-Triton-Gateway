import { PricingPolicy } from "@x402-gateway/types";
import config from "./config";

/**
 * x402 Integration with Old Faithful
 *
 * Old Faithful provides access to Solana's complete historical archive.
 * These historical queries are expensive to serve and perfect for x402 micropayments.
 *
 * Historical Methods (best served by Old Faithful):
 * - getTransaction, getBlock, getSignaturesForAddress
 * - getBlockTime, getBlocks, getConfirmedBlock/Transaction
 *
 * Premium pricing for historical data enables sustainable archive access.
 */

/**
 * Pricing policies for different JSON-RPC methods
 */
export const pricingPolicies: Record<string, PricingPolicy> = {
  getTransaction: {
    method: "getTransaction",
    priceUSD: config.pricing.getTransaction,
    description: "Retrieve a single transaction by signature",
  },
  getBlock: {
    method: "getBlock",
    priceUSD: config.pricing.getBlock,
    description: "Retrieve a block by slot number",
  },
  getSignaturesForAddress: {
    method: "getSignaturesForAddress",
    priceUSD: config.pricing.getSignaturesForAddress,
    description: "Retrieve transaction signatures for an address",
  },
  getBlockTime: {
    method: "getBlockTime",
    priceUSD: config.pricing.default,
    description: "Retrieve block time for a slot",
  },
  getBlocks: {
    method: "getBlocks",
    priceUSD: config.pricing.default * 2,
    description: "Retrieve blocks in a slot range",
  },
  getBlocksWithLimit: {
    method: "getBlocksWithLimit",
    priceUSD: config.pricing.default * 2,
    description: "Retrieve blocks with limit",
  },
  getConfirmedBlock: {
    method: "getConfirmedBlock",
    priceUSD: config.pricing.getBlock,
    description: "Retrieve confirmed block (deprecated, use getBlock)",
  },
  getConfirmedTransaction: {
    method: "getConfirmedTransaction",
    priceUSD: config.pricing.getTransaction,
    description: "Retrieve confirmed transaction (deprecated)",
  },
};

/**
 * Determine if a JSON-RPC method requires payment
 */
export function requiresPayment(method: string): boolean {
  const paidMethods = [
    "getTransaction",
    "getBlock",
    "getSignaturesForAddress",
    "getBlockTime",
    "getBlocks",
    "getBlocksWithLimit",
    "getConfirmedBlock",
    "getConfirmedTransaction",
  ];

  return paidMethods.includes(method);
}

/**
 * Get pricing for a specific method
 */
export function getPricing(method: string): PricingPolicy {
  return (
    pricingPolicies[method] || {
      method,
      priceUSD: config.pricing.default,
      description: "Historical data query",
    }
  );
}

/**
 * Calculate discount based on subscription tier
 */
export function calculateDiscount(
  basePrice: number,
  discountPercent: number
): number {
  return basePrice * (1 - discountPercent / 100);
}

/**
 * Convert USD price to USDC lamports (6 decimals for USDC)
 */
export function usdToUsdcLamports(usdAmount: number): string {
  const usdcDecimals = 6;
  const lamports = Math.floor(usdAmount * Math.pow(10, usdcDecimals));
  return lamports.toString();
}

/**
 * Calculate bandwidth-based dynamic pricing
 * Base price + size-based pricing
 */
export function calculateDynamicPrice(method: string, sizeBytes: number): number {
  const basePolicy = getPricing(method);
  const basePrice = basePolicy.priceUSD;

  // Size-based pricing: $0.000001 per KB
  const sizeKB = sizeBytes / 1024;
  const sizePricePerKB = 0.000001;
  const sizePrice = sizeKB * sizePricePerKB;

  const totalPrice = basePrice + sizePrice;

  return totalPrice;
}
