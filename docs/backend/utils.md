# Backend — Utilities (small reusable helper files)

## What this is

The `backend/utils/` folder holds small helper files that each do one focused job — sending an email, connecting to the database, hashing a password, and so on. Instead of writing that logic again in every controller (the files that handle each feature, like "register a user" or "upload a CV"), the controllers just `import` these helpers and call them. That way, if the way we hash a password ever needs to change, there's exactly one place to change it, not ten.

## File by file

### `backend/utils/asyncHandler.js`

Express (the web framework this backend is built on) has a gap: if a route handler is an `async` function and something inside it throws an error, Express doesn't automatically catch that error. Left alone, this can crash the server or leave the browser hanging forever waiting for a response that never comes. `asyncHandler` fixes this by wrapping every route handler so any error it throws is always caught and turned into a proper JSON error response instead of a crash.

- `asyncHandler` — lines 8–15: takes a route handler function (`fn`) and returns a new function that Express actually calls. It runs `fn`, and if it throws or rejects, the `.catch(...)` block catches the error, works out the right HTTP status code, logs the error to the console, and sends back a JSON response in the standard shape (see `apiResponse.js` below) instead of letting the error escape.
  - Worth pointing out in class: the comment at the top of this file (lines 4–7) explains that this code deliberately reads the actual status code off the error (`err.statusCode`, falling back to `500` only if it's not a recognized `ApiError`) rather than always hardcoding `500`. That matters because if every error came back as `500 Internal Server Error`, the frontend couldn't tell the difference between "you're not logged in" (401) and "the server broke" (500) — it uses the status code to decide what to do next (e.g. redirect to login vs. show a generic error).

### `backend/utils/apiResponse.js`

This defines the standard "success" shape every endpoint sends back, so the frontend always knows what format to expect no matter which endpoint it called.

- `ApiResponse` — lines 1–8: a small class (a blueprint for creating objects) with four fields: `statusCode` (the HTTP status number, e.g. `200`), `data` (whatever the endpoint actually wants to return — a user object, a list of roadmaps, etc.), `message` (a short human-readable string, defaulting to `"Success"`), and `success` (`true`/`false`, automatically worked out as "was the status code less than 400"). Every controller builds one of these and sends it back so the frontend can always check `.success` and read `.data` in the same way, regardless of which feature it's calling.

### `backend/utils/appiError.js`

Fun fact: yes, this filename really is spelled `appiError.js`, not `apiError.js`. It's a typo that's been in the codebase long enough that other files already import it under that misspelled name — so the "wrong" spelling is actually load-bearing now. Renaming it correctly would require updating every file that imports it at the same time, or imports would silently break.

- `ApiError` — lines 1–21: a custom error class that extends JavaScript's built-in `Error`. Normally a plain `Error` only carries a message. This version also carries a `statusCode` (what HTTP status to respond with, e.g. `404` for "not found" or `403` for "not allowed"), a `data` field (always `null` for errors), a `success` field (always `false`), and an optional list of `errors` for more detail. The idea: instead of a controller manually building a response object every time something goes wrong, it just does `throw new ApiError(403, "Not your roadmap")`, and `asyncHandler` (above) turns that into the right response automatically.

### `backend/utils/connectDB.js`

- `connectDB` — lines 3–12: an `async` function that connects the backend to the MongoDB database (MongoDB is where all the persistent data — users, roadmaps, jobs — actually lives). It calls `mongoose.connect(...)` using the connection string stored in the `MONGO_URI` environment variable, and logs `"MongoDB connected successfully"` once it succeeds. If the connection fails, it logs the error and calls `process.exit(1)` — this deliberately kills the whole server process, because there's no point running a backend that can't reach its database. This function is called once, right when the server starts up (in `index.js`), before the server starts accepting any requests.

### `backend/utils/cloudinary.js`

When a user uploads their CV, the file doesn't stay sitting on the backend's own hard disk — it gets uploaded to Cloudinary, an external file-hosting service (think of it like a specialized cloud storage service, similar in spirit to Google Drive, but built for hosting files that apps read back later). Storing it there instead of on the server's disk means the file survives even if the server restarts or is replaced, and multiple server instances could all reach the same file.

- `uploadCvOnCloudinary` — lines 13–39: takes `localFilePath` (the path to the CV file that was temporarily saved to the server's disk by `multer`, the file-upload middleware) and uploads it to Cloudinary. Returns Cloudinary's response object (which includes the file's public URL) on success, or `null` if `localFilePath` was empty or the upload failed. Two details worth calling out:
  - `resource_type: "auto"` (line 19) lets Cloudinary automatically decide how to store the file — as an image (for JPG/PNG) or as a raw file (for DOCX) — and only image/PDF/DOCX files are allowed (line 21).
  - The `finally` block (lines 28–37) always deletes the local temporary copy of the file from the server's disk afterwards, whether the upload succeeded or failed — so the server doesn't slowly fill up with leftover uploaded files.

### `backend/utils/emails.js` and `backend/utils/nodemailer.js`

Both files exist to send the one-time login code (OTP) by email, but only one of them is actually wired up and used. `emails.js` uses a service called Resend and defines `otpEmail`, but nothing in the rest of the codebase ever calls it — it's dead code, left over from an earlier attempt. The one that's actually used is `nodemailer.js`'s `otpEmailViaNodemailer`, which sends through Gmail's SMTP (the standard protocol mail servers use to send email) using a Gmail account's credentials.

- `backend/utils/emails.js` — `otpEmail` — lines 8–55: builds an HTML email containing the OTP code and calls Resend's API to send it. **Not called anywhere else in the codebase** — safe to point at as an example of dead code during a walkthrough, but don't rely on it actually sending anything.
- `backend/utils/nodemailer.js` — `otpEmailViaNodemailer` — lines 14–82: this is the function that actually sends the OTP email a user receives. It builds an HTML email with the 6-digit code and sends it via `transporter.sendMail(...)` (the `transporter`, set up on lines 6–12, is a reusable connection to Gmail's SMTP servers, authenticated with `EMAIL_USER`/`EMAIL_PASSWORD` from the environment).
  - The HTML template (lines 26–73) is a styled card with the Learn Bridge AI logo bar, the OTP code in a large monospace box, and a note that the code expires in 3 minutes.
  - Lines 20–25 explain something subtle in a code comment: some email apps (like Gmail's mobile app) automatically try to "invert" colors for users who have dark mode turned on, guessing at what's meant to be light or dark text. Because it's guessing, it can get it wrong — in this case it was turning the OTP code white-on-white, making it unreadable. The `<meta name="color-scheme" content="light only">` tag (line 31) tells email apps that respect it "don't do that, this email is always light-themed." As a backup for apps that ignore that tag, the OTP code box also uses old-fashioned HTML attributes (`bgcolor`, `<font color=...>`) instead of modern CSS, because Gmail's dark-mode color-rewriting specifically targets CSS colors and tends to leave those older HTML attributes alone.

### `backend/utils/ocr.js`

OCR stands for Optical Character Recognition — in plain terms, reading the text out of a picture or a scanned document, the way a human would read it off a photo, rather than getting text that's already stored as text.

Most of the time, OCR isn't actually needed: if someone uploads a normal PDF or Word document that was created digitally (not scanned), the text is already embedded in the file and can just be read directly, which is fast (milliseconds). OCR is only needed as a fallback — for an uploaded image (JPG/PNG) of a CV, or for a PDF that turns out to be a scanned picture of a page with no real text layer underneath it (so the "quick" text extraction comes back empty).

- `extractTextFromBuffer` — lines 9–21: the fast path. Given a file's raw bytes (`buffer`) and its type (`"pdf"` or `"docx"`), it pulls the text out directly — using the `pdf-parse` library for PDFs and `mammoth` for Word documents — without any image analysis. This runs inline, immediately, inside the upload request itself, because it's quick.
- `cloudinaryPdfToPng` — lines 26–30: takes a Cloudinary PDF URL and rewrites it into a URL for a PNG image of just the first page. This is needed because Cloudinary blocks directly downloading raw PDF files by default for security reasons, but rasterizing (converting) that same first page to a PNG image sidesteps that restriction, which then makes OCR possible on it.
- `ocrImageUrl` — lines 32–35 (internal helper, not exported/used outside this file): runs Tesseract.js (the OCR engine/library) on an image at a given URL and returns whatever text it manages to read out of it.
- `extractTextFromCV` — lines 39–44: the slow OCR path, used by the background worker (not the upload request itself) when the fast text-extraction path came back empty. If the file is a PDF, it first converts it to a PNG of the first page (using `cloudinaryPdfToPng` above) and then OCRs that image; for an already-image file, it OCRs it directly.

### `backend/utils/password.js`

This file handles password hashing and checking. "Hashing" means running a password through a one-way scrambling function that turns it into a fixed-length jumble of characters that cannot be reversed back into the original password — so even if someone got direct access to the database, they still couldn't read anyone's actual password, only the scrambled version.

- `hashPassword` — lines 5–7: takes a plain-text password and returns its bcrypt hash (bcrypt is the hashing algorithm/library used here — it's designed to be deliberately slow, which makes it harder for an attacker to try huge numbers of guesses quickly). This is what gets called when a user registers, before their password is ever saved to the database.
- `decodePassword` — lines 9–11: despite the name, this doesn't actually "decode" or reverse the hash (that's not possible) — it takes the password the user just typed in at login plus the hash stored in the database, and asks bcrypt to check whether they match, returning `true`/`false`. This is what gets called every time a user logs in.

### `backend/utils/learning.js`

This file holds the shared rules for the quiz-driven learning progress system — deciding which small "subtopics" inside a roadmap count as finished, which topics are locked until earlier ones are done, and how a user's overall percentage progress is calculated. It's kept in one file so that this logic is calculated the exact same way everywhere it's needed, instead of being recalculated slightly differently in different controllers.

- `PASS_THRESHOLD` — line 3: a constant, set to `60`. This is the minimum score (out of 100) a user needs on a subtopic's quiz to have "passed" it.
- `totalSubtopics` — lines 7–9: given a saved roadmap document, counts up how many subtopics exist in total across every step (topic) of that roadmap's plan.
- `isSubtopicCleared` — lines 11–15: checks whether one specific subtopic (identified by which step/topic it's under, plus its own ID) has already been cleared by the user. It does this by checking the roadmap's `clearedSubtopics` list — a running record kept on the roadmap document of every subtopic the user has already passed a quiz for.
- `isTopicUnlocked` — lines 17–22: decides whether a given topic (step) is currently accessible to the user, or still locked. The rule: the very first topic (`stepIndex <= 0`) is always unlocked. Any topic after that only unlocks once *every* subtopic in the *previous* topic has been cleared (checked with `isSubtopicCleared` above) — so a user has to finish a topic's subtopics in order before moving to the next topic. (If the previous topic happens to have no subtopics at all, it's treated as trivially cleared, so the next topic unlocks anyway.)
- `progressPercent` — lines 24–29: calculates the user's overall progress through the whole roadmap as a rounded percentage — the number of subtopics they've cleared, divided by the total number of subtopics across the whole roadmap, times 100. Returns `0` if the roadmap has no subtopics at all (to avoid dividing by zero).

**Where badges fit in:** the actual badge-awarding decision isn't made inside this file — it happens in `backend/controllers/quizzes/quizzes.controller.js`, which imports `PASS_THRESHOLD` and `isTopicUnlocked`/`progressPercent` from here. The rule (from that controller, around lines 280–304): a user's quiz score must clear `PASS_THRESHOLD` to count as a "pass" at all, and a badge is awarded the first time a user passes a **hard**-difficulty quiz for any topic — one badge per topic, never awarded twice for the same topic. So `learning.js` supplies the shared building blocks (what counts as "passed," what's unlocked, what percentage progress looks like), and the controller layered on top of it decides what to actually do with those facts (award a badge, unlock the next topic, and so on).
