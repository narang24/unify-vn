"""
Real GitHub provider.

Pulls *actual* deployment history from a repository using the GitHub REST API:
  * GitHub Actions workflow runs (CI/CD pipelines) — primary source
  * GitHub Deployments API + statuses — secondary source

and the failing-step logs for a run, so the agent reasons about real failures
instead of dummy data. Everything degrades gracefully (empty list / message) if
the token is missing or the API is unreachable.
"""

from __future__ import annotations

from datetime import datetime

import requests

from config import GITHUB_API, GITHUB_TOKEN

# GitHub run conclusion/status → Unify deployment status
_STATUS_MAP = {
    "success": "success",
    "failure": "failed",
    "startup_failure": "crashed",
    "cancelled": "rolled_back",
    "timed_out": "failed",
    "action_required": "failed",
    "stale": "rolled_back",
    "neutral": "success",
    "skipped": "rolled_back",
    "in_progress": "deploying",
    "queued": "queued",
    "waiting": "queued",
    "requested": "queued",
    "pending": "queued",
}


def _headers() -> dict:
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
    return headers


def _get(url: str, params: dict | None = None):
    resp = requests.get(url, headers=_headers(), params=params, timeout=20)
    resp.raise_for_status()
    return resp.json()


def _duration_seconds(start: str | None, end: str | None) -> int | None:
    if not start or not end:
        return None
    try:
        fmt = "%Y-%m-%dT%H:%M:%SZ"
        return int((datetime.strptime(end, fmt) - datetime.strptime(start, fmt)).total_seconds())
    except Exception:
        return None


def _map_run(run: dict) -> dict:
    conclusion = run.get("conclusion") or run.get("status") or "queued"
    head_commit = run.get("head_commit") or {}
    actor = run.get("actor") or {}
    return {
        "external_id": str(run.get("id")),
        "environment": "production",
        "status": _STATUS_MAP.get(conclusion, "queued"),
        "commit_sha": (run.get("head_sha") or "")[:7],
        "commit_message": (head_commit.get("message") or run.get("display_title") or "").split("\n")[0],
        "branch": run.get("head_branch"),
        "author": actor.get("login") or (head_commit.get("author") or {}).get("name"),
        "version": f"#{run.get('run_number')}" if run.get("run_number") else None,
        "duration_sec": _duration_seconds(run.get("run_started_at"), run.get("updated_at")),
        "logs_url": run.get("html_url"),
        "triggered_at": run.get("run_started_at") or run.get("created_at"),
        "raw": {
            "workflow": run.get("name"),
            "event": run.get("event"),
            "conclusion": conclusion,
            "run_id": run.get("id"),
        },
    }


def list_workflow_runs(owner: str, repo: str, per_page: int = 20) -> list[dict]:
    data = _get(f"{GITHUB_API}/repos/{owner}/{repo}/actions/runs", {"per_page": per_page})
    return [_map_run(run) for run in data.get("workflow_runs", [])]


def list_github_deployments(owner: str, repo: str, per_page: int = 20) -> list[dict]:
    deployments = _get(f"{GITHUB_API}/repos/{owner}/{repo}/deployments", {"per_page": per_page})
    result = []
    for dep in deployments:
        state = "queued"
        try:
            statuses = _get(dep["statuses_url"])
            if statuses:
                state = statuses[0].get("state", "queued")
        except Exception:
            pass
        result.append(
            {
                "external_id": str(dep.get("id")),
                "environment": dep.get("environment", "production"),
                "status": _STATUS_MAP.get(state, "queued"),
                "commit_sha": (dep.get("sha") or "")[:7],
                "commit_message": dep.get("description") or "",
                "branch": dep.get("ref"),
                "author": (dep.get("creator") or {}).get("login"),
                "version": None,
                "duration_sec": None,
                "logs_url": None,
                "triggered_at": dep.get("created_at"),
                "raw": {"deployment_id": dep.get("id"), "state": state},
            }
        )
    return result


def list_deployments(owner: str, repo: str, per_page: int = 20) -> list[dict]:
    """
    Return the repository's real deployment history. Prefers Actions workflow
    runs (which most teams use for deploys); falls back to the Deployments API.
    """
    try:
        runs = list_workflow_runs(owner, repo, per_page)
        if runs:
            return runs
    except Exception as exc:  # noqa: BLE001
        print(f"[github] workflow runs unavailable: {exc}")

    try:
        return list_github_deployments(owner, repo, per_page)
    except Exception as exc:  # noqa: BLE001
        print(f"[github] deployments unavailable: {exc}")
        return []


def get_run_failure_logs(owner: str, repo: str, run_id: str) -> str:
    """Extract real failing job/step names for a workflow run."""
    try:
        data = _get(f"{GITHUB_API}/repos/{owner}/{repo}/actions/runs/{run_id}/jobs")
    except Exception as exc:  # noqa: BLE001
        return f"Logs unavailable: {exc}"

    lines: list[str] = []
    for job in data.get("jobs", []):
        if job.get("conclusion") in (None, "success", "skipped"):
            continue
        lines.append(f"JOB {job.get('name')} → {job.get('conclusion')}")
        for step in job.get("steps", []):
            if step.get("conclusion") in ("failure", "cancelled", "timed_out"):
                lines.append(f"  ✗ step: {step.get('name')} ({step.get('conclusion')})")
    return "\n".join(lines) if lines else "No failing steps found in the latest run."
