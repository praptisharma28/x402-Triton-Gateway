# Docker Deployment Guide

This guide explains how to run the x402 Triton Gateway using Docker.

## Prerequisites

- Docker Desktop installed (includes Docker Compose)
- Old Faithful CLI binary (`/tmp/faithful-cli`)
- Old Faithful config file (`old-faithful-epoch-800.yml`)

## Architecture

The application consists of 4 services:

1. **Old Faithful** - Solana historical archive (Epoch 800)
2. **Facilitator** - Payment verification and settlement service
3. **Gateway** - x402 payment gateway proxying to Old Faithful
4. **Dashboard** - Next.js frontend with wallet integration

## Quick Start

### 1. Start Old Faithful

Old Faithful runs as a native binary (not containerized). Start it first:

```bash
/tmp/faithful-cli rpc --listen :8899 old-faithful-epoch-800.yml
```

Keep this terminal open. Old Faithful will listen on port 8899.

### 2. Start Docker Services

In a new terminal:

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

### 3. Access the Services

- **Dashboard**: http://localhost:3001
- **Client Demo**: http://localhost:3001/client
- **Gateway**: http://localhost:4021
- **Facilitator**: http://localhost:3000
- **Old Faithful**: http://localhost:8899

## Environment Variables

### Facilitator
- `FACILITATOR_PORT` - Port to listen on (default: 3000)
- `NETWORK` - Solana network (mainnet-beta/devnet)
- `SOLANA_RPC_URL` - Helius RPC endpoint
- `RECIPIENT_WALLET` - Payment recipient address

### Gateway
- `GATEWAY_PORT` - Port to listen on (default: 4021)
- `NETWORK` - Solana network
- `UPSTREAM_RPC_URL` - Old Faithful URL
- `FACILITATOR_URL` - Facilitator service URL
- `RECIPIENT_WALLET` - Payment recipient address
- `USDC_MINT_MAINNET` - USDC token mint address
- `PRICE_GET_TRANSACTION` - Price in USDC for getTransaction calls
- `PRICE_GET_BLOCK` - Price in USDC for getBlock calls
- `PRICE_GET_SIGNATURES` - Price in USDC for getSignatures calls

### Dashboard
- `NEXT_PUBLIC_GATEWAY_URL` - Gateway URL for frontend
- `NEXT_PUBLIC_SOLANA_RPC` - Solana RPC for wallet connections

## Docker Commands

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f facilitator
docker-compose logs -f gateway
docker-compose logs -f dashboard
```

### Stop services
```bash
docker-compose down
```

### Rebuild after code changes
```bash
docker-compose up --build
```

### Remove everything (including volumes)
```bash
docker-compose down -v
```

## Health Checks

Check if services are running:

```bash
# Facilitator
curl http://localhost:3000/health

# Gateway
curl http://localhost:4021/health

# Old Faithful
curl -X POST http://localhost:8899 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getVersion"}'
```

## Troubleshooting

### Old Faithful not accessible from Docker
- Old Faithful runs on the host, not in Docker
- Gateway uses `host.docker.internal:8899` to connect
- Make sure Old Faithful is running before starting Docker services

### Port conflicts
```bash
# Check what's using a port
lsof -ti:3000  # Facilitator
lsof -ti:4021  # Gateway
lsof -ti:3001  # Dashboard
lsof -ti:8899  # Old Faithful
```

### Dashboard shows connection errors
- Verify Gateway is running: `curl http://localhost:4021/health`
- Check browser console for CORS errors
- Ensure `NEXT_PUBLIC_GATEWAY_URL` points to `http://localhost:4021`

### Rebuilding specific service
```bash
docker-compose up --build facilitator
docker-compose up --build gateway
docker-compose up --build dashboard
```

## Production Deployment

For production deployment:

1. **Update environment variables** in `docker-compose.yml`:
   - Use your own Helius API key
   - Update `NEXT_PUBLIC_GATEWAY_URL` to your domain
   - Set proper recipient wallet address

2. **Use a reverse proxy** (nginx/Caddy) for HTTPS

3. **Deploy Old Faithful separately** on a dedicated server

4. **Update CORS settings** in Gateway to allow your domain

5. **Set up monitoring** with Docker health checks

## Notes

- The dashboard runs in production mode for better performance
- Old Faithful responses take 12-15 seconds due to data retrieval
- Payment transactions are broadcast but don't wait for confirmation
- All services restart automatically unless stopped manually
