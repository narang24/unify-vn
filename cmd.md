# Unify — Build & Production-Readiness Command Reference

Copy-pasteable commands to verify the frontend and backend build cleanly and
are ready to deploy. Uses only scripts that actually exist in
`backend/package.json` and `frontend/package.json`, plus the project's
existing Docker / Jenkins / k8s conventions.

---

## Prerequisites

- Node.js 20.x (Docker images use `node:20-alpine`; local dev tested on Node 22 too)
- PostgreSQL reachable (local dev default: `postgresql://unify:unify_dev_pass@localhost:5432/unify_dev`)
- Redis reachable (local dev default: `redis://localhost:6379/0`)
- `backend/.env.development` and `backend/.env.production` populated (see `backend/.env.example`)
- `frontend/.env.development` and `frontend/.env.production` populated (see `frontend/.env.example`)
- SMTP credentials set for real invitation email delivery (SMTP_HOST empty = emails no-op/log locally)
- Google / GitHub / GitLab OAuth apps registered, with client ID/secret in `backend/.env.*` only (not needed in frontend)

```bash
node -v      # expect v20.x (or compatible)
npm -v
```

---

## Backend (`backend/`)

### Install

```bash
cd backend
npm ci        # or: npm install
```

### Typecheck

```bash
npm run typecheck     # tsc -p tsconfig.json --noEmit
```

### Build

```bash
npm run build         # tsc -p tsconfig.build.json -> dist/
```

### Lint

No lint script is defined in `backend/package.json` — there is currently no
backend lint step to run.

### Database — Drizzle ORM migrations

```bash
npm run db:generate   # drizzle-kit generate  (creates a new migration + snapshot from schema changes)
npm run db:push       # drizzle-kit push       (dev-only: push schema directly, skips migration files)
npm run db:migrate    # drizzle-kit migrate    (apply pending migrations in backend/drizzle/ to DATABASE_URL)
npm run db:studio     # drizzle-kit studio     (browse DB in Drizzle Studio)
```

> **Outstanding:** migration `0004_salty_inhumans.sql` (teams / team_members /
> notifications tables) has been generated but **not yet applied** — Postgres
> was unreachable in the validation sandbox. Run `npm run db:migrate` against
> a live database before deploying.
>
> **Also flagged:** `backend/drizzle/meta/` is missing `0003_snapshot.json`
> (only 0000, 0001, 0002, 0004 exist). Verify `0004`'s snapshot was diffed
> against the correct prior schema state before relying on `db:generate` again
> — consider regenerating from a clean `db:push`'d reference DB if in doubt.

### Run — development (all three services)

```bash
npm run dev:all       # gateway :8000, auth :8001 (AUTH_PORT), workspace :8002 concurrently
# or individually:
npm run dev:gateway
npm run dev:auth
npm run dev:workspace
```

### Run — production (after `npm run build`)

```bash
npm run start:full    # concurrently starts gateway, auth, workspace from dist/
# or individually:
npm run start:gateway     # node dist/src/index.js
npm run start:auth        # node dist/services/auth/src/index.js
npm run start:workspace   # node dist/services/workspace/src/index.js
```

### Health-check curl commands

```bash
curl -s http://localhost:8000/health | jq   # gateway (aggregates upstream URLs)
curl -s http://localhost:8001/health | jq   # auth service
curl -s http://localhost:8002/health | jq   # workspace service
```

---

## Frontend (`frontend/`)

### Install

```bash
cd frontend
npm ci        # or: npm install
```

### Typecheck

No `typecheck` script exists in `frontend/package.json`. Run directly:

```bash
npx tsc --noEmit
```

### Lint

```bash
npm run lint    # eslint
```

### Build

```bash
npm run build   # next build
```

### Start (production, after build)

```bash
npm run start   # next start (default port 3000)
```

> **Environment note:** this repo was developed on Windows, so
> `node_modules/@next` currently contains `@next/swc-win32-x64-msvc` and not a
> Linux SWC binary. In a Linux CI/sandbox without npm registry access,
> `npm run build` / `npm run lint` / `npx tsc --noEmit` may hang or fail
> purely because the platform-specific native binary can't be
> installed/fetched — reinstall `node_modules` on the target OS (or run in the
> Linux Docker image below, which does a fresh `npm ci` and pulls the correct
> binary) rather than treating this as a code defect.

---

## Docker

Mirrors `backend/Dockerfile`, `frontend/Dockerfile`, and the Jenkinsfile's own
build commands exactly.

```bash
# Backend (single shared image; SERVICE env var selects gateway/auth/workspace at runtime)
docker build -f backend/Dockerfile -t unify-backend backend

# Frontend (NEXT_PUBLIC_* build args are inlined at build time)
docker build -f frontend/Dockerfile -t unify-frontend frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://api.unify.example \
  --build-arg NEXT_PUBLIC_FRONTEND_URL=https://app.unify.example \
  --build-arg NEXT_PUBLIC_APP_NAME=Unify \
  --build-arg NEXT_PUBLIC_APP_ENV=production

# AI agent (FastAPI, /ai-agent)
docker build -t unify-ai-agent ai-agent
```

## Kubernetes (`k8s/`)

```bash
kubectl apply -R -f k8s/

kubectl rollout restart deployment/frontend -n unify
kubectl rollout restart deployment/gateway -n unify
kubectl rollout restart deployment/auth -n unify
kubectl rollout restart deployment/workspace -n unify
kubectl rollout restart deployment/ai-agent -n unify
```

> **Gap to fix:** `k8s/configmap.yaml` / `k8s/secrets.yaml` do not yet define
> `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM`.
> Add these (SMTP_PASSWORD in `secrets.yaml`, the rest in `configmap.yaml`)
> before deploying the invitation-email feature to the cluster.

## CI (Jenkinsfile, repo root)

The existing pipeline (stages: Checkout → Build Frontend → Build Backend →
Build AI Agent → Login to ECR → Push Images → Deploy) runs exactly:

```bash
docker build -t $FRONTEND_IMAGE:latest ./frontend
docker build -t $BACKEND_IMAGE:latest ./backend
docker build -t $AI_IMAGE:latest ./ai-agent

aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

docker push $FRONTEND_IMAGE:latest
docker push $BACKEND_IMAGE:latest
docker push $AI_IMAGE:latest

kubectl apply -R -f k8s/
kubectl rollout restart deployment/frontend -n unify
kubectl rollout restart deployment/gateway -n unify
kubectl rollout restart deployment/auth -n unify
kubectl rollout restart deployment/workspace -n unify
kubectl rollout restart deployment/ai-agent -n unify
```

Note: the Jenkins pipeline does **not** currently run `npm run typecheck`,
`npm run build` (backend), `npm run lint`, or `npx tsc --noEmit` (frontend)
as a gate before the Docker build stages — it goes straight to
`docker build`, which will fail the whole pipeline if TypeScript errors
exist. Consider adding explicit typecheck/build/lint stages before the
Docker stages so failures surface with clearer errors sooner.

---

## Combined Production Verification Checklist

- [ ] `backend/.env.production` populated with real values (no placeholder
      `YOUR_RDS_*` / `replace-this-in-production*` strings left)
- [ ] `frontend/.env.production` populated (`NEXT_PUBLIC_API_URL`,
      `NEXT_PUBLIC_FRONTEND_URL` point at real deployed origins)
- [ ] `JWT_SECRET` / `SESSION_SECRET` are strong random values, unique per
      environment, and different from the dev/k8s-template values
- [ ] PostgreSQL reachable at `DATABASE_URL`; run `npm run db:migrate`
      (backend) against it — confirm migration `0004` (teams/team_members/
      notifications) is applied
- [ ] Redis reachable at `REDIS_URL`
- [ ] SMTP configured (`SMTP_HOST/PORT/USER/PASSWORD/FROM`) and a real test
      invitation email sends successfully
- [ ] Google / GitHub / GitLab OAuth apps registered with production
      callback URLs matching `FRONTEND_URL` / gateway domain
- [ ] `FRONTEND_URL` (backend) and `NEXT_PUBLIC_FRONTEND_URL` (frontend)
      match exactly — the gateway's CORS check in `backend/src/index.ts` and
      the auth service's CORS check in `backend/services/auth/src/index.ts`
      both do exact-origin matching in production (no wildcard)
- [ ] `k8s/configmap.yaml` and `k8s/secrets.yaml` updated with SMTP vars
      (currently missing) and real OAuth secrets before `kubectl apply`
- [ ] `backend/drizzle/meta/` snapshot sequence verified consistent
      (0003 snapshot currently missing — confirm before generating further
      migrations)
- [ ] `npm run typecheck` and `npm run build` pass in `backend/`
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` pass in `frontend/`
      on the actual target OS/architecture (not just this Windows-authored,
      Linux-sandbox-validated repo — rebuild `node_modules` per-platform)
- [ ] All three backend health endpoints return 200:
      `/health` on :8000 (gateway), :8001 (auth), :8002 (workspace)
