# x402 Triton Gateway - Micropayment-Gated Historical Solana Data

**Hackathon Submission**: Best x402 Integration with Old Faithful

A production-ready micropayment gateway that implements HTTP 402 (Payment Required) to monetize access to historical Solana blockchain data via Old Faithful. Users pay micro-amounts in USDC to query historical transactions and blocks.

## What It Does

This gateway enables monetization of Solana historical data access through:

- **Pay-per-query access** to Old Faithful's Solana historical archive (Epoch 800)
- **Wallet-based authentication** using Solana wallet adapters
- **Real USDC micropayments** on Solana mainnet
- **Transparent pricing** with cryptographic receipts for every query
- **Live transaction validation** with secure on-chain settlement

## Why This Matters

Historical blockchain data is valuable but expensive to maintain. This system:
- Creates sustainable revenue models for data providers
- Ensures fair, usage-based pricing for consumers
- Provides cryptographic proof of payment and data delivery
- Eliminates traditional API key/subscription overhead

## Architecture

```
┌─────────────┐
│   Client    │ 1. Connect wallet & sign USDC payment
│  Dashboard  │ 2. Request historical data + payment proof
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Gateway   │ 3. Enforce HTTP 402 Payment Required
│  (Port 4021)│ 4. Verify payment with facilitator
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Facilitator │ 5. Validate transaction structure
│  (Port 3000)│ 6. Broadcast to Solana mainnet
└──────┬──────┘ 7. Return confirmation
       │
       ├───────────────┐
       │               │
       ▼               ▼
┌─────────────┐ ┌─────────────┐
│   Solana    │ │ Old Faithful│
│  Mainnet    │ │  (Epoch 800)│
│  (Helius)   │ │ Port 8899   │
└─────────────┘ └─────────────┘
       │               │
       └───────┬───────┘
               ▼
        ┌─────────────┐
        │   Receipt   │ Transaction signature
        │  Generation │ + data returned to user
        └─────────────┘
```

## Key Features

### 1. x402 Protocol Implementation
- HTTP 402 responses with payment requirements
- Dynamic pricing per RPC method
- Cryptographic receipt generation

### 2. Old Faithful Integration
- Direct access to Epoch 800 historical data (slots 345,600,000 - 345,855,967)
- Support for `getTransaction`, `getBlock`, and other RPC methods
- Verified working example transactions from historical blocks

### 3. Real Solana Payments
- User signs USDC transfer transactions with their wallet
- No custodial wallets - users maintain full control
- Real mainnet settlement with transaction confirmations
- Direct transaction validation and broadcasting

### 4. Live Dashboard
- Next.js 15 with Solana wallet adapter integration
- Real-time service status monitoring
- Interactive transaction query interface
- Receipt history with on-chain verification links

## Technical Stack

### Backend
- **Gateway**: Express.js (TypeScript) - HTTP 402 enforcement
- **Facilitator**: Express.js (TypeScript) - Payment verification and settlement
- **Old Faithful**: Triton One's historical Solana archive

### Frontend
- **Next.js 15** with App Router
- **Solana Wallet Adapter** for wallet connections
- **@solana/web3.js** for transaction creation
- **TailwindCSS** for styling

### Blockchain
- **Solana Mainnet** via Helius RPC
- **USDC (SPL Token)**: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
- **Payment Recipient**: 62pyPYsdSLah2vDSeenEep2R2hP9jz98eDbnz4Zyb1Lf

## Setup Instructions

### Prerequisites
- Node.js 18+
- pnpm
- Solana CLI (optional, for wallet management)
- Old Faithful running on port 8899

### Environment Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure your environment variables:
```bash
# Network
NETWORK=mainnet-beta
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Old Faithful
UPSTREAM_RPC_URL=http://localhost:8899

# Pricing (USD per query)
PRICE_GET_TRANSACTION=0.00002
PRICE_GET_BLOCK=0.00005
PRICE_GET_SIGNATURES=0.0001
```

### Installation

```bash
# Install dependencies
pnpm install

# Build shared types
pnpm --filter @x402-gateway/types build
```

### Running Services

#### 1. Start Old Faithful
```bash
# Old Faithful should be running on localhost:8899
# Serving Epoch 800 data (slots 345,600,000 - 345,855,967)
```

#### 2. Start Facilitator
```bash
cd backend/facilitator
pnpm dev
# Runs on localhost:3000
```

#### 3. Start Gateway
```bash
cd backend/gateway
pnpm dev
# Runs on localhost:4021
```

#### 4. Start Dashboard
```bash
cd frontend/dashboard
pnpm dev
# Runs on localhost:3002
```

### Quick Start Script
```bash
# Start all services
./restart-services.sh
```

## Usage

### 1. Connect Wallet
- Open dashboard at `http://localhost:3002`
- Click "Select Wallet" and connect your Solana wallet
- Ensure you have USDC in your wallet

### 2. Query Historical Data

**Example Transactions** (from Epoch 800):
- `3G8fVhYvVrHDoUQdckWsMF8EDgEpXvkzrm98EE34VHW6LFUyX8fASdoGKhCQX9zz1xLm5zjwi3DoE7FEbm4RHRSU`
- `2Zwfm3NHJyeEbnCb3sfkaLmhtrM5LS4yJWUjLYrJ824SXfPcAfrjWJePyVZC21aFhRcPtcn6vDnMY5wXrq5vbVZ`
- `5eYfNeABJGRwVkvLdsTGLHqi2UGAuoESbGUt9SvQTdt92DSzDR2Jd5iryDEyzth4AZsWEJDHV64UAgaA16ZGFRFa`

### 3. Make Payment
- Dashboard displays price for query (e.g., 0.00002 USDC for getTransaction)
- Click "Pay & Fetch"
- Approve USDC transfer in your wallet
- Transaction is validated and broadcast to Solana
- Data is returned with cryptographic receipt

### 4. Verify Receipt
- Each query generates a receipt with:
  - Solana transaction signature
  - Timestamp
  - Query details
  - Payment proof
- Verify on Solana Explorer: `https://solscan.io/tx/[signature]`

## API Examples

### HTTP 402 Flow

1. **Initial Request (No Payment)**
```bash
curl -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getTransaction",
    "params": ["3G8fVhYvVrHDoUQdckWsMF8EDgEpXvkzrm98EE34VHW6LFUyX8fASdoGKhCQX9zz1xLm5zjwi3DoE7FEbm4RHRSU"]
  }'
```

**Response: 402 Payment Required**
```json
{
  "error": "Payment required",
  "amount": "20",
  "currency": "USDC",
  "recipient": "62pyPYsdSLah2vDSeenEep2R2hP9jz98eDbnz4Zyb1Lf",
  "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}
```

2. **Request with Payment**
```bash
curl -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -H "X-Payment-Signature: <base64-signed-transaction>" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getTransaction",
    "params": ["3G8fVhYvVrHDoUQdckWsMF8EDgEpXvkzrm98EE34VHW6LFUyX8fASdoGKhCQX9zz1xLm5zjwi3DoE7FEbm4RHRSU"]
  }'
```

**Response: Data + Receipt**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { /* transaction data */ },
  "receipt": {
    "signature": "5xK3...",
    "timestamp": 1731434562000,
    "payment": { /* payment details */ }
  }
}
```

## Payment Flow Details

### Transaction Structure
1. **User creates transaction** in browser wallet:
   - SPL token transfer (USDC)
   - Amount: Price in lamports (e.g., 20 for 0.00002 USDC)
   - Recipient: Payment recipient token account
   - User pays gas fees

2. **User signs** transaction with wallet private key

3. **Frontend sends** base64-encoded signed transaction to gateway

4. **Gateway forwards** to facilitator for verification

5. **Facilitator validates**:
   - Transaction structure is valid
   - Amount matches requirements
   - Recipient matches expected address
   - Transaction is properly signed

6. **Facilitator broadcasts** to Solana mainnet via Helius RPC

7. **Facilitator waits** for confirmation

8. **Gateway returns** data + receipt with real transaction signature

### Security Features
- User retains custody of funds (non-custodial)
- All transactions verified on-chain
- Cryptographic receipts for audit trail
- Transaction validation prevents malicious transfers
- No replay attacks (unique blockhash per transaction)

## Pricing Model

All historical data queries require micropayments in USDC:

| RPC Method | Price (USDC) | Description |
|------------|--------------|-------------|
| getTransaction | 0.00002 | Fetch historical transaction details |
| getBlock | 0.00005 | Fetch complete block data |
| getSignaturesForAddress | 0.0001 | Fetch transaction history for address |
| getBlockTime | 0.00001 | Retrieve block time for a slot |
| getBlocks | 0.00002 | Retrieve blocks in a slot range |
| getBlocksWithLimit | 0.00002 | Retrieve blocks with limit |
| getConfirmedBlock | 0.00005 | Retrieve confirmed block (deprecated) |
| getConfirmedTransaction | 0.00002 | Retrieve confirmed transaction (deprecated) |

Prices are configured in `.env` and can be adjusted based on:
- Data provider costs
- Network congestion
- Market demand
- Query complexity

## Old Faithful Integration

### Epoch 800 Coverage
- **Slot Range**: 345,600,000 - 345,855,967
- **Data Source**: files.old-faithful.net
- **RPC Endpoint**: http://localhost:8899

### Verified Working Queries
All example transactions have been tested and verified to return data from Old Faithful:

```bash
# Test getTransaction
echo '{"jsonrpc":"2.0","id":1,"method":"getTransaction","params":["3G8fVhYvVrHDoUQdckWsMF8EDgEpXvkzrm98EE34VHW6LFUyX8fASdoGKhCQX9zz1xLm5zjwi3DoE7FEbm4RHRSU",{"encoding":"json","maxSupportedTransactionVersion":0}]}' | curl -X POST http://localhost:8899 -H "Content-Type: application/json" -d @-
```

### Gateway Integration
- Gateway proxies requests to Old Faithful after payment verification
- Maintains same RPC interface as standard Solana nodes
- Adds payment layer without changing client code
- Supports all Old Faithful RPC methods

## Project Structure

```
x402-solana-hackathon/
├── backend/
│   ├── facilitator/          # Payment verification & settlement
│   │   └── src/
│   │       ├── index.ts      # Main server
│   │       ├── verify.ts     # Transaction validation
│   │       ├── settle.ts     # Solana broadcast
│   │       └── config.ts     # Configuration
│   └── gateway/              # HTTP 402 enforcement
│       └── src/
│           ├── index.ts      # Main server
│           ├── middleware.ts # Payment verification
│           ├── pricing.ts    # Dynamic pricing
│           └── proxy.ts      # Old Faithful proxy
├── frontend/
│   └── dashboard/            # Next.js client
│       └── app/
│           ├── page.tsx      # Main dashboard
│           └── client/       # Client-side payment UI
├── shared/
│   └── types/                # Shared TypeScript types
├── data/
│   └── receipts.json         # Payment receipts storage
└── scripts/                  # Utility scripts
    └── setup.sh              # Environment setup
```

## Troubleshooting

### Transaction Not Found
- Ensure transaction is from Epoch 800 (slots 345,600,000 - 345,855,967)
- Verify Old Faithful is running: `curl http://localhost:8899`
- Check example transactions are still valid

### Payment Verification Failed
- Check wallet has sufficient USDC
- Ensure wallet has SOL for gas fees
- Verify payment recipient has USDC token account
- Check facilitator logs for detailed errors
- Restart facilitator and gateway services

### CORS Errors
- Ensure gateway CORS includes frontend port (3002)
- Check `backend/gateway/src/index.ts` line 13

## Future Enhancements

1. **Multi-epoch Support**: Expand beyond Epoch 800
2. **Subscription Model**: Pre-paid query bundles
3. **Token Flexibility**: Accept SOL, other SPL tokens
4. **Advanced Pricing**: Dynamic pricing based on demand
5. **Analytics Dashboard**: Query metrics and revenue tracking
6. **Rate Limiting**: Per-wallet query limits
7. **Caching Layer**: Reduce Old Faithful load for popular queries

## Links

- **Solana Explorer**: https://solscan.io
- **Old Faithful**: https://old-faithful.net
- **Triton One**: https://triton.one
- **Solana x402 Hackathon**: https://solana.com/x402/hackathon

## License

MIT

## Credits

Built for the Solana x402 hackathon targeting the "Best x402 Integration with Old Faithful" bounty by Triton One.
