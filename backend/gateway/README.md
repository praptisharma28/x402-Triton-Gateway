# Gateway Server

The x402 payment gateway that sits in front of Old Faithful historical data access.

## Features

- **x402 Middleware**: Returns 402 for unpaid historical queries
- **Payment Verification**: Validates payments via facilitator
- **Proxy Layer**: Forwards verified requests to Old Faithful/ParaFi
- **Receipt Tracking**: Persists all payment receipts with metadata
- **Pricing Policy**: Configurable pricing per JSON-RPC method
- **Subscription Support**: Optional NFT-based subscription discounts

## Architecture

```
Client Request
     ↓
x402 Middleware (Check payment)
     ↓
     ├─→ No payment? → 402 Response with PaymentRequirements
     │
     └─→ Has payment? → Verify with Facilitator
              ↓
         Valid? → Settle with Facilitator
              ↓
         Proxy to Old Faithful/ParaFi
              ↓
         Return 200 with data + receipt
```

## Endpoints

### `POST /rpc`
Main JSON-RPC endpoint with x402 protection.

**Unpaid Request:**
```bash
curl -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getTransaction",
    "params": ["SIGNATURE_HERE"]
  }'
```

**Response (402):**
```json
{
  "error": "Payment Required",
  "message": "This endpoint requires payment: 0.00002 USDC",
  "method": "getTransaction",
  "payment": {
    "version": 1,
    "recipient": "YOUR_WALLET_ADDRESS",
    "mint": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    "amount": "20",
    "currency": "USDC",
    "network": "devnet",
    "invoiceId": "550e8400-e29b-41d4-a716-446655440000",
    "timeout": 60
  }
}
```

**Paid Request:**
```bash
curl -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: BASE64_ENCODED_PAYMENT_PAYLOAD" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getTransaction",
    "params": ["SIGNATURE_HERE"]
  }'
```

### `GET /health`
Health check endpoint.

### `GET /receipts?limit=50`
Get recent payment receipts.

### `GET /stats`
Get usage statistics and revenue metrics.

## Configuration

See `.env.example` in the root directory for all configuration options.

Key variables:
- `GATEWAY_PORT`: Server port (default: 4021)
- `UPSTREAM_RPC_URL`: Old Faithful/ParaFi endpoint
- `FACILITATOR_URL`: Facilitator service URL
- `RECIPIENT_WALLET`: Your wallet address for receiving payments
- `PRICE_GET_TRANSACTION`: Price in USD for getTransaction method

## Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## Supported JSON-RPC Methods

Paid methods (require x402 payment):
- `getTransaction` - $0.00002
- `getBlock` - $0.00005
- `getSignaturesForAddress` - $0.0001
- `getBlockTime` - $0.00001
- `getBlocks` - $0.00002
- `getBlocksWithLimit` - $0.00002
- `getConfirmedBlock` - $0.00005
- `getConfirmedTransaction` - $0.00002

Free methods (no payment required):
- Standard RPC methods like `getHealth`, `getVersion`, etc.

## Receipt Storage

Receipts are stored in `data/receipts.json` (for demo).

In production, use a proper database:
- PostgreSQL
- MongoDB
- Redis (for caching)

## Error Handling

- `400 Bad Request`: Invalid JSON-RPC format
- `402 Payment Required`: Payment needed
- `500 Internal Server Error`: Upstream or processing error

## Logging

All requests are logged with:
- Timestamp
- Method
- Payment status
- Latency
- Receipt ID

## Next Steps

1. Set up facilitator service (see `backend/facilitator/`)
2. Fund recipient wallet with mainnet USDC
3. Start Old Faithful on localhost:8899
4. Test with dashboard client
5. Monitor receipts and payments
