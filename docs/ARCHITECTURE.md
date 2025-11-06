# Architecture

Detailed system architecture of the x402 Old Faithful Access Gateway.

## System Overview

```
┌─────────────┐
│   Client    │
│  (Browser/  │
│  CLI/Agent) │
└──────┬──────┘
       │
       │ 1. POST /rpc (no payment)
       ▼
┌─────────────────────────────────────┐
│          Gateway (Port 4021)        │
│  ┌──────────────────────────────┐   │
│  │   x402 Payment Middleware    │   │
│  └──────────────────────────────┘   │
│              │                      │
│    2. Check: Paid method?           │
│              │                      │
│              ▼                      │
│         ┌────┴─────┐                │
│         │  No Pay? │                │
│         └────┬─────┘                │
│              │                      │
│    3. Return 402 + PaymentReqs      │
└──────────────┼──────────────────────┘
               │
               ▼
       ┌───────────────┐
       │    Client     │
       │ Creates USDC  │
       │  Transaction  │
       └───────┬───────┘
               │
               │ 4. POST /rpc + X-PAYMENT header
               ▼
┌────────────────────────────────────┐
│          Gateway (Port 4021)       │
│  ┌──────────────────────────────┐  │
│  │   x402 Payment Middleware    │  │
│  └──────────┬───────────────────┘  │
│             │                      │
│    5. Parse X-PAYMENT payload      │
│             │                      │
│             ▼                      │
│  ┌──────────────────────────────┐  │
│  │    POST /verify              │──┼───┐
│  └──────────────────────────────┘  │   │
└────────────────────────────────────┘   │
                                         │
    ┌────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────┐
│     Facilitator (Port 3000)        │
│  ┌──────────────────────────────┐  │
│  │   Verify Payment             │  │
│  │   - Decode transaction       │  │
│  │   - Check amount/recipient   │  │
│  │   - Validate with Kora       │  │
│  └──────────┬───────────────────┘  │
│             │                      │
│   6. POST signTransaction (Kora)   │
│             │                      │
│             ▼                      │
│      ┌──────────────┐              │
│      │  Kora (8080) │              │
│      └──────┬───────┘              │
│             │                      │
│   7. Valid? → { isValid: true }    │
└─────────────┼──────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│          Gateway                   │
│  ┌──────────────────────────────┐  │
│  │    POST /settle              │──┼───┐
│  └──────────────────────────────┘  │   │
└────────────────────────────────────┘   │
                                         │
    ┌────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│     Facilitator                     │
│  ┌──────────────────────────────┐   │
│  │   Settle Payment             │   │
│  │   - Sign & send via Kora     │   │
│  └──────────┬───────────────────┘   │
│             │                       │
│   8. POST signAndSendTransaction    │
│             │                       │
│             ▼                       │
│      ┌──────────────┐               │
│      │     Kora     │               │
│      └──────┬───────┘               │
│             │                       │
│   9. Broadcast to Solana            │
│             │                       │
│             ▼                       │
│      ┌──────────────┐               │
│      │Solana Network│               │
│      └──────┬───────┘               │
│             │                       │
│  10. { signature: "5J8..." }        │
└─────────────┼───────────────────────┘
              │
              ▼
┌────────────────────────────────────┐
│          Gateway                   │
│  ┌──────────────────────────────┐  │
│  │   Save Receipt               │  │
│  │   - invoiceId                │  │
│  │   - txSignature              │  │
│  │   - method, amount           │  │
│  └──────────┬───────────────────┘  │
│             │                      │
│  11. Proxy to Old Faithful/ParaFi  │
│             │                      │
│             ▼                      │
│  ┌──────────────────────────────┐  │
│  │   Upstream RPC               │  │
│  │   https://solana-rpc         │  │
│  │   .parafi.tech               │  │
│  └──────────┬───────────────────┘  │
│             │                      │
│  12. Return 200 + data + receipt   │
└─────────────┼──────────────────────┘
              │
              ▼
       ┌────────────┐
       │   Client   │
       │  Receives  │
       │    Data    │
       └────────────┘
```

## Component Details

### 1. Gateway Server

**Technology**: Express.js + TypeScript
**Port**: 4021
**Responsibilities**:
- Intercept JSON-RPC requests
- Apply x402 payment middleware
- Verify payments via facilitator
- Proxy to upstream RPC (ParaFi/Triton Old Faithful)
- Track receipts and usage stats

**Key Files**:
- `src/index.ts` - Main server
- `src/middleware.ts` - x402 payment logic
- `src/proxy.ts` - Upstream RPC proxy
- `src/receipts.ts` - Receipt storage
- `src/pricing.ts` - Pricing policies

**Endpoints**:
- `POST /rpc` - Main JSON-RPC endpoint (x402 protected)
- `GET /health` - Health check
- `GET /receipts` - Recent receipts
- `GET /stats` - Usage statistics

### 2. Facilitator Service

**Technology**: Express.js + TypeScript + Kora Client
**Port**: 3000
**Responsibilities**:
- Verify payment transactions (simulation)
- Settle payments (broadcast to Solana)
- Interface with Kora for gasless signing
- Enforce payment policies

**Key Files**:
- `src/index.ts` - Main server
- `src/kora.ts` - Kora RPC client
- `src/verify.ts` - Payment verification logic
- `src/settle.ts` - Payment settlement logic

**Endpoints**:
- `GET /supported` - Advertise facilitator capabilities
- `POST /verify` - Verify payment without broadcasting
- `POST /settle` - Settle payment and broadcast
- `GET /health` - Health check

### 3. Kora Signer

**Technology**: Kora (Rust binary)
**Port**: 8080
**Responsibilities**:
- Sign transactions as fee payer
- Validate against policies (allowlist/denylist)
- Broadcast to Solana
- Abstract gas fees from end users

**Configuration**:
- `kora.toml` - Server config, policies, API keys
- `signers.toml` - Signer configuration

**Key Features**:
- Policy enforcement (USDC-only transfers)
- Allowlist for approved programs/mints
- Max transaction limits
- API key authentication

### 4. Client Library

**Technology**: TypeScript + Solana Web3.js + SPL Token
**Responsibilities**:
- Detect 402 responses
- Create USDC payment transactions
- Sign with user wallet
- Retry with X-PAYMENT header
- Display receipts

**Key Files**:
- `src/fetch-with-payment.ts` - Main client class
- `src/payment.ts` - Payment transaction builder
- `src/cli.ts` - CLI demo

**Usage**:
```typescript
const client = createFetchWithPayment(payer, gatewayUrl);
const response = await client.request("getTransaction", [signature]);
```

### 5. Upstream RPC (ParaFi → Triton Old Faithful)

**Current**: ParaFi free RPC
- URL: `https://solana-rpc.parafi.tech`
- Standard Solana JSON-RPC interface
- Rate-limited, no SLA

**Target**: Triton Old Faithful
- Full historical archive (genesis to tip)
- Content-addressable CAR files
- JSON-RPC and gRPC interfaces
- Production-grade SLA

**Integration**: Zero-code swap via `UPSTREAM_RPC_URL` env variable

## Data Flow

### Unpaid Request Flow

```
Client → Gateway: POST /rpc { method: "getTransaction" }
Gateway → Client: 402 {
  error: "Payment Required",
  payment: {
    recipient: "...",
    amount: "20",
    mint: "...",
    invoiceId: "..."
  }
}
```

### Paid Request Flow

```
Client → Gateway: POST /rpc + X-PAYMENT header
Gateway → Facilitator: POST /verify { payment, requirements }
Facilitator → Kora: signTransaction (simulation)
Kora → Facilitator: { valid: true }
Facilitator → Gateway: { isValid: true }
Gateway → Facilitator: POST /settle { payment, requirements }
Facilitator → Kora: signAndSendTransaction
Kora → Solana: Broadcast transaction
Solana → Kora: Confirmation + signature
Kora → Facilitator: { signature: "5J8..." }
Facilitator → Gateway: { signature: "5J8...", timestamp }
Gateway → Receipt Store: Save receipt
Gateway → Old Faithful: POST /rpc (proxied)
Old Faithful → Gateway: { result: {...} }
Gateway → Client: 200 { result: {...} } + X-PAYMENT-RESPONSE header
```

## Payment Transaction Structure

```
Transaction {
  feePayer: Kora Signer (pays SOL fees)
  recentBlockhash: ...
  signatures: [User, Kora]
  instructions: [
    1. CreateAssociatedTokenAccount (if needed)
       - Payer: User
       - Wallet: Recipient
       - Mint: USDC

    2. Transfer
       - Source: User's USDC token account
       - Destination: Recipient's USDC token account
       - Amount: As specified in PaymentRequirements
       - Authority: User
  ]
}
```

## Error Handling

### Gateway Errors

| Status | Condition | Action |
|--------|-----------|--------|
| 400 | Invalid JSON-RPC | Return error + usage hint |
| 402 | Payment required | Return PaymentRequirements |
| 402 | Payment invalid | Return error + reason |
| 500 | Upstream error | Return JSON-RPC error |
| 500 | Facilitator down | Return error + retry hint |

### Facilitator Errors

| Status | Condition | Action |
|--------|-----------|--------|
| 400 | Missing payment/requirements | Return error |
| 500 | Kora unavailable | Return error |
| 500 | Verification failed | Return { isValid: false, error } |
| 500 | Settlement failed | Throw error |

### Client Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Insufficient USDC | Wallet balance < payment | Fund with USDC faucet |
| No token account | First USDC transfer | Auto-create (needs SOL rent) |
| Simulation failed | Transaction invalid | Check logs, verify amounts |
| Timeout | Network congestion | Retry with exponential backoff |

## Security Considerations

### Gateway

- ✅ Validate all JSON-RPC requests
- ✅ Rate limit per IP (planned)
- ✅ Verify payment amounts match requirements
- ✅ Idempotency: Check invoice ID before double-charging
- ✅ Sanitize logs (no private keys)

### Facilitator

- ✅ Authenticate API requests (Kora API key)
- ✅ Validate transaction structure before signing
- ✅ Enforce policies via Kora allowlist
- ✅ Timeout long-running verifications
- ✅ Audit log all settlements

### Kora

- ✅ Private key stored securely (env var or HSM)
- ✅ Policy allowlist (USDC only, approved programs)
- ✅ Max transaction limits
- ✅ API key authentication
- ✅ No external network access (localhost only)

### Client

- ✅ User controls private key (never sent to server)
- ✅ Verify 402 response structure before paying
- ✅ Check transaction recipient matches requirements
- ✅ Confirm amount matches quoted price
- ✅ Prompt user before auto-payment (optional)

## Performance

### Expected Latency

| Component | Operation | Latency |
|-----------|-----------|---------|
| Gateway | Check payment | <5ms |
| Facilitator | Verify | ~50ms (Kora RPC) |
| Facilitator | Settle | ~500ms (Solana finality) |
| Gateway | Proxy to Old Faithful | ~200ms |
| **Total** | **Paid request** | **~750ms** |

### Throughput

- Gateway: 1000+ req/s (CPU-bound)
- Facilitator: 100 settle/s (network-bound)
- Kora: Limited by Solana TPS (~3000 global)

### Optimization Strategies

1. **Caching**: Cache receipts by invoice ID
2. **Batching**: Batch multiple verifications to Kora
3. **Async Settlement**: Return 200 before confirmation (risky)
4. **Connection Pooling**: Reuse HTTP connections to upstream
5. **CDN**: Serve static assets via CDN

## Monitoring & Observability

### Metrics to Track

**Gateway**:
- Requests per second (total, by method)
- 402 response rate
- Payment success/failure rate
- Proxy latency (p50, p95, p99)
- Receipt storage size

**Facilitator**:
- Verifications per second
- Settlements per second
- Kora RPC latency
- Transaction confirmation time
- Policy violations

**Financial**:
- Total revenue (USDC)
- Revenue by method
- Average transaction size
- Failed payments (lost revenue)

### Logging

**Structured logs** with:
- Timestamp
- Request ID (for tracing)
- User wallet (hashed)
- Method called
- Payment status
- Latency
- Error details (if any)

**Example**:
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "requestId": "req_abc123",
  "wallet": "hash_xyz789",
  "method": "getTransaction",
  "payment": "settled",
  "txSignature": "5J8...",
  "latencyMs": 856,
  "amountUSD": 0.00002
}
```

### Alerts

- Gateway down (health check fails)
- Facilitator down
- Kora unavailable
- Settlement failure rate > 5%
- Upstream RPC errors > 10%
- Receipt storage > 80% capacity

## Deployment

### Development

```bash
# Local
pnpm install
pnpm dev:facilitator  # Terminal 1
pnpm dev:gateway      # Terminal 2
```

### Production (Docker)

```dockerfile
# Gateway
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
CMD ["pnpm", "start"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: x402-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: x402-gateway
  template:
    metadata:
      labels:
        app: x402-gateway
    spec:
      containers:
      - name: gateway
        image: x402-gateway:latest
        ports:
        - containerPort: 4021
        env:
        - name: UPSTREAM_RPC_URL
          value: "https://triton-old-faithful"
        - name: FACILITATOR_URL
          value: "http://facilitator-service:3000"
```

## Future Enhancements

### Short-term
- [ ] Subscription NFT support
- [ ] Next.js dashboard with charts
- [ ] WebSocket streaming with per-message payments
- [ ] Dynamic pricing based on slot ranges

### Medium-term
- [ ] Multi-network support (mainnet, Eclipse)
- [ ] GraphQL API support
- [ ] Payment batching (pay once, N requests)
- [ ] Refund mechanism for failed requests

### Long-term
- [ ] Decentralized facilitator network
- [ ] Cross-chain payments (Ethereum → Solana data)
- [ ] AI agent integration (auto-budgeting)
- [ ] Marketplace for historical data providers
