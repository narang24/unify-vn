from rag.loader import load_documents
from rag.chunker import chunk_documents
import rag.vectordb import build_vector_store

def build_repository_memort(repo_path: str):
    docs = load_documents(repo_path)
    print(f"Loaded {len(docs)} documents")
    chunks = chunk_documents(docs)
    print(f"Created {len(chunks)} chunks")
    build_vector_store(chunks)
    print("Repository memory built successfully")
