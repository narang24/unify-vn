from rag.vectordb import load_vector_store

def retrieve(query: str, k: int = 5):
    db = load_vector_store()
    return db.similarity_search(query, k=k)