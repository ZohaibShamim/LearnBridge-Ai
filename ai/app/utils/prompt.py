def roadmap_prompt(cv_text: str) -> str:
    return f"""
You are a professional career advisor.

Analyze the CV text below and generate a
12-month career roadmap.

Return JSON only with:
- career_goal
- steps (array)

CV TEXT:
{cv_text}
"""
