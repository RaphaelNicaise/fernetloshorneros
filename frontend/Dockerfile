# Development image for Next.js with hot reload
FROM node:20-alpine

WORKDIR /app

# Enable pnpm
RUN corepack enable

# Copy dependencies files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy app source (can be overridden by bind mount)
COPY . .

ENV HOST=0.0.0.0 \
    PORT=3000 \
    WATCHPACK_POLLING=true \
    WATCHPACK_POLLING_INTERVAL=1000

EXPOSE 3000

CMD ["pnpm", "dev"]
