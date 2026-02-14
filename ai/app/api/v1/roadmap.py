from fastapi import APIRouter, HTTPException
import json
import re
from app.schema.cv import CVRequest
from app.services.ai_service import generate_roadmap_from_cv
from app.services.search_service import enrich_roadmap_with_resources
from collections import Counter

router = APIRouter(prefix="/ai", tags=["AI"])

def extract_tags_from_roadmap(roadmap_obj: dict, max_tags: int = 7) -> list:
    """
    Extract the most important skills from the roadmap to use as tags.
    Returns up to max_tags unique skills from all steps.
    """
    all_skills = []
    
    print(f"[DEBUG] extract_tags_from_roadmap called")
    print(f"[DEBUG] roadmap_obj keys: {roadmap_obj.keys()}")
    
    # Collect all skills from all steps
    if "steps" in roadmap_obj:
        print(f"[DEBUG] Found steps, count: {len(roadmap_obj['steps'])}")
        for i, step in enumerate(roadmap_obj["steps"]):
            if "skills" in step and isinstance(step["skills"], list):
                print(f"[DEBUG] Step {i}: Found {len(step['skills'])} skills: {step['skills']}")
                all_skills.extend(step["skills"])
    else:
        print(f"[DEBUG] No 'steps' key found in roadmap_obj")
    
    print(f"[DEBUG] Total skills collected: {len(all_skills)}")
    print(f"[DEBUG] All skills: {all_skills}")
    
    # Count skill occurrences and get the most common ones
    if all_skills:
        skill_counter = Counter(all_skills)
        print(f"[DEBUG] Skill counter: {skill_counter.most_common(max_tags)}")
        # Get top max_tags skills by frequency
        top_skills = [skill for skill, count in skill_counter.most_common(max_tags)]
        print(f"[DEBUG] Top skills extracted: {top_skills}")
        return top_skills
    
    print(f"[DEBUG] No skills found, using fallback")
    # Fallback: extract from career goal if no skills found
    if "career_goal" in roadmap_obj:
        career_goal = roadmap_obj["career_goal"]
        # Extract meaningful words (skip small words like "a", "to", "and")
        stop_words = {"a", "an", "the", "to", "and", "or", "in", "for", "of", "is", "be", "as", "by"}
        words = [w for w in career_goal.split() if len(w) > 2 and w.lower() not in stop_words]
        tags = words[:max_tags]
        print(f"[DEBUG] Fallback tags from career goal: {tags}")
        return tags
    
    print(f"[DEBUG] No tags could be extracted")
    return []

@router.post("/roadmap")
def generate_roadmap(data: CVRequest):
    try:
        role = data.role
        
        print(f"[DEBUG] Role: {role}")
        print(f"[DEBUG] CV text length: {len(data.cv_text)}")
        
        roadmap_text = generate_roadmap_from_cv(data.cv_text, role)
        
        # Try to extract JSON from the response (in case AI wraps it in markdown)
        json_match = re.search(r'\{[\s\S]*\}', roadmap_text)
        if json_match:
            roadmap_text = json_match.group(0)
        
        # Parse the JSON string to object
        roadmap_obj = json.loads(roadmap_text)
        
        print(f"[DEBUG] Parsed roadmap structure - keys: {roadmap_obj.keys()}")
        if "steps" in roadmap_obj:
            print(f"[DEBUG] Number of steps: {len(roadmap_obj['steps'])}")
            if len(roadmap_obj['steps']) > 0:
                print(f"[DEBUG] First step keys: {roadmap_obj['steps'][0].keys()}")
                print(f"[DEBUG] First step skills: {roadmap_obj['steps'][0].get('skills', 'NO SKILLS KEY')}")
        
        # Validate structure
        if "career_goal" not in roadmap_obj or "steps" not in roadmap_obj:
            raise ValueError("Invalid roadmap structure")
        
        # Enrich each step with learning resources
        print(f"[DEBUG] Before enrichment - roadmap structure preserved")
        roadmap_with_resources = enrich_roadmap_with_resources(roadmap_obj)
        print(f"[DEBUG] After enrichment - roadmap keys: {roadmap_with_resources.keys()}")
        if "steps" in roadmap_with_resources and len(roadmap_with_resources['steps']) > 0:
            print(f"[DEBUG] After enrichment - First step keys: {roadmap_with_resources['steps'][0].keys()}")
        
        # Extract tags from the roadmap skills
        tags = extract_tags_from_roadmap(roadmap_with_resources)
        
        print(f"[DEBUG] Extracted tags: {tags}")
        
        return {
            "job_id": data.job_id,
            "roadmap": roadmap_with_resources,
            "tags": tags
        }
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating roadmap: {str(e)}")