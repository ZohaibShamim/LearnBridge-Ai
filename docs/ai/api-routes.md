# AI Service — API Routes (the endpoints)

## What this is

These two files define the actual web addresses (endpoints — URLs that a program can send a request to) that other parts of the app can call to talk to this AI service. For example, sending a POST request (a request that submits data, as opposed to a GET request which just asks for data back) to `/ai/roadmap` gets you back a career roadmap, and sending one to `/ai/quiz` gets you back a quiz. This AI service never talks to a user's browser directly — the only thing that ever calls these endpoints is the backend's worker process (`backend/workers/cv.worker.js`), a separate background program that picks up jobs and forwards them here.

## File by file

### `ai/app/api/v1/roadmap.py`

**Routes defined:**
- `POST /ai/roadmap` — takes a CV's text and a target job role, and returns a generated career roadmap plus some extra info (skill tags, skill gaps).

**Functions:**

#### `extract_tags_from_roadmap()` — lines 12–56

This is a helper function, meaning it's not called directly by a URL — it's used internally by the main endpoint below to do one specific job: pick out a short list of "tags" (skill labels, like "Python" or "SQL") that summarize the whole roadmap.

What it does, step by step:
1. It receives the finished roadmap (a dictionary/object with a `career_goal` and a list of `steps`) and a max number of tags to return (defaults to 7).
2. It loops through every step in the roadmap and collects all the `skills` listed on each step into one big list.
3. If it found any skills, it uses `Counter` (a built-in Python tool that counts how many times each item appears) to find the most frequently mentioned skills, and returns the top ones (up to `max_tags`).
4. If no skills were found anywhere (an edge case — maybe the AI didn't include a `skills` field on any step), it falls back to pulling words out of the `career_goal` text instead, skipping tiny filler words like "a", "the", "and". This way the function still returns *something* useful instead of an empty list.
5. If even that fails (no `career_goal` either), it returns an empty list rather than crashing.

There are a lot of `print(...)` debug lines sprinkled through this function — these just log what's happening at each step (useful for troubleshooting during development) and don't affect what the function returns.

#### `generate_roadmap()` — lines 58–116

This is the actual `POST /ai/roadmap` endpoint — the function that runs when someone sends a request to that URL.

What it does, step by step:
1. **Receives the request**: FastAPI (the web framework this service is built on) automatically parses the incoming request into a `CVRequest` object, which contains the CV text, a `job_id`, and the target `role`.
2. **Calls the AI**: it calls `generate_roadmap_from_cv()` (a separate service function, not shown here) which sends the CV text and role off to the LLM (large language model — the AI itself) and gets back raw text.
3. **Cleans up the AI's response** (lines 68–71): the AI is asked to reply with pure JSON (a structured text format for data), but sometimes it wraps its answer in a markdown code block anyway (those triple-backtick ```` ```json ... ``` ```` fences you see in chat apps), even when told not to. The line `re.search(r'\{[\s\S]*\}', roadmap_text)` uses a regex (a pattern-matching tool for text) to find everything between the very first `{` and the very last `}` in the response — which strips away any markdown wrapper text before or after the actual JSON. This exists purely to clean up that AI quirk.
4. **Parses the JSON**: `json.loads(roadmap_text)` turns that cleaned-up text into a real Python object it can work with.
5. **Validates the shape**: it checks that the parsed object actually has a `career_goal` and a `steps` field — if either is missing, it raises an error rather than pretending it has a valid roadmap.
6. **Enriches the roadmap**: it calls `enrich_roadmap_with_resources()` (another service function) to attach real learning resources — like a YouTube video and an article link — to each step.
7. **Extracts tags**: it calls the `extract_tags_from_roadmap()` helper described above to get a short list of skill tags for the whole roadmap.
8. **Extracts skills and gaps**: it calls `extract_skills_and_gap()` to figure out what skills the CV already shows, and which skills are still missing compared to the target role.
9. **Sends back the response**: a dictionary containing the `job_id`, the enriched `roadmap`, the `tags`, and the skill/gap information.

**Error handling** (lines 113–116): this whole process is wrapped in a try/except block (a way of saying "try this code, and if something goes wrong, handle it gracefully instead of crashing"):
- If step 4 (parsing the JSON) fails — meaning the AI's response still wasn't valid JSON even after the cleanup step — the user gets back an HTTP 500 error (a generic "something went wrong on the server" response) with a message saying the AI's response couldn't be parsed.
- If literally anything else in the function goes wrong (a network failure calling the AI, a missing field, any other bug), it's caught by a broader catch-all and also turned into an HTTP 500 error, with the raw error message included. Note: this means a client-side mistake (like a bad CV) and a genuine server bug both currently look the same to the caller — a known rough edge in this code, not something this doc is asking you to fix.

### `ai/app/api/v1/quiz.py`

**Routes defined:**
- `POST /ai/quiz` — takes a topic (and optionally a difficulty and number of questions), and returns a generated quiz.

**Functions:**

#### `create_quiz()` — lines 10–27

This is the `POST /ai/quiz` endpoint.

What it does, step by step:
1. **Receives the request**: FastAPI parses the incoming request into a `QuizRequest` object (containing `topic`, `difficulty`, and `num_questions`).
2. **Validates the topic** (lines 12–15): it strips whitespace off the topic and checks it isn't empty. If it is empty, it immediately raises an HTTP 422 error ("unprocessable entity" — the standard code for "your request data was wrong"), with the message "topic is required". This is treated as the caller's mistake, not the server's, which is why it's checked before anything else runs.
3. **Generates the quiz**: it calls `generate_quiz()` (a separate service function) with the topic, difficulty, and number of questions, and returns whatever quiz object comes back.

**Error handling** (lines 20–27), using a try/except block:
- If `generate_quiz()` raises a `QuizGenerationError` — meaning the AI produced something that couldn't be turned into a valid quiz — the error is logged, and the caller gets back an HTTP 502 error ("bad gateway" — the standard code for "an upstream service we depend on failed"), with a friendly message asking them to try again. It deliberately does *not* show the caller the raw internal error details.
- If anything else unexpected goes wrong, it's logged in full (with `logger.exception`, which also records the full technical stack trace for developers to debug later) and the caller just gets a generic HTTP 500 error with a plain "Internal error generating quiz." message — again, no internal details leaked to the caller.

This is a more careful pattern than `roadmap.py`'s error handling: it tells apart "the caller's input was bad" (422), "our AI/upstream step failed" (502), and "something truly unexpected broke" (500), instead of collapsing everything into one generic 500.
