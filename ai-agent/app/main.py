"""
Unify Intelli — AI Incident Agent API.

  GET  /health              liveness + Redis backend status
  POST /classify            ML incident classification (fast)
  GET  /deployments         REAL deployment history for owner/repo (GitHub)
  POST /analyze             full pipeline → structured root-cause analysis + fix
  POST /investigate         enriched analysis: full panel payload incl. workflow + PR hints
  POST /pull-request/draft  generate a repo-compliant PR draft from an RCA
  POST /index               build repository memory (RAG) from a local path
  POST /index-repo          clone owner/repo and build repository memory

Run:  uvicorn app.main:app --host 0.0.0.0 --port 8088   (from the ai-agent dir)
"""

from __future__ import annotations

import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import DEFAULT_OWNER, DEFAULT_REPO, GEMINI_API_KEY, GEMINI_MODEL
from ml.predict import classify_safe
from agent.orchestrator import analyze_incident
from providers.github import list_deployments
from memory.redis_memory import memory

# Shared thread-pool so async endpoints can offload blocking work.
_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="unify-api")

app = FastAPI(title="Unify Intelli — AI Incident Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response models ────────────────────────────────────────────────

class IncidentRequest(BaseModel):
    error: str
    owner: str | None = None
    repo: str | None = None
    deployment: dict | None = None


class IndexPathRequest(BaseModel):
    repo_path: str


class IndexRepoRequest(BaseModel):
    owner: str
    repo: str


class PrDraftRequest(BaseModel):
    owner: str
    repo: str
    branch: str | None = None
    rca: dict  # the full RCA payload from /analyze or /investigate


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "Agent API running",
        "cache_backend": memory.backend_label,
        "using_redis": memory.using_redis,
    }


@app.post("/classify")
def classify_endpoint(incident: IncidentRequest):
    return classify_safe(incident.error)


@app.get("/deployments")
async def deployments(owner: str = DEFAULT_OWNER, repo: str = DEFAULT_REPO):
    """Real deployment history for a repository (GitHub Actions / Deployments API)."""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(_pool, list_deployments, owner, repo, 15)
    return {"deployments": result}


@app.post("/analyze")
async def analyze(incident: IncidentRequest):
    """Full pipeline → structured root-cause analysis + fix."""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        _pool,
        analyze_incident,
        incident.error,
        incident.owner or DEFAULT_OWNER,
        incident.repo or DEFAULT_REPO,
        incident.deployment,
    )
    return result


@app.post("/investigate")
async def investigate(incident: IncidentRequest):
    """
    Enriched investigation endpoint.
    Returns the full panel payload:
      - everything from /analyze
      - pr_template: the repo's PR template (cached in Redis)
      - contribution_guidelines: the repo's CONTRIBUTING.md (cached in Redis, possibly empty)
    """
    owner = incident.owner or DEFAULT_OWNER
    repo  = incident.repo or DEFAULT_REPO

    loop = asyncio.get_event_loop()

    # Run the full analysis pipeline and fetch repo meta in parallel.
    async def _fetch_meta():
        from tools.repo_meta_tools import get_pr_template, get_contribution_guidelines
        pr_tmpl   = await loop.run_in_executor(_pool, get_pr_template, owner, repo)
        contrib   = await loop.run_in_executor(_pool, get_contribution_guidelines, owner, repo)
        return pr_tmpl, contrib

    rca_task  = loop.run_in_executor(_pool, analyze_incident, incident.error, owner, repo, incident.deployment)
    meta_task = _fetch_meta()

    rca, (pr_template, contribution_guidelines) = await asyncio.gather(rca_task, meta_task)

    return {
        **rca,
        "pr_template": pr_template,
        "contribution_guidelines": contribution_guidelines,
    }


@app.post("/pull-request/draft")
async def pull_request_draft(req: PrDraftRequest):
    """
    Generate a repository-compliant PR draft using the repo's PR template
    and contribution guidelines (both Redis-cached).
    Returns: { title, branch, body }
    """
    loop = asyncio.get_event_loop()

    # Fetch PR template + contribution guidelines (Redis-cached, parallel).
    from tools.repo_meta_tools import get_pr_template, get_contribution_guidelines

    pr_template_task = loop.run_in_executor(_pool, get_pr_template, req.owner, req.repo)
    contrib_task     = loop.run_in_executor(_pool, get_contribution_guidelines, req.owner, req.repo)
    pr_template, contribution_guidelines = await asyncio.gather(pr_template_task, contrib_task)

    # Generate the draft body with Gemini.
    try:
        from google import genai
        from pydantic import BaseModel as PydanticBase

        class PrDraft(PydanticBase):
            title: str
            branch: str
            body: str

        client = genai.Client(api_key=GEMINI_API_KEY)

        rca = req.rca
        prompt = f"""
You are Unify Intelli, an AI engineering assistant. Generate a GitHub pull request
draft that fixes the following incident in {req.owner}/{req.repo}.

## Incident Root Cause
{rca.get('root_cause', '')}

## Explanation
{rca.get('explanation', '')}

## Suggested Fix
{rca.get('suggested_fix', '')}

## Code Change
File: {(rca.get('code_snippet') or {}).get('filename', '')}
```{(rca.get('code_snippet') or {}).get('language', '')}
{(rca.get('code_snippet') or {}).get('code', '')}
```

## Repository PR Template
{pr_template}

## Contribution Guidelines (extract only relevant constraints)
{contribution_guidelines[:2000] if contribution_guidelines else '(none found)'}

## Instructions
- Fill in the PR template sections intelligently using the incident data above.
- The `title` should be a concise conventional-commit style title (e.g. "fix: ...").
- The `branch` should follow the pattern `fix/{{category}}-{{short-slug}}` using
  the incident category: {rca.get('category', 'incident')}.
- The `body` is the completed PR template with all sections filled.
- Output valid JSON with exactly three fields: title, branch, body.
"""
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={"response_mime_type": "application/json", "response_schema": PrDraft},
        )
        draft = PrDraft.model_validate_json(response.text)
        return {"title": draft.title, "branch": draft.branch, "body": draft.body}

    except Exception as exc:  # noqa: BLE001
        # Graceful fallback — return a minimal draft.
        rca = req.rca
        cat = rca.get("category", "incident").lower().replace(" ", "-").replace("/", "-")
        fix_summary = rca.get("suggested_fix", "See code snippet.")
        fallback_body = pr_template.replace(
            "<!-- What does this PR do? -->", fix_summary
        ).replace(
            "<!-- Describe the root cause this PR fixes -->",
            rca.get("root_cause", "")
        )
        return {
            "title": f"fix: resolve {rca.get('category', 'incident')} detected by Unify Intelli",
            "branch": f"fix/{cat}",
            "body": fallback_body,
            "_error": str(exc),
        }


@app.post("/index")
async def index_path(req: IndexPathRequest):
    loop = asyncio.get_event_loop()
    from rag.pipeline import build_repository_memory

    result = await loop.run_in_executor(_pool, build_repository_memory, req.repo_path)
    return result


@app.post("/index-repo")
async def index_repo(req: IndexRepoRequest):
    """Clone a repository and build its RAG memory (continuous indexing on connect)."""
    loop = asyncio.get_event_loop()

    from rag.pipeline import build_repository_memory
    from tools.github_tools import clone_repository

    local = await loop.run_in_executor(
        _pool, lambda: clone_repository.invoke({"owner": req.owner, "repo": req.repo})
    )
    result = await loop.run_in_executor(_pool, build_repository_memory, local["local_path"])
    return {**result, "local_path": local["local_path"]}
