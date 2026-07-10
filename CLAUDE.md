# CLAUDE.md — Learn Bridge AI (root guide)

This is the top-level contract for the whole repo: three independently-run services that together turn a user's CV into a personalized career roadmap. Read this before touching any of the three folders — it explains what we're building, the standard to hold, and how to work on any task here.

- **`backend/CLAUDE.md`** — Express + MongoDB + Redis/BullMQ API. Auth, CV upload, job orchestration, roadmap storage.
- **`frontend/CLAUDE.md`** — Next.js 16 (App Router) + React 19 dashboard. Auth UI, CV upload, roadmap/quiz views.
- **`ai/CLAUDE.md`** — FastAPI service. Stateless: takes CV text + role, calls an LLM provider, enriches with search results, returns a roadmap.

Read this file first. When a task is backend-, frontend-, or ai-service-specific, read the matching sub-guide too — they specialize this file, they don't conflict with it. Also read `DESIGN.md` before any UI work.

---

## 1. What this project is

**Learn Bridge AI** lets a user upload their CV, pick (or skip) a target role, and get back an AI-generated, multi-month career roadmap: phases, skills, milestones, and enriched learning resources (YouTube videos, articles) per step. Users can save roadmaps, list them, and revisit them later. Auth is email+password plus a 6-digit OTP second step (no third-party auth provider).

**The actual data flow, end to end** (confirmed against the code, not just the README):

1. Frontend (`/upload`) posts CV + role to backend `POST /api/v1/users/upload-cv` (protected route).
2. Backend uploads the file to Cloudinary, creates a `Job` document (Mongo), enqueues a BullMQ job on the `cv-processing` queue, responds `202`.
3. A **separate worker process** (`backend/workers/cv.worker.js` — not started by `npm run dev`, must be run manually) picks up the job: OCRs the CV via Tesseract.js, POSTs `{ job_id, cv_text, role }` to the `ai` FastAPI service's `POST /ai/roadmap`.
4. The `ai` service calls the configured LLM provider (Groq by default), parses the JSON roadmap out of the model's response, enriches each step with a YouTube link + article link (Serper API, with API-key-less scraping fallbacks), extracts top-7 skill tags, and returns it.
5. The worker writes `roadmap`/`tags`/`status: "completed"` back onto the `Job` document.
6. Frontend polls `GET /api/v1/users/job/:jobId` until `completed`, displays the roadmap, and optionally the user saves it via `POST /api/v1/roadmaps/save` (a separate, stricter-shaped `Roadmap` collection distinct from the raw `Job.roadmap`).

**The one thing that outranks features:** the CV-upload → roadmap pipeline has to actually complete, end to end, across four moving parts (backend API, Redis queue, worker process, AI service). It is trivial to "fix" the frontend or backend in isolation and still leave the pipeline broken because the worker wasn't running, Redis wasn't reachable, or the AI service choked on a malformed CV. Any change touching upload/roadmap generation must be verified through the *whole* pipeline, not just the layer you edited.

---

## 2. Our standard: correct → secure → fast → minimal

Same fixed priority order regardless of which service you're in. Never trade an earlier one for a later one.

- **Correct**: handle the edge cases the demo skips — a CV that OCRs to garbage/empty text, a roadmap the LLM returns with malformed JSON (the `ai` service already regex-strips markdown fences defensively — don't remove that), a user re-uploading while a previous job is still `processing`, a `role` that doesn't match the hardcoded enum (`data_scientist`, `software_engineer`, `machine_learning`, `ai`) on the `Job` model, concurrent refresh-token requests (the frontend already handles this with a single-flight queue in `config/instance/api.ts` — match that pattern, don't fire parallel refreshes elsewhere).
- **Secure**: this handles real PII — emails, password hashes, uploaded CVs (which likely contain name, address, phone, work history). Every route that reads/writes a user's data must check ownership (`roadmap.userId === req.user._id`, as `roadmaps.controller.js` already does — a 403 on mismatch, not a 404 that leaks existence). Refresh tokens must stay hashed at rest, consistently (see the known inconsistency in §7). Never log CV text, OTPs, or tokens in plaintext — the codebase currently does this a fair amount (see §7); don't add more.
- **Fast**: the AI roadmap generation is the slow path already (LLM call + up to 5 concurrent step-enrichment searches, ~20s ceiling each). Don't add synchronous work to the request path anywhere else. `getRoadmaps`/list endpoints have no pagination yet — if you touch them and a user could plausibly accumulate many roadmaps, add pagination rather than assuming small N forever.
- **Minimal**: see §3 — this codebase already reaches for real dependencies (BullMQ, Mongoose transactions, TanStack Query) rather than hand-rolling them. Keep doing that. Don't add a new dependency for something the stack already covers (see the reuse tables below).

---

## 3. Tech stack & what's already installed — use it, don't reinvent it

### Backend (`backend/`) — Node/Express, ESM

| Concern | Already installed — use it | Don't hand-roll |
|---|---|---|
| Web framework | `express` 5 | — |
| DB/ODM | `mongoose` 9 (MongoDB) | raw MongoDB driver calls |
| Auth tokens | `jsonwebtoken`, `bcrypt` | custom crypto/session tokens |
| Background jobs | `bullmq` + `ioredis` (queue: `cv-processing`) | setInterval polling, cron-in-process |
| File upload (in) | `multer` (disk staging → `public/uploads/`) | manual multipart parsing |
| File storage (out) | `cloudinary` | local/permanent disk storage |
| OCR | `tesseract.js` | shelling out to external OCR CLIs |
| Outbound HTTP | `axios` | raw `http`/`fetch` |
| Email | `nodemailer` (Gmail SMTP) — **this is the one actually wired up**; `resend` is installed and has a working module (`utils/emails.js`) but is dead-imported, never called | adding a third email lib |
| Testing | `jest` + `supertest` + `mongodb-memory-server` (replica-set mode, needed for the transaction in `registerUser`) | — |

**Not installed, and notably absent**: no validation library (Joi/Zod/express-validator) — validation is manual `if` checks in controllers; no rate-limiting library despite the README claiming rate limiting is a security feature (it isn't implemented); no structured logger (winston/pino) — it's raw `console.log` throughout; no centralized Express error-handling middleware. If you add any of these, that's a real gap-fill, not overengineering — but confirm with the user first since it's a cross-cutting change.

### Frontend (`frontend/`) — Next.js 16 App Router, React 19

| Concern | Already installed — use it | Don't hand-roll / don't add |
|---|---|---|
| Data fetching/mutations | `@tanstack/react-query` 5 | manual `useEffect` + `fetch` |
| HTTP client | single shared `axios` instance (`config/instance/api.ts`) — has request/response interceptors incl. single-flight 401 refresh queue | a second axios instance, or raw `fetch` for API calls |
| Client state | `zustand` 5 (with `persist`) — currently one store, `store/auth.ts` | Redux, Context-as-global-store for new domains |
| Icons | `lucide-react` | a second icon set |
| Styling | Tailwind CSS v4 (CSS-first config, no `tailwind.config.*` file — that's correct for v4, don't add one) | styled-components, CSS modules, inline `style=` |

**Not installed — confirm before adding**: no component/UI kit (no shadcn/ui, Radix, MUI). No form library (`react-hook-form`/`zod`) — forms are hand-rolled `useState`. No animation library — anything using Tailwind's `animate-in`/`fade-in`/`zoom-in` utility classes is likely relying on classes that **aren't actually shipped** (no `tailwindcss-animate` plugin installed) — verify these render before assuming they work. No testing framework at all (no Jest/Vitest/Playwright/Cypress) — frontend has zero automated test coverage today.

### AI service (`ai/`) — FastAPI, Python 3.12, fully synchronous

| Concern | Already installed — use it | Don't hand-roll / don't add |
|---|---|---|
| Web framework | `fastapi` + `uvicorn` | — |
| Validation | `pydantic` 2 (note: `CVRequest` still uses v1-style `class Config` — fine to leave, prefer `model_config = ConfigDict(...)` in new schemas) | — |
| Outbound HTTP | `requests` | — |
| Provider calls | raw `requests.post()` to Groq/HuggingFace/OpenAI REST endpoints — **no official SDKs installed** (no `groq`, `openai`, `huggingface_hub` packages) | installing an SDK is fine if it clearly simplifies something, but the current code deliberately avoids that dependency weight — ask before adding |

**Notable dead dependency**: `duckduckgo-search` is in `requirements.txt` but unused — `search_service.py` scrapes DuckDuckGo's HTML directly instead. Don't build on the assumption that package is wired up.

**Fully synchronous codebase** — every route/service function is `def`, not `async def`; concurrency for search enrichment uses `ThreadPoolExecutor`, not asyncio. This is a real scalability ceiling (one blocking request = one blocked worker thread), not a bug, but don't casually mix in `async def` routes without also fixing the sync I/O calls inside them — a half-async endpoint that still calls blocking `requests.post()` is worse than what's there now.

---

## 4. Before you write any code — clarify first

Don't jump straight to implementation. For any non-trivial change:

1. **Trace the real flow first.** This repo spans three processes plus a worker — a "small" backend change can silently break the worker's contract with the AI service, or the frontend's assumption about job-status polling shape. Read the actual caller/callee, not just the file you're editing.
2. **Find the gaps.** Is the request ambiguous about which of the three services it touches? Does it imply a change to the `Job`↔`Roadmap` split, the OTP flow, or the provider-switch logic in `ai/app/services/ai_service.py`? Ask rather than guess when a choice is genuinely the user's to make.
3. **For anything new or non-trivial, run `/idea-critique`** before it becomes a spec — stress-test it from the user/technical/product-fit angles. Pair with `brainstorming` for design exploration and `writing-plans` once the shape is clear.
4. **For auth, PHI-adjacent data (CVs, emails), or anything touching the token/refresh flow, run `/security-review`** after the change — this codebase already has one real refresh-token-hashing inconsistency in production code (§7); don't add a second one.

---

## 5. How we work — the per-task workflow

1. **Branch from `main`.** One branch per feature/fix, never commit directly on `main`.
2. **Plan and clarify** (§4).
3. **Write tests in the same change**, where a test framework exists for that layer:
   - Backend: Jest + Supertest + `mongodb-memory-server`, following the pattern in `backend/test/register/register.test.js` (only endpoint currently covered — everything else is untested; a good default is to add a test file alongside whatever you touch, not a giant retrofit).
   - AI service: there's no real test framework wired up (`test.py` is an ad-hoc script, not pytest, and only exercises the search-enrichment layer). If you add `pytest`, that's a legitimate gap-fill — confirm with the user first since it's a new dependency.
   - Frontend: no test framework exists. Don't invent one for a single small change; flag it to the user if a change is large enough to warrant one.
4. **Live-test the actual running app — always**, via the **claude-in-chrome** extension, before calling anything done. Unit tests (where they exist) verify logic, not the pipeline.

   **How to actually run this stack locally** (four things, three of them separate processes):
   - `cd ai && python run.py` → FastAPI on **port 8001** (hardcoded in `run.py`, `reload=True`).
   - `cd backend && npm run dev` → Express on **port 8000** (`PORT` env var).
   - **`cd backend && node workers/cv.worker.js`** → the BullMQ worker. **There is no npm script for this** — it is trivially easy to think CV upload is broken when actually the worker just isn't running. Always start it explicitly when testing the upload/roadmap flow.
   - `cd frontend && npm run dev` → Next.js on **port 3000** (Next's default, not overridden anywhere).
   - Redis and MongoDB must both be reachable. `backend/.env`'s `MONGO_URI` currently points at an Atlas cluster (cloud). **`REDIS_URL` is not currently set in `backend/.env`** — `queues/cv.queue.js` and `workers/cv.worker.js` both fall back to `127.0.0.1:6379` if it's unset, so either run local Redis or add `REDIS_URL` for the cloud instance before testing the upload pipeline.
   - Test the **golden path** (register → OTP → login → upload CV → wait for job completion → view roadmap → save it → list/view/delete it) and the edge cases that actually matter here: OTP expiry, wrong-role CV upload, a second upload while the first is still `processing`, refresh-token expiry mid-session (confirm the single-flight queue in `config/instance/api.ts` actually prevents duplicate refresh calls — watch the network tab).
5. **Commit continuously, with clear conventional messages** — this repo's history already does this well (`FIX: ...`, `FEATURE: ...` prefixes); keep matching that style unless told otherwise.
6. **Push and open a PR to `main` only once it's built, tested, and verified live** through the real pipeline above.

---

## 6. Good practices already in this codebase — honor them

Don't introduce a weaker parallel pattern where one of these already exists:

- **Two-step OTP login** (`loginUserStep1` → `verifyOTPAndLogin`) with a short-lived `sessionToken` JWT gating the second step — don't bypass this for new auth-adjacent flows.
- **Mongoose transaction** for the `User` + `Profile` creation in `registerUser` — keeps multi-document writes atomic. Use the same session pattern for any new multi-collection write that must succeed or fail together.
- **Refresh-token reuse detection**: `refreshAccessToken` clears the stored token and both cookies if the presented refresh token doesn't match what's stored — a real compromised-token response, not just a silent 401. Preserve this if you touch the refresh flow.
- **Ownership checks return 403, not 404**, on cross-user resource access (`getRoadmapById`/`deleteRoadmap`/`getJobStatus`) — consistent and correct; match it in any new resource endpoint.
- **BullMQ retry/backoff** already configured (`attempts: 3`, exponential backoff) on the `cv-processing` queue — don't add manual retry loops around it.
- **Single-flight token refresh** on the frontend (`config/instance/api.ts`'s `failedQueue`/`processQueue`) — prevents a burst of 401s from firing parallel refresh calls. Reuse this pattern if you add a second axios instance for any reason (better: don't add a second instance at all — see §3).
- **Zustand persists only the user object, deliberately excluding tokens** from localStorage (explicit comment in `store/auth.ts`) — access token lives in an in-memory module variable instead, refresh token is an httpOnly cookie the client never touches directly. Don't "fix" this by persisting tokens to localStorage; it's an intentional XSS-surface reduction.
- **Best-effort, non-blocking resource enrichment** in the AI service — a failed YouTube/article search for one roadmap step degrades to `None` rather than failing the whole request. Keep new enrichment sources failing the same way.

---

## 7. Known gaps and gotchas (from a full-codebase audit) — read before you touch these areas

These are real, currently-in-the-code issues surfaced by auditing all three services. Fix them if you're touching the area anyway; at minimum don't build new code on top of the broken assumption.

**Backend**
- **`utils/asyncHandler.js` swallows `ApiError` status codes.** A controller can `throw new ApiError(403, "...")` and the client will still receive a raw `{ message }` body with hardcoded HTTP 500 — the intended status code and the `ApiResponse`/`ApiError` shape are both lost. If you add a new thrown-error path, verify the actual HTTP response, don't assume the thrown status code survives.
- **Refresh-token storage is inconsistent.** `verifyOTPAndLogin` stores the refresh token **bcrypt-hashed**. `refreshAccessToken`'s rotation path stores the **new** refresh token **raw/unhashed**. A second refresh cycle will compare a raw stored value as if it were a hash — a real bug in the reuse-detection path. Fix this properly (hash consistently) if you touch token rotation.
- **Multer runs before auth on `/upload-cv`** (`upload.single("cv"), verifyUser, uploadCv`) — an unauthenticated request still writes a file to `public/uploads/` before being rejected.
- **Dead code**: `utils/emails.js`'s Resend-based `otpEmail` is imported in `user.controller.js` but never called; actual delivery goes through `utils/nodemailer.js`. `User.methods.isPasswordCorrect` on the model is unused (`utils/password.js`'s `decodePassword` is what's actually called).
- **Filenames have typos that are now load-bearing**: `utils/appiError.js` (not `apiError.js`), `middlewares/multer.middlware.js` (not `.middleware.js`). Match these exactly on import; don't "fix" the typo without updating every import site.
- **No centralized error-handling middleware** — every error path is manual per-route.
- **Env vars used in code but not documented anywhere**: `FRONTEND_URL` (CORS origin in `app.js`), `NODE_ENV` (cookie `secure` flag), `REDIS_URL` (queue/worker connection). There is also no `backend/.env.example` at all in the repo.
- **Only one backend endpoint has test coverage** (`POST /api/v1/users/register`) — everything else (login, OTP, upload, roadmap CRUD) is untested.

**Frontend**
- **Two pages are mock-only with real calls commented out**: `dashboard/page.tsx` and `quizzes/page.tsx` / `quizzes/[quizId]/page.tsx`. Don't assume "the dashboard works" — it's hardcoded data. `account-settings/page.tsx` and `change-password/page.tsx` are local-state-only stubs with `alert()` on submit, no API call at all.
- **Dead files**: `app/components/sidebar/Sidebar.tsx` (stray unused snippet — the real one is `components/sidebar/Sidebar.tsx`), `hooks/auth-hooks/useProtectedWrapper.tsx` and `usePublicWrapper.tsx` (both unused — actual route protection happens via imperative redirects inside `AuthProvider`, not these wrapper components; `usePublicWrapper`'s guard is literally commented out).
- **No shared UI primitives** — every modal/toast/skeleton is redefined per page. If you need a modal or toast in a new page, check whether it's worth extracting to a shared component rather than writing a fourth copy.
- **`NEXT_PUBLIC_API_BASE_URL` is independently re-read via `process.env` in both `config/instance/api.ts` and `useAuthProvider.tsx`**, and `useAuthProvider.tsx` calls the refresh endpoint with a raw `axios.post` that bypasses the shared interceptor-equipped instance — duplicated logic, easy to have them drift.
- **`globals.css` is largely untouched `create-next-app` boilerplate** — `body`'s `font-family: Arial, Helvetica, sans-serif` actually overrides the Geist font variables set up in `layout.tsx`, so the configured font isn't the one rendering. Dark mode CSS vars exist but barely differ from light mode.
- **No test framework at all.**

**AI service**
- **Every error surfaces as HTTP 500** with the raw exception string leaked to the caller (`roadmap.py`'s broad `except Exception`) — no differentiation between a bad CV, an upstream provider rate-limit, or an internal parse bug.
- **`SERPER_API_KEY` and `YOUTUBE_API_KEY` are used in code but missing from `.env.example`** — both are optional (graceful scraping fallback) but undocumented.
- **README is stale in two places**: it documents `roadmap` as a JSON *string* in the response (it's actually a parsed object) and omits the `tags` field entirely; it also states the HuggingFace default model is `mistralai/Mistral-7B-Instruct-v0.2` when `config.py` actually defaults to `HuggingFaceH4/zephyr-7b-beta`.
- **No auth between backend and AI service** — the worker calls `POST /ai/roadmap` with no API key/shared secret; it's trusted purely by network placement. Fine for local dev, worth revisiting before any real deployment.
- **`test.py` is not pytest** — it's an ad-hoc script with `print()`s, no assertions, and only covers the search-enrichment layer, not roadmap generation itself.

---

## 8. Environment variables — actual reference (not the stale README table)

**`backend/.env`** — confirmed in code: `PORT`, `MONGO_URI`, `RESEND_API_KEY` *(dead — unused)*, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_EXPIRY`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME`, `FASTAPI_URL`, `ROADMAP_TIMEOUT_MS`, `EMAIL_USER`, `EMAIL_PASSWORD`. Also read but **not currently in the file**: `FRONTEND_URL`, `NODE_ENV`, `REDIS_URL` (all have safe fallbacks except that `REDIS_URL`'s fallback is local-only Redis).

**`ai/.env`** — `AI_PROVIDER`, `GROQ_API_KEY`, `GROQ_MODEL` (optional override), `HUGGINGFACE_API_KEY`, `HUGGINGFACE_MODEL` (optional override), `OPENAI_API_KEY`. Also read but **missing from `.env.example`**: `SERPER_API_KEY`, `YOUTUBE_API_KEY` (both optional).

**`frontend/.env.local`** — only `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8000/api/v1` if unset).

---

## 9. Skills — when to reach for which

| Skill | Use it when |
|---|---|
| `/idea-critique` | Planning anything new or non-trivial, before it becomes a spec. |
| `brainstorming` | Exploring intent/requirements/design before implementation. |
| `writing-plans` | Turning an agreed spec into a step-by-step plan. |
| `/security-review` | Any change touching auth, tokens, CV/PII handling, or the AI-service network boundary. |
| `frontend-design` / `ui-ux-pro-max` / `impeccable` | Building or polishing UI — useful here specifically because there's no existing design system to defer to (§3). |
| `claude-in-chrome` | Live testing the full pipeline (§5, step 4) — mandatory before calling anything done. |
| `/code-review` or `/simplify` | Before opening a PR. |

---

## 10. Definition of done

- [ ] Task clarified and gaps closed before coding (§4).
- [ ] Work done on a new branch off `main`.
- [ ] Nothing hand-rolled that an installed dependency already covers (§3).
- [ ] Real edge cases handled, not just the golden path (§1, §2).
- [ ] Didn't build on top of a known-broken assumption from §7 without at least flagging it.
- [ ] Tests added where a framework exists for that layer (§5).
- [ ] **Live-tested via claude-in-chrome** with all four processes running (AI service, backend, worker, frontend) and Redis/Mongo reachable.
- [ ] Committed in meaningful increments with clear messages.
- [ ] Pushed and PR opened to `main` only once fully built, tested, and verified live.
