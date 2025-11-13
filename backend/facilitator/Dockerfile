FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy shared types first
COPY shared/types /app/shared/types
WORKDIR /app/shared/types
RUN pnpm install && pnpm build

# Copy facilitator
WORKDIR /app/backend/facilitator
COPY backend/facilitator/package.json backend/facilitator/pnpm-lock.yaml ./
RUN pnpm install

COPY backend/facilitator .

# Build
RUN pnpm build

EXPOSE 3000

CMD ["node", "dist/index.js"]
