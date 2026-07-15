# Backend — Database Models (MongoDB / Mongoose)

## What this is

The files in `backend/models/` describe the "shape" of the data this app stores in the database — think of each one as a blueprint for a table (in MongoDB, a table is called a "collection"). Instead of a rigid spreadsheet with fixed columns, MongoDB stores flexible "documents" that look a lot like JSON objects (nested objects, lists, optional fields) — so the blueprint mostly exists to keep our own code honest about what fields *should* be there, not to physically force the database to reject anything else.

The library used here, **Mongoose**, is a tool that takes one of these blueprints (called a "schema") and turns it into a JavaScript class ("model") your code can use directly — e.g. `User.findOne({ email })` instead of writing raw database queries by hand. Each schema below also defines things like which fields are required, what type they are (`String`, `Number`, `Date`, `Boolean`, `ObjectId`, arrays of any of those), and any fixed list of allowed values (Mongoose calls this an `enum`).

One recurring pattern you'll see across every file: a field like `userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }`. This just stores the unique ID of a document in another collection — like a foreign key in a normal SQL database — and the `ref: "User"` tells Mongoose "if you ever want the full user document, not just its ID, look in the `User` collection." This is how, for example, a roadmap knows which user it belongs to.

## File by file

### `backend/models/user.model.js`

This is the **User account** — one document per person who can log in. It stores login credentials, the one-time-password (OTP) used for two-step login, and the token used to silently refresh a login session without re-entering a password.

`userSchema` — lines 5–17:

| Field | Type | Required? | Purpose |
|---|---|---|---|
| `email` | String | yes, and must be unique | The user's login email. `unique: true` means the database itself won't allow two accounts with the same email. `lowercase: true` means Mongoose automatically converts it to lowercase before saving, so `Bob@X.com` and `bob@x.com` are treated as the same account. |
| `password` | String | yes | The user's password — already hashed (scrambled one-way) by the time it's saved here, not stored in plain text. |
| `otp` | String | no | The current one-time-password sent to the user's email for the second step of login. |
| `otp_expiry` | Date | no | The time after which `otp` is no longer valid. |
| `role` | String | no (defaults to `"student"`) | What kind of user this is. `enum: ["student", "teacher"]` means Mongoose only allows one of these two exact values — anything else gets rejected. |
| `refreshToken` | String | no | A long-lived token that lets the frontend get a new short-lived login session without asking the user to log in again. |
| `forgotPasswordToken` | String | no | A one-time token emailed to the user when they request a password reset. |
| `forgotPasswordExpiry` | Date | no | When `forgotPasswordToken` stops being valid. |

The schema also has `{ timestamps: true }` as a second argument (line 16) — this is a Mongoose shortcut that automatically adds and maintains `createdAt` and `updatedAt` fields on every document, so we never have to set those by hand.

**Methods** (lines 19–46) — these are custom functions attached to every user document, callable like `someUser.generateAccessToken()`:
- `generateAccessToken` (lines 19–31) and `generateRefreshToken` (lines 32–42) both use the `jsonwebtoken` library to create a signed token (a piece of text that proves "this really came from our server and hasn't been tampered with") containing the user's ID (and, for the access token, their email and role too).
- `isPasswordCorrect` (lines 44–46) compares a plain-text password someone typed in against the hashed one stored in the database, using `bcrypt` (a library built specifically for safely comparing hashed passwords).

**A thing worth pointing out, just from reading this file:** this schema only defines *one* `refreshToken` field, with no note here about whether it's expected to be stored as a plain string or a hashed one — that decision happens wherever the code actually *writes* to this field (not in this file), so whether it's consistently hashed can't be confirmed just by reading the model itself.

### `backend/models/profile.model.js`

This is **extra profile information** about a user — the kind of thing you'd expect on a CV or resume, separate from login credentials. It's a separate collection from `User` so that account/security data and personal/career data don't live in the same document.

`profileSchema` — lines 3–35:

| Field | Type | Required? | Purpose |
|---|---|---|---|
| `user` | ObjectId, `ref: "User"` | yes | Links this profile to exactly one user account — "which user does this profile belong to." |
| `firstName` | String | yes | User's first name. |
| `lastName` | String | yes | User's last name. |
| `phone` | String | no | Contact phone number. |
| `profileUrl` | String | no | Link to a profile picture or similar. |
| `address` | nested object (`street`, `city`, `state`, `zip`, all String) | no | A postal address, broken into parts. |
| `education` | array of objects (lines 16–23) | no | A list of schools/degrees. Each entry has `degree` (String, required) and `institution` (String, required), plus optional `year` (Number) and `gpa` (Number). |
| `skills` | array of Strings | no | A simple list of skill names, e.g. `["Python", "SQL"]`. |
| `experience` | array of objects (lines 25–31) | no | A list of past jobs. Each entry has optional `jobTitle`, `company`, and `duration` (all String). |
| `careerGoals` | String | no | Free-text notes on what the user wants to achieve career-wise. |

Like `User`, it uses `{ timestamps: true }` (line 34) to auto-track `createdAt`/`updatedAt`.

### `backend/models/jobs.schema.js`

This is the **CV-processing job tracker**. Whenever a user uploads their CV, the app doesn't process it instantly (turning a CV into a roadmap takes a while, since it involves reading the file and calling an AI model) — instead, it creates one `Job` document to track "how far along is this particular upload," and a separate background process updates that document as work happens.

`jobSchema` — lines 3–53:

| Field | Type | Required? | Purpose |
|---|---|---|---|
| `userId` | ObjectId, `ref: "User"` | yes | Which user uploaded this CV. |
| `status` | String, `enum: ["uploaded", "processing", "completed", "failed"]` | no (defaults to `"uploaded"`) | Tracks the job's progress through its lifecycle — this is the field the frontend repeatedly checks ("polls") to know when the roadmap is ready. |
| `cvUrl` | String | yes | Where the uploaded CV file is stored (a Cloudinary file-hosting link). |
| `fileType` | String, `enum: ["image", "pdf", "docx"]` | no (defaults to `"image"`) | Tells the backend *how* to pull text out of the file — e.g. run OCR (Optical Character Recognition — reading text out of an image) for an image, or a different method for a PDF/Word doc. |
| `role` | String, `enum: ["data_scientist", "software_engineer", "machine_learning", "ai"]` | no | The target career role the user picked (or left blank) for the roadmap to aim at. |
| `tags` | array of Strings | no | Short labels describing the roadmap/CV, generated later. |
| `extractedSkills` | array of Strings | no | Skills the AI found by reading the user's CV. |
| `requiredSkills` | array of Strings | no | Skills that are typically needed for the target role. |
| `missingSkills` | array of Strings | no | The gap: skills the role needs that the CV doesn't show — `requiredSkills` minus `extractedSkills`, essentially. |
| `extractedText` | String | no | The raw text pulled out of the CV file (e.g. via OCR), before any AI processing. |
| `roadmap` | Object (loosely typed, no fixed inner shape) | no | Where the finished, AI-generated roadmap gets attached once the job finishes. Because it's just `type: Object`, Mongoose doesn't enforce a shape on what's inside — unlike the separate `Roadmap` collection below, which is strict. |
| `error` | String | no | If something went wrong (`status: "failed"`), a description of what happened. |

`{ timestamps: true }` (end of line 53) again auto-adds `createdAt`/`updatedAt`, which is also how the frontend/backend can tell how long a job has been running.

### `backend/models/roadmap.schema.js`

This is the **saved roadmap** a user chooses to keep — distinct from the raw, loosely-typed `roadmap` field sitting inside a `Job` document above. Once a user is happy with a generated roadmap, it gets copied into its own strictly-shaped `Roadmap` document here, along with the user's ongoing progress (completed steps, quizzes passed, badges earned).

This file actually defines three schemas that nest inside each other: `subtopicSchema` → `stepSchema` → `roadmapSchema`.

**`subtopicSchema`** — lines 5–10. A roadmap step can be broken down into smaller subtopics (e.g. a "Learn SQL" step might have subtopics "Joins," "Indexes," "Subqueries"). Each subtopic has:
- `title` (String, required) — the subtopic's name.
- `summary` (String, optional) — a short description.
- `resources` (Object, optional) — learning material for this subtopic (e.g. a YouTube link and an article link), stored as a loose object since its exact shape can vary.

A comment on lines 3–4 explains something important: unlike the steps around it, subtopics deliberately **keep their auto-generated `_id`** (every Mongoose sub-document normally gets one automatically). That ID is the stable "key" used elsewhere to link a subtopic to its quizzes and to the progress-tracking fields further down (`clearedSubtopics`, `badges`) — i.e., it's how the app remembers "the user passed the hard quiz for *this specific* subtopic."

**`stepSchema`** — lines 12–36. One step is one phase of the roadmap (commonly one calendar month of learning). Fields:
- `month` (Number, required) — which month of the plan this step is.
- `title` (String, required) — the step's name, e.g. "Learn Python Basics."
- `description` (String, optional) — more detail on what to do.
- `skills` (array of Strings, optional) — skills this step is meant to teach.
- `resources` (Object, optional) — learning material for the step as a whole (same loose-object idea as subtopics).
- `subtopics` (array of `subtopicSchema`, optional) — the smaller breakdown described above.

Note `{ _id: false }` on line 35 — this tells Mongoose *not* to generate an `_id` for each step (unlike subtopics, which explicitly keep theirs). Steps are identified by their position/index in the array instead (you'll see `stepIndex` used that way elsewhere in this file).

**`roadmapSchema`** — lines 38–108. The top-level document:

| Field | Type | Required? | Purpose |
|---|---|---|---|
| `userId` | ObjectId, `ref: "User"` | yes | Which user this saved roadmap belongs to (used for the ownership checks the rest of the app relies on). |
| `jobTitle` | String | yes | The target role/job this roadmap is aimed at. |
| `roadmap.career_goal` | String | no | A short description of the overall goal. |
| `roadmap.steps` | array of `stepSchema` | no | The actual month-by-month plan, described above. |
| `description` | String | no | A general description of the roadmap. |
| `isActive` | Boolean | no (defaults to `true`) | Whether this is the user's currently-active roadmap (vs. an old/replaced one). |
| `completedSteps` | array of Numbers | no | The 0-based positions (indexes) of steps the user has marked as done. A comment on lines 66–67 explains that overall progress percentage is calculated elsewhere as `completedSteps.length / roadmap.steps.length` — it isn't stored directly. |
| `clearedSubtopics` | array of objects (lines 75–81) | no | Tracks which subtopic-level quizzes the user has passed. Each entry has `stepIndex` (Number, required — which step), `subtopicId` (String, required — the subtopic's own `_id`, as a string), and `difficulty` (String, required, `enum: ["medium", "hard"]`). A comment on line 74 clarifies a subtopic only counts as "cleared" once its medium *or* hard quiz is passed. |
| `badges` | array of objects (lines 84–90) | no | Achievement badges. Each has `stepIndex` (Number, required), `title` (String, required), and `earnedAt` (Date, defaults to the current time when created). A comment on line 83 explains a badge is awarded the *first* time the user passes a HARD subtopic quiz within that step/topic — so it's one badge per topic, not one per quiz. |
| `tags` | array of Strings | no | Short labels describing the roadmap. |
| `skills` | array of Strings | no | Skills the roadmap as a whole covers. |
| `extractedSkills` | array of Strings | no | Skills found on the user's original CV, carried over from the `Job` this roadmap came from. |
| `missingSkills` | array of Strings | no | Skills the target role needs that the CV didn't show, also carried over from the `Job`. |

`{ timestamps: true }` (line 108) again auto-tracks `createdAt`/`updatedAt`.

### `backend/models/quiz.schema.js`

This is a **generated quiz** — a set of multiple-choice questions, usually tied to one subtopic of a saved roadmap, used to check whether the user actually learned the material before letting them mark it "cleared."

This file defines `questionSchema` (one question) nested inside `quizSchema` (the whole quiz).

**`questionSchema`** — lines 5–25. A comment on lines 3–4 flags something important for security: `correctIndex` and `explanation` are the source of truth for grading and must **never** be sent to the user's browser while they're actively taking the quiz — only revealed after they submit. Fields:
- `question` (String, required) — the question text.
- `options` (array of Strings, required) — the multiple-choice answers. A custom `validate` function (lines 11–14) enforces that there must be **exactly 4** options — Mongoose will reject saving the document otherwise.
- `correctIndex` (Number, required, `min: 0, max: 3`) — which of the 4 options (by position, 0 to 3) is correct.
- `explanation` (String, optional) — why that answer is correct, shown after grading.
- `difficulty` (String, `enum: ["easy", "medium", "hard"]`, defaults to `"medium"`) — how hard this individual question is.

Like `stepSchema` above, `questionSchema` uses `{ _id: false }` (line 24) — individual questions don't need their own database ID; they're identified by their position in the array (see `questionIndex` in the results model below).

**`quizSchema`** — lines 27–59:

| Field | Type | Required? | Purpose |
|---|---|---|---|
| `userId` | ObjectId, `ref: "User"` | yes | Who this quiz was generated for. |
| `roadmapId` | ObjectId, `ref: "Roadmap"` | no | Optionally links this quiz back to the specific saved roadmap it came from. |
| `stepIndex` | Number | no | Which step (by position) in that roadmap this quiz covers. |
| `subtopicId` | String | no | Which subtopic (by its `_id`) this quiz covers. |
| `title` | String | yes | The quiz's display title. |
| `description` | String | no | A short description of the quiz. |
| `category` | String | no | A category label. |
| `topic` | String | yes | The subject the quiz tests. |
| `difficulty` | String, `enum: ["easy", "medium", "hard", "mixed"]` | no (defaults to `"mixed"`) | Overall difficulty level of the quiz. |
| `estimatedTime` | Number | no (defaults to `5`) | Estimated minutes to complete, per the comment on line 52. |
| `questions` | array of `questionSchema` | yes | The actual questions. |

A comment on lines 39–40 explains why `stepIndex`/`subtopicId`/`difficulty` exist together: for roadmap subtopic quizzes, this combination (plus `roadmapId` and the user) is used as a cache key, so the same user asking for "the hard quiz on this subtopic" a second time reuses the already-generated quiz instead of generating a new one every time ("lazy generation" — only build it the first time it's actually needed).

`{ timestamps: true }` (line 58) again auto-tracks `createdAt`/`updatedAt`.

### `backend/models/quizResult.schema.js`

This is **one submission**: a record of a user actually taking a quiz — their answers, their score, and whether they passed. It's what the app checks against `clearedSubtopics`/`badges` on the `Roadmap` model to decide if progress should be updated.

This file defines `answerSchema` (one answer) nested inside `quizResultSchema` (the whole submission).

**`answerSchema`** — lines 4–11. A comment on line 3 explains `selectedIndex` is `-1` when the user left that question unanswered (rather than, say, `null` or missing). Fields:
- `questionIndex` (Number, required) — which question (by position in the quiz's `questions` array) this answer is for.
- `selectedIndex` (Number, required) — which option the user picked (0–3, or -1 for unanswered).
- `isCorrect` (Boolean, required) — whether that answer was right.

Also uses `{ _id: false }` (line 10) — answers don't need their own database ID.

**`quizResultSchema`** — lines 13–41:

| Field | Type | Required? | Purpose |
|---|---|---|---|
| `userId` | ObjectId, `ref: "User"` | yes | Who submitted this attempt. |
| `quizId` | ObjectId, `ref: "Quiz"` | yes | Which quiz this is an attempt at. |
| `answers` | array of `answerSchema` | yes | The user's answer to every question. |
| `score` | Number | yes | Number of questions answered correctly (comment on line 26). |
| `total` | Number | yes | Total number of questions (comment on line 27). |
| `percentage` | Number | yes | Score as a percentage. |
| `grade` | String | yes | A letter grade — comment on line 29 notes it's one of A/B/C/D/F. |
| `passed` | Boolean | no (defaults to `false`) | Whether the user passed — comment says this is `percentage >= PASS_THRESHOLD` (a passing cutoff defined elsewhere in the code, not in this file). |
| `difficulty` | String, `enum: ["easy", "medium", "hard", "mixed"]` | no | The difficulty of the quiz that was taken. |
| `roadmapId` | ObjectId, `ref: "Roadmap"` | no | A comment on line 32 explains this (and the next two fields) are copied over from the `Quiz` document at the moment of submission, purely so the app can query "how is this roadmap's progress going" directly from quiz results, without needing to look the quiz up separately every time. |
| `stepIndex` | Number | no | Copied from the quiz, as above. |
| `subtopicId` | String | no | Copied from the quiz, as above. |
| `badgeAwarded` | Boolean | no (defaults to `false`) | Whether this specific attempt earned the user a new badge. |
| `timeSpent` | Number | no (defaults to `0`) | Seconds spent on the quiz, as reported by the browser — a comment on line 37 flags this is client-reported and **not trusted** as an authoritative measurement (a user's browser could report anything). |
| `feedback` | String | no | Optional feedback text. |

`{ timestamps: true }` (line 40) again auto-tracks `createdAt`/`updatedAt`.
