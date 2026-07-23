from pathlib import Path

from repository.models import (
    DirectoryNode,
    FileNode,
    RepositoryTree,
)

def parse_directory(path: Path) -> DirectoryNode:
    node = DirectoryNode(
        name=path.name,
        path=str(path),
    )

    for item in sorted(path.iterdir()):
        if item.name.startswith("."):
            continue

        if item.is_dir():
            node.directories.append(
                parse_directory(item)
            )

        else:
            node.files.append(
                FileNode(
                    name=item.name,
                    path=str(item),
                    extension=item.suffix,
                    size=item.stat().st_size,
                )
            )

    return node

def build_repository_tree(repo_path: str) -> RepositoryTree:
    root = parse_directory(Path(repo_path))
    return RepositoryTree(root=root)

def directory_to_dict(node: DirectoryNode) -> dict:
    return {
        "name": node.name,
        "path": node.path,
        "directories": [
            directory_to_dict(directory)
            for directory in node.directories
        ],
        "files": [
            {
                "name": file.name,
                "path": file.path,
                "extension": file.extension,
                "size": file.size,
            }
            for file in node.files
        ],
    }

def repository_tree(repo_path: str) -> dict:
    tree = build_repository_tree(repo_path)

    return {
        "total_directories": tree.total_directories,
        "total_files": tree.total_files,
        "tree": directory_to_dict(tree.root),
    }

if __name__ == "__main__":
    tree = build_repository_tree("repos/fastapi")

    print(tree.total_directories)
    print(tree.total_files)