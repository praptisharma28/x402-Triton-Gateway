# x402 Gateway Demo Commands

Complete set of curl commands to demonstrate the x402 payment gateway.

---

## 🏥 1. Health Checks

### Gateway Health
```bash
curl http://localhost:4021/health | jq
```

**Expected Output:**
```json
{
  "status": "ok",
  "timestamp": 1762472089495,
  "upstreamUrl": "https://solana-rpc.parafi.tech",
  "network": "devnet"
}
```

### Facilitator Health
```bash
curl http://localhost:3000/health | jq
```

---

## 💰 2. Get Facilitator Capabilities (x402 /supported)

```bash
curl http://localhost:3000/supported | jq
```

**Expected Output:**
```json
{
  "version": 1,
  "schemes": ["exact"],
  "networks": ["devnet", "mainnet-beta"],
  "tokens": [
    {
      "mint": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      "symbol": "USDC",
      "network": "devnet"
    }
  ],
  "features": ["verify", "settle"]
}
```

**What this shows:**
- ✅ Supports x402 version 1
- ✅ Accepts USDC payments
- ✅ Can verify and settle transactions
- ✅ Works on devnet and mainnet

---

## 📊 3. Check Current Statistics (Before Payments)

```bash
curl http://localhost:4021/stats | jq
```

**Expected Output:**
```json
{
  "totalRequests": 2,
  "totalRevenue": 0.00004,
  "methodBreakdown": {
    "getTransaction": {
      "count": 2,
      "revenue": 0.00004
    }
  },
  "averageLatency": 2.5,
  "failureRate": 0
}
```

---

## 🚫 4. Make Unpaid Request (Get HTTP 402)

### Request Historical Transaction (No Payment)
```bash
curl -i -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "getTransaction",
    "params": ["48xStxW3Z39DmnxNGkhTCpYiQVqf96tALiQm2qdfRrERkUD6GcigHcR92NUVb9ebZyVFRMd3mbWDngJSfZ2T44gF"]
  }'
```

**Expected Output:**
```
HTTP/1.1 402 Payment Required
```

```json
{
  "error": "Payment Required",
  "message": "This endpoint requires payment: 0.00002 USDC",
  "method": "getTransaction",
  "payment": {
    "version": 1,
    "recipient": "11111111111111111111111111111111",
    "mint": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    "amount": "20",
    "currency": "USDC",
    "network": "devnet",
    "invoiceId": "a1931740-7c46-4bd6-96a9-e7e93b5fe246",
    "timeout": 60
  }
}
```

**What this shows:**
- 🚫 Request blocked with HTTP 402
- 💰 Price: $0.00002 USDC (20 lamports)
- 🆔 Unique invoice ID for this request
- ⏰ 60 second timeout to make payment

---

## 💳 5. Test Different Methods (Different Pricing)

### getBlock (Higher Price)
```bash
curl -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "getBlock",
    "params": [419800000]
  }' | jq
```

**Expected Price:** $0.00005 USDC

### getSignaturesForAddress (Highest Price)
```bash
curl -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "getSignaturesForAddress",
    "params": ["7xNdVuE604ZTw7CNhFjZR11wtTK0XVznnXy7KsqTDgl"]
  }' | jq
```

**Expected Price:** $0.0001 USDC

**What this shows:**
- 📊 Dynamic pricing per method
- 💸 More expensive operations = higher cost
- 🎯 Calibrated to Triton's pricing model

---

## ✅ 6. Make Paid Request (Using Script)

### Generate a Real Paid Request
```bash
./scripts/make-paid-request.sh "getTransaction" \
  '["48xStxW3Z39DmnxNGkhTCpYiQVqf96tALiQm2qdfRrERkUD6GcigHcR92NUVb9ebZyVFRMd3mbWDngJSfZ2T44gF"]'
```

**What happens:**
1. Script gets 402 response with invoice ID
2. Creates mock payment transaction
3. Retries with X-PAYMENT header
4. Facilitator verifies payment (MOCK MODE)
5. Facilitator settles payment (generates tx signature)
6. Gateway proxies to ParaFi
7. Receipt is saved
8. Data is returned

**Expected Output:**
```
Invoice: a1931740-7c46-4bd6-96a9-e7e93b5fe246
✅ Receipt created for getTransaction
```

---

## 🧾 7. View All Receipts

```bash
curl http://localhost:4021/receipts | jq
```

**Expected Output:**
```json
[
  {
    "id": "79e85c62-ee10-40ec-8fd0-6d30f98bfdb9",
    "invoiceId": "a1931740-7c46-4bd6-96a9-e7e93b5fe246",
    "txSignature": "pfi1xinKYA8SrzoeyqJT9pyG928PcNhZHMtUa6DUt1p9ppCv4E2tCzmCqOeoYrs999JNKdzqfoVKtb8gLXJKBA",
    "method": "getTransaction",
    "endpoint": "/rpc",
    "amountUSD": 0.00002,
    "currency": "USDC",
    "status": "settled",
    "payloadSize": 152,
    "latencyMs": 3,
    "timestamp": 1762472089495,
    "payer": "extracted_payer_address",
    "recipient": "11111111111111111111111111111111",
    "network": "devnet"
  }
]
```

**What this shows:**
- 📝 Complete payment record
- ✅ Status: "settled" (payment confirmed)
- 💰 Amount paid: $0.00002
- 🔑 Solana transaction signature
- ⏱️ Latency: 3ms
- 🎯 Method used: getTransaction

### View Recent Receipts (Limit 5)
```bash
curl http://localhost:4021/receipts?limit=5 | jq
```

### View Single Receipt Details
```bash
curl http://localhost:4021/receipts | jq '.[0]'
```

---

## 📈 8. View Updated Statistics

```bash
curl http://localhost:4021/stats | jq
```

**Expected Output (After Making Requests):**
```json
{
  "totalRequests": 5,
  "totalRevenue": 0.0001,
  "methodBreakdown": {
    "getTransaction": {
      "count": 3,
      "revenue": 0.00006
    },
    "getBlock": {
      "count": 2,
      "revenue": 0.0001
    }
  },
  "averageLatency": 257.4,
  "failureRate": 0
}
```

**What this shows:**
- 💵 Total revenue generated
- 📊 Breakdown by method type
- ⚡ Average response latency
- ✅ Success rate tracking

---

## 🔄 9. Generate Multiple Test Receipts

### Quick Test - 4 Requests
```bash
for i in {1..4}; do
  ./scripts/make-paid-request.sh "getTransaction" \
    '["48xStxW3Z39DmnxNGkhTCpYiQVqf96tALiQm2qdfRrERkUD6GcigHcR92NUVb9ebZyVFRMd3mbWDngJSfZ2T44gF"]'
  sleep 1
done

echo ""
echo "=== Receipts Generated ==="
curl -s http://localhost:4021/receipts | jq 'length'
echo " receipts total"
```

### Run Full Receipt Generator
```bash
./scripts/generate-real-receipts.sh
```

**What this shows:**
- 🔄 Automated payment flow
- 📝 Multiple receipts generated
- 💰 Revenue accumulation
- 📊 Statistics updating in real-time

---

## 🌐 10. Test Different RPC Methods

### Get Current Slot
```bash
curl -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "getSlot",
    "params": []
  }' | jq
```

### Get Block Height
```bash
curl -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 5,
    "method": "getBlockHeight",
    "params": []
  }' | jq
```

### Get Recent Blockhash
```bash
curl -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 6,
    "method": "getRecentBlockhash",
    "params": []
  }' | jq
```

**Note:** Some methods might be free (not in pricing policy) and will proxy without payment.

---

## 🎯 11. Test Payment Flow Manually (Advanced)

### Step 1: Get Invoice ID
```bash
RESPONSE=$(curl -s -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 100,
    "method": "getTransaction",
    "params": ["48xStxW3Z39DmnxNGkhTCpYiQVqf96tALiQm2qdfRrERkUD6GcigHcR92NUVb9ebZyVFRMd3mbWDngJSfZ2T44gF"]
  }')

INVOICE_ID=$(echo $RESPONSE | jq -r '.payment.invoiceId')
echo "Invoice ID: $INVOICE_ID"
```

### Step 2: Create Payment Payload
```bash
PAYMENT_PAYLOAD=$(echo "{
  \"version\": 1,
  \"transaction\": \"dGVzdA==\",
  \"invoiceId\": \"$INVOICE_ID\",
  \"network\": \"devnet\"
}" | base64)

echo "Payment Payload: $PAYMENT_PAYLOAD"
```

### Step 3: Make Paid Request
```bash
curl -s -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: $PAYMENT_PAYLOAD" \
  -d '{
    "jsonrpc": "2.0",
    "id": 100,
    "method": "getTransaction",
    "params": ["48xStxW3Z39DmnxNGkhTCpYiQVqf96tALiQm2qdfRrERkUD6GcigHcR92NUVb9ebZyVFRMd3mbWDngJSfZ2T44gF"]
  }' | jq
```

**What this shows:**
- 🔍 Manual payment flow breakdown
- 📦 X-PAYMENT header structure
- 🎫 Invoice ID tracking
- ✅ Complete request lifecycle

---

## 🖥️ 12. Dashboard Access

### Open Dashboard
```bash
open http://localhost:3001
# Or visit in browser: http://localhost:3001
```

**Dashboard Features:**
- 📊 Receipts table
- 💰 Revenue statistics
- 📈 Method breakdown
- ⏱️ Latency metrics
- 🔄 Real-time updates

---

## 🧪 13. Run Automated Tests

```bash
./scripts/test-gateway.sh
```

**Tests:**
1. ✅ Health check
2. ✅ 402 Payment Required responses
3. ✅ Statistics tracking
4. ✅ Receipt storage
5. ✅ Pricing varies by method
6. ✅ Upstream proxy configuration

---

## 🎬 Demo Script (5 Minutes)

### Quick Demo Flow
```bash
# 1. Show system is healthy
echo "=== 1. Health Check ==="
curl http://localhost:4021/health | jq
sleep 2

# 2. Show 402 response
echo ""
echo "=== 2. Unpaid Request (402) ==="
curl -i -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getTransaction","params":["48xStxW3Z39DmnxNGkhTCpYiQVqf96tALiQm2qdfRrERkUD6GcigHcR92NUVb9ebZyVFRMd3mbWDngJSfZ2T44gF"]}' \
  2>/dev/null | head -15
sleep 2

# 3. Show facilitator capabilities
echo ""
echo "=== 3. Facilitator Capabilities ==="
curl http://localhost:3000/supported | jq
sleep 2

# 4. Generate paid receipts
echo ""
echo "=== 4. Making Paid Requests ==="
./scripts/make-paid-request.sh "getTransaction" \
  '["48xStxW3Z39DmnxNGkhTCpYiQVqf96tALiQm2qdfRrERkUD6GcigHcR92NUVb9ebZyVFRMd3mbWDngJSfZ2T44gF"]'
sleep 2

# 5. Show receipts
echo ""
echo "=== 5. View Receipts ==="
curl http://localhost:4021/receipts | jq '.[0]'
sleep 2

# 6. Show statistics
echo ""
echo "=== 6. Revenue Statistics ==="
curl http://localhost:4021/stats | jq
sleep 2

# 7. Open dashboard
echo ""
echo "=== 7. Opening Dashboard ==="
echo "Dashboard: http://localhost:3001"
open http://localhost:3001 2>/dev/null || echo "Visit http://localhost:3001 in your browser"
```

---

## 🎯 Key Demo Points to Highlight

1. **HTTP 402 Protocol**
   - Standard HTTP status code for payment
   - Returns pricing and payment requirements
   - Clean API design

2. **Micropayments**
   - $0.00002 per transaction lookup
   - USDC payments on Solana
   - Gasless via Kora (mock mode)

3. **Dynamic Pricing**
   - Different prices for different operations
   - Calibrated to market rates
   - Easy to configure

4. **Receipt Tracking**
   - Every payment recorded
   - Transaction signatures
   - Revenue analytics

5. **Production Ready**
   - Switch ParaFi → Triton with 1 env var
   - Complete test suite
   - Real payment flow (mock mode for demo)

6. **Dashboard**
   - Real-time receipt display
   - Revenue tracking
   - Method breakdown

---

## 🔧 Troubleshooting

### Services Not Running?
```bash
# Check gateway
curl http://localhost:4021/health

# Check facilitator
curl http://localhost:3000/health

# Check dashboard
curl http://localhost:3001
```

### Restart Services
```bash
# Kill all
pkill -f "tsx watch"
pkill -f "next dev"

# Restart gateway
cd backend/gateway && MOCK_KORA=true pnpm dev &

# Restart facilitator
cd backend/facilitator && MOCK_KORA=true pnpm dev &

# Restart dashboard
cd frontend/dashboard && pnpm dev &
```

---

## 📝 Notes

- All commands assume services are running
- MOCK_KORA=true means no real Kora setup needed
- Receipts persist in `data/receipts.json`
- ParaFi is free testing endpoint (production = Triton)
- Transaction signatures are mock-generated (realistic format)

---

**Ready for hackathon demo!** 🚀
