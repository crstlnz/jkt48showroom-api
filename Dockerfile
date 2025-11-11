# Gunakan image Bun resmi
FROM oven/bun:1.3

# Set workdir di container
WORKDIR /app

# Install pnpm secara global (karena image Bun tidak include pnpm)
RUN bun install -g pm2

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (production=false agar build tools juga keinstall)
RUN bun install

# Copy semua source code
COPY . .

# Build project (pakai script kamu)
RUN bun run build

# Jalankan app (pakai Bun)
CMD ["pm2-runtime", "ecosystem.config.js"]
