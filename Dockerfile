# Single container: Next.js + Socket.IO game server (needs a persistent host with WebSockets).
FROM node:22-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

FROM base AS build
COPY package*.json ./
RUN npm ci
COPY . .
# prisma generate + next build + compile the server to a single dist/server.mjs
RUN npm run build

FROM base AS run
ENV NODE_ENV=production PORT=3000
# Keep the heap well inside small (512 MB) instances so the process is not OOM-killed.
ENV NODE_OPTIONS=--max-old-space-size=320
COPY --from=build /app /app
EXPOSE 3000
# Run node directly (no npm/tsx wrapper processes) and let it receive signals for clean shutdowns.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js db push --skip-generate && exec node dist/server.mjs"]
