#!/bin/bash
# Make a single paid request with unique data

METHOD=$1
PARAMS=$2

if [ -z "$METHOD" ]; then
  echo "Usage: $0 <method> <params>"
  exit 1
fi

# Step 1: Get 402 with unique request
RESPONSE=$(curl -s -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":$(date +%s),\"method\":\"$METHOD\",\"params\":$PARAMS}")

INVOICE_ID=$(echo $RESPONSE | jq -r '.payment.invoiceId')

if [ "$INVOICE_ID" == "null" ]; then
  echo "❌ Failed to get invoice ID"
  echo $RESPONSE
  exit 1
fi

echo "Invoice: $INVOICE_ID"

# Step 2: Make paid request
PAID_RESPONSE=$(curl -s -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: $(echo "{\"version\":1,\"transaction\":\"dGVzdA==\",\"invoiceId\":\"$INVOICE_ID\",\"network\":\"devnet\"}" | base64)" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":$(date +%s),\"method\":\"$METHOD\",\"params\":$PARAMS}")

echo "✅ Receipt created for $METHOD"
