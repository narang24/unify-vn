# Unify Intelli — AI Incident Agent (`/ai-agent`)

A modular, proactive AI engineering assistant that analyzes **real** repository
deployments, classifies incidents with a trained ML model, investigates with
tools + RAG + historical memory, and produces a root-cause analysis with a
suggested fix. It sits alongside `/backend` and `/frontend`.

## Layout

```
ai-agent/
├── app/            FastAPI service (main.py)
├── agent/          LangGraph agent: state, nodes, graph, orchestrator
├── ml/             Trained TF-IDF + LogisticRegression incident classifier
│   ├── data/       incidents.csv, test_incidents.csv
│   └── models/     incident_classifier.pkl, tfidf.pkl
├── rag/            Repository memory: loader, chunker, embeddings, Chroma store
├── memory/         Redis long-term memory + cache (in-memory fallback)
├── repository/     Repo tree parser + knowledge graph
├── tools/          Modular agent tools
│   ├── github_tools.py     real deployments, logs, changes, structure
│   ├── codegraph.py        parsing, indexing, execution graphs
│   ├── observability.py    metrics / Kubernetes (real when configured)
│   └── knowledge_tools.py  ML classify, RAG retrieve, similar incidents
├── providers/      github.py — real GitHub REST integration
└── config.py       env-driven configuration
```

## Pipeline

1. **ML classification first** — predicts the incident category + confidence.
2. **Cache** — Redis lookup for previously-analyzed incidents.
3. **Real logs** — pulls failing-step logs from GitHub Actions for the run.
4. **RAG** — semantic search over the repository memory.
5. **Historical memory** — similar resolved incidents.
6. **Tool-driven investigation** — LangGraph agent calls the tools it needs.
7. **Structured RCA** — problem, root cause, explanation, fix, code snippet, confidence.
8. **Persist** — stores the incident in long-term memory + cache.

Every dependency (Gemini, Chroma, Redis, GitHub) **degrades gracefully**.

## Setup

```bash
cd ai-agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in GEMINI_API_KEY + GITHUB_TOKEN
python -m ml.train            # trains the classifier from ml/data/incidents.csv
uvicorn app.main:app --host 0.0.0.0 --port 8088
```

The `/backend` workspace service calls this API via `AI_AGENT_URL`
(default `http://localhost:8088`).

## Endpoints

| Method | Path           | Purpose                                            |
|--------|----------------|----------------------------------------------------|
| GET    | `/health`      | liveness                                           |
| POST   | `/classify`    | ML classification only (`{ error }`)               |
| GET    | `/deployments` | **real** deployment history (`?owner=&repo=`)      |
| POST   | `/analyze`     | full RCA (`{ error, owner, repo, deployment }`)    |
| POST   | `/index`       | build RAG memory from a local path                 |
| POST   | `/index-repo`  | clone `owner/repo` and build RAG memory            |
