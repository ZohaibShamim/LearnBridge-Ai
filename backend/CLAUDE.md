# CLAUDE.md — Backend (`backend/`)

Express 5 + MongoDB (Mongoose) + Redis/BullMQ API. Owns auth (JWT + OTP), CV upload, async CV→roadmap job orchestration, and roadmap CRUD. Read the root `../CLAUDE.md` first — this file goes deeper on backend-specific engineering rules.

---

## 1. Priority order

**Correct → secure → scalable → minimal.** Same as the root contract. In this service specifically: "correct" means the HTTP status code and response shape a client receives actually match what happened (see §4 — this is currently broken in one load-bearing place); "secure" means every PII-touching route enforces ownership and every token stays hashed at rest; "scalable" means list endpoints paginate and heavy work stays off the request thread (already true for CV processing via BullMQ — keep it true for anything new).

---

## 2. Use what's installed — don't hand-roll it

| Concern | Use this (already installed) | Don't |
|---|---|---|
| Web framework | `express` 5 | — |
| DB/ODM | `mongoose` 9 | raw MongoDB driver calls, hand-written query builders |
| Auth tokens | `jsonwebtoken`, `bcrypt` | custom crypto, hand-rolled session tokens |
| Background jobs | `bullmq` + `ioredis` | `setInterval` polling loops, cron-in-process, a second queue library |
| File upload (in) | `multer` | manual multipart parsing |
| File storage (out) | `cloudinary` | writing to local/permanent disk |
| OCR | `tesseract.js` | shelling out to an OCR CLI |
| Outbound HTTP | `axios` | raw `http`/`fetch` |
| Testing | `jest` + `supertest` + `mongodb-memory-server` | a second test runner |

**Not installed — add deliberately, not by default, and say why in the PR:**
- **Validation**: no schema validator exists; every controller does manual `if (!field) throw ...`. This does not scale past the current handful of routes. When you add a route with more than 2–3 fields to validate, reach for **Zod** (lightweight, TS-friendly, no framework lock-in) rather than adding another block of manual `if`s.
- **Rate limiting**: not implemented despite the root README claiming it is. Add **`express-rate-limit`** (Redis-backed via `rate-limit-redis`, since Redis is already a dependency) on `/register`, `/login`, `/resend-otp`, and `/verify-otp` before this service is exposed beyond localhost — these are exactly the endpoints brute-force and OTP-guessing attacks target.
- **Structured logging**: every diagnostic today is a raw `console.log`. Fine for a single dev box; not fine once this runs as more than one process (which it already does — API + worker) and you need to correlate a request across both. Reach for **`pino`** (fast, structured JSON, pairs well with Express via `pino-http`) before adding more `console.log`s, not after.
- **No new queue, ORM, or HTTP client** — BullMQ, Mongoose, and axios already cover those needs.

---

## 3. Architecture map

```
index.js          → boots: connectDB() then app.listen(PORT)
app.js             → Express app: CORS, cookie-parser, JSON/urlencoded body limits (16kb), route mounting
routes/            → user.routes.js (/api/v1/users), roadmap.routes.js (/api/v1/roadmaps, router.use(verifyUser) globally)
controllers/       → user.controller.js (auth + OTP + CV upload + job status), roadmaps.controller.js (CRUD)
middlewares/       → auth.middleware.js (verifyUser), multer.middlware.js (note the typo — real filename)
models/            → user.model.js, profile.model.js, roadmap.schema.js, jobs.schema.js
queues/            → cv.queue.js — BullMQ producer, REDIS_URL-aware with local fallback
workers/           → cv.worker.js — SEPARATE PROCESS, not started by `npm run dev`. OCR → calls `ai` service → writes Job doc.
utils/             → ApiResponse, ApiError (real filename: appiError.js), asyncHandler, connectDB, cloudinary, password, ocr, nodemailer/emails
```

**The `Job` vs `Roadmap` split is deliberate, keep it.** `Job` (`jobs.schema.js`) is the transient async CV-processing record — loosely-typed `roadmap: Object`, owned by the worker. `Roadmap` (`roadmap.schema.js`) is the user's deliberately-saved, strictly-shaped roadmap, owned by `roadmaps.controller.js`. Don't collapse these into one model — they have different write owners and different shape guarantees.

**The worker is a separate process by design**, so it can OCR and call the AI service without blocking the API's event loop. If you add a new kind of background job, give it its own queue + worker file following the `cv.queue.js`/`cv.worker.js` pattern — don't bolt more job types onto the existing `cv-processing` queue.

---

## 4. Conventions

**Response shape — and the bug you must not build on top of.** Success responses are `new ApiResponse(statusCode, data, message)`. Errors are *supposed* to be `throw new ApiError(statusCode, message)`, caught generically by `asyncHandler`. **They currently aren't**: `utils/asyncHandler.js` catches the error, logs it, and responds `res.status(500).json({ message })` — hardcoded 500, raw object, regardless of the `ApiError`'s actual `statusCode`. A controller that does `throw new ApiError(403, "Forbidden")` today produces a 500 with just `{ message: "Forbidden" }` on the wire, not the intended 403 with the full `ApiResponse` shape.

Fix, when you touch this file:
```js
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    const statusCode = err instanceof ApiError ? err.statusCode : 500;
    const message = err.message || "Internal Server Error";
    console.error(err);
    res.status(statusCode).json(new ApiResponse(statusCode, null, message));
  });
```
Until it's fixed, **don't rely on `ApiError`'s status code surviving to the client** — verify the actual HTTP response in any new error path, don't just trust the thrown code.

**Filenames with typos are load-bearing.** `utils/appiError.js` (not `apiError.js`), `middlewares/multer.middlware.js` (not `.middleware.js`). Match them exactly on import. If you rename them, update every import site in the same change — don't leave both names around.

**Comments: sparse, and only for the non-obvious.** This codebase has none beyond the occasional section banner — keep it that way for straightforward CRUD, but add a one-line comment wherever the reason for a choice isn't visible in the code itself: why a Mongoose session is used here and nowhere else (`registerUser`'s transaction), why the refresh token is compared via `bcrypt.compare` instead of a direct string match, why multer runs before `verifyUser` on `/upload-cv` (it currently shouldn't — see §5). A comment that restates the line below it in English is noise; delete it.

---

## 5. Security — non-negotiable

- **Ownership checks on every user-scoped route.** `roadmaps.controller.js` already does this right — 403 on mismatch, not a 404 that leaks whether the resource exists. Match this pattern on any new resource.
- **Refresh token hashing must be consistent — it currently isn't.** `verifyOTPAndLogin` stores the refresh token **bcrypt-hashed**. `refreshAccessToken`'s rotation path stores the newly-issued refresh token **raw/unhashed**. This means a second refresh cycle compares a raw stored value as if it were a hash, breaking the reuse-detection this system is supposed to provide. Fix: hash on every write to `user.refreshToken`, no exceptions — write a single `setRefreshToken(user, rawToken)` helper and call it from both places instead of inlining the hash/no-hash logic twice.
- **Multer runs before auth on `/upload-cv`.** `upload.single("cv"), verifyUser, uploadCv` means an unauthenticated request still writes a file to `public/uploads/` before being rejected. Reorder to `verifyUser, upload.single("cv"), uploadCv` when you next touch this route.
- **Never log OTPs, tokens, or full user documents.** `loginUserStep1` currently does `console.log("User found:", user)`, which includes the password hash and (after the next line runs) the OTP. Don't add more of these — log an id or email, never the document.
- **CORS is env-driven (`FRONTEND_URL`) — keep it that way.** Don't hardcode an origin, and don't wildcard it.
- **Cookie flags must match across every place a cookie is set.** `verifyOTPAndLogin` correctly gates `secure` on `NODE_ENV === "production"`; `refreshAccessToken`'s two cookie-setting branches hardcode `secure: true`, which will silently break local HTTP dev testing of the refresh-rotation path. Use one shared cookie-options constant, not three copies.

---

## 6. Scalability rules

- **Paginate every list endpoint.** `getRoadmaps` currently returns everything for a user with no `limit`/`skip`/cursor. Fine at today's scale, a real problem the moment a user has hundreds of saved roadmaps. Add pagination (`?page=&limit=`, or cursor-based if you want it to hold up better under concurrent writes) before this becomes a production incident, not after.
- **Project only what you need.** Mongoose queries here already correctly exclude `password`/`refreshToken` on the auth-loaded user (`select("-password -refreshToken")` in `verifyUser`) — keep that discipline on every new query that touches `User`.
- **Heavy work stays off the request thread.** CV OCR + AI roadmap generation already happens in the BullMQ worker, not inline in `uploadCv` — this is correct, don't regress it by adding new synchronous heavy work (a second AI call, a large export/report generation) directly inside a controller. Queue it.
- **`connectDB.js` sets no explicit pool size.** Fine at current load (Mongoose/driver defaults, ~100 connections). If this API and the worker both scale to multiple instances, revisit `maxPoolSize` explicitly rather than assuming the default forever.

---

## 7. Testing

Jest + Supertest + `mongodb-memory-server` (`MongoMemoryReplSet` — required because `registerUser` uses a Mongoose transaction, which needs a replica set). Only `POST /api/v1/users/register` has coverage today (`test/register/register.test.js`). When you touch a route, add a test alongside it in the same change rather than retrofitting the whole surface at once — follow the existing file's pattern (spin up the in-memory replica set, hit the route via `supertest(app)`, assert on `response.body.success`/`.message`/status code).

Priority order for filling the gap, if you're adding tests proactively rather than alongside a change: the OTP login flow (login → verify → refresh, including the reuse-detection path once fixed), then roadmap CRUD ownership checks (403 on cross-user access), then the CV upload → job creation flow (mocking Cloudinary/BullMQ).

---

## 8. Environment variables

Required: `PORT`, `MONGO_URI`, `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_EXPIRY`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME`, `FASTAPI_URL`, `ROADMAP_TIMEOUT_MS`, `EMAIL_USER`, `EMAIL_PASSWORD` (Gmail App Password — not the account password; regenerate at `myaccount.google.com/apppasswords` if auth starts failing with `535-5.7.8`).

Also read but **not in any `.env.example`** (none exists for this service — worth adding): `FRONTEND_URL` (CORS origin, falls back to `http://localhost:3000`), `NODE_ENV` (gates cookie `secure` flag), `REDIS_URL` (BullMQ/ioredis connection — falls back to local `127.0.0.1:6379` if unset; required for the queue/worker to reach a real Redis instance outside local dev).

`RESEND_API_KEY` is set but dead — `utils/emails.js`'s Resend-based `otpEmail` is never called; actual OTP delivery goes through `utils/nodemailer.js` (Gmail SMTP). Don't wire new email-sending code to the Resend path without first deciding whether to finish that migration or delete the dead code.

---

## 9. Definition of done (backend)

- [ ] Response status code matches what the client actually receives (verify, don't assume `ApiError`'s code survives — see §4).
- [ ] Every user-scoped query checks ownership; 403 on mismatch.
- [ ] Any new `user.refreshToken` write goes through a single hashing helper.
- [ ] List endpoints you add or touch are paginated.
- [ ] No new `console.log` of a full document, token, OTP, or password.
- [ ] Heavy/slow work is queued (BullMQ), not inline in a controller.
- [ ] Test added alongside the route you touched, using the existing Jest/Supertest/mongodb-memory-server pattern.
- [ ] Nothing hand-rolled that Zod/pino/express-rate-limit would cover better (§2) — if you added one of these, it was a deliberate, called-out decision.
