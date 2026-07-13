def roadmap_prompt(cv_text: str, role: str = None) -> str:
    # Convert underscore-separated role names to readable format
    role_map = {
        "data_scientist": "Data Scientist",
        "software_engineer": "Software Engineer",
        "machine_learning": "Machine Learning Engineer",
        "ai": "AI Engineer"
    }
    
    if role:
        role_name = role_map.get(role, role)
        role_section = f"""\n\nTARGET ROLE: {role_name}

IMPORTANT INSTRUCTIONS:
- The user wants to become a {role_name}.
- Carefully analyze their existing skills, experience, and education from the CV.
- Identify which of their current skills are transferable and relevant to the {role_name} role.
- Build the roadmap progressively: start by leveraging their existing strengths, then introduce new skills they need to learn.
- For each month, clearly mention which existing skills they should build upon and which new skills they need to acquire.
- The career_goal must specifically mention the {role_name} role.
- Focus on tools, technologies, frameworks, and certifications that are most in-demand for a {role_name}."""
    else:
        role_section = "\n\nAnalyze the user's existing skills and experience from the CV and suggest the most suitable career path based on their background."
    
    return f"""You are a professional career advisor who creates personalized career roadmaps.

Analyze the CV text below and generate a detailed 12-month career roadmap.{role_section}

Return ONLY a valid JSON object with this exact structure:
{{
  "career_goal": "A clear, specific career goal statement tailored to their background and target role",
  "current_level": "Brief assessment of their current skill level based on CV",
  "estimated_timeline": "12 months",
  "steps": [
    {{
      "month": 1,
      "title": "Step title",
      "description": "Detailed description of what to do this month, referencing their existing skills where relevant",
      "skills": ["skill1", "skill2", "skill3"],
      "subtopics": [
        {{ "title": "A focused sub-skill within this month", "summary": "One sentence on what the learner studies here" }}
      ]
    }}
  ]
}}

Rules:
- Generate exactly 12 steps (one per month).
- Each step should have 3-5 skills.
- Each step must have 2 to 4 subtopics that break the month's title into concrete, quizzable sub-skills.
- Each subtopic needs a short "title" and a one-sentence "summary". Subtopics must be specific enough to write a focused quiz on.
- Earlier months should leverage existing skills from the CV.
- Later months should focus on advanced and specialized skills.
- Do not include any markdown formatting, code blocks, or explanatory text.
- Return ONLY the JSON.

CV TEXT:
{cv_text}
"""
