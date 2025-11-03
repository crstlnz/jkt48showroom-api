# Gunakan image Bun resmi
FROM oven/bun:1.3

# Set workdir di container
WORKDIR /app

# Install pnpm secara global (karena image Bun tidak include pnpm)
RUN bun install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install dependencies (production=false agar build tools juga keinstall)
RUN pnpm install --frozen-lockfile

# Copy semua source code
COPY . .

# Build project (pakai script kamu)
RUN pnpm run build

# Jalankan app (pakai Bun)
CMD ["bun", ".output/index.js"]
