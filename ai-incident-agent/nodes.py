from state import AgentState
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import AIMessage, ToolMessage
from langgraph.graph import END
from dotenv import load_dotenv
from tools import tools
import os
from langchain_core.messages import SystemMessage

load_dotenv()

llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY")
)

llm_with_tools = llm.bind_tools(tools)

tool_map = {tool.name: tool for tool in tools}

def tool_node(state: AgentState):
    last_message = state["messages"][-1]
    tool_call = last_message.tool_calls[0]

    tool = tool_map[tool_call["name"]]
    result = tool.invoke(tool_call["args"])

    tool_message = ToolMessage(
        content=str(result),
        tool_call_id=tool_call["id"]
    )

    new_state = {
        "messages": state["messages"] + [tool_message],
        "context": state["context"],
        "artifacts": state["artifacts"].copy(),
        "observations": state["observations"][:]
    }

    new_state["artifacts"][tool_call["name"]] = result
    new_state["observations"].append(f"{tool_call['name']} executed")

    return new_state

def analyze_node(state: AgentState):

    system = SystemMessage(
        content="""
You are an expert software engineering assistant.

Use the available tools whenever required.

Never guess repository information.
If a tool can answer the user's question, call it first.
Use as few tools as necessary.
"""
    )

    response = llm_with_tools.invoke(
        [system] + state["messages"]
    )

    return {
        "messages": state["messages"] + [response],
        "context": state["context"],
        "artifacts": state["artifacts"],
        "observations": state["observations"]
    }

def should_continue(state: AgentState):
    last_message = state["messages"][-1]
    if(isinstance(last_message, AIMessage) and last_message.tool_calls):
        return "tool"
    
    return END