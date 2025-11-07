#!/bin/bash

# Quick 2-Minute Demo of x402 Gateway
# Shows all key features in a simple flow

set -e

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   x402 Old Faithful Gateway - Quick Demo             ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Health Check
echo -e "${BLUE}[1/6] Health Check${NC}"
curl -s http://localhost:4021/health | jq
echo ""
sleep 1

# 2. Show 402 Response (Payment Required)
echo -e "${BLUE}[2/6] Unpaid Request → HTTP 402 Payment Required${NC}"
echo "Request: getTransaction without payment"
echo ""
curl -s -X POST http://localhost:4021/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getTransaction","params":["48xStxW3Z39DmnxNGkhTCpYiQVqf96tALiQm2qdfRrERkUD6GcigHcR92NUVb9ebZyVFRMd3mbWDngJSfZ2T44gF"]}' \
  | jq
echo ""
echo -e "${YELLOW}💰 Price: \$0.00002 USDC (20 lamports)${NC}"
echo ""
sleep 2

# 3. Show Facilitator Capabilities
echo -e "${BLUE}[3/6] x402 Facilitator Capabilities${NC}"
curl -s http://localhost:3000/supported | jq
echo ""
sleep 1

# 4. Current Stats Before Payment
echo -e "${BLUE}[4/6] Current Statistics${NC}"
curl -s http://localhost:4021/stats | jq
echo ""
sleep 1

# 5. Make a Paid Request
echo -e "${BLUE}[5/6] Making Paid Request${NC}"
echo "Generating receipt via payment flow..."
echo ""
./scripts/make-paid-request.sh "getTransaction" \
  '["48xStxW3Z39DmnxNGkhTCpYiQVqf96tALiQm2qdfRrERkUD6GcigHcR92NUVb9ebZyVFRMd3mbWDngJSfZ2T44gF"]'
echo ""
sleep 1

# 6. Show Receipt & Updated Stats
echo -e "${BLUE}[6/6] View Receipt & Updated Stats${NC}"
echo ""
echo -e "${YELLOW}Latest Receipt:${NC}"
curl -s http://localhost:4021/receipts | jq '.[0] | {
  txSignature: .txSignature,
  method: .method,
  amountUSD: .amountUSD,
  status: .status,
  latencyMs: .latencyMs
}'
echo ""

echo -e "${YELLOW}Updated Statistics:${NC}"
curl -s http://localhost:4021/stats | jq
echo ""

# Summary
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Demo Complete!                                      ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ HTTP 402 Payment Protocol${NC}"
echo -e "${GREEN}✅ Micropayments (\$0.00002 per request)${NC}"
echo -e "${GREEN}✅ Receipt Tracking${NC}"
echo -e "${GREEN}✅ Revenue Statistics${NC}"
echo -e "${GREEN}✅ Kora Facilitator Integration${NC}"
echo ""
echo "📊 Dashboard: http://localhost:3001"
echo "📝 Full demo commands: DEMO_COMMANDS.md"
echo ""
