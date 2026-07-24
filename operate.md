# Operating Unify

How to run and inspect every part of the stack: **`/frontend`** (Next.js),
**`/backend`** (Node microservices + PostgreSQL + Redis), and **`/ai-agent`**
(Python FastAPI incident agent).

---

## 1. Services & ports

| Service              | Location      | Port   | Notes                                        |
|----------------------|---------------|--------|----------------------------------------------|
| Frontend (Next.js)   | `frontend/`   | `3000` | Talks only to the gateway on `8000`.         |
| API Gateway          | `backend/src` | `8000` | Single entry point → proxies to auth/workspace. |
| Auth service         | `backend/services/auth` | `8001` | Sign-in/up, OAuth, JWT + refresh tokens.     |
| Workspace service    | `backend/services/workspace` | `8002` | Workspaces, spaces, work-items, repos, deployments, incidents, GitHub proxy, prefs. |
| AI Incident Agent    | `ai-agent/`   | `8088` | FastAPI — classify / analyze / deployments.  |
| PostgreSQL           | external      | `5432` | Primary datastore.                           |
| Redis                | external      | `6379` | Cache, sessions, prefs (optional — falls back to in-memory). |

---

## 2. Environment variables

### `backend/.env.development`
```bash
NODE_ENV=development
GATEWAY_PORT=8000
PORT=8001                 # auth service
WORKSPACE_PORT=8002
FRONTEND_URL=http://localhost:3000
API_PREFIX=/api/v1

# ── Database (required) ──
DATABASE_URL=postgresql://unify:unify_dev_pass@localhost:5432/unify_dev

# ── Auth ──
JWT_SECRET=dev-only-secret-change-in-prod
SESSION_SECRET=dev-session-secret-change-in-prod

# ── Redis (optional; in-memory fallback if unset/unreachable) ──
REDIS_URL=redis://localhost:6379

# ── OAuth (GitHub token is captured on login → token-free repo browsing) ──
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITLAB_CLIENT_ID=...
GITLAB_CLIENT_SECRET=...

# ── AI agent ──
AI_AGENT_URL=http://localhost:8088
```

### `frontend/.env.development`
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000   # the gateway
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

### `ai-agent/.env`
```bash
GEMINI_API_KEY=your-gemini-api-key
GITHUB_TOKEN=token-with-actions-and-deployments-read   # for real deployments
GEMINI_MODEL=gemini-3.5-flash
REPO_OWNER=narang24
REPO_NAME=TravelStory-VN
AI_AGENT_PORT=8088
REDIS_URL=redis://localhost:6379/0          # optional
PROMETHEUS_URL=                             # optional
KUBE_API_URL=                               # optional
```

> **`DATABASE_URL`** is the single most important variable — the backend refuses
> to start without a reachable PostgreSQL at this URL.

---

## 3. PostgreSQL

### Start PostgreSQL
```bash
# Docker (quickest)
docker run --name unify-pg -e POSTGRES_USER=unify -e POSTGRES_PASSWORD=unify_dev_pass \
  -e POSTGRES_DB=unify_dev -p 5432:5432 -d postgres:16

# macOS (Homebrew)
brew services start postgresql@16

# Linux
sudo service postgresql start
```

### Create the tables (migrations)
```bash
cd backend
npm install
npm run db:push        # apply the schema directly (dev)
# or, using generated SQL migrations in backend/drizzle/:
npm run db:migrate
```

### View the tables
```bash
# Option A — Drizzle Studio (visual browser at https://local.drizzle.studio)
cd backend && npm run db:studio

# Option B — psql
psql "$DATABASE_URL"
\dt                    # list all tables
\d+ work_items         # describe a table
SELECT * FROM workspaces;
SELECT * FROM spaces;
SELECT * FROM work_items;
SELECT * FROM repositories;
SELECT * FROM deployments;
SELECT * FROM incidents;
```

Tables: `users`, `refresh_tokens`, `workspaces`, `spaces`, `sprints`,
`work_items`, `repositories`, `deployments`, `incidents`.

---

## 4. Redis

Used for caching (GitHub API responses, user lookups), session-adjacent data and
per-user preferences (Recents / Starred). The app runs **without** it (in-memory
fallback), but Redis is recommended for performance.

### Start Redis
```bash
# Docker
docker run --name unify-redis -p 6379:6379 -d redis:7

# macOS
brew services start redis

# Linux
sudo service redis-server start

# Verify
redis-cli ping        # → PONG
redis-cli keys 'unify:*'
```

---

## 5. Run the stack

Open three terminals (or use a process manager).

### Backend (gateway + auth + workspace)
```bash
cd backend
npm install
npm run db:push          # first time only
npm run dev:full         # starts gateway :8000, auth :8001, workspace :8002
```

### AI Incident Agent
```bash
cd ai-agent
python -m venv .venv && source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m ml.train                                   # trains the classifier once
cp .env.example .env                                 # fill GEMINI_API_KEY + GITHUB_TOKEN
uvicorn app.main:app --host 0.0.0.0 --port 8088
```

### Frontend
```bash
cd frontend
npm install
npm run dev              # http://localhost:3000
```

Then open **http://localhost:3000**.

---

## 6. Quick health checks

```bash
curl http://localhost:8000/health     # gateway
curl http://localhost:8001/health     # auth
curl http://localhost:8002/health     # workspace
curl http://localhost:8088/health     # ai-agent
redis-cli ping                        # redis
psql "$DATABASE_URL" -c '\dt'         # postgres tables
```

---

## 7. Notes

- **GitHub browsing is token-free**: signing in with GitHub captures an OAuth
  token (scope `repo`, `read:user`) that the backend uses to serve code, issues,
  PRs, branches and commits — no PATs or webhooks to configure.
- **Deployments are real**: the workspace service asks the AI agent, which reads
  GitHub Actions runs / the Deployments API. Failed deployments auto-trigger an
  incident analysis.
- If Redis, the AI agent, or GitHub aren't available, features degrade
  gracefully (in-memory cache, sample data) rather than erroring.
