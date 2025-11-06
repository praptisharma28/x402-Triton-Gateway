# Client Demo

Auto-pay client that detects HTTP 402 responses, creates USDC payments, and retries requests with payment proof.

## Features

- **Auto-Payment**: Automatically handles 402 responses
- **USDC Transfers**: Creates SPL token transfer transactions
- **Wallet Integration**: Signs transactions with Solana keypair
- **Receipt Tracking**: Displays transaction signatures and explorer links
- **CLI Demo**: Interactive examples for historical data queries

## Architecture

```
Client Request
     ↓
Gateway returns 402 + PaymentRequirements
     ↓
Client creates USDC transfer transaction
     ↓
Client signs with wallet
     ↓
Client creates X-PAYMENT payload
     ↓
Client retries request with X-PAYMENT header
     ↓
Gateway verifies → settles → returns 200 + data
```

## Setup

### 1. Generate Wallet

```bash
solana-keygen new --outfile ~/.config/solana/test-wallet.json
```

### 2. Get Public Key

```bash
solana-keygen pubkey ~/.config/solana/test-wallet.json
```

### 3. Fund with Devnet SOL

```bash
solana airdrop 1 <YOUR_PUBLIC_KEY> --url devnet
```

### 4. Fund with Devnet USDC

Visit Circle's devnet faucet:
https://faucet.circle.com/

Request USDC to your wallet address.

### 5. Configure Environment

Add to `.env`:

```bash
TEST_PAYER_PRIVATE_KEY='[1,2,3,...]'  # Your keypair as array
NETWORK=devnet
NEXT_PUBLIC_GATEWAY_URL=http://localhost:4021
```

To get the private key array:
```bash
cat ~/.config/solana/test-wallet.json
```

## Running

### Interactive CLI Demo

```bash
pnpm start
```

This will:
1. Connect to the gateway
2. Request a historical transaction (getTransaction)
3. Automatically pay on 402 response
4. Display the result + tx signature
5. Request a historical block (getBlock)
6. Pay and display result

### Individual Examples

```bash
# Get transaction example
pnpm demo:transaction

# Get block example
pnpm demo:block
```

## Usage in Your Code

```typescript
import { Keypair } from "@solana/web3.js";
import { createFetchWithPayment } from "./fetch-with-payment";

// Load your wallet
const payer = Keypair.fromSecretKey(secretKeyBytes);

// Create client
const client = createFetchWithPayment(payer, "http://localhost:4021", {
  debug: true,
});

// Make requests - payment handled automatically
const response = await client.request("getTransaction", [
  "SIGNATURE_HERE",
  { encoding: "json" },
]);

console.log(response.result);
```

## Payment Flow

### 1. Initial Request (Unpaid)

```typescript
const response = await client.request("getTransaction", [signature]);
```

**Gateway Response (402):**
```json
{
  "error": "Payment Required",
  "message": "This endpoint requires payment: 0.00002 USDC",
  "payment": {
    "recipient": "...",
    "mint": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    "amount": "20",
    "invoiceId": "..."
  }
}
```

### 2. Client Creates Payment

```typescript
const paymentTx = await createPaymentTransaction(
  connection,
  payer,
  requirements
);
```

This creates a SPL token transfer:
- From: Your USDC token account
- To: Recipient's USDC token account
- Amount: As specified in requirements
- Signed by: Your wallet

### 3. Client Retries with Payment

```typescript
headers["X-PAYMENT"] = base64EncodedPaymentPayload;
const response = await axios.post(gatewayUrl, request, { headers });
```

### 4. Gateway Verifies & Settles

- Facilitator verifies transaction
- Kora broadcasts to Solana
- Gateway returns 200 + data

### 5. Client Receives Result

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": { ... }
}
```

**Headers:**
```
X-PAYMENT-RESPONSE: {"signature": "5J8...", "amount": 0.00002, "invoiceId": "..."}
```

## API Reference

### `FetchWithPayment`

Main client class for making paid requests.

**Constructor:**
```typescript
new FetchWithPayment(
  payer: Keypair,
  gatewayUrl: string,
  options?: {
    maxRetries?: number;
    debug?: boolean;
  }
)
```

**Methods:**
```typescript
async request(method: string, params: any[]): Promise<JsonRpcResponse>
```

### `createPaymentTransaction`

Create SPL token transfer for payment.

```typescript
async function createPaymentTransaction(
  connection: Connection,
  payer: Keypair,
  requirements: PaymentRequirements
): Promise<string>
```

### `createPaymentPayload`

Encode transaction for X-PAYMENT header.

```typescript
function createPaymentPayload(
  transaction: string,
  network: "devnet" | "mainnet-beta"
): string
```

## Troubleshooting

### "Insufficient USDC balance"

Fund your wallet with devnet USDC:
https://faucet.circle.com/

### "No USDC token account found"

The first USDC transfer will create your token account automatically. Make sure you have enough SOL for rent (~0.002 SOL).

### "Transaction simulation failed"

Check that:
1. You have enough SOL for transaction fees (~0.00001 SOL)
2. You have enough USDC for the payment
3. The recipient's wallet address is valid
4. The USDC mint address matches your network (devnet/mainnet)

### "Payment verification failed"

The transaction was rejected by Kora policy. Check:
1. You're using the correct USDC mint
2. Transfer amount matches requirements
3. Transaction is properly signed
4. Kora is running and accessible

## Next Steps

1. Integrate into your application
2. Add error handling and retry logic
3. Implement payment caching (avoid double-payment)
4. Add transaction confirmation polling
5. Build UI for payment approval

## Resources

- [x402 Protocol](https://solana.com/developers/guides/getstarted/intro-to-x402)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token](https://spl.solana.com/token)
- [Circle USDC Faucet](https://faucet.circle.com/)
