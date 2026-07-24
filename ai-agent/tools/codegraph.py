"""Repository parsing, indexing, execution-graph and tree tools."""

import ast
import os
from collections import deque
from pathlib import Path

from langchain_core.tools import tool

from repository.tree_parser import repository_tree


@tool
def route_analyzer(primary_language: str) -> dict:
    """Select the appropriate code analyzer for a language."""
    analyzers = {
        "Python": "Jedi", "TypeScript": "ts-morph", "JavaScript": "ts-morph",
        "Java": "JavaParser", "Go": "Go AST", "C++": "libclang",
        "C": "libclang", "Rust": "rust-analyzer",
    }
    return {"primary_language": primary_language, "analyzer": analyzers.get(primary_language, "Tree-sitter")}


@tool
def read_repository_files(local_path: str) -> dict:
    """Find all source code files in a cloned repository."""
    source_extensions = {".py", ".js", ".ts", ".java", ".go", ".cpp", ".c", ".rs"}
    source_files = []
    for root, _, files in os.walk(local_path):
        for file in files:
            _, ext = os.path.splitext(file)
            if ext in source_extensions:
                source_files.append(os.path.join(root, file))
    return {"total_source_files": len(source_files), "source_files": source_files}


@tool
def read_source_file(file_path: str) -> dict:
    """Read the contents of a source code file."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    return {"file_path": file_path, "content": content}


def _call_name(node):
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return f"{_call_name(node.value)}.{node.attr}"
    return None


@tool
def parse_python_file(file_path: str) -> dict:
    """Parse a Python file and extract imports, functions, classes and calls."""
    with open(file_path, "r", encoding="utf-8") as f:
        tree = ast.parse(f.read())

    imports, functions, classes, function_calls = [], [], [], {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imports.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            imports.append(node.module or "")
        elif isinstance(node, ast.FunctionDef):
            functions.append(node.name)
            calls = [_call_name(c.func) for c in ast.walk(node) if isinstance(c, ast.Call)]
            function_calls[node.name] = [c for c in calls if c]
        elif isinstance(node, ast.ClassDef):
            classes.append(node.name)

    return {
        "file_path": file_path,
        "imports": imports,
        "functions": functions,
        "classes": classes,
        "function_calls": function_calls,
    }


@tool
def build_repository_index(local_path: str) -> dict:
    """Build a complete repository index (call graph, deps, lookups) for a Python repo."""
    python_files = [f for f in read_repository_files.invoke({"local_path": local_path})["source_files"] if f.endswith(".py")]
    module_map = {Path(f).stem: f for f in python_files}

    call_graph, dependency_graph, function_lookup, class_lookup = {}, {}, {}, {}
    for file_path in python_files:
        parsed = parse_python_file.invoke({"file_path": file_path})
        for function in parsed["functions"]:
            function_lookup[function] = file_path
            call_graph[function] = {"file": file_path, "calls": parsed["function_calls"].get(function, [])}
        for cls in parsed["classes"]:
            class_lookup[cls] = file_path
        dependency_graph[file_path] = [module_map[m] for m in parsed["imports"] if m in module_map]

    return {
        "call_graph": call_graph,
        "dependency_graph": dependency_graph,
        "function_lookup": function_lookup,
        "class_lookup": class_lookup,
        "module_lookup": module_map,
    }


@tool
def build_execution_graph(local_path: str) -> dict:
    """Build an execution graph showing which functions invoke which others."""
    repo = build_repository_index.invoke({"local_path": local_path})
    call_graph, function_lookup = repo["call_graph"], repo["function_lookup"]

    execution_graph = {}
    for function, info in call_graph.items():
        execution_graph[function] = {"file": info["file"], "calls": []}
        for called in info["calls"]:
            if called in function_lookup:
                execution_graph[function]["calls"].append({"function": called, "defined_in": function_lookup[called]})
    return execution_graph


@tool
def find_impacted_functions(local_path: str, changed_function: str) -> dict:
    """Find all repository functions impacted by a changed function."""
    execution_graph = build_execution_graph.invoke({"local_path": local_path})
    reverse_graph = {}
    for caller, info in execution_graph.items():
        for callee in info["calls"]:
            reverse_graph.setdefault(callee["function"], []).append(caller)

    impacted, visited, queue = [], set(), deque([changed_function])
    while queue:
        current = queue.popleft()
        for caller in reverse_graph.get(current, []):
            if caller not in visited:
                visited.add(caller)
                impacted.append(caller)
                queue.append(caller)
    return {"changed_function": changed_function, "impacted_functions": impacted}


@tool
def trace_execution_path(local_path: str, start_function: str, target_function: str) -> dict:
    """Find one execution path from start_function to target_function."""
    execution_graph = build_execution_graph.invoke({"local_path": local_path})
    queue, visited = deque([(start_function, [start_function])]), set()
    while queue:
        current, path = queue.popleft()
        if current == target_function:
            return {"path": path}
        if current in visited:
            continue
        visited.add(current)
        for callee in execution_graph.get(current, {}).get("calls", []):
            queue.append((callee["function"], path + [callee["function"]]))
    return {"path": []}


@tool
def get_repository_tree(repo_path: str) -> dict:
    """Build and analyze the complete repository directory tree."""
    return repository_tree(repo_path)
