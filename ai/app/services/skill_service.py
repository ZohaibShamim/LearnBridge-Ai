import json
import re
import logging
from app.services.ai_service import call_ai
from app.utils.skill_prompt import skill_gap_prompt

logger = logging.getLogger(__name__)

SKILL_SYSTEM_PROMPT = "You are a technical recruiter that returns strictly-valid JSON skill analyses."


def _clean_list(value, limit: int = 30) -> list:
    """Coerce to a de-duplicated list of non-empty short strings."""
    if not isinstance(value, list):
        return []
    seen = set()
    out = []
    for item in value:
        s = str(item).strip()
        if not s:
            continue
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
        if len(out) >= limit:
            break
    return out


def extract_skills_and_gap(cv_text: str, role: str = None) -> dict:
    """
    Extract skills from the CV (R1.6) and compute the gap versus the target role (R1.7).

    Best-effort: any failure returns empty lists rather than raising, so a skill-analysis
    problem never fails the roadmap request (matches the enrichment philosophy).
    Returns {extracted_skills, required_skills, missing_skills}.
    """
    empty = {"extracted_skills": [], "required_skills": [], "missing_skills": []}

    if not cv_text or not cv_text.strip():
        return empty

    try:
        raw = call_ai(skill_gap_prompt(cv_text, role), system_prompt=SKILL_SYSTEM_PROMPT)
    except Exception as e:
        logger.error("Skill analysis LLM call failed: %s", e)
        return empty

    match = re.search(r"\{[\s\S]*\}", raw)
    if match:
        raw = match.group(0)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error("Skill analysis JSON parse failed: %s", e)
        return empty

    extracted = _clean_list(data.get("extracted_skills"))
    required = _clean_list(data.get("required_skills"))
    model_missing = _clean_list(data.get("missing_skills"))

    # Recompute the gap ourselves so it is always a true set difference (required − extracted),
    # regardless of what the model returned for missing_skills.
    have = {s.lower() for s in extracted}
    computed_missing = [s for s in required if s.lower() not in have]

    # Prefer our computed gap; fall back to the model's list only if required was empty.
    missing = computed_missing if required else model_missing

    return {
        "extracted_skills": extracted,
        "required_skills": required,
        "missing_skills": missing,
    }
