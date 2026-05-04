FROM oven/bun:1.3.1-alpine AS base
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

COPY src/ ./src/
COPY tsconfig.json ./

RUN bun run build

FROM oven/bun:1.3.1-alpine AS production
WORKDIR /app

COPY --from=base /app/.output ./.output

EXPOSE 3000
CMD ["bun", "run", "dist/index.js"]