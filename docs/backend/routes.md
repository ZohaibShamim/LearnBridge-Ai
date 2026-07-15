# Backend — Routes (the URL map)

## What this is

A "route" file is the server's address book. It lists every URL the server understands — for example `/api/v1/users/login` — and says two things about it: which HTTP "method" (verb) it responds to, and which controller function should actually run when that URL is hit. The method tells you what kind of action is happening: `GET` means "read/fetch some data," `POST` means "create something or trigger an action," `PATCH` means "update part of something that already exists," and `DELETE` means "remove something."

Route files themselves are almost always short and boring on purpose — they don't contain the real business logic (checking the database, hashing a password, calling the AI service, etc.). That logic lives in a separate "controller" function, and the route file just wires a URL + method to the right controller. Route files can also attach "middleware" — a function that runs *before* the controller, usually to do a check. The most common one here is `verifyUser`, which checks that the request has a valid login token before letting it continue. If a route doesn't have `verifyUser` attached (directly or via the whole file being protected), anyone can call it without logging in.

Every route below is mounted under a prefix in `backend/app.js`:
- `user.routes.js` → `/api/v1/users`
- `roadmap.routes.js` → `/api/v1/roadmaps`
- `quiz.routes.js` → `/api/v1/quizzes`
- `dashboard.routes.js` → `/api/v1/dashboard`

So a line like `router.post("/login", ...)` inside `user.routes.js` actually means the real URL is `POST /api/v1/users/login`.

## File by file

### `backend/routes/user.routes.js`

Handles account creation, login (with the 6-digit OTP step), CV upload, and checking on an upload's progress.

| Method | Path (full URL) | Controller function | Logged in required? | Lines |
|---|---|---|---|---|
| POST | `/api/v1/users/register` | `registerUser` | No | 16 |
| POST | `/api/v1/users/login` | `loginUserStep1` | No | 17 |
| POST | `/api/v1/users/verify-otp` | `verifyOTPAndLogin` | No | 18 |
| POST | `/api/v1/users/resend-otp` | `resendOtp` | No | 19 |
| POST | `/api/v1/users/upload-cv` | `uploadCv` | Yes (`verifyUser`) | 21 |
| GET | `/api/v1/users/job/:jobId` | `getJobStatus` | Yes (`verifyUser`) | 22 |
| POST | `/api/v1/users/refresh-token` | `refreshAccessToken` | No | 23 |

What a user is actually doing on each one:
- **POST /register** — filling out the sign-up form (name, email, password) and creating a new account.
- **POST /login** — typing in email + password. This is only step 1: if it succeeds, the server emails a one-time code instead of logging the user straight in.
- **POST /verify-otp** — typing in the 6-digit code they got by email to finish logging in and actually receive their session.
- **POST /resend-otp** — clicking "didn't get a code? resend it" if the first email didn't arrive or expired.
- **POST /upload-cv** — uploading their CV file (and picking a target role) to kick off the AI roadmap-generation pipeline. Note the comment on line 20: `verifyUser` deliberately runs *before* the file-upload middleware (`upload.single("cv")`) so an unauthenticated request gets rejected before any file is written to disk.
- **GET /job/:jobId** — the frontend repeatedly asking "is my roadmap ready yet?" while the CV is being processed in the background.
- **POST /refresh-token** — not something the user clicks — this runs automatically in the background to quietly get a fresh login session before the old one expires, so they don't get logged out while using the app.

### `backend/routes/roadmap.routes.js`

**Every single route in this file requires being logged in.** Line 14, `router.use(verifyUser)`, applies the `verifyUser` middleware to the whole router at once — so instead of writing `verifyUser` on each line one by one, the file protects all five routes below it in one shot. In plain English: nobody can view, save, update, or delete *any* roadmap data — even someone else's — without a valid login token.

| Method | Path (full URL) | Controller function | Logged in required? | Lines |
|---|---|---|---|---|
| POST | `/api/v1/roadmaps/save` | `saveRoadmap` | Yes (whole file, line 14) | 17 |
| GET | `/api/v1/roadmaps/` | `getRoadmaps` | Yes (whole file, line 14) | 20 |
| GET | `/api/v1/roadmaps/:roadmapId` | `getRoadmapById` | Yes (whole file, line 14) | 23 |
| PATCH | `/api/v1/roadmaps/:roadmapId/progress` | `updateRoadmapProgress` | Yes (whole file, line 14) | 26 |
| DELETE | `/api/v1/roadmaps/:roadmapId` | `deleteRoadmap` | Yes (whole file, line 14) | 29 |

What a user is actually doing on each one:
- **POST /save** — after generating a roadmap, clicking "save this" so it's kept permanently instead of being thrown away.
- **GET /** — opening the "my roadmaps" page to see the list of every roadmap they've saved.
- **GET /:roadmapId** — opening one specific saved roadmap to view its full details.
- **PATCH /:roadmapId/progress** — checking (or unchecking) a box next to a step to mark it as done, so their progress is remembered.
- **DELETE /:roadmapId** — clicking "delete" on a roadmap they no longer want.

### `backend/routes/dashboard.routes.js`

The smallest route file — just one real route, also protected for the whole file.

| Method | Path (full URL) | Controller function | Logged in required? | Lines |
|---|---|---|---|---|
| GET | `/api/v1/dashboard/` | `getDashboard` | Yes (`router.use(verifyUser)`, line 7) | 8 |

What a user is actually doing:
- **GET /** — opening their dashboard/home page after logging in. Behind the scenes, `getDashboard` pulls together real progress and quiz data for that specific user (not fake placeholder data) into one summary view.

### `backend/routes/quiz.routes.js`

Like the roadmap file, line 16 (`router.use(verifyUser)`) protects **every** route below it — a user must be logged in to generate, take, or review any quiz. Note the comment on lines 21–22: the more specific paths (`/attempts`, `/attempt/:attemptId`) are declared *before* the generic `/:quizId` route on purpose — otherwise Express would think the word "attempts" in the URL was actually someone's quiz ID.

| Method | Path (full URL) | Controller function | Logged in required? | Lines |
|---|---|---|---|---|
| POST | `/api/v1/quizzes/generate` | `generateQuiz` | Yes (whole file, line 16) | 18 |
| POST | `/api/v1/quizzes/subtopic` | `getOrCreateSubtopicQuiz` | Yes (whole file, line 16) | 19 |
| GET | `/api/v1/quizzes/attempts` | `getUserAttempts` | Yes (whole file, line 16) | 23 |
| GET | `/api/v1/quizzes/attempt/:attemptId` | `getAttempt` | Yes (whole file, line 16) | 24 |
| GET | `/api/v1/quizzes/` | `getQuizzes` | Yes (whole file, line 16) | 26 |
| GET | `/api/v1/quizzes/:quizId` | `getQuizById` | Yes (whole file, line 16) | 27 |
| POST | `/api/v1/quizzes/:quizId/submit` | `submitQuiz` | Yes (whole file, line 16) | 28 |

What a user is actually doing on each one:
- **POST /generate** — asking the app to create a brand-new quiz for them (e.g. from their roadmap topic).
- **POST /subtopic** — opening one specific subtopic inside a roadmap step and asking for a quiz at a chosen difficulty; if that exact quiz already exists it's reused instead of generated again ("lazily generate or return the cached quiz," per the code comment).
- **GET /attempts** — looking at their history of every quiz they've taken (used to build the dashboard).
- **GET /attempt/:attemptId** — reviewing the results of one specific quiz attempt after finishing it, including which answers were right or wrong.
- **GET /** — browsing the list of quizzes available to them.
- **GET /:quizId** — opening a specific quiz to take it. This version is sent *without* the correct answers, so a user can't peek at them in the browser's network tab.
- **POST /:quizId/submit** — clicking "submit" after answering all the questions, sending their chosen answers in to be graded.
