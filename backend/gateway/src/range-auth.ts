import jwt from 'jsonwebtoken';
import NodeCache from 'node-cache';

// Secret for JWT signing (in production, use env variable)
const JWT_SECRET = process.env.JWT_SECRET || 'x402-range-secret-change-in-production';

// Cache for purchased ranges (TTL handled by JWT expiry)
const rangeCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

export interface RangeToken {
  rangeId: string;
  startSlot: number;
  endSlot: number;
  purchaser: string; // wallet address
  txSignature: string; // payment transaction signature
  expiresAt: number;
  iat?: number;
}

export interface PurchaseRangeRequest {
  startSlot: number;
  endSlot: number;
  duration: number; // in seconds (e.g., 3600 = 1 hour)
  paymentTxSignature: string;
  payer: string; // wallet address
}

/**
 * Generate a JWT token for purchased range access
 */
export function generateRangeToken(request: PurchaseRangeRequest): string {
  const expiresAt = Date.now() + (request.duration * 1000);
  const rangeId = `${request.startSlot}-${request.endSlot}-${request.payer}`;

  const payload: RangeToken = {
    rangeId,
    startSlot: request.startSlot,
    endSlot: request.endSlot,
    purchaser: request.payer,
    txSignature: request.paymentTxSignature,
    expiresAt,
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: request.duration,
  });

  // Cache the range purchase
  rangeCache.set(rangeId, payload);

  return token;
}

/**
 * Verify and decode a range token
 */
export function verifyRangeToken(token: string): RangeToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as RangeToken;

    // Check if token is expired
    if (decoded.expiresAt < Date.now()) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('[RANGE-AUTH] Token verification failed:', error);
    return null;
  }
}

/**
 * Check if a slot/block is within a purchased range
 */
export function isSlotInRange(slot: number, rangeToken: RangeToken): boolean {
  return slot >= rangeToken.startSlot && slot <= rangeToken.endSlot;
}

/**
 * Check if a transaction signature query is covered by a range token
 * Note: We can't determine slot from signature without querying,
 * so this is a simplified check. In production, you might need to
 * query Old Faithful to get the slot for the transaction first.
 */
export function isTransactionInRange(signature: string, rangeToken: RangeToken): boolean {
  // For now, assume all transaction queries within a purchased range are allowed
  // In production, you'd want to:
  // 1. Query Old Faithful to get the slot for this transaction
  // 2. Check if that slot is in the range
  // For hackathon demo, we'll allow all tx queries if user has ANY active range token
  return true;
}

/**
 * Calculate price for a range purchase
 * Pricing: $0.00001 per block * number of blocks
 */
export function calculateRangePrice(startSlot: number, endSlot: number): number {
  const blockCount = endSlot - startSlot + 1;
  const pricePerBlock = 0.00001; // $0.00001 per block
  return blockCount * pricePerBlock;
}

/**
 * Get all active ranges for a wallet
 */
export function getActiveRanges(walletAddress: string): RangeToken[] {
  const allKeys = rangeCache.keys();
  const activeRanges: RangeToken[] = [];

  for (const key of allKeys) {
    const range = rangeCache.get<RangeToken>(key);
    if (range && range.purchaser === walletAddress && range.expiresAt > Date.now()) {
      activeRanges.push(range);
    }
  }

  return activeRanges;
}
