from pydantic import BaseModel, Field
from typing import List, Optional


class QuizRequest(BaseModel):
    topic: str
    difficulty: str = "mixed"          # "easy" | "medium" | "hard" | "mixed"
    num_questions: int = Field(default=5, ge=3, le=15)


class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct_index: int
    explanation: Optional[str] = None
    difficulty: str = "medium"


class QuizResponse(BaseModel):
    topic: str
    questions: List[QuizQuestion]
