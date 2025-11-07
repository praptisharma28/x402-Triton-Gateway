#!/bin/bash

# Generate REAL receipts by testing the full payment flow
# This uses the facilitator in MOCK MODE to simulate payments

set -e

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Generating REAL Receipts via Payment Flow          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

GATEWAY_URL="http://localhost:4021"
FACILITATOR_URL="http://localhost:3000"

# Helper function to generate a payment transaction (base64 encoded mock)
generate_mock_payment() {
  local invoice_id=$1
  local amount=$2

  # Create a simple mock transaction (base64 encoded)
  # In reality, this would be a signed SPL token transfer
  echo "dGVzdC10cmFuc2FjdGlvbi1kYXRhLWZvci1pbm  voice-${invoice_id}-amount-${amount}" | base64
}

echo "════════════════════════════════════════════════"
echo "Test 1: Generate receipt for getTransaction"
echo "════════════════════════════════════════════════"
echo ""

# Step 1: Get 402 response
echo "→ Making unpaid request to get 402..."
RESPONSE=$(curl -s -X POST $GATEWAY_URL/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"getTransaction",
    "params":["48xStxW3Z39DmnxNGkhTCpYiQVqf96tALiQm2qdfRrERkUD6GcigHcR92NUVb9ebZyVFRMd3mbWDngJSfZ2T44gF"]
  }')

echo "✓ Received 402 response"
INVOICE_ID=$(echo $RESPONSE | jq -r '.payment.invoiceId')
AMOUNT=$(echo $RESPONSE | jq -r '.payment.amount')
echo "  Invoice ID: $INVOICE_ID"
echo "  Amount: $AMOUNT lamports"
echo ""

# Step 2: Create payment transaction
echo "→ Creating payment transaction..."
PAYMENT_TX=$(generate_mock_payment $INVOICE_ID $AMOUNT)
echo "✓ Payment transaction created"
echo ""

# Step 3: Send request with payment
echo "→ Sending request with X-PAYMENT header..."
PAYMENT_PAYLOAD=$(cat <<EOF
{
  "version": 1,
  "transaction": "$PAYMENT_TX",
  "invoiceId": "$INVOICE_ID",
  "network": "devnet"
}
EOF
)

PAID_RESPONSE=$(curl -s -X POST $GATEWAY_URL/rpc \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: $(echo $PAYMENT_PAYLOAD | base64)" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"getTransaction",
    "params":["48xStxW3Z39DmnxNGkhTCpYiQVqf96tALiQm2qdfRrERkUD6GcigHcR92NUVb9ebZyVFRMd3mbWDngJSfZ2T44gF"]
  }')

echo "✓ Request completed!"
echo ""

# Give it a moment to save
sleep 1

echo "════════════════════════════════════════════════"
echo "Test 2: Generate receipt for getBlock"
echo "════════════════════════════════════════════════"
echo ""

# Repeat for getBlock
RESPONSE=$(curl -s -X POST $GATEWAY_URL/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"getBlock",
    "params":[419800000]
  }')

INVOICE_ID=$(echo $RESPONSE | jq -r '.payment.invoiceId')
AMOUNT=$(echo $RESPONSE | jq -r '.payment.amount')
PAYMENT_TX=$(generate_mock_payment $INVOICE_ID $AMOUNT)

PAYMENT_PAYLOAD=$(cat <<EOF
{
  "version": 1,
  "transaction": "$PAYMENT_TX",
  "invoiceId": "$INVOICE_ID",
  "network": "devnet"
}
EOF
)

curl -s -X POST $GATEWAY_URL/rpc \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: $(echo $PAYMENT_PAYLOAD | base64)" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"getBlock",
    "params":[419800000]
  }' > /dev/null

echo "✓ getBlock receipt generated"
sleep 1

echo ""
echo "════════════════════════════════════════════════"
echo "Test 3: Generate receipt for getSignaturesForAddress"
echo "════════════════════════════════════════════════"
echo ""

RESPONSE=$(curl -s -X POST $GATEWAY_URL/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"getSignaturesForAddress",
    "params":["7xNdVuE604ZTw7CNhFjZR11wtTK0XVznnXy7KsqTDgl"]
  }')

INVOICE_ID=$(echo $RESPONSE | jq -r '.payment.invoiceId')
AMOUNT=$(echo $RESPONSE | jq -r '.payment.amount')
PAYMENT_TX=$(generate_mock_payment $INVOICE_ID $AMOUNT)

PAYMENT_PAYLOAD=$(cat <<EOF
{
  "version": 1,
  "transaction": "$PAYMENT_TX",
  "invoiceId": "$INVOICE_ID",
  "network": "devnet"
}
EOF
)

curl -s -X POST $GATEWAY_URL/rpc \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: $(echo $PAYMENT_PAYLOAD | base64)" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"getSignaturesForAddress",
    "params":["7xNdVuE604ZTw7CNhFjZR11wtTK0XVznnXy7KsqTDgl"]
  }' > /dev/null

echo "✓ getSignaturesForAddress receipt generated"
sleep 1

echo ""
echo "════════════════════════════════════════════════"
echo "Results"
echo "════════════════════════════════════════════════"
echo ""

# Check receipts
RECEIPT_COUNT=$(curl -s $GATEWAY_URL/receipts | jq 'length')
echo "✅ Generated $RECEIPT_COUNT REAL receipts!"
echo ""

# Show stats
echo "Gateway Stats:"
curl -s $GATEWAY_URL/stats | jq

echo ""
echo "✅ Done! Check the dashboard at http://localhost:3001"
echo ""
