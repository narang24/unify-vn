"""
Repository memory (RAG) pipeline.

Loads documentation/source, chunks it, embeds it and persists a vector store
that the incident agent can semantically search when reasoning about a failure.
Called once when a repository is connected and incrementally whenever the
repository changes.
"""

from rag.loader import load_documents
from rag.chunker import chunk_documents
from rag.vectordb import build_vector_store


def build_repository_memory(repo_path: str) -> dict:
    docs = load_documents(repo_path)
    print(f"Loaded {len(docs)} documents")

    chunks = chunk_documents(docs)
    print(f"Created {len(chunks)} chunks")

    if not chunks:
        print("No indexable documents found — skipping vector store build")
        return {"documents": len(docs), "chunks": 0, "indexed": False}

    build_vector_store(chunks)
    print("Repository memory built successfully")

    return {"documents": len(docs), "chunks": len(chunks), "indexed": True}


# Backwards-compatible alias (previous name had a typo).
build_repository_memort = build_repository_memory
