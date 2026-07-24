from langchain_text_splitters import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size = 800,
    chunk_overlap = 150,
)

def chunk_documents(documents):
    chunks = []
    for doc in documents:
        split = splitter.create_documents(
            texts=[doc["content"]],
            metadatas=[doc["metadata"]],
        )
        chunks.extend(split)
    return chunks