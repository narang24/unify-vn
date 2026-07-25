"""
Repo metadata tools — fetch and Redis-cache PR templates and contribution
guidelines so they are only downloaded from GitHub once per 24 hours.
"""

from __future__ import annotations

import base64

import requests

from config import GITHUB_API, GITHUB_TOKEN
from memory.redis_memory import memory


def _headers() -> dict:
    h = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if GITHUB_TOKEN:
        h["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return h


def _fetch_file(owner: str, repo: str, path: str) -> str | None:
    """Return decoded file content from GitHub, or None if not found."""
    try:
        url = f"{GITHUB_API}/repos/{owner}/{repo}/contents/{path}"
        resp = requests.get(url, headers=_headers(), timeout=15)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, dict) and data.get("encoding") == "base64":
            return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
        return None
    except Exception as exc:  # noqa: BLE001
        print(f"[repo_meta] could not fetch {owner}/{repo}/{path}: {exc}")
        return None


def get_pr_template(owner: str, repo: str) -> str:
    """
    Return the repository's PR template text (Redis-cached 24 h).
    Checks the common locations GitHub supports:
      .github/PULL_REQUEST_TEMPLATE.md
      PULL_REQUEST_TEMPLATE.md
      docs/PULL_REQUEST_TEMPLATE.md
    Falls back to a minimal generic template if none is found.
    """
    cached = memory.get_pr_template(owner, repo)
    if cached:
        return cached

    candidates = [
        ".github/PULL_REQUEST_TEMPLATE.md",
        ".github/pull_request_template.md",
        "PULL_REQUEST_TEMPLATE.md",
        "docs/PULL_REQUEST_TEMPLATE.md",
    ]
    text: str | None = None
    for path in candidates:
        text = _fetch_file(owner, repo, path)
        if text:
            break

    if not text:
        text = (
            "## Summary\n\n<!-- What does this PR do? -->\n\n"
            "## Root Cause\n\n<!-- Describe the root cause this PR fixes -->\n\n"
            "## Changes\n\n<!-- List the key changes -->\n\n"
            "## Testing\n\n<!-- How was this tested? -->\n"
        )

    memory.set_pr_template(owner, repo, text)
    return text


def get_contribution_guidelines(owner: str, repo: str) -> str:
    """
    Return the repo's contribution guidelines (Redis-cached 24 h).
    Falls back to an empty string when not found.
    """
    cached = memory.get_contribution_guidelines(owner, repo)
    if cached is not None:
        return cached

    candidates = [
        "CONTRIBUTING.md",
        ".github/CONTRIBUTING.md",
        "docs/CONTRIBUTING.md",
    ]
    text: str | None = None
    for path in candidates:
        text = _fetch_file(owner, repo, path)
        if text:
            break

    result = text or ""
    memory.set_contribution_guidelines(owner, repo, result)
    return result
