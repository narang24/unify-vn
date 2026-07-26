# ai-agent/Dockerfile
# FastAPI incident agent (classify / analyze / RAG). Build context is
# `ai-agent/`:
#   docker build -f ai-agent/Dockerfile -t unify-ai-agent ai-agent

FROM python:3.11-slim AS base

# git is required by GitPython (tools.github_tools.clone_repository);
# build-essential is needed for a couple of native wheels (e.g. chromadb deps).
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── deps ────────────────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── app code ────────────────────────────────────────────────────────────
COPY . .

# Train the TF-IDF + LogisticRegression classifier at build time so
# ml/models/*.pkl exist in the image (ml/predict.py loads them lazily,
# but /classify and /analyze need them present).
RUN mkdir -p ml/models && python -m ml.train

# Non-root runtime user
RUN useradd --create-home --uid 1001 agent \
    && mkdir -p /app/repos /app/rag/chroma_db \
    && chown -R agent:agent /app
USER agent

ENV PYTHONUNBUFFERED=1 \
    AI_AGENT_PORT=8088

EXPOSE 8088

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8088/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8088"]