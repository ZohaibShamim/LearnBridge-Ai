from fastapi import FastAPI
from app.api.v1.roadmap import router as roadmap_router
from app.api.v1.quiz import router as quiz_router

app = FastAPI(title="AI Career Roadmap API")

app.include_router(roadmap_router)
app.include_router(quiz_router)
