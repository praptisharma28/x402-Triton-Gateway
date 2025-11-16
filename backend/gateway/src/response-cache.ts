import NodeCache from 'node-cache';
import { JsonRpcResponse } from '@x402-gateway/types';

/**
 * Response cache for bandwidth-based pricing
 * Stores fetched responses temporarily while waiting for payment
 */

interface CachedResponse {
  response: JsonRpcResponse;
  sizeBytes: number;
  timestamp: number;
}

// Cache with 60 second TTL
const cache = new NodeCache({ stdTTL: 60, checkperiod: 10 });

/**
 * Store a response in cache
 */
export function cacheResponse(
  cacheKey: string,
  response: JsonRpcResponse
): number {
  const responseJson = JSON.stringify(response);
  const sizeBytes = Buffer.byteLength(responseJson, 'utf8');

  const cachedData: CachedResponse = {
    response,
    sizeBytes,
    timestamp: Date.now(),
  };

  cache.set(cacheKey, cachedData);

  return sizeBytes;
}

/**
 * Retrieve a cached response
 */
export function getCachedResponse(cacheKey: string): JsonRpcResponse | null {
  const cachedData = cache.get<CachedResponse>(cacheKey);

  if (cachedData) {
    return cachedData.response;
  }

  return null;
}

/**
 * Delete a cached response
 */
export function deleteCachedResponse(cacheKey: string): void {
  cache.del(cacheKey);
}

/**
 * Generate cache key from invoice ID
 */
export function generateCacheKey(invoiceId: string): string {
  return `response:${invoiceId}`;
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    keys: cache.keys().length,
    stats: cache.getStats(),
  };
}
