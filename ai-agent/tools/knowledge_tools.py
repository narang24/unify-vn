"""ML classification, RAG retrieval and historical-incident tools."""

from langchain_core.tools import tool


@tool
def classify_incident(incident: str) -> dict:
    """
    Classify an incident description into a category (e.g. Database Failure,
    Kubernetes Failure, API Failure) with a confidence score, using the trained
    ML model. Call this FIRST to decide which other tools to use.
    """
    from ml.predict import classify_safe
    return classify_safe(incident)


@tool
def retrieve_repository_knowledge(query: str) -> str:
    """
    Semantically search the repository memory (RAG vector store) for code and
    documentation relevant to the query, to ground the analysis.
    """
    from rag.retriever import retrieve_text
    return retrieve_text(query, k=5)


@tool
def get_similar_incidents(incident: str) -> list:
    """
    Retrieve previously resolved incidents similar to the current one from
    historical incident memory, so their fixes can inform the analysis.
    """
    from memory.redis_memory import memory
    return memory.similar_incidents(incident, k=3)
