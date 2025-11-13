FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY frontend/dashboard/package.json frontend/dashboard/pnpm-lock.yaml ./
RUN pnpm install

# Copy source
COPY frontend/dashboard .

# Build
RUN pnpm build

# Production image
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

RUN pnpm install --prod

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

CMD ["pnpm", "start"]
