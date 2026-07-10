# Learn Bridge AI — Requirements Audit & Gap Analysis

**Audited against:** `SRS final.docx` (Software Requirements Specification) and `12-SDS.docx` (Software Design Specification).
**Audit basis:** every requirement below is traced to the actual code in `backend/`, `ai/`, and `frontend/` — not to the README. File references are `path:line`.
**Companion doc:** [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) — the fix/build plan with concrete solutions for everything flagged here.

---

## 1. Executive summary

The **core pipeline works**: register → OTP login → pick role → upload CV → async job (Cloudinary + BullMQ + worker) → AI generates a 12-month roadmap (Groq LLM) with per-step YouTube/article resources → view → save → list/delete. That covers roughly **half** of the specified functional requirements well.

The other half of the spec is **missing or faked**:

| Headline gap | Spec ref | Reality |
|---|---|---|
| **Quiz system** | R1.9, UC-05 | 100% mock UI. No backend route, no model, no AI generation, no scoring. |
| **Progress tracking** | R1.10, UC-06 | No model, no endpoints, no way to mark a step done. |
| **Progress dashboard/analytics** | R1.11 | Hardcoded mock numbers. |
| **Skill extraction from resume** | R1.6 | "Tags" come from the *generated roadmap*, not from the CV. No NLP. |
| **Skill-gap detection** | R1.7 | Does not exist. Prompt mentions "transferable skills" in prose only. |
| **PDF / DOCX resume upload** | R1.5 | Backend accepts **only JPG/PNG**. Frontend offers PDF → backend rejects it. DOCX unsupported everywhere. |

On top of the feature gaps there are **security and correctness loopholes** (§4): error status codes swallowed, inconsistent refresh-token hashing, an unauthenticated file-write path, no rate limiting, an open internal AI endpoint, and OTP email delivery currently disabled.

**Bottom line:** the demo-happy path is solid; the parts of the spec that make it a *learning platform* (assess → track → close skill gaps) are not built. See the plan for sequencing.

---

## 2. Functional requirements traceability (SRS §4.1)

Legend: ✅ Done · ⚠️ Partial / not to spec · ❌ Missing (or mock-only)

| Ref | Requirement | Status | Evidence & notes |
|---|---|---|---|
| **R1.1** | Register an account | ✅ | `backend/controllers/user/user.controller.js:19` `registerUser`, atomic `User`+`Profile` transaction. `frontend/app/(auth)/signup/page.tsx`. |
| **R1.2** | Authenticate via secure login (JWT) | ✅ | Two-step OTP login: `loginUserStep1:98` → `verifyOTPAndLogin:189`. JWT access + refresh (`user.model.js:19-42`). Exceeds spec (adds OTP). ⚠️ but OTP email is **disabled** — see §4.9. |
| **R1.3** | Choose career domain (AI/ML/DS/SE) | ✅ | Role enum `data_scientist, software_engineer, machine_learning, ai` (`jobs.schema.js:23`); UI in `upload/page.tsx:12`. |
| **R1.4** | Generate personalized roadmap | ✅ | `worker → POST /ai/roadmap` (`ai/app/api/v1/roadmap.py:57`) → Groq (`ai_service.py:98`). Prompt is role-aware (`prompt.py`). ⚠️ SRS says ≤10s; real time is ~15–25s (LLM + up to 5 enrichment searches) — matches NFR §5.1 (15–20s), not the R1.4 table's 10s. |
| **R1.5** | Upload resume — **PDF/DOCX supported** | ⚠️❌ | Upload + Cloudinary + job works, **but only for images.** Multer allows only jpg/png (`multer.middlware.js:17`), Cloudinary hardcodes `resource_type:"image"` + `allowed_formats:["jpg","jpeg","png"]` (`cloudinary.js:18-20`), OCR is Tesseract-on-image (`ocr.js`). **Frontend advertises PDF** (`upload/page.tsx:142,382`) → a PDF upload is rejected by multer. **DOCX is unsupported at every layer.** This is the single biggest spec-vs-code contradiction. |
| **R1.6** | Extract skills from resume (NLP) | ⚠️ | No resume-skill extraction. `extract_tags_from_roadmap` (`roadmap.py:11`) pulls the top-7 skills **out of the roadmap the LLM just wrote**, not out of the CV. `Profile.skills` (`profile.model.js:24`) exists but is never populated. SDS names **spaCy**; spaCy is not installed (`ai/requirements.txt`). |
| **R1.7** | Identify missing / gap skills | ❌ | No skill-gap logic anywhere in the codebase (grep-confirmed). The prompt asks the model to "identify transferable skills" narratively; there is no structured *have-vs-need* comparison and no "missing skills" output field. |
| **R1.8** | Recommend learning resources (24/7) | ✅ | Per-step enrichment: YouTube + article via Serper with scraping fallback (`ai/app/services/search_service.py`), best-effort. Rendered in `roadmap/[jobId]/page.tsx` `ResourceCard`. |
| **R1.9** | Conduct quizzes (instant scoring) | ❌ | **Mock only.** `quizzes/page.tsx:137` and `[quizId]/page.tsx:8` render hardcoded arrays; the real `useQuery` is commented out (`quizzes/page.tsx:127`). `quiz.service.ts` calls `/quizzes*` endpoints that **do not exist** on the backend. No `Quiz`/`QuizResult` model, no AI quiz generation. |
| **R1.10** | Store user progress (encrypted) | ❌ | No `Progress` model, no progress routes, no per-step completion state. Nothing persists learning progress. |
| **R1.11** | Display progress analytics (charts) | ❌ | `dashboard/page.tsx:31-138` is entirely hardcoded (courses, hours, scores, "5 skill gaps"). No data source. |

**Score: R1.1–R1.4 ✅, R1.8 ✅ (5/11). R1.5, R1.6 ⚠️ (2/11). R1.7, R1.9, R1.10, R1.11 ❌ (4/11).**

---

## 3. Use-case & design coverage (SRS §4.2, SDS §7)

### 3.1 Use cases
| UC | Name | Status | Note |
|---|---|---|---|
| UC-01 | Register / Login | ✅ | Full, plus OTP second factor. |
| UC-02 | Upload Resume | ⚠️ | Works for images; PDF broken, DOCX missing (R1.5). |
| UC-03 | Generate & View Roadmap | ✅ | Full, with polling UI. |
| UC-04 | Access Study Resources | ✅ | Per-step resources shown in the roadmap viewer. |
| UC-05 | Take AI Quiz | ❌ | Mock. |
| UC-06 | Track Progress | ❌ | Mock dashboard, nothing persisted. |

### 3.2 SDS design classes (SDS §7.1) & data entities (SDS §7.2)
| SDS class / entity | Built? | Note |
|---|---|---|
| `User` | ✅ | Split into `User` + `Profile` (reasonable). |
| `Resume` | ⚠️ | No dedicated model. Resume data (`cvUrl`, `extractedText`) lives on the transient `Job` doc. SDS defines a persistent Resume table — not matched. |
| `Skill` | ❌ | No entity. `Profile.skills` array exists but unused. |
| `LearningRoadmap` | ✅ | `roadmap.schema.js`. ⚠️ save drops `current_level`/`estimated_timeline` (see §4.10). |
| `Quiz` | ❌ | Missing. |
| `QuizResult` | ❌ | Missing. |
| `Progress` | ❌ | Missing. |
| `AIService` | ✅ | FastAPI service. |

### 3.3 SDS design behaviors specified but not built
- **Human-in-the-loop skill editing** (SDS §5 "Risks" — user edits extracted skills *before* gap analysis). Not built (depends on R1.6/R1.7 existing first).
- **Roadmap node In-Progress / Completed states** (SRS §5.5 Usability — "different colored lines/icons for In-Progress or Completed"). Not built; steps have no state.
- **Onboarding "How-to-Use" overlay** for first-time users (SRS §5.7 User Documentation). Not built.
- **Admin actor** (SRS §4.2.1 — "Admin: manages system data and users, monitors progress"). No admin role (`user.model.js:11` enum is `["student","teacher"]`, no `admin`), no admin routes, no admin UI.

---

## 4. Loopholes & issues (must-address, independent of new features)

These are live problems in the current code. Several are also flagged in the repo's own `CLAUDE.md` guides; they are consolidated here with spec impact.

**4.1 Error status codes are swallowed (correctness).** `utils/asyncHandler.js` catches every error and always responds `500 { message }`, discarding the `ApiError` status and the `ApiResponse` shape. A controller's `throw new ApiError(403, …)` reaches the client as a raw 500. Breaks SRS §5.2 "graceful error message". → Fix in plan T-B1.

**4.2 Refresh-token hashing is inconsistent (security).** `verifyOTPAndLogin:219` stores the refresh token **bcrypt-hashed**; `refreshAccessToken:366` stores the rotated token **raw**. Second refresh compares raw-vs-bcrypt → reuse-detection silently breaks. Also `bcrypt.compare` at `:339` is **not awaited** (always truthy). Undermines SRS §5.3 Security. → T-B2.

**4.3 Multer runs before auth (security).** `user.routes.js:20` = `upload.single("cv"), verifyUser, uploadCv` — an unauthenticated request writes a file to `public/uploads/` before being rejected. Reorder to `verifyUser, upload.single("cv"), …`. → T-B3.

**4.4 No rate limiting (security).** README claims it; it is not implemented. `/login`, `/verify-otp`, `/resend-otp`, `/register` are brute-force / OTP-guess targets (OTP is a 6-digit code valid 3 min). → T-B4.

**4.5 AI service is unauthenticated (security).** `POST /ai/roadmap` trusts any caller by network placement — no shared secret. Fine on localhost, unsafe once deployed. → T-A3.

**4.6 AI service leaks internals & collapses all errors to 500.** `roadmap.py:105` `except Exception → HTTPException(500, str(e))`. A bad CV, a provider rate-limit, and an internal bug are indistinguishable, and the raw exception string is returned to the caller. Breaks SRS §5.2. → T-A2.

**4.7 PII is not encrypted at rest (security / compliance).** SRS §5.3 and R1.10 require resume data "encrypted, available only to the owner". Uploaded CVs sit on Cloudinary and `extractedText` sits in Mongo as **plaintext**. Passwords are bcrypt-hashed ✅, but resume content is not protected. → T-B7.

**4.8 List endpoint has no pagination (scalability).** `getRoadmaps` (`roadmaps.controller.js:74`) returns every roadmap for a user. Violates the "scalable" bar as saved-roadmap count grows. → T-B6.

**4.9 OTP email delivery is disabled (functional).** `loginUserStep1:125` and `resendOtp:179` **comment out** the send and `console.log` the OTP instead. Login therefore can't complete for a real user who doesn't see server logs. Blocks R1.2 end-to-end in any non-dev environment. → T-B5.

**4.10 Roadmap data-shape drift (correctness, low sev).** (a) The generated step uses `month` (`prompt.py:37`, `roadmap.schema.js:5`) but the viewer reads `step_number`/`duration` (`cv.service.ts:24`, `roadmap/[jobId]/page.tsx:249,269`) — those fields don't exist, so the step number falls back to the array index and duration never shows. (b) `saveRoadmap` (`roadmaps.controller.js:58`) persists only `career_goal`+`steps`, dropping `current_level`/`estimated_timeline`, and ignores the `description` the frontend sends (schema has the field, controller never sets it). → T-B8.

**4.11 Sensitive logging (security, low sev).** `loginUserStep1:105` logs the full user document (password hash + OTP); several `[DEBUG]` prints in the AI service log CV-derived data. Don't log PII/secrets. → T-B9.

**4.12 Frontend dead code / mock leakage.** `account-settings` and `change-password` are `alert()`-only stubs with no API (`account-settings/page.tsx:11`, `change-password/page.tsx:16`); `settings` is near-empty; dead files `app/components/sidebar/Sidebar.tsx`, `hooks/auth-hooks/useProtectedWrapper.tsx`, `usePublicWrapper.tsx`. Clean up / wire up. → T-F5.

---

## 5. What is genuinely solid (don't regress)

- Async CV pipeline: BullMQ queue + separate worker + retry/backoff. Keep the `Job` (transient) vs `Roadmap` (saved) split.
- Two-step OTP auth with short-lived session token gating step 2.
- Ownership checks return **403 not 404** on cross-user access (`roadmaps.controller.js`, `getJobStatus`).
- Provider-agnostic AI layer (Groq/HF/OpenAI behind one dispatch) + defensive JSON extraction from LLM output.
- Best-effort, non-blocking resource enrichment (one failed search ≠ failed roadmap).
- Frontend: single-flight 401 refresh queue, access-token-in-memory / refresh-token-in-httpOnly-cookie split, TanStack Query polling that stops on completion.

---

## 6. Coverage snapshot

```
Functional requirements (R1.1–R1.11):   ✅ 5   ⚠️ 2   ❌ 4
Use cases (UC-01–06):                    ✅ 4   ⚠️ 1   ❌ 1
SDS entities (8):                        ✅ 3   ⚠️ 1   ❌ 4
Open security/correctness loopholes:     12 (see §4)
```

Proceed to [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for the prioritized build/fix plan.
