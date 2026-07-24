from langchain_community.vectorstores import Chroma
from rag.embedding import embedding_model

DB_PATH = "./rag/chroma_db"


def build_vector_store(chunks):
    db = Chroma.from_documents(
        documents=chunks,
        embedding=embedding_model,
        persist_directory=DB_PATH,
    )
    # Newer Chroma persists automatically; keep this best-effort for older versions.
    try:
        db.persist()
    except Exception:
        pass
    return db


def load_vector_store():
    return Chroma(
        persist_directory=DB_PATH,
        embedding_function=embedding_model,
    )
