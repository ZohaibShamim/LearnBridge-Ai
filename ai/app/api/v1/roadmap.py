from fastapi import APIRouter
from app.schema.cv import CVRequest
from app.services.ai_service import generate_roadmap_from_cv

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/roadmap")
def generate_roadmap(data: CVRequest):
    roadmap = generate_roadmap_from_cv(data.cv_text)
    return {"job_id": data.job_id, "roadmap": roadmap}
