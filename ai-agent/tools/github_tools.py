"""GitHub-backed tools — real deployments, changes, repo profile & structure."""

import base64
import json
import os

import requests
from langchain_core.tools import tool

from config import GITHUB_API, GITHUB_TOKEN, DEFAULT_OWNER, DEFAULT_REPO
from providers.github import list_deployments, get_run_failure_logs


def _headers() -> dict:
    headers = {"Accept": "application/vnd.github+json"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


@tool
def get_recent_deployments(owner: str = DEFAULT_OWNER, repo: str = DEFAULT_REPO) -> list:
    """
    Get the repository's REAL recent deployments (GitHub Actions workflow runs /
    Deployments API), including status, commit, author, branch and timing.
    """
    return list_deployments(owner, repo, per_page=10)


@tool
def get_deployment_logs(owner: str, repo: str, run_id: str) -> str:
    """Get REAL failing job/step logs for a specific deployment (workflow run id)."""
    return get_run_failure_logs(owner, repo, run_id)


@tool
def get_github_changes(owner: str = DEFAULT_OWNER, repo: str = DEFAULT_REPO) -> str:
    """Get files changed in the latest GitHub commit."""
    commits = requests.get(f"{GITHUB_API}/repos/{owner}/{repo}/commits", headers=_headers(), timeout=20).json()
    if not commits:
        return "No commits found."
    sha = commits[0]["sha"]
    commit = requests.get(f"{GITHUB_API}/repos/{owner}/{repo}/commits/{sha}", headers=_headers(), timeout=20).json()
    files = [f["filename"] for f in commit.get("files", [])]
    return "\n".join(files) if files else "No files changed."


@tool
def get_repo_profile(owner: str = DEFAULT_OWNER, repo: str = DEFAULT_REPO) -> dict:
    """Get a high-level profile of a GitHub repository."""
    repo_data = requests.get(f"{GITHUB_API}/repos/{owner}/{repo}", headers=_headers(), timeout=20).json()
    languages = requests.get(f"{GITHUB_API}/repos/{owner}/{repo}/languages", headers=_headers(), timeout=20).json()
    return {
        "name": repo_data.get("name"),
        "description": repo_data.get("description"),
        "default_branch": repo_data.get("default_branch"),
        "stars": repo_data.get("stargazers_count"),
        "forks": repo_data.get("forks_count"),
        "primary_language": repo_data.get("language"),
        "languages": languages,
    }


@tool
def scan_repository(owner: str = DEFAULT_OWNER, repo: str = DEFAULT_REPO) -> dict:
    """Scan the repository structure and identify important files."""
    data = requests.get(
        f"{GITHUB_API}/repos/{owner}/{repo}/git/trees/HEAD?recursive=1", headers=_headers(), timeout=20
    ).json()
    tree = data.get("tree", [])

    important = {
        "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
        "requirements.txt", "pyproject.toml", "Pipfile", "pom.xml",
        "build.gradle", "Cargo.toml", "go.mod", "Dockerfile",
        "docker-compose.yml", "docker-compose.yaml", "README.md",
    }
    important_files, directories = [], set()
    for item in tree:
        path = item["path"]
        if item["type"] == "tree":
            directories.add(path)
        if path.split("/")[-1] in important:
            important_files.append(path)
    return {
        "total_files": len(tree),
        "directories": sorted(directories),
        "important_files": important_files,
    }


@tool
def detect_frameworks(owner: str = DEFAULT_OWNER, repo: str = DEFAULT_REPO) -> dict:
    """Detect frameworks and package managers used in the repository."""
    frameworks, package_managers = [], []

    pkg = requests.get(f"{GITHUB_API}/repos/{owner}/{repo}/contents/package.json", headers=_headers(), timeout=20)
    if pkg.status_code == 200:
        content = base64.b64decode(pkg.json()["content"]).decode()
        deps = {}
        parsed = json.loads(content)
        deps.update(parsed.get("dependencies", {}))
        deps.update(parsed.get("devDependencies", {}))
        for name, label in [("react", "React"), ("next", "Next.js"), ("express", "Express"), ("@nestjs/core", "NestJS")]:
            if name in deps:
                frameworks.append(label)
        package_managers.append("npm")

    reqs = requests.get(f"{GITHUB_API}/repos/{owner}/{repo}/contents/requirements.txt", headers=_headers(), timeout=20)
    if reqs.status_code == 200:
        content = base64.b64decode(reqs.json()["content"]).decode().lower()
        for name, label in [("fastapi", "FastAPI"), ("django", "Django"), ("flask", "Flask")]:
            if name in content:
                frameworks.append(label)
        package_managers.append("pip")

    return {"frameworks": frameworks, "package_managers": package_managers}


@tool
def analyze_repository(owner: str = DEFAULT_OWNER, repo: str = DEFAULT_REPO) -> dict:
    """Analyze a GitHub repository (profile + structure + frameworks)."""
    return {
        "profile": get_repo_profile.invoke({"owner": owner, "repo": repo}),
        "structure": scan_repository.invoke({"owner": owner, "repo": repo}),
        "frameworks": detect_frameworks.invoke({"owner": owner, "repo": repo}),
    }


@tool
def clone_repository(owner: str = DEFAULT_OWNER, repo: str = DEFAULT_REPO) -> dict:
    """Clone a GitHub repository locally (for parsing / execution-graph tools)."""
    from git import Repo

    local_path = f"repos/{repo}"
    if not os.path.exists(local_path):
        Repo.clone_from(f"https://github.com/{owner}/{repo}.git", local_path)
    return {"local_path": local_path}
