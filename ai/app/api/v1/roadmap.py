from fastapi import APIRouter, HTTPException
import json
import re
from app.schema.cv import CVRequest
from app.services.ai_service import generate_roadmap_from_cv
from app.services.search_service import enrich_roadmap_with_resources

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/roadmap")
def generate_roadmap(data: CVRequest):
    try:
        # Generate roadmap from CV
        roadmap_text = generate_roadmap_from_cv(data.cv_text)
        
        # Try to extract JSON from the response (in case AI wraps it in markdown)
        json_match = re.search(r'\{[\s\S]*\}', roadmap_text)
        if json_match:
            roadmap_text = json_match.group(0)
        
        # Parse the JSON string to object
        roadmap_obj = json.loads(roadmap_text)
        
        # Validate structure
        if "career_goal" not in roadmap_obj or "steps" not in roadmap_obj:
            raise ValueError("Invalid roadmap structure")
        
        # Enrich each step with learning resources (YouTube videos or articles)
        roadmap_with_resources = enrich_roadmap_with_resources(roadmap_obj)
        
        return {
            "job_id": data.job_id,
            "roadmap": roadmap_with_resources
        }
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating roadmap: {str(e)}")
