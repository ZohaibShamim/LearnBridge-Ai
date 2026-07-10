def quiz_prompt(topic: str, difficulty: str = "mixed", num_questions: int = 5) -> str:
    """
    Build the prompt that asks the model for a multiple-choice quiz on `topic`.
    The strict JSON shape mirrors the roadmap prompt's approach so the same
    regex-extract + json.loads guard on the router side handles both.
    """
    if difficulty == "mixed":
        difficulty_line = (
            "- Mix the difficulty across questions: roughly a third easy, a third medium, a third hard.\n"
            '- Each question\'s "difficulty" field must be one of: "easy", "medium", "hard".'
        )
    else:
        difficulty_line = (
            f'- All questions should be {difficulty} difficulty.\n'
            f'- Each question\'s "difficulty" field must be "{difficulty}".'
        )

    return f"""You are an expert technical instructor writing an assessment.

Create a multiple-choice quiz to test a learner's knowledge of: {topic}

Return ONLY a valid JSON object with this exact structure:
{{
  "topic": "{topic}",
  "questions": [
    {{
      "question": "A clear, self-contained question about {topic}",
      "options": ["option A", "option B", "option C", "option D"],
      "correct_index": 0,
      "explanation": "One or two sentences explaining why the correct option is right",
      "difficulty": "easy"
    }}
  ]
}}

Rules:
- Generate exactly {num_questions} questions.
- Every question must have exactly 4 options.
- "correct_index" is the 0-based index (0, 1, 2, or 3) of the correct option in that question's "options" array.
- Exactly one option per question is correct. Options must be distinct and plausible.
{difficulty_line}
- Questions must be answerable from knowledge of {topic} alone, not trick questions.
- Do not include any markdown formatting, code fences, or explanatory text outside the JSON.
- Return ONLY the JSON object.
"""
