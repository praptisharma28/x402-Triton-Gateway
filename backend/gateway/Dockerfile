FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy shared types first
COPY shared/types /app/shared/types
WORKDIR /app/shared/types
RUN pnpm install && pnpm build

# Copy gateway
WORKDIR /app/backend/gateway
COPY backend/gateway/package.json backend/gateway/pnpm-lock.yaml ./
RUN pnpm install

COPY backend/gateway .

# Build
RUN pnpm build

EXPOSE 4021

CMD ["node", "dist/index.js"]
