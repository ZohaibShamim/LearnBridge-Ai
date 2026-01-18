def roadmap_prompt(cv_text: str) -> str:
    return f"""You are a professional career advisor.

Analyze the CV text below and generate a 12-month career roadmap.

Return ONLY a valid JSON object with this exact structure:
{{
  "career_goal": "A clear career goal statement",
  "steps": [
    {{
      "month": 1,
      "title": "Step title",
      "description": "What to do this month",
      "skills": ["skill1", "skill2"]
    }}
  ]
}}

Do not include any markdown formatting, code blocks, or explanatory text. Return ONLY the JSON.

CV TEXT:
{cv_text}
"""
