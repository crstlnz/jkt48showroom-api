# Gunakan image Bun resmi
FROM oven/bun:1.3

# Set workdir di container
WORKDIR /app

# Copy dependency files
COPY package.json bun.lockb* pnpm-lock.yaml* ./

# Install dependencies
RUN bun install

# Copy semua source code
COPY . .

# Build project
RUN bun run build

# Expose port (opsional tapi good practice)
EXPOSE 3000

# Jalankan langsung pakai Bun, tanpa PM2
CMD ["bun", ".output/index.js"]
