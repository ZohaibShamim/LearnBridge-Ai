from fastapi import APIRouter, HTTPException
import logging
from app.schema.quiz import QuizRequest, QuizResponse
from app.services.quiz_service import generate_quiz, QuizGenerationError

router = APIRouter(prefix="/ai", tags=["AI"])
logger = logging.getLogger(__name__)


@router.post("/quiz", response_model=QuizResponse)
def create_quiz(data: QuizRequest):
    topic = (data.topic or "").strip()
    if not topic:
        # Client error, not a server fault.
        raise HTTPException(status_code=422, detail="topic is required")

    try:
        result = generate_quiz(topic, data.difficulty, data.num_questions)
        return result
    except QuizGenerationError as e:
        # The upstream model produced something we couldn't turn into a quiz — surface as a
        # bad-gateway rather than a generic 500, and don't leak internals.
        logger.error("Quiz generation failed for topic=%r: %s", topic, e)
        raise HTTPException(status_code=502, detail="Failed to generate a valid quiz. Please try again.")
    except Exception as e:
        logger.exception("Unexpected quiz error for topic=%r", topic)
        raise HTTPException(status_code=500, detail="Internal error generating quiz.")
