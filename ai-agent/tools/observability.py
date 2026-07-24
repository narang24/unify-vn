"""
Observability tools — metrics, Kubernetes state, runtime logs.

These are honest integration points: when a real endpoint is configured
(PROMETHEUS_URL / KUBE_API_URL) they query it; otherwise they return a clear
"not configured" message rather than fabricated data. Real deployment logs come
from GitHub Actions via tools.github_tools.get_deployment_logs.
"""

import requests
from langchain_core.tools import tool

from config import PROMETHEUS_URL, KUBE_API_URL


@tool
def get_metrics(query: str = "up") -> str:
    """
    Query runtime metrics from Prometheus (CPU, memory, latency, error rate).
    Requires PROMETHEUS_URL to be configured.
    """
    if not PROMETHEUS_URL:
        return "Metrics integration not configured (set PROMETHEUS_URL to enable real metrics)."
    try:
        resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query}, timeout=15)
        resp.raise_for_status()
        return str(resp.json().get("data", {}).get("result", []))
    except Exception as exc:  # noqa: BLE001
        return f"Metrics unavailable: {exc}"


@tool
def get_kubernetes_status(namespace: str = "default") -> str:
    """
    Get Kubernetes pod status for a namespace. Requires KUBE_API_URL configured.
    """
    if not KUBE_API_URL:
        return "Kubernetes integration not configured (set KUBE_API_URL to enable real pod status)."
    try:
        resp = requests.get(f"{KUBE_API_URL}/api/v1/namespaces/{namespace}/pods", timeout=15)
        resp.raise_for_status()
        pods = resp.json().get("items", [])
        return "\n".join(
            f"{p['metadata']['name']}: {p.get('status', {}).get('phase', 'Unknown')}" for p in pods
        ) or "No pods found."
    except Exception as exc:  # noqa: BLE001
        return f"Kubernetes status unavailable: {exc}"
