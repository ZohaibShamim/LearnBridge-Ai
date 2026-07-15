# AI Service — Data Schemas (Pydantic Models)

## What this is

These two files don't do any real "work" — they just describe the *shape* of the data flowing into and out of the AI service, like a form template that lists exactly which fields are required and what type each one must be (a piece of text, a whole number, a list, etc). This kind of shape-description is called a **schema** or **model**, and the library used to write them here is **Pydantic**. The reason that's useful: Pydantic automatically checks incoming data against the model and rejects anything that doesn't match — so if a field is missing or the wrong type, the request gets stopped and an error is returned before any of your actual logic even runs.

## File by file

### `ai/app/schema/cv.py`

This file has one model: `CVRequest` — lines 4–10. It describes exactly what the backend worker must send to the AI service when it asks for a career roadmap to be generated.

Fields:
- **`job_id`** (line 5) — a string (`str`), required. This is the unique ID of the CV-processing job in the database, so the AI service's response can be matched back to the right job.
- **`cv_text`** (line 6) — a string (`str`), required. This is the plain text that was extracted (via OCR — Optical Character Recognition, the process of turning an image or scanned document into text) from the user's uploaded CV file.
- **`role`** (line 7) — an optional string (`Optional[str]`, defaults to `None`). This is the target job role the user picked (e.g. "software_engineer"). Because it's optional, a user can ask for a roadmap without specifying a target role, and the AI service will just generate a more general one.

There's also a small `Config` class (lines 9–10) with `from_attributes = True`. In plain English: this just tells Pydantic it's allowed to build a `CVRequest` from an object with matching attributes (not only from a plain dictionary) — a minor convenience setting, not a field.

### `ai/app/schema/quiz.py`

This file has three models, used for generating and returning quiz questions on a topic.

**`QuizRequest`** — lines 5–8. This is what a caller sends in to *ask* for a quiz to be generated.
- **`topic`** (line 6) — a string (`str`), required. The subject the quiz should be about (e.g. "Python basics").
- **`difficulty`** (line 7) — a string (`str`), optional, defaults to `"mixed"`. How hard the questions should be — the comment in the code says the allowed values are `"easy"`, `"medium"`, `"hard"`, or `"mixed"` (Pydantic doesn't enforce that exact list here, it's just documented in a comment).
- **`num_questions`** (line 8) — a whole number (`int`), optional, defaults to `5`. How many quiz questions to generate. It uses Pydantic's `Field(..., ge=3, le=15)`, which means "greater than or equal to 3, less than or equal to 15" — so Pydantic will automatically reject a request asking for, say, 1 or 100 questions.

**`QuizQuestion`** — lines 11–16. This describes a single quiz question, and is used as a building block inside `QuizResponse` below.
- **`question`** (line 12) — a string (`str`), required. The actual question text shown to the user.
- **`options`** (line 13) — a list of strings (`List[str]`), required. The multiple-choice answer options for this question.
- **`correct_index`** (line 14) — a whole number (`int`), required. The position (index) in the `options` list of the correct answer.
- **`explanation`** (line 15) — an optional string (`Optional[str]`, defaults to `None`). An optional explanation of why the correct answer is correct, shown to the user after they answer.
- **`difficulty`** (line 16) — a string (`str`), optional, defaults to `"medium"`. The difficulty level of this specific question.

**`QuizResponse`** — lines 19–21. This is what the AI service sends *back* after generating a quiz.
- **`topic`** (line 20) — a string (`str`), required. Echoes back the topic the quiz was generated for.
- **`questions`** (line 21) — a list of `QuizQuestion` objects (`List[QuizQuestion]`), required. The actual generated quiz questions, each shaped exactly like the `QuizQuestion` model described above.
