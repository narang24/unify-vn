from pathlib import Path

SUPPORTED_FILES = {
    "README.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
}

SUPPORTED_EXTENSIONS = {
    ".md",
    ".txt",
}


def load_documents(repo_path: str):

    documents = []

    repo = Path(repo_path)

    for file in repo.rglob("*"):

        if (
            file.name not in SUPPORTED_FILES
            and file.suffix.lower() not in SUPPORTED_EXTENSIONS
        ):
            continue

        try:

            text = file.read_text(
                encoding="utf-8",
                errors="ignore"
            )

            documents.append({
                "content": text,
                "metadata": {
                    "source": str(file.relative_to(repo)),
                    "type": file.suffix.lower(),
                }
            })

        except Exception:
            pass

    return documents