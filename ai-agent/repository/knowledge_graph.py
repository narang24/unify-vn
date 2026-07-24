from repository.graph_models import (
    GraphNode,
    GraphEdge,
    KnowledgeGraph,
)
from repository.models import (
    DirectoryNode,
    FileNode,
)

from tools import parse_python_file

def build_graph_from_directory(
    directory: DirectoryNode,
    graph: KnowledgeGraph,
    parent: str | None = None,
):
    directory_id = directory.path

    graph.add_node(
        GraphNode(
            id=directory_id,
            type="directory",
            name=directory.name,
        )
    )

    if parent:
        graph.add_edge(
            GraphEdge(
                source=parent,
                target=directory_id,
                relation="contains",
            )
        )

    for file in directory.files:
        file_id = file.path

        graph.add_node(
            GraphNode(
                id=file_id,
                type="file",
                name=file.name,
                metadata={
                    "extension": file.extension,
                    "size": file.size,
                },
            )
        )

        graph.add_edge(
            GraphEdge(
                source=directory_id,
                target=file_id,
                relation="contains",
            )
        )

        if file.extension == ".py":
            try:
                parsed = parse_python_file.invoke({"file_path": file.path})
                graph_node = graph.nodes[-1]
                graph_node.metadata["functions"] = parsed.get("functions", [])
                graph_node.metadata["classes"] = parsed.get("classes", [])
                graph_node.metadata["imports"] = parsed.get("imports", [])
            except Exception:
                # Unparseable file — keep the file node without symbol metadata.
                pass

    for child in directory.directories:
        build_graph_from_directory(
            child,
            graph,
            directory_id,
        )

def build_knowledge_graph(tree):

    graph = KnowledgeGraph()

    build_graph_from_directory(
        tree.root,
        graph,
    )

    return graph

if __name__ == "__main__":
    from repository.tree_parser import build_repository_tree

    tree = build_repository_tree("repos/fastapi")
    graph = build_knowledge_graph(tree)

    print(f"Nodes: {len(graph.nodes)}")
    print(f"Edges: {len(graph.edges)}")