"""
Unify Intelli — AI Incident Agent API.

  GET  /health              liveness
  POST /classify            ML incident classification (fast)
  GET  /deployments         REAL deployment history for owner/repo (GitHub)
  POST /analyze             full pipeline → structured root-cause analysis + fix
  POST /index               build repository memory (RAG) from a local path
  POST /index-repo          clone owner/repo and build repository memory

Run:  uvicorn app.main:app --host 0.0.0.0 --port 8088   (from the ai-agent dir)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import DEFAULT_OWNER, DEFAULT_REPO
from ml.predict import classify_safe
from agent.orchestrator import analyze_incident
from providers.github import list_deployments

app = FastAPI(title="Unify Intelli — AI Incident Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/health")
def health():
    return {"status": "Agent API running"}


@app.post("/classify")
def classify_endpoint(incident: IncidentRequest):
    return classify_safe(incident.error)


@app.get("/deployments")
def deployments(owner: str = DEFAULT_OWNER, repo: str = DEFAULT_REPO):
    """Real deployment history for a repository (GitHub Actions / Deployments API)."""
    return {"deployments": list_deployments(owner, repo, per_page=15)}


@app.post("/analyze")
def analyze(incident: IncidentRequest):
    return analyze_incident(
        incident.error,
        owner=incident.owner or DEFAULT_OWNER,
        repo=incident.repo or DEFAULT_REPO,
        deployment=incident.deployment,
    )


@app.post("/index")
def index_path(req: IndexPathRequest):
    from rag.pipeline import build_repository_memory

    return build_repository_memory(req.repo_path)


@app.post("/index-repo")
def index_repo(req: IndexRepoRequest):
    """Clone a repository and build its RAG memory (continuous indexing on connect)."""
    from rag.pipeline import build_repository_memory
    from tools.github_tools import clone_repository

    local = clone_repository.invoke({"owner": req.owner, "repo": req.repo})
    result = build_repository_memory(local["local_path"])
    return {**result, "local_path": local["local_path"]}
