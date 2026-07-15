# Backend — Controllers (the actual request handlers)

## What this is

A "controller" is the function that actually runs when a specific web request comes in. For example, when someone clicks "Log In" on the website, their browser sends a request to the server, and it's the login **controller** that checks their password and decides what to send back. Routes (a different part of the code, not covered in this doc) only decide *which* controller runs for *which* URL — like a receptionist pointing you to the right office. The controller is the office itself, where the actual work happens: checking the database, validating input, deciding success or failure, and sending a response.

Controllers are where the real "business logic" lives — the rules of how the app actually behaves (e.g. "a user can only see their own roadmap," "an OTP code expires after 3 minutes"). Everything in this document is backend (server-side) code, written in JavaScript using Express (a popular Node.js web framework).

A couple of small helper things you'll see everywhere in this codebase:
- `asyncHandler(...)` wraps every controller so that if something throws an error inside an `async` function, it gets caught automatically instead of crashing the server.
- `ApiResponse` and `ApiError` are just standard "envelope" shapes for what gets sent back to the browser — a consistent `{ statusCode, data, message }` object for success, and a thrown error object for failure.

---

## File by file

### `backend/controllers/user/user.controller.js`

This file is responsible for everything about a user's identity: creating an account, logging in (with a two-step password + emailed code process), refreshing login sessions, and uploading a CV (resume) to kick off roadmap generation.

#### `registerUser()` — lines 20–95

Creates a brand-new user account.

1. Pulls `email`, `password`, `firstName`, `lastName`, `degree`, `institute` out of the request body.
2. Checks that none of these fields are empty strings — if any are missing, it stops immediately and returns a 400 ("Bad Request") error.
3. Starts a **database transaction** (a "session" from MongoDB/Mongoose). Think of a transaction as an all-or-nothing bundle: two separate pieces of data (a `User` record and a `Profile` record) need to be created together, and a transaction guarantees that either *both* get saved, or *neither* does — so you never end up with half a user account in the database.
4. Inside the transaction: checks whether a user with that email already exists. If so, it throws an error (409 "Conflict" — email already taken).
5. Hashes (scrambles, one-way) the password before storing it, so the plain-text password is never saved in the database.
6. Creates the `User` document, then creates a linked `Profile` document (name, degree, institution) that points back to that user's ID.
7. If both writes succeed, it commits the transaction (makes the changes permanent) and returns the newly created user with a 201 ("Created") response.
8. If anything fails along the way, it aborts the transaction (undoes any partial writes) and throws either the original error or a generic 500 ("Internal Server Error").
9. Either way, at the very end it closes the database session (cleanup).

#### `loginUserStep1()` — lines 99–140

This is **step 1 of a two-step login**. It checks the user's password and, if correct, emails them a one-time code (OTP — a 6-digit "one-time password") instead of logging them in right away.

1. Looks up the user by email. If no user is found, returns a 404 ("Not Found").
2. Compares the submitted password against the stored (hashed) password using `decodePassword`. If it doesn't match, returns a 401 ("Unauthorized" / invalid credentials).
3. If the password is correct, generates a random 6-digit OTP, saves it on the user record along with an expiry time of 3 minutes from now.
4. Emails the OTP to the user's email address.
5. Creates a short-lived (10-minute) "session token" (a JSON Web Token, or JWT — a signed, tamper-proof string that encodes the user's ID) — this is **not** the final login token, just a temporary pass that proves "this person already gave the right password" so step 2 can trust it.
6. Returns the session token to the browser with a 200 status, telling the frontend to now ask the user for their OTP.

**Why two steps instead of just a password?** This is a simple form of two-factor authentication. Even if someone steals or guesses your password, they still can't log in — they'd also need access to your email inbox to read the OTP code. It's a second, independent barrier.

#### `resendOtp()` — lines 144–180

Lets a user request a new OTP if the first one expired or didn't arrive, without having to redo step 1 (re-enter their password).

1. Requires the `sessionToken` from step 1 in the request body — if missing, returns 400.
2. Verifies the session token is valid and not expired/tampered with. If verification fails, returns 401 ("Session expired. Please login again.").
3. Looks up the user by the ID encoded in that token. If not found, returns 404.
4. Generates a fresh 6-digit OTP, overwrites the old one on the user record, resets the 3-minute expiry, and emails it.
5. Returns 200 confirming the OTP was resent.

#### `verifyOTPAndLogin()` — lines 184–232

This is **step 2 of login** — the actual moment the user gets logged in.

1. Requires both `otp` and `sessionToken` in the request body; returns 400 if either is missing.
2. Verifies the session token (from step 1) is valid and decodes the user's ID from it.
3. Looks up the user, then checks three things at once: the user exists, the submitted OTP matches the one stored on the record, and the OTP hasn't expired yet. If any of these fail, it returns 400 ("Invalid or expired OTP") — deliberately vague, so an attacker can't tell which specific check failed.
4. Clears the OTP fields from the user record (a used or expired OTP can't be reused).
5. Generates a real **access token** (short-lived, used to authenticate normal API requests) and a **refresh token** (longer-lived, used to get new access tokens later without re-entering a password).
6. Hashes the refresh token with `bcrypt` before saving it to the database — this way, even if the database were ever leaked, the raw refresh token itself isn't exposed.
7. Sets the raw refresh token as an `httpOnly` cookie (a cookie JavaScript in the browser can't read directly — this reduces the risk of it being stolen via a cross-site scripting attack) and marks it `secure` only in production (so it's only sent over HTTPS once deployed).
8. Returns 200 with the user object and the access token in the response body (the access token is handled by frontend JavaScript directly, unlike the refresh token).

#### `uploadCv()` — lines 236–302

Handles a user uploading their CV file and kicks off the background job that eventually turns it into a career roadmap.

1. Requires a file (`req.file`, attached by the `multer` file-upload middleware before this function runs) — if missing, throws a 400 ("A CV file ... is required").
2. Requires a `role` field (a string, the target job role) in the request body — if missing or the wrong type, throws 400.
3. Looks at the file's extension to determine its real type (`.pdf`, `.docx`, or otherwise treated as an image) — the code explicitly does **not** trust the browser-reported MIME type, because it's often wrong (e.g. Word docs sometimes arrive labeled as a generic binary type).
4. If it's a PDF or DOCX, it extracts the text right away on the server (fast — milliseconds) using `extractTextFromBuffer`. This step is "best effort": if text extraction fails, it just logs a warning and continues with empty text rather than blocking the whole upload. (Image files skip this — image OCR, optical character recognition, i.e. "reading text out of a picture," is slow and is deliberately left for the background worker instead.)
5. Uploads the file to Cloudinary (a cloud file-storage service) and gets back a URL for it.
6. Creates a `Job` document in the database recording the user, the CV's Cloudinary URL, file type, target role, and any text already extracted.
7. Adds a task named `"cv-processing"` to a background job queue (BullMQ) with the job ID, CV URL, file type, and role — this is what a separate worker process picks up later to actually OCR the file (if needed) and generate the roadmap via the AI service.
8. Immediately responds with 202 ("Accepted" — meaning "we got it, we're working on it, check back later") and the new job's ID, so the frontend can poll for progress instead of waiting for the whole pipeline to finish inline.

#### `getJobStatus()` — lines 306–331

Lets the frontend check on the progress of a previously-submitted CV-processing job (e.g. "still processing," "completed," "failed").

1. Requires a `jobId` URL parameter; returns 400 if missing.
2. Looks up the `Job` by ID. Returns 404 if it doesn't exist.
3. **Security check**: compares the job's stored `userId` against the ID of the currently logged-in user (`req.user._id`, set by the auth middleware earlier in the request). If they don't match, returns 403 ("Forbidden") — this stops User A from checking the status of User B's CV-processing job just by guessing or copying a job ID.
4. If everything checks out, returns the full job document (which includes its status and, once done, the roadmap) with 200.

#### `refreshAccessToken()` — lines 335–394

Lets a logged-in user get a brand-new access token using their refresh token, without having to log in again — this normally happens automatically in the background when the old access token expires.

1. Reads the refresh token from the `httpOnly` cookie (preferred) or, as a fallback for testing, from the request body. If neither is present, throws 401.
2. Verifies the refresh token's signature is valid (proves it was really issued by this server and hasn't been tampered with) and decodes the user ID from it.
3. Looks up that user; if not found, throws 401.
4. **Security check (reuse detection)**: compares the incoming refresh token against the one stored in the database (hashed) using `bcrypt.compare`. If they don't match, that's treated as a sign the refresh token may have been stolen and reused by someone else. The response: wipe the stored refresh token from the database (so the real owner is force-logged-out everywhere), clear both cookies on the client, and return 403 with an explicit "Security Alert: Compromised token detected" message — rather than a vague generic error.
5. If the token checks out, it generates a brand-new access token *and* a brand-new refresh token (this "rotation" pattern means each refresh token can only be used once, which limits how much damage a stolen one can do).
6. Saves the new refresh token and sets it as the new cookie, then returns the new access token with 200.

**A known inconsistency worth knowing about** (documented in this repo's own engineering notes): `verifyOTPAndLogin` stores the refresh token bcrypt-hashed, but this function's rotation step (line 385, `user.refreshToken = newRefreshToken;`) stores the **new** refresh token **without hashing it first**. That means on the *next* refresh cycle, `bcrypt.compare` is comparing a raw token against another raw token as if the stored one were a hash — which silently breaks the reuse-detection safety check described above after the first rotation. This is a known, not-yet-fixed bug in the code, not something added by this documentation.

---

### `backend/controllers/roadmaps/roadmaps.controller.js`

This file is responsible for the "saved roadmap" CRUD (Create, Read, Update, Delete) operations — once a user is happy with an AI-generated roadmap, this is what saves it permanently, lists it, fetches one, updates progress on it, or deletes it. (Note: this is a separate concept from the `Job` model used during CV processing — a `Roadmap` is the clean, permanently-saved version a user has chosen to keep.)

#### `saveRoadmap()` — lines 6–73

Saves a new roadmap for the logged-in user.

1. Confirms the user is authenticated (`req.user?._id` is set by earlier auth middleware); returns 401 if not.
2. Requires both `jobTitle` and `roadmap` in the request body; returns 400 if either is missing.
3. Validates the shape of the roadmap object: it must have a `career_goal` (text) and a `steps` array. Returns 400 with a clear message if this structure is wrong.
4. Validates every individual step in the array has both a `month` (a number) and a `title` (a string) — if even one step is malformed, the whole save is rejected with 400, rather than silently saving a broken roadmap.
5. Creates the new `Roadmap` document, attaching it to the current user's ID, and includes optional extras like `tags`, `extractedSkills`, and `missingSkills` (defaulting to empty arrays if not provided).
6. Returns the newly saved roadmap with 201.

#### `getRoadmaps()` — lines 76–90

Lists all roadmaps belonging to the logged-in user.

1. Confirms the user is authenticated; returns 401 if not.
2. Queries the database for all `Roadmap` documents where `userId` matches the current user — this is itself a security boundary: it never fetches other users' roadmaps in the first place, because the query is filtered by the logged-in user's ID.
3. Sorts them newest-first (`createdAt: -1`) and returns the full list with 200.

(Note: this endpoint has no pagination — it always returns every roadmap a user has. That's fine while users have few roadmaps, but would need a limit/page mechanism if a user accumulated a very large number.)

#### `getRoadmapById()` — lines 93–122

Fetches one specific saved roadmap by its ID.

1. Confirms the user is authenticated; returns 401 if not.
2. Looks up the roadmap by the `roadmapId` URL parameter. Returns 404 if it doesn't exist.
3. **Security (ownership) check**: compares the roadmap's `userId` to the logged-in user's ID. If they don't match, returns 403 ("You don't have access to this roadmap") — this makes sure the roadmap actually belongs to the person asking for it, so User A can't view User B's roadmap just by changing the ID in the URL. Note it deliberately returns 403, not a fake 404 — but crucially it still doesn't reveal any of the *other* user's roadmap content, just confirms something exists there.
4. If ownership checks out, returns the roadmap with 200.

#### `updateRoadmapProgress()` — lines 126–184

Marks a single step in a roadmap as completed (or un-completed) and recalculates overall progress. This is what powers a checkbox-style "mark this step done" feature.

1. Confirms the user is authenticated; returns 401 if not.
2. Reads `stepIndex` and `completed` (true/false) from the request body. Converts `stepIndex` to a number and checks it's a non-negative whole number — returns 400 if not.
3. Looks up the roadmap; returns 404 if missing.
4. **Ownership check**: same as above — 403 if the roadmap doesn't belong to this user.
5. Checks that `stepIndex` is actually within range of how many steps this roadmap has (you can't complete step #50 of a 10-step roadmap) — returns 400 if out of range.
6. Updates the database: if `completed` is true, it adds the step index to a `completedSteps` set (using MongoDB's `$addToSet`, which won't create a duplicate entry if it's already there); if false, it removes the index (`$pull`). Using a "set" operation like this makes the action **idempotent** — calling it twice with the same input has the same effect as calling it once, so double-clicks or retried requests can't cause weird duplicate state.
7. Recalculates the completion percentage: `(number of completed steps / total steps) × 100`, rounded.
8. Returns 200 with the updated roadmap ID, the list of completed step indexes, total steps, completed count, and the percentage.

#### `deleteRoadmap()` — lines 187–218

Permanently deletes a saved roadmap.

1. Confirms the user is authenticated; returns 401 if not.
2. Looks up the roadmap; returns 404 if missing.
3. **Ownership check**: same pattern again — 403 if it belongs to someone else, so a user cannot delete another user's roadmap even if they somehow know its ID.
4. If ownership checks out, deletes it from the database and returns 200 confirming deletion.

---

### `backend/controllers/dashboard/dashboard.controller.js`

This file is responsible for building the summary data shown on the user's dashboard — an overview of how they're doing across all their roadmaps and quizzes, rather than the details of any single one.

#### `getDashboard()` — lines 9–105

Gathers and calculates all the stats shown on the dashboard's summary screen. This function doesn't create anything — it reads existing data and does some math on it (an "aggregation").

1. Confirms the user is authenticated; returns 401 if not.
2. Fetches, at the same time (`Promise.all`, so both database calls run in parallel instead of one after another — faster), every `Roadmap` and every `QuizResult` belonging to this user, both sorted newest-first.
3. For each roadmap, works out its progress in one of two ways:
   - If the roadmap has "subtopics" (a more detailed breakdown used by the quiz-driven learning feature), progress is based on how many subtopics have been **cleared** — meaning the user passed a medium or hard quiz on them — not just manually checked off. This uses two shared helper functions, `totalSubtopics()` and `progressPercent()`, imported from `utils/learning.js`.
   - If the roadmap doesn't have subtopics (an older/simpler roadmap), progress falls back to the manual `completedSteps` checkbox approach described in `updateRoadmapProgress()` above.
4. Builds a `currentLearning` array — one summary entry per roadmap, including its title, career goal, how many steps/subtopics total, how many are done, the percentage, how many badges earned, and its tags.
5. Calculates overall stats across *all* roadmaps: how many are 100% complete (`roadmapsCompleted`), how many are in progress but not finished (`coursesInProgress`), and an average progress percentage across all of them (`overallProgress`).
6. Calculates quiz stats: total quizzes completed, and the average score percentage across all quiz attempts.
7. Builds a `recentActivity` list — the 6 most recent quiz attempts, each with score, percentage, letter grade, and date — a quick "what have I done lately" feed.
8. Returns everything (stats object, `currentLearning` list, `recentActivity` list) with 200.

This function is explicitly noted in the code as replacing earlier hardcoded/mock dashboard data with real numbers pulled from the database.

---

### `backend/controllers/quizzes/quizzes.controller.js`

This file is responsible for generating quizzes (with help from the AI service), letting users take them, grading their answers, and — for quizzes tied to a roadmap subtopic — updating that roadmap's progress and awarding badges when a user proves they've mastered a topic.

Before the exported controller functions, there are a few small non-exported helper functions worth knowing about, since the controllers below all lean on them:
- `toSafeQuiz()` (lines 19–39) — strips the correct answers and explanations out of a quiz before sending it to a user who is about to *take* it, so the answer key can't be read by peeking at the network traffic in the browser.
- `toFullQuiz()` (lines 42–58) — the opposite: includes the correct answers and explanations, only used *after* a quiz has been submitted, for the results-review screen.
- `gradeFor()` (lines 60–66) — converts a percentage score into a letter grade (A/B/C/D/F).
- `feedbackFor()` (lines 68–81) — converts a letter grade into a short encouraging/corrective sentence shown to the user.

#### `generateQuiz()` — lines 86–140

Generates a brand-new quiz on a general topic (not tied to a specific roadmap subtopic) by calling out to the AI service.

1. Requires a non-empty `topic` string; throws 400 if missing.
2. Clamps `numQuestions` to between 3 and 15 regardless of what was requested — this stops someone from asking for, say, 10,000 questions and running up AI costs or abusing the endpoint. Also restricts `difficulty` to one of `easy`, `medium`, `hard`, or `mixed`, silently falling back to `mixed` if an invalid value is sent.
3. Calls the AI service's `/ai/quiz` endpoint (a separate FastAPI service, reached over HTTP) with the topic, difficulty, and question count.
4. If that call fails: a 422 response from the AI service becomes a 400 ("Invalid topic for quiz generation") back to the user; any other failure becomes a generic 502 ("Bad Gateway" — meaning "the service we depend on failed") without leaking internal error details to the client.
5. Maps the AI service's response into this app's own question shape (question text, options, correct index, explanation, difficulty).
6. If the AI came back with zero usable questions, throws a 502 rather than saving an empty quiz.
7. Saves the new `Quiz` document to the database, owned by the current user.
8. Returns the "safe" version (no answers) of the created quiz with 201.

#### `getOrCreateSubtopicQuiz()` — lines 144–218

Generates (or reuses a cached) quiz for one specific subtopic inside a specific roadmap step, at a chosen difficulty. This is what powers the "take a quiz on this subtopic" button inside a roadmap.

1. Requires `roadmapId`, a valid non-negative `stepIndex`, and a `subtopicId`; throws 400 if any are missing/invalid. Also requires `difficulty` to be exactly `easy`, `medium`, or `hard` (no `mixed` here); throws 400 otherwise.
2. Looks up the roadmap; throws 404 if not found.
3. **Ownership check**: throws 403 if the roadmap doesn't belong to the requesting user.
4. Finds the specific step and subtopic inside the roadmap's data by index/ID; throws 404 if either doesn't exist.
5. **Progress-gating check**: calls `isTopicUnlocked()` (a shared helper) to make sure the user has actually cleared the *previous* topic's subtopics before letting them start this one. If it's still locked, throws 403 ("Complete the previous topic before starting this one") — this enforces a step-by-step learning order rather than letting users skip ahead.
6. **Caching**: checks whether a quiz already exists for this exact combination of user, roadmap, step, subtopic, and difficulty. If so, it just returns that existing quiz (200) instead of generating a new one — saves an AI call and keeps quiz content stable if the user reopens it.
7. If no cached quiz exists, calls the AI service's `/ai/quiz` endpoint with a topic string built from the subtopic's title/summary, and 5 questions at the fixed difficulty. Same error-handling pattern as `generateQuiz()` (422 → 400, anything else → 502).
8. Maps the response into question objects, and again rejects (502) if zero questions came back.
9. Saves the new quiz, tagged with the roadmap ID, step index, subtopic ID, and difficulty so it can be found by the cache check above next time.
10. Returns the safe (answer-free) quiz with 201.

#### `getQuizzes()` — lines 221–228

Lists every quiz the logged-in user has generated, newest first, with answers stripped out (`toSafeQuiz`). Simple read — no ownership check needed beyond filtering the database query itself to `userId`, since it never touches another user's quizzes in the first place.

#### `getQuizById()` — lines 231–244

Fetches one specific quiz by ID, for a user about to take it.

1. Looks up the quiz by ID; throws 404 if not found.
2. **Ownership check**: throws 403 if the quiz's `userId` doesn't match the requester — stops a user from taking, or even seeing the shape of, someone else's quiz.
3. Returns the safe (no answers) version with 200.

#### `submitQuiz()` — lines 247–333

The most involved function in this file — grades a user's quiz attempt, saves the result, and (for certain quizzes) updates roadmap progress and awards a badge.

1. Requires `answers` to be an array (of the option index the user picked for each question); throws 400 if not.
2. Looks up the quiz; throws 404 if missing.
3. **Ownership check**: throws 403 if the quiz doesn't belong to this user.
4. **Grades server-side**: for every question, it checks the user's submitted answer (defaulting to "unanswered" if it's missing or an invalid index) against the quiz's real `correctIndex`, stored only on the server. This is an important security/integrity detail: the correct answers were never sent to the browser (`toSafeQuiz` stripped them earlier), and the score is calculated here on the server from the *stored* answer key — a user cannot fake a high score by tampering with request data, because the client never had the answers to submit in the first place, and even if they submitted a fabricated "score," it's ignored — only the raw answers are used to grade.
5. Calculates the total score, percentage, letter grade, and whether it counts as a "pass" (percentage at or above `PASS_THRESHOLD`, a shared constant).
6. **Roadmap side-effects** — only run if the quiz was passed, *and* it's a subtopic-specific quiz (has `roadmapId` and `subtopicId`), *and* the difficulty was `medium` or `hard` (an easy-difficulty pass doesn't count toward clearing a subtopic):
   - Re-fetches the roadmap and re-checks ownership before touching it.
   - Marks the subtopic as "cleared" in the roadmap's `clearedSubtopics` list. If it was already cleared at `medium` difficulty and this new pass is at `hard`, it upgrades the recorded difficulty rather than adding a duplicate entry — this operation is written to be safe to repeat (idempotent).
   - **Badge logic**: if this was a `hard`-difficulty pass, and no badge has been awarded yet for this topic/step, it adds a new badge to the roadmap's `badges` list and flags `badgeAwarded = true` in the response. In plain terms: passing the hard version of a topic's quiz for the first time earns you a badge for that topic.
   - Saves the updated roadmap and recalculates its overall progress percentage via `progressPercent()`.
7. Saves a new `QuizResult` document recording everything about the attempt: the graded answers, score, percentage, grade, pass/fail, which roadmap/step/subtopic it applied to, whether a badge was awarded, time spent, and a short feedback message (`feedbackFor()`).
8. Returns 201 with the attempt ID, score, total, percentage, grade, pass/fail, whether a badge was awarded, and the (possibly updated) roadmap progress.

#### `getAttempt()` — lines 336–372

Fetches the full details of one past quiz attempt, for a results-review screen (includes correct answers this time, since the quiz is already over).

1. Looks up the `QuizResult`; throws 404 if not found.
2. **Ownership check**: throws 403 if the attempt doesn't belong to the requester.
3. Also looks up the original quiz it belonged to; throws 404 if the quiz itself was somehow deleted since.
4. Returns the attempt's details (answers given, score, grade, badge status, feedback, etc.) together with the *full* quiz including correct answers (`toFullQuiz`) — appropriate here because the quiz is already completed, so revealing answers can't be used to cheat.

#### `getUserAttempts()` — lines 375–384

Lists a user's quiz attempt history.

1. Builds a filter that's always scoped to the current user's ID, and optionally narrows to one specific `quizId` if that's passed as a query parameter.
2. Returns all matching `QuizResult` documents, newest first, with 200.

(Same note as `getRoadmaps()`: no pagination here either — fine today, worth adding if a user's quiz history grows large.)

---

## Recurring pattern across all four files

A few things you'll notice repeat constantly, because they're this codebase's house style:

- **Every user-scoped route starts by checking `req.user?._id` exists** (login required), then, for anything fetched by ID, **checks that the record's `userId` matches the logged-in user** before returning or modifying it — returning 403 ("Forbidden") on a mismatch rather than a 404 ("Not Found"). This is a deliberate choice: it's still clear and consistent (always 403 for "not yours"), while never letting a raw 500 or crash leak information either way.
- Input is always validated by hand (`if` checks that throw or return an error), not by a validation library — this repo doesn't have one yet.
- The AI-service calls in `quizzes.controller.js` never trust the shape of what comes back blindly — they map fields explicitly and check for an empty result before saving.
