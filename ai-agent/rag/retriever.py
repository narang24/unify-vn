"""
Semantic retrieval over repository memory.

Degrades gracefully: if the vector store hasn't been built yet (repository not
indexed) or embeddings aren't available, it returns an empty list instead of
raising, so the agent can still proceed with its other tools.
"""

def retrieve(query: str, k: int = 5):
    try:
        # Imported lazily so a missing vector-store backend (chromadb /
        # langchain_community) never breaks agent import or the wider pipeline.
        from rag.vectordb import load_vector_store

        db = load_vector_store()
        return db.similarity_search(query, k=k)
    except Exception as exc:  # noqa: BLE001 - retrieval must never break the agent
        print(f"[rag] retrieval unavailable: {exc}")
        return []


def retrieve_text(query: str, k: int = 5) -> str:
    """Return retrieved chunks as a single formatted string for prompting."""
    docs = retrieve(query, k=k)
    if not docs:
        return "No repository knowledge retrieved (repository not indexed yet)."

    blocks = []
    for doc in docs:
        source = getattr(doc, "metadata", {}).get("source", "unknown")
        content = getattr(doc, "page_content", str(doc))
        blocks.append(f"# {source}\n{content}")
    return "\n\n".join(blocks)
