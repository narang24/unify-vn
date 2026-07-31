# backend/Dockerfile
# Shared image for all three Node services (gateway :8000, auth :8001,
# workspace :8002) since they share one package.json / tsconfig and are
# just different entrypoints under dist/. Build context is `backend/`:
#   docker build -f backend/Dockerfile -t unify-backend backend
#
# At deploy time, pick which service the container runs via the SERVICE
# env var (gateway | auth | workspace) — see the CMD script at the bottom.
# This means CI only builds ONE image and k8s Deployments just set a
# different `env: SERVICE=...` per Deployment, instead of building three
# separate images.

# ── 1. deps (full, incl. dev deps for the TypeScript build) ───────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── 2. build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# → produces dist/src/index.js, dist/services/auth/src/index.js,
#   dist/services/workspace/src/index.js

# ── 3. production deps only ────────────────────────────────────────────
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ── 4. runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs && adduser -S backend -u 1001

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
# Needed at runtime for `npm run db:migrate:prod` (drizzle-kit reads the
# config + SQL migration files directly, not from the compiled dist/).
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/drizzle ./drizzle

# # Default service if none is specified at `docker run` / k8s env.
# ENV SERVICE=gateway

USER backend

# Expose all three possible ports; only one is actually bound per container.
EXPOSE 8000 8001 8002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.SERVICE==='auth'?8001:process.env.SERVICE==='workspace'?8002:8000)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Select the entrypoint based on $SERVICE at container start.
# CMD ["sh", "-c", "\
#   case \"$SERVICE\" in \
#     auth) exec node dist/services/auth/src/index.js ;; \
#     workspace) exec node dist/services/workspace/src/index.js ;; \
#     gateway|*) exec node dist/src/index.js ;; \
#   esac"]

CMD ["sh", "-c", "npm run db:migrate:prod && npm run start:full"]