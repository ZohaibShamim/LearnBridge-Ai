from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class CVRequest(BaseModel):
    job_id: str
    cv_text: str

@app.post("/ai/roadmap")
def generate_roadmap(data: CVRequest):
    # later: call OpenAI / LLM here

    roadmap = {
        "career_goal": "Backend Engineer",
        "steps": [
            "Learn JavaScript deeply",
            "Master Node.js & Express",
            "Learn Databases",
            "System Design Basics",
            "Apply for Backend Roles"
        ]
    }

    return {
        "job_id": data.job_id,
        "roadmap": roadmap
    }
