from langchain_community.vectorstores import Chroma
from rag.embedding import embedding_model

DB_PATH="./rag/chroma_db"

def build_vector_store(chunks):
    db = Chroma.from_documents(
        documents = chunks,
        embedding = embedding_model,
        persist_directory = DB_PATH,
    )
    db.persist()
    return db

def load_vector_store():
    return Chroma(
        persist_directory = DB_PATH,
        embedding_function = embedding_model,
    )