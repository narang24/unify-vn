"""
Agent tool registry.

Modular toolset the LangGraph agent can call while investigating an incident:
  * knowledge_tools  — ML classification, RAG retrieval, historical incidents
  * observability    — metrics, Kubernetes state (real when configured)
  * github_tools     — real deployments, logs, changes, repo profile & structure
  * codegraph        — repository parsing, indexing, execution graphs
"""

from tools.knowledge_tools import (
    classify_incident,
    retrieve_repository_knowledge,
    get_similar_incidents,
)
from tools.observability import get_metrics, get_kubernetes_status
from tools.github_tools import (
    get_recent_deployments,
    get_deployment_logs,
    get_github_changes,
    get_repo_profile,
    scan_repository,
    detect_frameworks,
    analyze_repository,
    clone_repository,
)
from tools.codegraph import (
    route_analyzer,
    read_repository_files,
    read_source_file,
    parse_python_file,
    build_repository_index,
    build_execution_graph,
    find_impacted_functions,
    trace_execution_path,
    get_repository_tree,
)

# Ordered so classification comes first, then evidence-gathering tools.
tools = [
    classify_incident,
    get_recent_deployments,
    get_deployment_logs,
    get_github_changes,
    get_metrics,
    get_kubernetes_status,
    retrieve_repository_knowledge,
    get_similar_incidents,
    get_repo_profile,
    scan_repository,
    detect_frameworks,
    analyze_repository,
    clone_repository,
    route_analyzer,
    read_repository_files,
    read_source_file,
    parse_python_file,
    build_repository_index,
    build_execution_graph,
    find_impacted_functions,
    trace_execution_path,
    get_repository_tree,
]

__all__ = ["tools", "parse_python_file"]
