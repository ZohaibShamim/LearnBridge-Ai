def skill_gap_prompt(cv_text: str, role: str = None) -> str:
    """
    Prompt the model to (a) extract skills present in the CV, (b) list the key skills
    required for the target role, and (c) compute which required skills are missing.
    Kept separate from the roadmap prompt so the (volatile) roadmap prompt stays untouched.
    """
    role_map = {
        "data_scientist": "Data Scientist",
        "software_engineer": "Software Engineer",
        "machine_learning": "Machine Learning Engineer",
        "ai": "AI Engineer",
    }

    if role:
        role_name = role_map.get(role, role)
        role_block = f"""TARGET ROLE: {role_name}

Return ONLY a valid JSON object with this exact structure:
{{
  "extracted_skills": ["skills actually found in the CV text"],
  "required_skills": ["the most important skills needed to work as a {role_name}"],
  "missing_skills": ["required_skills that are NOT already present in extracted_skills"]
}}

Rules:
- extracted_skills: only skills genuinely evidenced by the CV (tools, languages, frameworks, concepts). If the CV is empty or unreadable, return an empty list.
- required_skills: 8-12 core, in-demand skills for a {role_name}.
- missing_skills: exactly the required_skills the candidate does not yet have (set difference). Do not invent skills outside required_skills.
- Use short skill names (e.g. "Python", "SQL", "Docker"), not sentences."""
    else:
        role_block = """No target role was provided.

Return ONLY a valid JSON object with this exact structure:
{
  "extracted_skills": ["skills actually found in the CV text"],
  "required_skills": [],
  "missing_skills": []
}

Rules:
- extracted_skills: only skills genuinely evidenced by the CV. If the CV is empty or unreadable, return an empty list.
- Leave required_skills and missing_skills empty when no role is given.
- Use short skill names, not sentences."""

    return f"""You are a technical recruiter analyzing a candidate's CV.

{role_block}

Do not include any markdown formatting, code fences, or text outside the JSON. Return ONLY the JSON object.

CV TEXT:
{cv_text}
"""
