FROM oven/bun:1.3 AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile


FROM oven/bun:1.3 AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN NODE_ENV=production bun run build


FROM oven/bun:1.3-slim

WORKDIR /app

COPY --from=builder /app/.output ./.output
COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock ./

CMD ["bun", "run", "start"]