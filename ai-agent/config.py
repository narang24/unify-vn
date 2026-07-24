"""Central configuration for the Unify Intelli AI agent."""

import os
from dotenv import load_dotenv

load_dotenv()

# ── Secrets / integrations ───────────────────────────────────────────────────
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Optional observability integrations (honest "not configured" when unset).
PROMETHEUS_URL = os.getenv("PROMETHEUS_URL", "")
KUBE_API_URL = os.getenv("KUBE_API_URL", "")

# ── Defaults ─────────────────────────────────────────────────────────────────
DEFAULT_OWNER = os.getenv("REPO_OWNER", "narang24")
DEFAULT_REPO = os.getenv("REPO_NAME", "TravelStory-VN")

GITHUB_API = "https://api.github.com"

# Port the FastAPI app binds to (see app/main.py).
PORT = int(os.getenv("AI_AGENT_PORT", "8088"))
