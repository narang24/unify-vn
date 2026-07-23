from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class FileNode:
    name: str
    path: str
    extension: str
    size: int


@dataclass
class DirectoryNode:
    name: str
    path: str
    directories: list["DirectoryNode"] = field(default_factory=list)
    files: list[FileNode] = field(default_factory=list)


@dataclass
class RepositoryTree:
    root: DirectoryNode

    @property
    def total_directories(self) -> int:
        def count_dirs(node: DirectoryNode):
            return 1 + sum(count_dirs(d) for d in node.directories)

        return count_dirs(self.root)

    @property
    def total_files(self) -> int:
        def count_files(node: DirectoryNode):
            return len(node.files) + sum(
                count_files(d) for d in node.directories
            )

        return count_files(self.root)