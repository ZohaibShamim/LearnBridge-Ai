# AI Service — Core Logic (the "services")

## What this is

These four files are the "brains" of the AI service. When someone uploads a CV and asks for a career roadmap, this is the code that actually does the thinking: it talks to an AI model (like ChatGPT, but here it can be Groq, HuggingFace, or OpenAI depending on configuration), turns the AI's answer into something the app can use, and searches the internet for YouTube videos and articles to attach to each learning step.

In a project like this, a "service" file is just a place for reusable logic that isn't tied to a specific web page or API route (a URL the app responds to, like `/ai/roadmap`). The route file's job is to receive the request and send back a response; the service files do the actual work in between — calling the AI, checking its answer makes sense, and fetching extra resources. Splitting it this way means the same logic (like "call the AI provider") can be reused by more than one route without copy-pasting it.

## File by file

### `ai/app/services/ai_service.py`

This file is responsible for talking to whichever AI provider is configured (Groq, HuggingFace, or OpenAI) and turning a CV into the raw text of a career roadmap.

**`ROADMAP_JSON_SCHEMA`** — lines 19–58 (a constant, not a function)
This is a strict "shape" (schema) that tells OpenAI exactly what fields a roadmap response must contain — for example, every step must have a `month`, `title`, `description`, `skills` list, and `subtopics` list, and every subtopic must have a `title` and `summary`. Why this exists: normally, when you ask an AI for JSON (a structured, computer-readable text format like `{"key": "value"}`), you just ask nicely in the prompt and hope it listens. In practice, that's not reliable — the comment in the code (lines 15–18) says that `gpt-4o-mini` kept silently leaving out the `"subtopics"` list even though the prompt asked for it. OpenAI has a stricter mode called "Structured Outputs" where you hand it this schema, and it becomes *impossible* for the AI to return valid output without every listed field being present. So this schema is a safety net — instead of trusting the AI to remember everything, the code forces it.

**`call_ai(prompt, system_prompt)`** — lines 61–74
This is a generic "send this text to whichever AI provider is configured" function. It takes a `prompt` (the actual question/instructions for the AI) and an optional `system_prompt` (background instructions that set the AI's role, like "you are a career advisor"). It checks the `AI_PROVIDER` setting and calls the matching private function — `_call_huggingface`, `_call_groq`, or `_call_openai`. If the setting is something unrecognized, it raises an error instead of silently failing. This function exists so both the roadmap feature and the quiz feature (see `quiz_service.py` below) can share one place that decides "which provider do we talk to," rather than duplicating that if/else logic in two files.

**`generate_roadmap_from_cv(cv_text, role)`** — lines 77–101
This is the main entry point for turning a CV into a roadmap. It takes the CV's extracted text and an optional target `role` (like `"software_engineer"`). Step by step:
1. It logs some debug info about the `role` value it received (lines 87–92) — leftover from tracking down an earlier bug where the role wasn't being passed through correctly.
2. It builds the actual prompt text by calling `roadmap_prompt(cv_text, role)` from a separate utility file.
3. It checks `AI_PROVIDER` and calls the matching provider function directly (not through `call_ai`, so it can pass the special `ROADMAP_JSON_SCHEMA` only when using OpenAI, at line 99).
4. It returns whatever raw text the provider sends back — this function does not parse the JSON itself; that happens later in the route that calls it.

**`_call_huggingface(prompt, system_prompt)`** — lines 103–162
Sends the prompt to Hugging Face's free inference API. Step by step:
- If no `HUGGINGFACE_API_KEY` is set, it raises an error immediately rather than making a doomed request.
- It formats the prompt using a special template (`<|system|>`, `<|user|>`, `<|assistant|>` tags) because the specific model used here (Zephyr) expects instructions in that exact format.
- It sends the request with `requests.post(...)`, with a 60-second timeout.
- If the request fails, it catches a few specific error types and turns them into friendlier messages: an HTTP error (`HTTPError`) — with special messages for "model no longer available" (status 410), "model still loading" (503), or "bad API key" (401); a timeout; or any other exception.
- If it succeeds, the response can come back in two shapes (a list or a dictionary) depending on Hugging Face's API — the code handles both.

**`_call_groq(prompt, system_prompt)`** — lines 164–207
Does the same job as `_call_huggingface` but talks to Groq's API instead, which uses the more standard "chat completions" format (a list of `{role, content}` messages, the same style OpenAI popularized). Step by step:
- Checks for `GROQ_API_KEY`, raises an error if missing.
- Builds a payload with the system prompt and user prompt as separate chat messages, plus generation settings (`temperature` — how random/creative the output is — and `max_tokens` — the maximum length of the reply).
- Sends the POST request with a 60-second timeout, with the same style of error handling as HuggingFace (bad key → 401 message, rate limit → 429 message, timeout, or generic failure).
- On success, pulls the actual text out of Groq's response shape: `response.json()["choices"][0]["message"]["content"]`.

**`_call_openai(prompt, system_prompt, json_schema)`** — lines 209–257
Does the same job again, but for OpenAI, and this is the one that can use the strict `ROADMAP_JSON_SCHEMA` described above. Step by step:
- Checks for `OPENAI_API_KEY`, raises an error if missing.
- Builds the same kind of chat-message payload as Groq.
- Sets `response_format`: if a `json_schema` was passed in (as `generate_roadmap_from_cv` does for the roadmap), it uses OpenAI's strict `json_schema` mode; otherwise it falls back to plain `json_object` mode, which only guarantees the reply is syntactically valid JSON, not that every field is present.
- Same error handling pattern as the other two providers (401 → bad key message, 429 → rate limit/quota message, timeout, generic failure).
- Returns the text content from the response, same shape as Groq's.

All three `_call_*` functions do exactly the same job — "ask an AI model for text back" — but each one has to speak a slightly different "dialect" (request shape, headers, response shape, error codes) because each company built its API differently.

---

### `ai/app/services/quiz_service.py`

This file is responsible for turning a topic (like "Python basics") into a validated multiple-choice quiz.

**`QuizGenerationError`** — lines 12–13
A custom error type (a Python `Exception` subclass). It's raised whenever the AI's quiz output can't be turned into something usable, so the calling code can catch this specific error rather than a generic one.

**`generate_quiz(topic, difficulty, num_questions)`** — lines 16–81
This function asks the AI for a quiz and then carefully checks (validates) that the answer is actually usable before handing it back. Step by step:
1. Builds a prompt via `quiz_prompt(topic, difficulty, num_questions)` and sends it to the AI using `call_ai` (line 26) — reusing the shared provider-dispatch function from `ai_service.py` instead of duplicating that logic.
2. Some AI models wrap their JSON answer in markdown code fences (like triple backticks) even when told not to. Line 29 uses a regular expression (a text-pattern search) to pull out just the `{...}` object, ignoring anything wrapped around it.
3. Tries to parse that text as JSON with `json.loads`. If parsing fails, it raises `QuizGenerationError` instead of letting the app crash with a raw error.
4. Checks that a `"questions"` list exists and isn't empty; if not, raises an error.
5. Loops through every question the AI returned and only keeps ones that pass all these checks (lines 44–76):
   - It's a dictionary/object (not some other type).
   - It has a `question` field and exactly 4 non-empty `options` (multiple choice needs exactly four choices).
   - Its `correct_index` (which option, numbered 0–3, is the right answer) can be converted to a whole number and is between 0 and 3.
   - Its `difficulty` value is one of `"easy"`, `"medium"`, or `"hard"` — if it's missing or invalid, it defaults to `"medium"` instead of rejecting the whole question.
   Anything that fails a check is silently skipped (using Python's `continue`), not the whole quiz — so one bad question doesn't ruin the rest.
6. If literally zero questions survived all that filtering, it raises `QuizGenerationError` — an empty quiz is treated as a failure.
7. Otherwise, it returns a clean dictionary with the topic and the surviving, validated questions.

The overall idea: the AI is not trusted to always follow instructions perfectly, so this function double-checks its work and throws out anything broken, rather than passing bad data further into the app where it could confuse a student taking the quiz or crash the scoring logic.

---

### `ai/app/services/search_service.py`

This file is responsible for finding a YouTube video and an article link for each piece of the roadmap, so the student has something to actually click and learn from, not just a text description.

**`enrich_roadmap_with_resources(roadmap)`** — lines 14–49
This is the main function this file is built around. It takes the whole roadmap (a dictionary with a list of `steps`, and each step can have its own list of `subtopics`) and attaches search results to every single one of them. Step by step:
1. It builds one big to-do list (`tasks`, lines 25–33): one search task per step (using the step's title + skills as the search query), and one more search task per subtopic inside that step (using the subtopic's title plus its parent step's title, so the search stays relevant — e.g., not just "React" but "React Hooks tutorial" style). For a roadmap with 12 steps and roughly 3 subtopics each, that's around 36+12 = ~48 searches to run.
2. Instead of running these ~48 searches one after another (which would be very slow), it uses a **thread pool** (`concurrent.futures.ThreadPoolExecutor`, line 37) with up to 10 workers. Think of a thread pool like having up to 10 people searching the internet at the same time instead of one person doing every search in a line — it doesn't make any single search faster, but it means many searches finish in the time it would normally take for just one or two, because they're all happening in parallel rather than waiting their turn.
3. For each task, it collects the result with `future.result(timeout=25)` — waiting up to 25 seconds for that one search to finish.
4. If any single search throws an error or times out, the `except` block (lines 44–46) catches it, prints a warning, and just sets that one step's or subtopic's resources to `{"youtube_video": None, "article": None}`. It does **not** let one failed search crash the whole roadmap — the rest of the steps still get their resources normally. This "best-effort" approach means a flaky network request never blocks a student from seeing their roadmap; that one step just quietly ends up without a video/article link.
5. Returns the same roadmap dictionary, now with a `"resources"` key added to every step and subtopic.

**`search_learning_resources(query)`** — lines 51–76
For a single search query, this runs a YouTube search and an article search *at the same time* using a small thread pool (2 workers, lines 62–64) — again, in parallel rather than one after the other, to save time. Each of the two searches also has its own 10-second timeout and its own `try/except`, so if the YouTube search fails but the article search succeeds (or vice versa), the successful one is still kept. Returns a dictionary like `{"youtube_video": ..., "article": ...}`.

**`search_youtube(query)`** — lines 78–100
Tries three different methods, in order, to find one YouTube video, stopping as soon as one works:
1. If a `YOUTUBE_API_KEY` is configured, try the official YouTube Data API (`search_youtube_api`).
2. If that didn't return anything and a `SERPER_API_KEY` is configured, try Serper (a paid Google-search API) restricted to YouTube results (`search_youtube_via_serper`).
3. If that also didn't work, fall back to scraping YouTube's own search results page directly, no API key needed (`search_youtube_scraping`).
If none of the three methods find anything, it returns `None` — no video for this query, but that's fine because of the best-effort handling described above.

**`search_youtube_api(query)`** — lines 102–148
Calls the real YouTube Data API v3 search endpoint, asking for exactly one video result with a specific set of filters (embeddable, medium length, relevance-sorted). It checks specifically for a "quota exceeded" error (YouTube API keys have a daily usage limit) and treats that the same as "no result" rather than crashing. Any other HTTP error or exception is caught and logged, also returning `None`.

**`search_youtube_via_serper(query)`** — lines 150–181
Uses the Serper API's general web search, but scopes the query to `site:youtube.com` so results are restricted to YouTube pages. It loops through the results looking for the first one whose link actually contains `youtube.com/watch` (a real video page, not a channel or playlist link).

**`search_youtube_scraping(query)`** — lines 183–216
The no-API-key fallback: it fetches YouTube's public search results page directly like a browser would (spoofing a `User-Agent` header so YouTube doesn't reject the request), then uses a regular expression to find the first `"videoId":"..."` pattern buried in the page's raw HTML/JavaScript, and builds a normal watch URL from it.

**`search_article(query)`** — lines 218–230
Same "try the good option, fall back to the free option" pattern as `search_youtube`: if `SERPER_API_KEY` is set, try Serper first (`search_with_serper`); otherwise (or if that fails) fall back to scraping DuckDuckGo's search results (`search_with_duckduckgo`), which needs no API key.

**`search_with_serper(query)`** — lines 232–284
Searches Google (via Serper) for `"<query> tutorial guide"`. It keeps a hand-picked list of "quality domains" (sites like `freecodecamp.org`, `realpython.com`, `geeksforgeeks.org`, etc. — lines 254–260) and first tries to return a result from one of those trusted teaching sites, skipping any YouTube links (since those are handled separately). If nothing from the trusted list turns up, it falls back to just the first non-YouTube result instead of returning nothing.

**`search_with_duckduckgo(query)`** — lines 286–321
The last-resort, no-API-key option: it POSTs a search query to DuckDuckGo's plain HTML search page (not its JSON API), then uses a regular expression to find the first result link in the raw HTML. DuckDuckGo wraps result links in its own redirect URL (containing `uddg=<the real link>`), so the code extracts and decodes the actual destination URL out of that wrapper before returning it.

---

### `ai/app/services/skill_service.py`

This file is responsible for figuring out what skills a user already has (based on their CV) versus what skills they still need for their target role — the "skill gap."

**`_clean_list(value, limit)`** — lines 12–29
A small helper function, not specific to skills — it takes any value and turns it into a clean list of strings: it drops anything that isn't already a list, strips whitespace, removes empty entries, removes case-insensitive duplicates (so `"Python"` and `"python"` count as the same skill and only the first one is kept), and caps the list at `limit` items (default 30) so one runaway AI response can't return an unbounded list.

**`extract_skills_and_gap(cv_text, role)`** — lines 32–77
This is the main function. It takes the CV text and an optional target `role`, and returns a dictionary with three lists: `extracted_skills` (what the user already has), `required_skills` (what the role needs), and `missing_skills` (the gap between them). Step by step:
1. If `cv_text` is empty or just whitespace, it immediately returns all-empty lists (line 42–43) — no point asking the AI about nothing.
2. It asks the AI (via the shared `call_ai` function) to analyze the CV against the role, using a prompt built by `skill_gap_prompt`. This whole step is wrapped in a `try/except` (lines 45–49): if the AI call itself fails for any reason, the function logs the error and returns the same all-empty result rather than crashing — this analysis is treated as a "nice to have," so its failure should never break the rest of the roadmap generation.
3. Same defensive JSON-extraction trick as the other files: it uses a regular expression to pull just the `{...}` object out of the AI's raw text reply (in case it's wrapped in markdown), in case the AI didn't return pure JSON.
4. Tries to `json.loads` that text; if parsing fails, again logs the error and returns the empty result instead of crashing.
5. Runs the AI's three lists (`extracted_skills`, `required_skills`, `missing_skills`) through the `_clean_list` helper to normalize them.
6. Here's the interesting part (lines 65–71): instead of just trusting whatever `missing_skills` list the AI returned, the code **recomputes the gap itself**. It builds a set (a collection with no duplicates) of the user's skills in lowercase, then builds `computed_missing` as every required skill that is *not* in that set — a straightforward "what's required minus what they have" calculation. It prefers this self-computed list over the AI's own answer, and only falls back to the AI's `missing_skills` list if `required_skills` came back empty (in which case there's nothing to compute a gap from). This matters because it means the "missing skills" answer is always mathematically consistent with the other two lists, even if the AI's own arithmetic/reasoning about what's missing was sloppy or wrong.
7. Returns the final dictionary of all three cleaned, consistent lists.
