# x402 Old Faithful Access Gateway

A paid access layer for Solana's historical data via Triton's Old Faithful archive, implementing the x402 payment protocol with Kora-backed micropayments.

## Overview

This project monetizes access to Solana's complete historical blockchain data by:
- Returning HTTP 402 for unpaid historical queries
- Processing micropayments via Kora facilitator (gasless USDC)
- Proxying verified requests to Old Faithful/ParaFi RPC
- Tracking receipts and usage in a Next.js dashboard

## Project Structure

```
├── backend/
│   ├── gateway/          # Express server with x402 middleware + Old Faithful proxy
│   └── facilitator/      # Kora-backed /verify, /settle, /supported endpoints
├── frontend/
│   ├── dashboard/        # Next.js + shadcn UI for receipts & analytics
│   └── client-demo/      # Auto-pay client wrapper + CLI demo
├── shared/
│   ├── types/            # TypeScript types for x402 + receipts
│   └── utils/            # Shared utilities
└── docs/                 # Documentation & demo scripts
```

## Architecture

### Backend Components

**Gateway (Port 4021)**
- Intercepts JSON-RPC requests (`POST /rpc`)
- Returns 402 for unpaid historical methods (getTransaction, getBlock, etc.)
- Verifies payments via facilitator
- Proxies to ParaFi (testing) or Triton Old Faithful (production)
- Persists receipts with tx sig, method, bytes, latency

**Facilitator (Port 3000)**
- `POST /verify` - Simulates payment via Kora
- `POST /settle` - Broadcasts transaction and returns signature
- `GET /supported` - Advertises capabilities (x402 v1, exact scheme, devnet/mainnet)

### Frontend Components

**Dashboard**
- Receipts table (tx sig, method, amount, status, duration)
- Usage charts by method and slot range
- Pricing admin panel
- Explorer links for transaction verification

**Client Demo**
- Fetch wrapper that detects 402, pays, and retries
- CLI example: fetch a 2021 transaction signature
- Auto-generates payment transactions with USDC

## Technology Stack

- **Protocol**: x402 (HTTP 402 Payment Required)
- **Blockchain**: Solana (devnet for testing, mainnet for production)
- **Facilitator**: Kora (gasless transaction signing)
- **Payment Token**: USDC (SPL token)
- **Backend**: Node.js + Express + TypeScript
- **Frontend**: Next.js 15 + shadcn/ui + TailwindCSS
- **Data Source**: ParaFi RPC (testing) → Triton Old Faithful (production)

## Endpoints

### Testing (ParaFi)
- JSON-RPC: `https://solana-rpc.parafi.tech`
- Yellowstone gRPC: `https://solana-rpc.parafi.tech:10443`

### Production (Triton Old Faithful)
- To be configured via `UPSTREAM_RPC_URL` environment variable
- Drop-in replacement (same JSON-RPC 2.0 interface)

## Payment Flow

1. Client requests historical data → `POST /rpc`
2. Gateway returns `402 Payment Required` with payment details
3. Client creates USDC transfer, signs with wallet
4. Client retries with `X-PAYMENT` header
5. Gateway calls facilitator `/verify` → Kora validates
6. Gateway calls facilitator `/settle` → Tx broadcasted
7. Gateway proxies to Old Faithful
8. Client receives `200 OK` with historical data + receipt

## Pricing Model

Starting prices (calibrated to Triton's $25 per million queries):
- `getTransaction`: $0.00002 USDC
- `getBlock`: $0.00005 USDC
- `getSignaturesForAddress`: $0.0001 USDC (per 1000 results)

Optional: Subscription NFT holders bypass or receive discounted pricing.

## Setup Instructions

### Prerequisites
- Node.js v20+
- pnpm (or npm/yarn)
- Solana CLI
- Devnet SOL and USDC for testing

### Installation

```bash
# Install dependencies for all workspaces
pnpm install

# Set up Kora (see backend/facilitator/README.md)
# Configure environment variables
cp .env.example .env
```

### Running the System

```bash
# Terminal 1: Start facilitator
cd backend/facilitator
pnpm dev

# Terminal 2: Start gateway
cd backend/gateway
pnpm dev

# Terminal 3: Start dashboard
cd frontend/dashboard
pnpm dev

# Terminal 4: Run client demo
cd frontend/client-demo
pnpm start
```

## Development Milestones

- [x] Day 1: Gateway skeleton + 402 responses + facilitator /supported
- [ ] Day 2: Implement /verify + /settle + persist receipts + E2E flow
- [ ] Day 3: Integrate ParaFi RPC + test historical methods
- [ ] Day 4: Dashboard MVP + shadcn blocks + Postman collection
- [ ] Day 5: Pricing polish + error handling + demo recording

## Demo Script

1. **Unpaid Request**: `curl` to `/rpc` without payment → See 402 response with pricing
2. **Auto-Pay Client**: Run CLI demo → Fetches 2021 transaction, auto-pays, prints result + tx sig
3. **Dashboard**: View receipt row with method, amount, latency, ParaFi proxy log

## Resources

- [x402 Protocol Docs](https://solana.com/developers/guides/getstarted/intro-to-x402)
- [Kora Facilitator Guide](https://solana.com/developers/guides/getstarted/build-a-x402-facilitator)
- [Triton One Documentation](https://docs.triton.one/)
- [Old Faithful GitHub](https://github.com/rpcpool/yellowstone-faithful)
- [Coinbase x402 Reference](https://github.com/coinbase/x402)

## License

MIT

## Hackathon Track

Solana x402 Hackathon - Triton Side Track ($2500)
# x402-Triton-Gateway
