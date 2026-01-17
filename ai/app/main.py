from fastapi import FastAPI
from app.api.v1.roadmap import router as roadmap_router

app = FastAPI(title="AI Career Roadmap API")

app.include_router(roadmap_router)
