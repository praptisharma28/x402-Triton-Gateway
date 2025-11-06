# Facilitator Service

Kora-backed facilitator that handles x402 payment verification and settlement with gasless transactions.

## Features

- **Payment Verification**: Simulates transactions via Kora without broadcasting
- **Payment Settlement**: Signs and broadcasts transactions to Solana
- **Gasless Transactions**: Kora pays network fees on behalf of users
- **Policy Enforcement**: Kora validates transactions against configured policies
- **Capability Advertisement**: `/supported` endpoint for client discovery

## Architecture

```
Gateway
   ↓
Facilitator (/verify) → Kora RPC (signTransaction)
   ↓                         ↓
Facilitator (/settle) → Kora RPC (signAndSendTransaction)
   ↓                         ↓
Transaction Signature ← Solana Network
```

## Endpoints

### `GET /supported`
Advertise facilitator capabilities.

**Response:**
```json
{
  "version": 1,
  "scheme": ["exact"],
  "network": ["devnet"],
  "feePayer": "KORA_SIGNER_PUBLIC_KEY"
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
    "network": "devnet",
    "transaction": "BASE64_ENCODED_SIGNED_TRANSACTION"
  },
  "requirements": {
    "version": 1,
    "recipient": "RECIPIENT_WALLET",
    "tokenAccount": "RECIPIENT_TOKEN_ACCOUNT",
    "mint": "USDC_MINT_ADDRESS",
    "amount": "20",
    "currency": "USDC",
    "network": "devnet",
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

## Kora Setup

### 1. Install Kora

```bash
# Download Kora binary
curl -L https://github.com/kora-network/kora/releases/download/vX.X.X/kora-darwin-arm64 -o kora
chmod +x kora
mv kora /usr/local/bin/
```

### 2. Generate Signer Keypair

```bash
solana-keygen new --outfile ~/.config/solana/kora-signer.json
```

### 3. Fund Signer (Devnet)

```bash
solana airdrop 2 $(solana-keygen pubkey ~/.config/solana/kora-signer.json) --url devnet
```

### 4. Create `kora.toml`

```toml
# Server Configuration
bind_address = "127.0.0.1:8080"
rpc_url = "https://api.devnet.solana.com"

# API Keys (for facilitator authentication)
[[api_keys]]
key = "your_api_key_here"
name = "facilitator"

# Policy: Allow USDC transfers only
[[policies]]
name = "usdc_only"
type = "allowlist"

[[policies.allowlist]]
# Devnet USDC mint
address = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
program = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"

# Allowed programs
[[policies.allowlist]]
# System Program
address = "11111111111111111111111111111111"

[[policies.allowlist]]
# Associated Token Program
address = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"

[[policies.allowlist]]
# Compute Budget Program
address = "ComputeBudget111111111111111111111111111111"

# Fee Payer Configuration
[fee_payer]
max_lamports_per_transaction = 10000
max_transactions_per_minute = 100
```

### 5. Create `signers.toml`

```toml
[[signers]]
name = "main_signer"
type = "memory"
private_key_env = "KORA_SIGNER_PRIVATE_KEY"
weight = 1
```

### 6. Set Environment Variable

```bash
# Extract private key from keypair file
export KORA_SIGNER_PRIVATE_KEY=$(cat ~/.config/solana/kora-signer.json | jq -r '.[0:32] | map(tostring) | join(",")')
```

### 7. Start Kora

```bash
kora --config kora.toml --signers signers.toml
```

## Configuration

See `.env.example` for environment variables:

```bash
FACILITATOR_PORT=3000
KORA_RPC_URL=http://localhost:8080
KORA_API_KEY=your_api_key_here
KORA_PAYER_ADDRESS=<kora_signer_public_key>
NETWORK=devnet
```

## Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## Testing

### Test /supported endpoint
```bash
curl http://localhost:3000/supported
```

### Test /verify endpoint
```bash
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "payment": { ... },
    "requirements": { ... }
  }'
```

## Verification Logic

The facilitator verifies:
1. ✅ Transaction structure is valid
2. ✅ Transaction is properly signed
3. ✅ Token transfer instruction exists
4. ✅ Transfer amount meets or exceeds requirements
5. ✅ Recipient token account matches
6. ✅ Kora policy allows the transaction

## Error Handling

Common errors:
- `Invalid transaction`: Malformed transaction data
- `No token transfer instruction found`: Missing SPL token transfer
- `Insufficient payment`: Amount less than required
- `Wrong recipient`: Token account mismatch
- `Kora rejected the transaction`: Policy violation

## Production Considerations

1. **Rate Limiting**: Add rate limits per IP/API key
2. **Monitoring**: Track verification/settlement success rates
3. **Logging**: Centralized logging for all transactions
4. **Kora High Availability**: Run multiple Kora instances
5. **Database**: Store settlement records for auditing
6. **Error Recovery**: Retry logic for failed broadcasts

## Security

- Kora signer must have sufficient SOL for fees
- API keys should be rotated regularly
- Policies must restrict to approved programs/mints
- Never expose private keys in logs or responses
