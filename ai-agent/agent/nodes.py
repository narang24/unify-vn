from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import AIMessage, ToolMessage, SystemMessage
from langgraph.graph import END

from config import GEMINI_API_KEY, GEMINI_MODEL
from agent.state import AgentState
from tools import tools

llm = ChatGoogleGenerativeAI(model=GEMINI_MODEL, google_api_key=GEMINI_API_KEY)
llm_with_tools = llm.bind_tools(tools)

tool_map = {tool.name: tool for tool in tools}


def tool_node(state: AgentState):
    """Execute every tool call requested in the last AI message."""
    last_message = state["messages"][-1]

    new_messages = list(state["messages"])
    artifacts = dict(state.get("artifacts", {}))
    observations = list(state.get("observations", []))

    for tool_call in last_message.tool_calls:
        tool = tool_map.get(tool_call["name"])
        if tool is None:
            result = f"Unknown tool: {tool_call['name']}"
        else:
            try:
                result = tool.invoke(tool_call["args"])
            except Exception as exc:  # noqa: BLE001
                result = f"Tool {tool_call['name']} error: {exc}"

        new_messages.append(ToolMessage(content=str(result), tool_call_id=tool_call["id"]))
        artifacts[tool_call["name"]] = result
        observations.append(f"{tool_call['name']} executed")

    return {
        "messages": new_messages,
        "context": state.get("context", {}),
        "classification": state.get("classification", {}),
        "retrieved": state.get("retrieved", ""),
        "artifacts": artifacts,
        "observations": observations,
    }


def analyze_node(state: AgentState):
    classification = state.get("classification", {})
    retrieved = state.get("retrieved", "")

    system = SystemMessage(
        content=f"""
You are Unify Intelli — an expert software engineering incident-analysis agent.

An ML classifier has already predicted the incident category:
  category: {classification.get("category", "Unknown")}
  confidence: {classification.get("confidence", 0.0)}

Use this classification to decide which tools to call. Investigate using REAL
data before concluding: real deployments and their logs, GitHub changes,
repository structure and execution paths, metrics/Kubernetes state when
available, and similar past incidents. Never guess repository details.

Relevant repository knowledge retrieved via RAG:
{retrieved or "(none yet — call retrieve_repository_knowledge if useful)"}

When you have enough evidence, produce a final root-cause analysis with:
problem, root cause, explanation, a concrete suggested fix, a code snippet, and
a confidence score. Use as few tools as necessary.
"""
    )

    response = llm_with_tools.invoke([system] + state["messages"])

    return {
        "messages": state["messages"] + [response],
        "context": state.get("context", {}),
        "classification": classification,
        "retrieved": retrieved,
        "artifacts": state.get("artifacts", {}),
        "observations": state.get("observations", []),
    }


def should_continue(state: AgentState):
    last_message = state["messages"][-1]
    if isinstance(last_message, AIMessage) and last_message.tool_calls:
        return "tool"
    return END
