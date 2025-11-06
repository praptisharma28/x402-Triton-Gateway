#!/bin/bash

# written by gpt, so I don't know if they are that correct lol
# x402 Old Faithful Gateway - Setup Script
# This script automates the initial setup process

set -e

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   x402 Old Faithful Gateway - Setup Wizard            ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js v20+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version)${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}⚠️  pnpm not found. Installing...${NC}"
    npm install -g pnpm
fi
echo -e "${GREEN}✅ pnpm $(pnpm --version)${NC}"

if ! command -v solana &> /dev/null; then
    echo -e "${RED}❌ Solana CLI not found. Please install from https://docs.solana.com/cli/install-solana-cli-tools${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Solana CLI $(solana --version)${NC}"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Step 1: Install Dependencies"
echo "═══════════════════════════════════════════════════════"
echo ""

pnpm install

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Step 2: Generate Wallets"
echo "═══════════════════════════════════════════════════════"
echo ""

mkdir -p ~/.config/solana

# Generate recipient wallet
if [ ! -f ~/.config/solana/recipient-wallet.json ]; then
    echo "Generating recipient wallet (receives payments)..."
    solana-keygen new --no-bip39-passphrase --outfile ~/.config/solana/recipient-wallet.json
    RECIPIENT_PUBKEY=$(solana-keygen pubkey ~/.config/solana/recipient-wallet.json)
    echo -e "${GREEN}✅ Recipient wallet: $RECIPIENT_PUBKEY${NC}"
else
    RECIPIENT_PUBKEY=$(solana-keygen pubkey ~/.config/solana/recipient-wallet.json)
    echo -e "${YELLOW}⚠️  Recipient wallet already exists: $RECIPIENT_PUBKEY${NC}"
fi

# Generate Kora signer
if [ ! -f ~/.config/solana/kora-signer.json ]; then
    echo "Generating Kora signer wallet (pays gas fees)..."
    solana-keygen new --no-bip39-passphrase --outfile ~/.config/solana/kora-signer.json
    KORA_PUBKEY=$(solana-keygen pubkey ~/.config/solana/kora-signer.json)
    echo -e "${GREEN}✅ Kora signer: $KORA_PUBKEY${NC}"
else
    KORA_PUBKEY=$(solana-keygen pubkey ~/.config/solana/kora-signer.json)
    echo -e "${YELLOW}⚠️  Kora signer already exists: $KORA_PUBKEY${NC}"
fi

# Generate test payer
if [ ! -f ~/.config/solana/test-wallet.json ]; then
    echo "Generating test payer wallet (for client demo)..."
    solana-keygen new --no-bip39-passphrase --outfile ~/.config/solana/test-wallet.json
    TEST_PUBKEY=$(solana-keygen pubkey ~/.config/solana/test-wallet.json)
    echo -e "${GREEN}✅ Test payer: $TEST_PUBKEY${NC}"
else
    TEST_PUBKEY=$(solana-keygen pubkey ~/.config/solana/test-wallet.json)
    echo -e "${YELLOW}⚠️  Test payer already exists: $TEST_PUBKEY${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Step 3: Fund Wallets with Devnet SOL"
echo "═══════════════════════════════════════════════════════"
echo ""

echo "Funding Kora signer (needs 2 SOL for fees)..."
solana airdrop 2 $KORA_PUBKEY --url devnet || echo "Airdrop may have failed or rate limited, continuing..."

echo "Funding test payer (needs 1 SOL for fees)..."
solana airdrop 1 $TEST_PUBKEY --url devnet || echo "Airdrop may have failed or rate limited, continuing..."

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Step 4: Configure Environment"
echo "═══════════════════════════════════════════════════════"
echo ""

# Extract private key for test payer
TEST_PRIVATE_KEY=$(cat ~/.config/solana/test-wallet.json)

# Create .env file
cat > .env << EOF
# Network Configuration
NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com

# Upstream RPC (ParaFi for testing, Triton Old Faithful for production)
UPSTREAM_RPC_URL=https://solana-rpc.parafi.tech
UPSTREAM_GRPC_URL=https://solana-rpc.parafi.tech:10443

# Gateway Configuration
GATEWAY_PORT=4021
GATEWAY_HOST=0.0.0.0

# Facilitator Configuration
FACILITATOR_PORT=3000
FACILITATOR_URL=http://localhost:3000

# Kora Configuration
KORA_RPC_URL=http://localhost:8080
KORA_API_KEY=hackathon_demo_key_$(date +%s)

# Payment Configuration
RECIPIENT_WALLET=$RECIPIENT_PUBKEY
USDC_MINT_DEVNET=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
USDC_MINT_MAINNET=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Pricing (in USD)
PRICE_GET_TRANSACTION=0.00002
PRICE_GET_BLOCK=0.00005
PRICE_GET_SIGNATURES=0.0001

# Frontend Dashboard
NEXT_PUBLIC_GATEWAY_URL=http://localhost:4021
NEXT_PUBLIC_FACILITATOR_URL=http://localhost:3000

# Testing Wallets
TEST_PAYER_PRIVATE_KEY='$TEST_PRIVATE_KEY'
KORA_PAYER_ADDRESS=$KORA_PUBKEY
EOF

echo -e "${GREEN}✅ Created .env file${NC}"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "Step 5: Configure Kora"
echo "═══════════════════════════════════════════════════════"
echo ""

# Extract Kora API key from .env
KORA_API_KEY=$(grep KORA_API_KEY .env | cut -d '=' -f2)

# Create Kora configuration
mkdir -p backend/facilitator

cat > backend/facilitator/kora.toml << EOF
# Kora Configuration for x402 Facilitator

# Server Configuration
bind_address = "127.0.0.1:8080"
rpc_url = "https://api.devnet.solana.com"

# API Keys (for facilitator authentication)
[[api_keys]]
key = "$KORA_API_KEY"
name = "facilitator"

# Policy: Allow USDC transfers only
[[policies]]
name = "usdc_only"
type = "allowlist"

[[policies.allowlist]]
# Devnet USDC mint
address = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
program = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"

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
EOF

cat > backend/facilitator/signers.toml << EOF
[[signers]]
name = "main_signer"
type = "memory"
private_key_env = "KORA_SIGNER_PRIVATE_KEY"
weight = 1
EOF

echo -e "${GREEN}✅ Created Kora configuration files${NC}"

# Create start-kora script
cat > scripts/start-kora.sh << 'EOF'
#!/bin/bash
cd backend/facilitator
export KORA_SIGNER_PRIVATE_KEY=$(cat ~/.config/solana/kora-signer.json | jq -r '.[0:32] | map(tostring) | join(",")')
kora --config kora.toml --signers signers.toml
EOF

chmod +x scripts/start-kora.sh

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✨ Setup Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "1. ${YELLOW}Fund wallets with USDC${NC}"
echo "   Visit: https://faucet.circle.com/"
echo "   Send devnet USDC to:"
echo "     - Test payer: $TEST_PUBKEY"
echo ""
echo "2. ${YELLOW}Install Kora (if not installed)${NC}"
echo "   macOS ARM: curl -L https://github.com/kora-network/kora/releases/download/v0.1.0/kora-darwin-arm64 -o /usr/local/bin/kora && chmod +x /usr/local/bin/kora"
echo "   Linux: curl -L https://github.com/kora-network/kora/releases/download/v0.1.0/kora-linux-x64 -o /usr/local/bin/kora && chmod +x /usr/local/bin/kora"
echo ""
echo "3. ${YELLOW}Start the system${NC}"
echo "   Terminal 1: ./scripts/start-kora.sh"
echo "   Terminal 2: cd backend/facilitator && pnpm dev"
echo "   Terminal 3: cd backend/gateway && pnpm dev"
echo "   Terminal 4: cd frontend/client-demo && pnpm start"
echo ""
echo "4. ${YELLOW}Test the system${NC}"
echo "   curl http://localhost:4021/health"
echo "   curl http://localhost:3000/supported"
echo ""
echo "For detailed instructions, see docs/SETUP.md"
echo ""
