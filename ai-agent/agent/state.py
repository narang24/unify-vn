from typing import TypedDict

from langchain_core.messages import BaseMessage


class AgentState(TypedDict, total=False):
    messages: list[BaseMessage]
    context: dict          # incident text, owner/repo, deployment info
    classification: dict   # ML classifier output (category + confidence)
    retrieved: str         # RAG-retrieved repository knowledge
    artifacts: dict        # raw tool outputs, keyed by tool name
    observations: list[str]
