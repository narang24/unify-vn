from langchain_core.tools import tool
import os
import requests
from dotenv import load_dotenv
from git import Repo
import ast
from pathlib import Path
from collections import deque
from repository.tree_parser import build_repository_tree, repository_tree

load_dotenv()

headers = {
    "Authorization": f"Bearer {os.getenv('GITHUB_TOKEN')}"
}

OWNER = "narang24"
REPO = "TravelStory-VN"

@tool
def get_logs() -> str:
    """Get recent application error logs."""
    return """
10:01 ERROR Database connection failed
10:02 ERROR PostgreSQL ECCONREFUSED
10:03 ERROR API returned 500
"""

@tool
def get_metrics() -> str:
    """Get current application metrics. """
    return """
CPU: 92%
Memory: 87%
Latency: 2.3 sec
Error Rate: 41%
"""

@tool
def get_recent_deployments() -> str:
    """Get recent deployments"""
    return """
10 minutes ago
Commit: 7f3c8ab
Author: Vanshika
Service: auth-service
    """

@tool
def get_kubernetes_status() -> str:
    """Get Kubernetes pod status"""
    return """
auth-service: Running
postgres: Running
api-gateway: CrashLoopBackOff
"""

@tool
def get_github_changes(owner: str, repo: str) -> str:
    """Get files changed in the lastest Github Commit."""
    
    url = f"https://api.github.com/repos/{owner}/{repo}/commits"
    response = requests.get(url, headers = headers)
    data = response.json()
    sha = data[0]["sha"]
    url = f"https://api.github.com/repos/{owner}/{repo}/commits/{sha}"
    response = requests.get(url, headers = headers)
    commit = response.json()
    files = [file["filename"] for file in commit["files"]]
    return "\n".join(files)

@tool
def get_repo_profile(owner: str, repo: str) -> dict:
    """Get a high-level profile of a GitHub repository."""

    # Repository metadata
    repo_url = f"https://api.github.com/repos/{owner}/{repo}"
    repo_data = requests.get(repo_url, headers=headers).json()

    # Languages
    lang_url = f"https://api.github.com/repos/{owner}/{repo}/languages"
    languages = requests.get(lang_url, headers=headers).json()

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
def scan_repository(owner: str, repo: str) -> dict:
    """Scan the repository structure and identify important files."""
    
    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/HEAD?recursive=1"
    response = requests.get(url, headers=headers)
    data = response.json()

    tree = data["tree"]

    important = {
        "package.json",
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "requirements.txt",
        "pyproject.toml",
        "Pipfile",
        "pom.xml",
        "build.gradle",
        "build.gradle.kts",
        "Cargo.toml",
        "go.mod",
        "Dockerfile",
        "docker-compose.yml",
        "docker-compose.yaml",
        "README.md"
    }

    important_files = []
    directories = set()

    for item in tree:
        path = item["path"]
        if item["type"] == "tree":
            directories.add(path)
        if path.split("/")[-1] in important:
            important_files.append(path)

    return {
        "total_files": len(tree),
        "directories": sorted(list(directories)),
        "important_files": important_files,
    }     

@tool
def detect_frameworks(owner: str, repo: str) -> dict:
    """Detect frameworks and package managers used in the repository."""
    frameworks = []
    package_managers = []

    url = f"https://api.github.com/repos/{owner}/{repo}/contents/package.json"
    response = requests.get(url, headers = headers)
    if response.status_code == 200:
        import base64
        import json
        content = base64.b64decode(response.json()["content"]).decode()
        package = json.loads(content)

        deps = {}
        deps.update(package.get("dependencies", {}))
        deps.update(package.get("devDependencies", {}))

        if "react" in deps:
            frameworks.append("React")
        if "next" in deps:
            frameworks.append("Next.js")
        if "express" in deps:
            frameworks.append("Express")
        if "@nestjs/core" in deps:
            frameworks.append("NestJS")

        package_managers.append("npm")

    url = f"https://api.github.com/repos/{owner}/{repo}/contents/requirements.txt"
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        import base64

        content = base64.b64decode(response.json()["content"]).decode().lower()

        if "fastapi" in content:
            frameworks.append("FastAPI")
        if "django" in content:
            frameworks.append("Django")
        if "flask" in content:
            frameworks.append("Flask")

        package_managers.append("pip")

    return {
        "frameworks": frameworks,
        "package_managers": package_managers
    }

@tool
def analyze_repository(owner: str, repo: str) -> dict:
    """Analyze a GitHub repository."""

    profile = get_repo_profile.invoke({
        "owner": owner,
        "repo": repo
    })

    structure = scan_repository.invoke({
        "owner": owner,
        "repo": repo
    })

    frameworks = detect_frameworks.invoke({
        "owner": owner,
        "repo": repo
    })

    return {
        "profile": profile,
        "structure": structure,
        "frameworks": frameworks
    }

@tool
def route_analyzer(primary_language: str) -> dict:
    """Select the appropriate code analyzer."""

    analyzers = {
        "Python": "Jedi",
        "TypeScript": "ts-morph",
        "JavaScript": "ts-morph",
        "Java": "JavaParser",
        "Go": "Go AST",
        "C++": "libclang",
        "C": "libclang",
        "Rust": "rust-analyzer",
    }

    return {
        "primary_language": primary_language,
        "analyzer": analyzers.get(primary_language, "Tree-sitter")
    }

@tool
def clone_repository(owner: str, repo: str) -> dict:
    """Clone a Github repository locally."""
    repo_url = f"https://github.com/{owner}/{repo}.git"
    local_path = f"repos/{repo}"

    if not os.path.exists(local_path):
        Repo.clone_from(repo_url, local_path)
    
    return {"local_path": local_path}

@tool
def read_repository_files(local_path: str) -> dict:
    """Find all source code files in a cloned repository."""

    source_extensions = {
        ".py",
        ".js",
        ".ts",
        ".java",
        ".go",
        ".cpp",
        ".c",
        ".rs"
    }

    source_files = []

    for root, _, files in os.walk(local_path):
        for file in files:
            _, ext = os.path.splitext(file)

            if ext in source_extensions:
                source_files.append(os.path.join(root, file))

    return {
        "total_source_files": len(source_files),
        "source_files": source_files
    }

@tool
def read_source_file(file_path: str) -> dict:
    """Read the contents of a source code file."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    return {
        "file_path": file_path,
        "content": content
    }

def get_call_name(node):
    if isinstance(node, ast.Name):
        return node.id

    elif isinstance(node, ast.Attribute):
        return f"{get_call_name(node.value)}.{node.attr}"

    return None
  
@tool
def parse_python_file(file_path: str) -> dict:
    """Parse a Python file and extract imports, functions, and classes."""

    with open(file_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read())

    imports = []
    functions = []
    classes = []
    function_calls = {}

    for node in ast.walk(tree):

        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append(alias.name)

        elif isinstance(node, ast.ImportFrom):
            imports.append(node.module or "")

        elif isinstance(node, ast.FunctionDef):
            functions.append(node.name)
            calls = []

            for child in ast.walk(node):
                if isinstance(child, ast.Call):
                    call_name = get_call_name(child.func)

                    if call_name:
                        calls.append(call_name)

            function_calls[node.name] = calls

        elif isinstance(node, ast.ClassDef):
            classes.append(node.name)

    return {
        "file_path": file_path,
        "imports": imports,
        "functions": functions,
        "classes": classes,
        "function_calls": function_calls
    }

@tool
def parse_repository(local_path: str) -> dict:
    """Parse all Python files in a repository."""

    repository = {}

    source_files = read_repository_files.invoke({
        "local_path": local_path
    })["source_files"]

    for file_path in source_files:
        if file_path.endswith(".py"):
            repository[file_path] = parse_python_file.invoke({
                "file_path": file_path
            })

    return repository

# @tool
# def extract_function_calls(file_path: str) -> dict:
#     """Extract function calls made inside each function."""

#     with open(file_path, "r", encoding="utf-8") as f:
#         tree = ast.parse(f.read())

#     function_calls = {}

#     for node in ast.walk(tree):
#         if isinstance(node, ast.FunctionDef):

#             calls = []

#             for child in ast.walk(node):
#                 if isinstance(child, ast.Call):
#                     call_name = get_call_name(child.func)
#                     if call_name:
#                         calls.append(call_name)

#             function_calls[node.name] = calls

#     return {
#         "file_path": file_path,
#         "function_calls": function_calls
#     }

# @tool
# def build_call_graph(local_path: str) -> dict:
#     """Build a function call graph for a Python repository."""

#     call_graph = {}

#     source_files = read_repository_files.invoke({
#         "local_path": local_path
#     })["source_files"]

#     for file_path in source_files:
#         if not file_path.endswith(".py"):
#             continue

#         parsed = parse_python_file.invoke({
#             "file_path": file_path
#         })

#         for function in parsed["functions"]:
#             call_graph[function] = {
#                 "file": file_path,
#                 "calls": parsed["function_calls"].get(function, [])
#             }

#     return call_graph

# @tool
# def build_dependency_graph(local_path: str) -> dict:
#     """Build a file dependency graph for a Python repository."""

#     dependency_graph = {}

#     source_files = read_repository_files.invoke({
#         "local_path": local_path
#     })["source_files"]

#     # Map module name -> file path
#     module_map = {
#         Path(file).stem: file
#         for file in source_files
#         if file.endswith(".py")
#     }

#     for file_path in source_files:
#         if not file_path.endswith(".py"):
#             continue

#         parsed = parse_python_file.invoke({
#             "file_path": file_path
#         })

#         dependencies = []

#         for module in parsed["imports"]:
#             if module in module_map:
#                 dependencies.append(module_map[module])

#         dependency_graph[file_path] = dependencies

#     return dependency_graph

@tool
def build_repository_index(local_path: str) -> dict:
    """Build a complete repository index for a Python repository."""

    source_files = read_repository_files.invoke({
        "local_path": local_path
    })["source_files"]

    python_files = [
        file for file in source_files
        if file.endswith(".py")
    ]

    # Module name -> file path
    module_map = {
        Path(file).stem: file
        for file in python_files
    }

    call_graph = {}
    dependency_graph = {}
    function_lookup = {}
    class_lookup = {}

    for file_path in python_files:

        parsed = parse_python_file.invoke({
            "file_path": file_path
        })

        # Build function lookup + call graph
        for function in parsed["functions"]:

            function_lookup[function] = file_path

            call_graph[function] = {
                "file": file_path,
                "calls": parsed["function_calls"].get(function, [])
            }

        # Build class lookup
        for cls in parsed["classes"]:
            class_lookup[cls] = file_path

        # Build dependency graph
        dependency_graph[file_path] = [
            module_map[module]
            for module in parsed["imports"]
            if module in module_map
        ]

    return {
        "call_graph": call_graph,
        "dependency_graph": dependency_graph,
        "function_lookup": function_lookup,
        "class_lookup": class_lookup,
        "module_lookup": module_map
    }

@tool
def build_execution_graph(local_path: str) -> dict:
    """
    Build an execution graph showing which functions invoke which other
    repository functions.
    """

    repo = build_repository_index.invoke({
        "local_path": local_path
    })

    call_graph = repo["call_graph"]
    function_lookup = repo["function_lookup"]

    execution_graph = {}

    for function, info in call_graph.items():

        execution_graph[function] = {
            "file": info["file"],
            "calls": []
        }

        for called_function in info["calls"]:

            # Ignore library/built-in functions
            if called_function not in function_lookup:
                continue

            execution_graph[function]["calls"].append({
                "function": called_function,
                "defined_in": function_lookup[called_function]
            })

    return execution_graph

@tool
def find_impacted_functions(local_path: str, changed_function: str) -> dict:
    """
    Find all repository functions that are impacted by a changed function.
    """

    execution_graph = build_execution_graph.invoke({
        "local_path": local_path
    })

    # Reverse graph: callee -> callers
    reverse_graph = {}

    for caller, info in execution_graph.items():
        for callee in info["calls"]:
            reverse_graph.setdefault(callee["function"], []).append(caller)

    impacted = []
    visited = set()
    queue = deque([changed_function])

    while queue:
        current = queue.popleft()

        for caller in reverse_graph.get(current, []):
            if caller not in visited:
                visited.add(caller)
                impacted.append(caller)
                queue.append(caller)

    return {
        "changed_function": changed_function,
        "impacted_functions": impacted
    }

@tool
def trace_execution_path(
    local_path: str,
    start_function: str,
    target_function: str
) -> dict:
    """
    Find one execution path from start_function to target_function.
    """

    execution_graph = build_execution_graph.invoke({
        "local_path": local_path
    })

    queue = deque([(start_function, [start_function])])
    visited = set()

    while queue:
        current, path = queue.popleft()

        if current == target_function:
            return {
                "path": path
            }

        if current in visited:
            continue

        visited.add(current)

        for callee in execution_graph.get(current, {}).get("calls", []):
            queue.append((
                callee["function"],
                path + [callee["function"]]
            ))

    return {
        "path": []
    }

@tool
def get_repository_tree(repo_path: str):
    """
    Build and analyze the complete repository directory tree.
    """
    return repository_tree(repo_path)

tools = [
    get_logs, 
    get_metrics, 
    get_recent_deployments, 
    get_kubernetes_status, 
    get_github_changes, 
    get_repo_profile, 
    scan_repository,
    detect_frameworks,
    analyze_repository,
    route_analyzer,
    clone_repository,
    read_repository_files,
    read_source_file,
    parse_python_file,
    parse_repository,
    # extract_function_calls,
    # build_call_graph,
    # build_dependency_graph
    build_repository_index,
    build_execution_graph,
    find_impacted_functions,
    trace_execution_path,
    get_repository_tree
]