from rag.pipeline import build_repository_memort
from rag.retriever import retrieve

REPO = "repos/fastapi"

build_repository_memort(REPO)

docs = retrieve("How do i run this project?")

for doc in docs:
    print("-" * 50)
    print(doc.metadata)
    print(doc.page_content)