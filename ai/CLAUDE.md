# CLAUDE.md — AI Service (`ai/`)

FastAPI service, fully stateless. Takes CV text + optional target role, calls a configurable LLM provider (Groq/HuggingFace/OpenAI), enriches the result with YouTube/article resources, and returns a structured roadmap. Called only by the backend's BullMQ worker (`backend/workers/cv.worker.js`) — never by the browser. Read the root `../CLAUDE.md` first.

---

## 1. Priority order

**Correct → secure → scalable → minimal.** In this service specifically: "correct" means the response actually matches what the router promises (currently no `response_model` is declared — see §4); "secure" means this internal-only endpoint doesn't become an open door if it's ever reachable beyond localhost (see §6); "scalable" means the fully-synchronous request handling (see §5) gets a real look before traffic grows, not after.

---

## 2. Use what's installed — don't hand-roll it

| Concern | Use this (already installed) | Don't |
|---|---|---|
| Web framework | `fastapi` + `uvicorn` | — |
| Validation | `pydantic` 2 | manual dict-key checking |
| Outbound HTTP | `requests` | shelling out, raw sockets |

**Deliberately not installed — don't add without a reason:**
- **No LLM provider SDKs** (`groq`, `openai`, `huggingface_hub`). Every provider is called via raw `requests.post()` to its REST endpoint. This is a real, working choice that keeps the dependency footprint small and the three providers structurally identical (`_call_groq`/`_call_huggingface`/`_call_openai` all follow the same shape in `ai_service.py`). If you add a fourth provider, follow that same raw-`requests` pattern rather than pulling in an SDK for just one provider — consistency across providers matters more here than any single SDK's convenience methods.
- **`duckduckgo-search` is in `requirements.txt` but unused** — `search_service.py` scrapes DuckDuckGo's HTML directly instead. Don't build on the assumption that package is wired up; either use it properly or remove it from `requirements.txt` next time you touch dependencies.
- **No `pydantic-settings`.** Config (`core/config.py`) is plain `os.getenv()` calls. Fine at the current size (a handful of keys); if config grows past ~10 keys or needs validation (e.g., rejecting an unknown `AI_PROVIDER` value at startup instead of at first request), migrate to a `BaseSettings` class rather than adding more bare `os.getenv()` calls.
- **No test framework** — see §7.

---

## 3. Architecture

```
run.py                      → entrypoint: uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
                               host/port are HARDCODED here, not env-driven — reload=True is dev-only config
app/main.py                  → FastAPI() instance, includes the roadmap router
app/api/v1/roadmap.py         → the one endpoint: POST /ai/roadmap (router prefix is /ai — "v1" is organizational
                               only, NOT mounted in the actual URL path; don't assume /api/v1/... is reachable)
app/core/config.py            → env var loading (AI_PROVIDER, per-provider keys/models/urls)
app/schema/cv.py              → CVRequest pydantic model (job_id, cv_text, role)
app/services/ai_service.py    → provider dispatch: generate_roadmap_from_cv() → _call_groq/_call_huggingface/_call_openai
app/services/search_service.py → resource enrichment: YouTube + article search per roadmap step, ThreadPoolExecutor fan-out
app/utils/prompt.py           → roadmap_prompt() — the one prompt template, role-aware
```

**Request flow:** `CVRequest` in → `generate_roadmap_from_cv(cv_text, role)` calls the configured provider → router regex-strips markdown fences and `json.loads()`s the result → validates `career_goal`/`steps` keys exist → `enrich_roadmap_with_resources()` fans out YouTube/article search per step (concurrent, `ThreadPoolExecutor(max_workers=5)`) → `extract_tags_from_roadmap()` pulls top-7 skills via `collections.Counter` → returns `{job_id, roadmap, tags}`.

**The defensive JSON extraction (`re.search(r'\{[\s\S]*\}', ...)`) exists because the prompt asks the LLM for pure JSON but models sometimes wrap it in markdown fences anyway.** Don't remove this regex step even if it looks redundant — it's there because of observed real-world LLM output, not speculatively.

---

## 4. Conventions

**Declare `response_model` on the route.** `POST /ai/roadmap` currently returns a raw dict with no `response_model`, so FastAPI can't validate or document the actual response shape — the OpenAPI docs at `/docs` are less useful than they should be, and a shape regression (e.g., `tags` silently disappearing) wouldn't be caught by FastAPI itself. Add a `RoadmapResponse` pydantic model (`job_id: str`, `roadmap: dict` or a fully-typed `Roadmap` model, `tags: list[str]`) and set it as the route's `response_model` next time this file is touched.

**Narrow the exception handling — don't let everything become a 500.** `roadmap.py` currently catches `json.JSONDecodeError` distinctly (good) but then has one broad `except Exception` that turns *everything else* — a bad CV (client error), an upstream provider rate-limit (retryable), or a genuine internal bug — into the same `HTTPException(500, detail=str(e))`, leaking the raw exception string to the caller. When you touch this handler, distinguish at least: malformed/empty `cv_text` → 422, upstream provider error (rate limit, auth failure — `_call_groq`/`_call_huggingface` already raise provider-specific messages, don't discard that specificity) → 502, and only genuine internal errors → 500 with a generic message (not the raw exception text).

**Replace `print()` with `logging`.** Every diagnostic today — including the debug-heavy `[DEBUG]`-prefixed lines left in `roadmap.py` and `ai_service.py` from a prior "role" field bug — is a raw `print()`. These always fire, can't be leveled or suppressed in production, and don't include a timestamp or request id. When you touch a file with `print()` calls, replace them with Python's `logging` module (`logger = logging.getLogger(__name__)`, `logger.debug(...)`/`.info(...)`/`.error(...)`) rather than adding another `print`.

**Comments: sparse, and only for the non-obvious.** Same policy as the other two services. Worth a comment: why the JSON-extraction regex exists (see above), why `AI_PROVIDER` defaults to `groq` specifically (free tier + fast inference — if that's the reason, say so), why search failures are swallowed per-resource instead of failing the whole request (best-effort enrichment is a deliberate choice — see §5). Not worth a comment: what a dict comprehension does.

---

## 5. Scalability — this service is fully synchronous today

Every route handler and service function is `def`, not `async def`. Concurrency for the search-enrichment fan-out comes from `ThreadPoolExecutor`, not `asyncio`. This means **one request occupies one worker thread for the full duration of the LLM call plus all search enrichment** — acceptable at today's traffic (one internal caller, the backend worker, processing one CV at a time), a real ceiling the moment multiple CVs are processed concurrently or this service gets a second caller.

If you're adding new I/O (a new provider call, a new search source): the lowest-risk improvement is switching `requests` to `httpx.AsyncClient` and making the relevant route `async def` — FastAPI and `httpx` are already async-capable, this service just isn't using that capability yet. **Don't half-do this** — an `async def` route that still calls blocking `requests.post()` inside it is worse than the current fully-sync version (it blocks the event loop instead of just occupying a thread pool worker). If you convert one path, convert its full call chain.

**No caching exists.** Every roadmap generation re-hits the LLM and re-runs all search enrichment from scratch, even for an identical `(cv_text, role)` pair. Not worth solving speculatively — but if this becomes a hot path (repeated re-generation requests, cost pressure from the LLM provider), an `lru_cache` keyed on a hash of `(cv_text, role)` is the first thing to reach for, before anything more elaborate.

**Search enrichment is deliberately best-effort.** A failed YouTube/article search for one step degrades to `None` rather than failing the whole roadmap request (`search_service.py`). Keep this property for any new enrichment source you add — a resource-search failure should never be the reason a user doesn't get their roadmap.

---

## 6. Security

**This endpoint has no authentication.** The backend worker calls `POST /ai/roadmap` with no API key, bearer token, or shared secret — it's trusted purely by network placement (same machine / private network in dev). This is acceptable *only* as long as this service is never reachable from outside that trust boundary. Before this is deployed anywhere with a public or semi-public network path, add a shared-secret header (`X-Internal-Token` checked via a FastAPI `Depends()`) that only the backend knows — don't ship this service publicly reachable and unauthenticated.

**Exception messages currently leak to the client** (`detail=str(e)`, see §4) — this can expose internal file paths, provider error internals, or stack-trace-adjacent detail to whatever calls this endpoint. Narrowing the exception handling (§4) also closes this leak — treat them as the same fix.

---

## 7. Testing

**`test.py` is not a real test suite** — it's a 16-line ad-hoc script with `print()`s and no assertions, and it only exercises the search-enrichment layer against live network calls (real Serper/YouTube/DuckDuckGo requests), never the roadmap-generation path itself. Don't run it as a regression gate — it isn't one.

When you next touch this service in a way that warrants tests, reach for **`pytest`** (the standard choice, zero-friction with FastAPI's `TestClient`/`httpx.AsyncClient` test fixtures). Priority order: (1) the JSON-extraction/parsing logic in `roadmap.py` — feed it a markdown-fenced response, a bare-JSON response, and a malformed response, assert the right thing happens for each; (2) `extract_tags_from_roadmap`'s skill-frequency logic; (3) each provider function (`_call_groq` etc.) with `requests` mocked, asserting the right error message surfaces for 401/429/etc. Don't write tests against live provider APIs — mock the HTTP layer.

---

## 8. Environment variables

Required: `AI_PROVIDER` (`groq` | `huggingface` | `openai`, defaults to `groq`), and the key for whichever provider is selected (`GROQ_API_KEY`, `HUGGINGFACE_API_KEY`, or `OPENAI_API_KEY`). Optional per-provider model overrides: `GROQ_MODEL` (default `llama-3.3-70b-versatile`), `HUGGINGFACE_MODEL` (default `HuggingFaceH4/zephyr-7b-beta` — note the project README claims a different default, `mistralai/Mistral-7B-Instruct-v0.2`; trust `core/config.py`, not the README, and fix the README when you're next in this file). `OPENAI_MODEL` is **not** overridable — `gpt-3.5-turbo` is hardcoded in `ai_service.py`; add the env override if this becomes a real gap.

**Used in code but missing from `.env.example`** — add these when you next touch that file: `SERPER_API_KEY` (optional — enables Serper-based search instead of raw scraping fallbacks) and `YOUTUBE_API_KEY` (optional — enables the official YouTube Data API instead of scraping).

---

## 9. Definition of done (AI service)

- [ ] New route declares a `response_model` rather than returning a raw dict.
- [ ] New error paths distinguish client error / upstream provider error / internal error — not everything collapses to a bare 500 with the raw exception leaked.
- [ ] No new `print()` — use `logging` for anything you add.
- [ ] If you added `async def` anywhere, the full call chain underneath it is actually async (no blocking `requests` call left inside).
- [ ] New search/enrichment sources fail per-resource (return `None`), never the whole request.
- [ ] `.env.example` updated if you added or now depend on a new env var.
- [ ] Live-tested against the real backend worker call path (`job_id`/`cv_text`/`role` payload), not just `curl` in isolation — the shape the worker sends must match what `CVRequest` expects.
