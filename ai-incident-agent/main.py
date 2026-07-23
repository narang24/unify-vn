import os
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage
from graph import graph

load_dotenv()

app = FastAPI()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

class IncidentRequest(BaseModel):
    error: str

class IncidentAnalysis(BaseModel):
    problem: str
    likely_cause: str
    explanation: str
    suggested_fix: str
    confidence: float

llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash",
    google_api_key=os.getenv("GEMINI_API_KEY")
)

response = graph.invoke(
    {
        "messages": [
            HumanMessage(content=f"""
You are an expert software engineering assistant.

Repository:
https://github.com/narang24/TravelStory-VN

Question:
Explain the architecture.

Use the available tools whenever necessary.
Only call the tools required to answer the question.
"""
)
        ],
        "context": {
            "incident": ""
        },
        "artifacts": {},
        "observations": [],
    },
    config={
        "configurable": {
            "thread_id": "incident-1"
        }
    }
)

print(response)

@app.get("/health")
def health():
    return { "status": "Agent API running" }

@app.post('/analyze')
def analyze_incident(incident: IncidentRequest):
    prompt = f"""
    You are a software engineering incident debugging assistant.
    Analyze this error:
    {incident.error}
    Explain the likely cause and suggest a fix.
    """
    response = client.models.generate_content(
        model="gemini-3.5-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": IncidentAnalysis
        }
    )
    analysis = IncidentAnalysis.model_validate_json(response.text)

    return analysis