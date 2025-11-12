# Facilitator Service

Payment facilitator that handles x402 payment verification and settlement for Old Faithful access.

## Features

- **Payment Verification**: Validates transaction structure and payment amounts
- **Payment Settlement**: Broadcasts user-signed transactions to Solana
- **User-Pays-Gas**: Users sign and pay for their own transaction fees
- **Transaction Validation**: Ensures proper SPL token transfers
- **Capability Advertisement**: `/supported` endpoint for client discovery

## Architecture

```
Gateway
   ↓
Facilitator (/verify) → Validate Transaction Structure
   ↓
Facilitator (/settle) → Broadcast to Solana (Helius RPC)
   ↓
Transaction Signature ← Solana Network
```

## How It Works

1. User creates and signs USDC transfer transaction in their wallet
2. Gateway forwards transaction to facilitator for verification
3. Facilitator validates:
   - Transaction is properly formatted and signed
   - SPL token transfer instruction exists
   - Transfer amount matches requirements
   - Recipient matches expected address
4. Facilitator broadcasts transaction to Solana mainnet
5. Facilitator waits for confirmation
6. Returns transaction signature to gateway

## Endpoints

### `GET /supported`
Advertise facilitator capabilities.

**Response:**
```json
{
  "version": 1,
  "scheme": ["exact"],
  "network": ["mainnet-beta"],
  "feePayer": "PAYMENT_RECIPIENT_ADDRESS"
}
```

### `POST /verify`
Verify payment transaction without broadcasting.

**Request:**
```json
{
  "payment": {
    "version": 1,
    "scheme": "exact",
    "network": "mainnet-beta",
    "transaction": "BASE64_ENCODED_SIGNED_TRANSACTION",
    "invoiceId": "UUID"
  },
  "requirements": {
    "version": 1,
    "recipient": "RECIPIENT_WALLET",
    "tokenAccount": "RECIPIENT_TOKEN_ACCOUNT",
    "mint": "USDC_MINT_ADDRESS",
    "amount": "20",
    "currency": "USDC",
    "network": "mainnet-beta",
    "invoiceId": "UUID"
  }
}
```

**Response (Success):**
```json
{
  "isValid": true
}
```

**Response (Failure):**
```json
{
  "isValid": false,
  "error": "Insufficient payment: 10 < 20"
}
```

### `POST /settle`
Settle payment by broadcasting to Solana.

**Request:** Same as `/verify`

**Response:**
```json
{
  "signature": "5J8...",
  "timestamp": 1699999999999
}
```

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1699999999999,
  "network": "mainnet-beta",
  "solanaRpcUrl": "https://mainnet.helius-rpc.com/..."
}
```

## Configuration

Environment variables (see `.env`):

```bash
# Server
FACILITATOR_PORT=3000
FACILITATOR_HOST=0.0.0.0

# Network
NETWORK=mainnet-beta
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Payment
RECIPIENT_WALLET=62pyPYsdSLah2vDSeenEep2R2hP9jz98eDbnz4Zyb1Lf
```

## Running

```bash
# Development (auto-reload)
pnpm dev

# Production build
pnpm build
pnpm start
```

## Testing

### Test /supported endpoint
```bash
curl http://localhost:3000/supported
```

### Test /health endpoint
```bash
curl http://localhost:3000/health
```

### Test /verify endpoint
```bash
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "payment": {
      "version": 1,
      "scheme": "exact",
      "network": "mainnet-beta",
      "transaction": "BASE64_TX",
      "invoiceId": "test-uuid"
    },
    "requirements": {
      "version": 1,
      "recipient": "WALLET_ADDRESS",
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "amount": "20",
      "currency": "USDC",
      "network": "mainnet-beta",
      "invoiceId": "test-uuid"
    }
  }'
```

## Verification Logic

The facilitator verifies:
1. Transaction structure is valid
2. Transaction is properly signed by user
3. SPL token transfer instruction exists
4. Transfer instruction type is Transfer (3) or TransferChecked (12)
5. Transfer amount meets or exceeds requirements
6. Recipient token account matches (if specified)

## Error Handling

Common errors:
- `Invalid transaction: ...`: Malformed transaction data
- `No token transfer instruction found`: Missing SPL token transfer
- `Insufficient payment: X < Y`: Amount less than required
- `Wrong recipient: X != Y`: Token account mismatch
- `Not a token transfer instruction`: Wrong instruction type

## Production Considerations

1. **Rate Limiting**: Add rate limits per wallet/IP address
2. **Monitoring**: Track verification/settlement success rates
3. **Logging**: Centralized logging for all transactions
4. **RPC Redundancy**: Use multiple RPC endpoints with fallback
5. **Database**: Store settlement records for auditing
6. **Error Recovery**: Retry logic for failed broadcasts
7. **Transaction Fees**: Monitor SOL balance for potential future uses

## Security

- Users sign their own transactions with their wallets
- Users pay their own gas fees (non-custodial)
- Transaction validation prevents overpayment detection issues
- No private keys stored on facilitator
- All transactions verified on-chain
- Unique blockhash prevents replay attacks
