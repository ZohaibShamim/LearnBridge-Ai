# Learn Bridge AI — Implementation Plan

Fix/build plan for every gap in [`AUDIT.md`](./AUDIT.md). Each task lists: **spec ref → files to touch → concrete solution → acceptance test**. Task IDs (`T-B1`, `T-A2`, `T-F3`) are referenced from the audit.

**Priority:**
- **P0 — spec-critical features** the platform is graded on but doesn't have (quiz, progress, skill-gap, PDF/DOCX).
- **P1 — loopholes** that make P0 unsafe or the golden path unusable in a real deployment (auth/correctness/email).
- **P2 — design-spec polish** and cleanup (onboarding, node states, admin, stubs, dead code).

Follow the repo workflow: branch off `main`, add tests where a framework exists (Jest backend / add pytest for AI / add Vitest for a big new frontend flow), and **live-test the full 4-process pipeline** (AI :8001, backend :8000, `node workers/cv.worker.js`, frontend :3000, Redis+Mongo reachable) before calling anything done.

---

## P0 — Missing spec features

### T-1 · Quiz system (R1.9, UC-05) — *largest single gap*
**Touches:** `ai/` (new quiz endpoint), `backend/` (model + routes + controller), `frontend/` (un-mock 3 pages).

**Design.** Quizzes are generated per roadmap step/skill by the LLM (the spec's "AI Quiz"), stored, taken, and scored server-side. Reuse the existing provider-dispatch pattern — do **not** add an LLM SDK.

1. **AI service — `POST /ai/quiz`.** New router mirroring `roadmap.py`. Input `{ topic|skill, difficulty, num_questions }`; prompt the model for strict JSON: `{ questions: [{ question, options[4], correctIndex, explanation }] }`. Reuse the `re.search(r'\{[\s\S]*\}', …)` + `json.loads` guard and a `response_model`. Keep the correct answers server-side only.
2. **Backend — models.** `models/quiz.schema.js` (`userId`, `roadmapId?`, `topic`, `difficulty`, `questions:[{question, options, correctIndex, explanation}]`) and `models/quizResult.schema.js` (`userId`, `quizId`, `answers:[{questionIndex, selected, isCorrect}]`, `score`, `total`, `timeSpent`, `completedAt`). Matches SDS `Quiz`/`QuizResult`.
3. **Backend — routes/controller** (`routes/quiz.routes.js`, mount `/api/v1/quizzes`, `router.use(verifyUser)`):
   - `POST /generate` → calls AI `/ai/quiz`, saves `Quiz`, returns it **without `correctIndex`**.
   - `GET /` and `GET /:quizId` (strip answers) — ownership 403 like roadmaps.
   - `POST /:quizId/submit` → score against stored `correctIndex`, persist `QuizResult`, return score + per-question correctness + explanations. **Instant scoring = R1.9.**
   - `GET /results?quizId=` → attempt history.
4. **Frontend — remove the mocks.** `quizzes/page.tsx:127` un-comment the real `useQuery`, delete the hardcoded array (`:137`). `quizzes/[quizId]/page.tsx` — delete `mockQuiz` (`:8`), fetch the real quiz, replace `handleCompleteQuiz`'s `alert` (`:117`) with `submitQuizAnswer`/`submit`. Wire `[quizId]/results/page.tsx`. The service layer (`config/services/quiz.service.ts`) already defines all the calls — just point them at the now-real endpoints.

**Note:** `quiz.service.ts` uses `selectedAnswer: number` (index) and `correctAnswer: number` — keep the index-based contract on the backend to avoid a rewrite.
**Acceptance:** generate a quiz from a roadmap skill → take it → submit → correct score + explanations returned and a `QuizResult` row exists; answers never appear in any GET response.

---

### T-2 · Progress tracking + real dashboard (R1.10, R1.11, UC-06)
**Touches:** `backend/` (progress model + routes), `frontend/` (roadmap viewer node completion + real dashboard).

1. **Model** `models/progress.schema.js`: `{ userId, roadmapId, completedSteps:[Number], quizResults:[ref], completedPercentage, lastUpdated }` (SDS `Progress`). One doc per (user, roadmap).
2. **Routes** `/api/v1/progress` (auth + ownership): `GET /:roadmapId`, `PATCH /:roadmapId/step` `{ month, completed }` → recompute `completedPercentage = completedSteps/totalSteps`, `GET /summary` → aggregate across roadmaps for the dashboard.
   - Simplest storage: reuse the saved `Roadmap` and add a `completedSteps:[Number]` field there rather than a second collection, if you prefer fewer models. Either is fine — pick one and be consistent.
3. **Frontend — roadmap viewer** (`roadmap/[jobId]/page.tsx` `StepCard`): add a "Mark complete" toggle → `PATCH …/step`; render **In-Progress vs Completed** node styling (green check / colored connector) — this also satisfies the SRS §5.5 usability requirement for node state colors. The "Start Learning Now" button (`:556`) currently only scrolls — make it advance real state.
4. **Frontend — dashboard** (`dashboard/page.tsx`): delete the hardcoded `stats`/`currentLearning`/`recentActivity` arrays (`:31-138`); drive them from `GET /progress/summary` + saved roadmaps + quiz results via `useQuery`. Charts satisfy R1.11 — a lightweight bar/progress-ring is enough; only add a chart lib if genuinely needed (Tailwind width-% bars already used elsewhere cover most of it).

**Acceptance:** mark a step complete → persists across reload → dashboard % and "courses in progress" reflect real data, not mocks.

---

### T-3 · Skill extraction + skill-gap detection (R1.6, R1.7)
**Touches:** `ai/` (extraction + gap), `backend/` (persist), `frontend/` (show gaps; optional edit).

This is the spec's differentiator ("fills skill gaps with AI") and is currently absent.

1. **Extraction (R1.6).** In the AI service add `extract_skills_from_cv(cv_text)` — pragmatic approach: **one LLM call** returning `{ skills: [...] }` from the CV text (do not add spaCy just to match the doc's wording; an LLM extraction is equivalent and consistent with the existing stack — note this substitution for the supervisor). Return these as a distinct `extracted_skills` field, separate from the roadmap-derived `tags`.
2. **Gap (R1.7).** Maintain a per-role required-skills reference (`ai/app/data/role_skills.py` — a dict keyed by the 4 roles, or ask the LLM for the canonical skill set of the target role). Compute `missing_skills = required − extracted`. Return `{ extracted_skills, required_skills, missing_skills }` and feed `missing_skills` into the roadmap prompt so the roadmap **explicitly targets the gaps** (tightens R1.4 too).
3. **Persist.** Add `extractedSkills`/`missingSkills` to `Job` (`jobs.schema.js`) and the saved `Roadmap`; the worker already writes `roadmap`/`tags` — add these two.
4. **Frontend.** Show "Skills you have / Skills to gain" on the roadmap page. The dashboard's fake "5 skill gaps" becomes real.

**Acceptance:** upload a CV for a role → response contains non-empty `extracted_skills` and a `missing_skills` set that differs from the CV's skills; roadmap steps reference the missing skills.

---

### T-4 · PDF / DOCX resume support (R1.5) — *fix the spec contradiction*
**Touches:** `backend/` (multer, cloudinary, OCR/text extraction), and the frontend claim already matches.

Currently every layer is image-only; the frontend already promises PDF. Pick **text-extraction over OCR** where possible (faster, cleaner than OCR'ing a PDF).

1. **Multer** (`multer.middlware.js:17`): allow `application/pdf` and `application/vnd.openxmlformats-officedocument.wordprocessingml.document` + exts `.pdf`, `.docx` (keep images).
2. **Cloudinary** (`cloudinary.js:17`): use `resource_type:"auto"` (or `"raw"` for docx) and widen/remove `allowed_formats`; images stay as-is.
3. **Text extraction** (`ocr.js` → generalize to `extractTextFromCV(url, mimeType)`):
   - PDF → `pdf-parse` (add dep) on the downloaded buffer; if it yields little text (scanned PDF), **fall back to Tesseract** on a Cloudinary-rasterized page image.
   - DOCX → `mammoth` (add dep) → raw text.
   - image → existing Tesseract path.
   - New deps: `pdf-parse`, `mammoth` — both are exactly the "use a library, don't hand-roll a parser" case; call it out in the PR.
4. Keep the worker contract unchanged (it just gets `cv_text`).

**Acceptance:** upload a real PDF and a real DOCX → job completes with sensible `extractedText` and a roadmap; a scanned-image PDF still works via OCR fallback.

---

## P1 — Loopholes (do alongside/just after P0; several are prerequisites for a safe demo)

### T-B1 · Fix `asyncHandler` (Audit §4.1)
`utils/asyncHandler.js` → honor `ApiError.statusCode` and return the `ApiResponse` shape:
```js
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    const status = err instanceof ApiError ? err.statusCode : 500;
    console.error(err);
    res.status(status).json(new ApiResponse(status, null, err.message || "Internal Server Error"));
  });
```
Verify a `throw new ApiError(403,…)` now yields a real 403. (Touches every error path — smoke-test login failure + upload-with-bad-role.)

### T-B2 · Consistent refresh-token hashing + await compare (Audit §4.2)
`user.controller.js`: hash on **every** write to `user.refreshToken` (add a `setRefreshToken(user, raw)` helper; fix `refreshAccessToken:366` which stores raw). Fix `:339` to `await bcrypt.compare(...)`. Unify cookie options (one constant; `secure` gated on `NODE_ENV`, not hardcoded `true` at `:347,369`).

### T-B3 · Auth before file write (Audit §4.3)
`user.routes.js:20` → `verifyUser, upload.single("cv"), uploadCv`.

### T-B4 · Rate limiting (Audit §4.4)
Add `express-rate-limit` (+ `rate-limit-redis`, Redis already present) on `/register`, `/login`, `/verify-otp`, `/resend-otp`.

### T-B5 · Enable OTP email (Audit §4.9)
`loginUserStep1:125` / `resendOtp:179` — uncomment `otpEmailViaNodemailer(...)`; keep the `console.log` behind a `NODE_ENV!=="production"` guard so dev stays convenient. Remove the dead Resend import path or finish that migration (`utils/emails.js` is imported but unused).

### T-B6 · Paginate `getRoadmaps` (Audit §4.8)
Add `?page=&limit=` (skip/limit + total count) to `roadmaps.controller.js:74`; update `roadmaps/page.tsx` fetch.

### T-B7 · Protect resume PII at rest (Audit §4.7, R1.10/§5.3)
At minimum: make Cloudinary CV uploads **private/authenticated** (signed URLs, `type:"authenticated"`) instead of public, and restrict `Job`/`Roadmap` reads to the owner (already 403-guarded — confirm no public CV URL leaks). If full field-level encryption of `extractedText` is required by the grader, encrypt before persist (Node `crypto` AES-GCM with a key from env) — call this out as a deliberate add.

### T-B8 · Roadmap data-shape drift (Audit §4.10)
Align the contract: either emit `step_number`/`duration` from the AI or (simpler) change `cv.service.ts:24` + viewer to read `month`. Persist `current_level`/`estimated_timeline`/`description` in `saveRoadmap` + `roadmap.schema.js`.

### T-B9 · Stop logging secrets/PII (Audit §4.11)
Remove `console.log("User found:", user)` (`:105`); log an id/email only. Strip `[DEBUG]` CV/skill prints in `ai/app/**` or move behind a logger level.

### T-A2 · AI service error taxonomy (Audit §4.6)
`roadmap.py` (and the new quiz route): empty/garbage `cv_text` → 422; provider error (propagate `_call_*` messages) → 502; internal → 500 with a **generic** message (stop leaking `str(e)`). Add `logging` instead of `print`.

### T-A3 · AI service shared-secret auth (Audit §4.5)
Add `X-Internal-Token` checked via a FastAPI `Depends()`; worker sends it (`FASTAPI_INTERNAL_TOKEN` env in both services). Blocks an open roadmap/quiz-generation endpoint once deployed.

---

## P2 — Design-spec polish & cleanup

- **T-F1 · Onboarding overlay** (SRS §5.7) — first-login "how to upload a CV / follow the roadmap" tips overlay; gate on a `hasOnboarded` flag (localStorage or `Profile`).
- **T-F2 · Roadmap node state colors** (SRS §5.5) — covered by T-2 step 3; ensure completed/in-progress use color **and** icon (accessibility rule).
- **T-3b · Human-in-the-loop skill editing** (SDS §5) — let the user edit `extracted_skills` before roadmap/gap generation. Do after T-3.
- **T-5 · Admin actor** (SRS §4.2.1) — add `"admin"` to the `user.model.js:11` role enum; an admin-guard middleware; minimal admin routes (list users, view aggregate progress). Only if the grader weights the Admin actor — it's under-specified in the SRS.
- **T-F5 · Wire or remove stubs** (Audit §4.12) — implement `account-settings` (profile update: needs a `PATCH /users/profile` route — none exists yet) and `change-password` (`POST /users/change-password`) against real endpoints, or clearly mark as out-of-scope. Delete dead files: `app/components/sidebar/Sidebar.tsx`, `hooks/auth-hooks/useProtectedWrapper.tsx`, `usePublicWrapper.tsx`.
- **T-6 · Docs/env hygiene** — add `backend/.env.example` + `ai/.env.example` (document `FRONTEND_URL`, `NODE_ENV`, `REDIS_URL`, `SERPER_API_KEY`, `YOUTUBE_API_KEY`, new `FASTAPI_INTERNAL_TOKEN`); add an `npm run worker` script (there is none — the worker is easy to forget to start); fix stale README claims (roadmap is an object not a string; `tags` field; HF default model).
- **T-7 · Tests** — backend: cover login/OTP, roadmap ownership, and the new quiz/progress routes (Jest+Supertest, existing pattern). AI: add pytest for JSON-extraction, tag/skill extraction, quiz parsing (mock HTTP). Frontend: introduce Vitest when wiring the quiz flow.

---

## Suggested sequencing (milestones)

1. **M1 — Make the golden path deployable & safe:** T-B1, T-B2, T-B3, T-B5, T-B9, T-A2, T-A3. (Small, high-value; unblocks real end-to-end login + trustworthy errors.)
2. **M2 — Resume ingestion to spec:** T-4 (PDF/DOCX) + T-3 (skill extraction + gap). These feed everything downstream.
3. **M3 — Assessment & tracking:** T-1 (quiz) then T-2 (progress + real dashboard). Quiz results flow into progress.
4. **M4 — Hardening & polish:** T-B4, T-B6, T-B7, T-B8, T-5, T-F1, T-F5, T-6, T-7.

Each milestone is independently demoable and should be branched, tested, and PR'd to `main` per the repo workflow, verifying the full 4-process pipeline live.
