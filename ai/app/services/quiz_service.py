import json
import re
import logging
from app.services.ai_service import call_ai
from app.utils.quiz_prompt import quiz_prompt

logger = logging.getLogger(__name__)

QUIZ_SYSTEM_PROMPT = "You are an expert technical instructor that generates strictly-valid JSON quiz assessments."


class QuizGenerationError(Exception):
    """Raised when the model output cannot be turned into a valid quiz."""


def generate_quiz(topic: str, difficulty: str = "mixed", num_questions: int = 5) -> dict:
    """
    Ask the LLM for a quiz on `topic`, parse and VALIDATE the result.

    Validation is deliberate (see AUDIT/loopholes): the model can return malformed JSON,
    the wrong number of questions, not-exactly-4 options, or an out-of-range correct_index.
    We normalize/repair what we safely can and reject what we can't, so the backend never
    stores an unscorable quiz.
    """
    prompt = quiz_prompt(topic, difficulty, num_questions)
    raw = call_ai(prompt, system_prompt=QUIZ_SYSTEM_PROMPT)

    # Models sometimes wrap JSON in markdown fences despite instructions — extract the object.
    match = re.search(r'\{[\s\S]*\}', raw)
    if match:
        raw = match.group(0)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error("Quiz JSON parse failed: %s", e)
        raise QuizGenerationError(f"Model did not return valid JSON: {e}")

    questions = data.get("questions")
    if not isinstance(questions, list) or len(questions) == 0:
        raise QuizGenerationError("Model output had no questions.")

    cleaned = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        text = q.get("question")
        options = q.get("options")
        correct = q.get("correct_index")

        # Must have a question and exactly 4 non-empty string options.
        if not text or not isinstance(options, list) or len(options) != 4:
            continue
        options = [str(o).strip() for o in options]
        if any(o == "" for o in options):
            continue

        # correct_index must be a valid 0..3 int.
        try:
            correct = int(correct)
        except (TypeError, ValueError):
            continue
        if correct < 0 or correct > 3:
            continue

        diff = str(q.get("difficulty", "medium")).lower()
        if diff not in ("easy", "medium", "hard"):
            diff = "medium"

        cleaned.append({
            "question": str(text).strip(),
            "options": options,
            "correct_index": correct,
            "explanation": str(q.get("explanation", "")).strip(),
            "difficulty": diff,
        })

    if len(cleaned) == 0:
        raise QuizGenerationError("No valid questions survived validation.")

    return {"topic": data.get("topic", topic), "questions": cleaned}
