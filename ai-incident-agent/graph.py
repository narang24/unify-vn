from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import InMemorySaver
from state import AgentState
from nodes import analyze_node, should_continue, tool_node
from tools import tools

memory = InMemorySaver()

builder = StateGraph(AgentState)
builder.add_node("analyze", analyze_node)
builder.add_node("tool", tool_node)
builder.add_edge(START, "analyze")
builder.add_conditional_edges(
    "analyze",
    should_continue
)
builder.add_edge("tool", "analyze")

graph = builder.compile(checkpointer=memory)