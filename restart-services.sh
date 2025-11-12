#!/bin/bash

# Kill all existing processes
pkill -9 -f "tsx watch" || true
lsof -ti:4021 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

sleep 2

# Start facilitator
cd /Users/praps/Downloads/x402-solana-hackathon/backend/facilitator
pnpm dev > /tmp/facilitator-restart.log 2>&1 &
FACILITATOR_PID=$!

sleep 3

# Start gateway
cd /Users/praps/Downloads/x402-solana-hackathon/backend/gateway
pnpm dev > /tmp/gateway-restart.log 2>&1 &
GATEWAY_PID=$!

sleep 5

echo "Services started:"
echo "Facilitator PID: $FACILITATOR_PID"
echo "Gateway PID: $GATEWAY_PID"

echo ""
echo "Checking health..."
curl -s http://localhost:4021/health | jq

echo ""
echo "Checking receipt count..."
curl -s http://localhost:4021/receipts | jq 'length'
