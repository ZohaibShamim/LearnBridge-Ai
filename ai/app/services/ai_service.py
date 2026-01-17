import requests
from app.core.config import GROQ_API_KEY, GROQ_URL, MODEL_NAME
from app.utils.prompt import roadmap_prompt

def generate_roadmap_from_cv(cv_text: str) -> str:
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "user",
                "content": roadmap_prompt(cv_text)
            }
        ],
        "temperature": 0.4
    }

    response = requests.post(GROQ_URL, headers=headers, json=payload)
    response.raise_for_status()

    return response.json()["choices"][0]["message"]["content"]
