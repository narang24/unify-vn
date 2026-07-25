"""
Incident-analysis orchestrator — the proactive AI engineering assistant.

Pipeline (now parallelised for low latency):
  1. ML classification FIRST          ── ml.predict.classify_safe
  2. Redis cache lookup               ── memory.redis_memory  (returns immediately on hit)
  3. PARALLEL:
       a. Enrich with real deploy logs ── providers.github (when run id given)
       b. RAG repository memory        ── rag.retriever
       c. Historical incident memory   ── memory.similar_incidents
  4. Tool-driven investigation        ── agent.graph (LangGraph, real tools)
  5. Structured root-cause analysis + fix + workflow
  6. Persist resolved incident + cache in Redis

Every external dependency degrades gracefully so a result is always returned.
"""

from __future__ import annotations

import hashlib
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from config import DEFAULT_OWNER, DEFAULT_REPO, GEMINI_API_KEY, GEMINI_MODEL
from ml.predict import classify_safe
from rag.retriever import retrieve_text
from memory.redis_memory import memory

# Shared executor for parallelising blocking IO inside async-safe calls.
_executor = ThreadPoolExecutor(max_workers=8, thread_name_prefix="unify-agent")


def _cache_key(incident: str, owner: str, repo: str) -> str:
    return "rca:" + hashlib.sha1(f"{owner}/{repo}:{incident}".encode()).hexdigest()


def _enrich_with_real_logs(incident: str, owner: str, repo: str, deployment: dict | None) -> str:
    """Append real failing-step logs from GitHub Actions when a run id is available."""
    if not deployment:
        return incident
    run_id = deployment.get("external_id") or (deployment.get("raw") or {}).get("run_id")
    if not run_id:
        return incident
    try:
        from providers.github import get_run_failure_logs

        logs = get_run_failure_logs(owner, repo, str(run_id))
        if logs:
            return f"{incident}\n\nReal deployment logs:\n{logs}"
    except Exception as exc:  # noqa: BLE001
        print(f"[agent] real logs unavailable: {exc}")
    return incident


def _run_graph_investigation(incident: str, owner: str, repo: str, classification: dict, retrieved: str):
    from langchain_core.messages import HumanMessage

    from agent.graph import graph

    prompt = f"""
An incident/deployment failure occurred in {owner}/{repo}.

Incident:
{incident}

Predicted category (ML): {classification.get('category')} (confidence {classification.get('confidence')})

Investigate using the available tools (real deployments, logs, GitHub changes,
repository structure, execution paths, similar incidents), then give a final
root-cause analysis with a concrete fix and a code snippet.
"""
    result = graph.invoke(
        {
            "messages": [HumanMessage(content=prompt)],
            "context": {"incident": incident, "owner": owner, "repo": repo},
            "classification": classification,
            "retrieved": retrieved,
            "artifacts": {},
            "observations": [],
        },
        config={"configurable": {"thread_id": _cache_key(incident, owner, repo)}},
    )
    messages = result.get("messages", [])
    final_text = messages[-1].content if messages else ""
    observations = result.get("observations", [])
    tools_used = sorted({o.split()[0] for o in observations})
    return final_text, tools_used


def _structured_rca(incident: str, classification: dict, retrieved: str, investigation: str) -> dict | None:
    try:
        from google import genai
        from pydantic import BaseModel

        class CodeSnippet(BaseModel):
            filename: str
            language: str
            code: str

        class WorkflowStep(BaseModel):
            step: int
            label: str
            detail: str

        class RCA(BaseModel):
            problem: str
            likely_cause: str
            explanation: str
            suggested_fix: str
            code_snippet: CodeSnippet
            workflow: list[WorkflowStep]
            confidence: float

        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = f"""
You are Unify Intelli. Produce a root-cause analysis as JSON.

Incident:
{incident}

ML classification: {classification}

Retrieved repository knowledge:
{retrieved}

Investigation notes from tools:
{investigation}

For the `workflow` field, produce an ordered list of investigation steps that were
logically taken to reach this root cause (3-6 steps). Each step has:
  step: sequential number (1-based)
  label: short action name (e.g. "ML classification", "Log analysis", "Code diff review")
  detail: one sentence describing what was found or confirmed at this step
"""
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={"response_mime_type": "application/json", "response_schema": RCA},
        )
        return RCA.model_validate_json(response.text).model_dump()
    except Exception as exc:  # noqa: BLE001
        print(f"[agent] structured synthesis unavailable: {exc}")
        return None


def _build_fallback_workflow(tools_used: list[str]) -> list[dict]:
    """Generate a basic workflow list when Gemini structured synthesis fails."""
    steps = []
    label_map = {
        "classify_incident": "ML incident classification",
        "get_logs": "Application log analysis",
        "get_metrics": "Runtime metrics review",
        "get_kubernetes_status": "Kubernetes state check",
        "get_recent_deployments": "Recent deployment correlation",
        "get_github_changes": "GitHub diff review",
        "scan_repository": "Repository structure scan",
        "build_execution_graph": "Execution path trace",
        "retrieve_repository_knowledge": "RAG repository knowledge retrieval",
        "get_similar_incidents": "Historical incident matching",
    }
    for i, tool in enumerate(tools_used, 1):
        steps.append({
            "step": i,
            "label": label_map.get(tool, tool.replace("_", " ").title()),
            "detail": f"Executed {tool} to gather evidence.",
        })
    return steps or [{"step": 1, "label": "Classification", "detail": "Incident classified by ML model."}]


def analyze_incident(
    incident: str,
    owner: str = DEFAULT_OWNER,
    repo: str = DEFAULT_REPO,
    deployment: dict | None = None,
) -> dict:
    # ── 1. Fast ML classification ─────────────────────────────────────────
    classification = classify_safe(incident)

    # ── 2. Redis cache hit? ───────────────────────────────────────────────
    key = _cache_key(incident, owner, repo)
    cached = memory.cache_get(key)
    if cached:
        return {**cached, "cached": True}

    # ── 3. Parallel enrichment ────────────────────────────────────────────
    t_start = time.monotonic()

    futures: dict[str, Any] = {}
    with ThreadPoolExecutor(max_workers=4, thread_name_prefix="unify-enrich") as pool:
        futures["logs"] = pool.submit(_enrich_with_real_logs, incident, owner, repo, deployment)
        futures["rag"]  = pool.submit(retrieve_text, f"{incident} {classification['category']}")
        futures["similar"] = pool.submit(memory.similar_incidents, incident, 3)

    enriched_incident = futures["logs"].result()
    retrieved         = futures["rag"].result()
    similar           = futures["similar"].result()

    # ── 4. LangGraph investigation (may be slow — runs after enrichment) ──
    investigation, tools_used = "", []
    try:
        investigation, tools_used = _run_graph_investigation(
            enriched_incident, owner, repo, classification, retrieved
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[agent] investigation unavailable: {exc}")

    # ── 5. Structured RCA via Gemini ──────────────────────────────────────
    rca = _structured_rca(enriched_incident, classification, retrieved, investigation)
    rag_grounded = bool(retrieved) and "not indexed" not in retrieved

    elapsed_ms = round((time.monotonic() - t_start) * 1000)

    # Build the workflow (from RCA or fallback)
    workflow = (rca["workflow"] if rca else None) or _build_fallback_workflow(tools_used)

    result = {
        "problem":        rca["problem"] if rca else f"{classification['category']}: {incident[:120]}",
        "category":       classification["category"],
        "classification": classification,
        "confidence":     rca["confidence"] if rca else classification["confidence"],
        "root_cause":     rca["likely_cause"] if rca else (investigation or "Root cause pending deeper analysis."),
        "explanation":    rca["explanation"] if rca else investigation,
        "suggested_fix":  rca["suggested_fix"] if rca else "Review the highlighted change and revert or guard it.",
        "code_snippet":   rca["code_snippet"] if rca else None,
        "workflow":       workflow,
        "tools_used":     tools_used or ["classify_incident", "retrieve_repository_knowledge", "get_similar_incidents"],
        "similar_incidents": similar,
        "rag_grounded":   rag_grounded,
        "elapsed_ms":     elapsed_ms,
    }

    memory.remember_incident(
        {
            "incident":     enriched_incident,
            "category":     classification["category"],
            "root_cause":   result["root_cause"],
            "suggested_fix": result["suggested_fix"],
            "owner":        owner,
            "repo":         repo,
        }
    )
    memory.cache_set(key, result, ttl_seconds=1800)
    return result
