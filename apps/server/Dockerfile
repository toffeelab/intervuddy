FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable pnpm

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/server/ ./apps/server/

RUN pnpm install --frozen-lockfile --prod=false
RUN pnpm --filter @intervuddy/server build
RUN pnpm install --frozen-lockfile --prod

FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/packages/shared/ ./packages/shared/
COPY --from=builder /app/packages/database/ ./packages/database/
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/apps/server

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => { if (r.statusCode !== 200) throw new Error() })"

CMD ["node", "dist/main.js"]
