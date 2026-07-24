from langgraph.graph import StateGraph, START
from langgraph.checkpoint.memory import InMemorySaver

from agent.state import AgentState
from agent.nodes import analyze_node, tool_node, should_continue

memory = InMemorySaver()

builder = StateGraph(AgentState)
builder.add_node("analyze", analyze_node)
builder.add_node("tool", tool_node)
builder.add_edge(START, "analyze")
builder.add_conditional_edges("analyze", should_continue)
builder.add_edge("tool", "analyze")

graph = builder.compile(checkpointer=memory)
