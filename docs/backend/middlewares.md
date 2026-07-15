# Backend — Middlewares (checks that run before your code)

## What this is

A "middleware" is just a function that runs **before** the main code that handles a request, and it gets to decide what happens next: let the request continue, or stop it right there with an error. Think of it like a security guard standing at the door of a building — they check your ID (or your ticket, or your bag) before you're allowed inside, and if something's wrong, you don't get in at all, no matter how good the room behind the door is. In this backend, middlewares are used to check "is this person logged in?" and "is this file actually a CV we can accept?" before the real work (like generating a roadmap) ever starts.

## File by file

### `backend/middlewares/auth.middleware.js`

This file exports one function: `verifyUser` — lines 6–42. Its job is to act as the security guard for any route that requires the user to be logged in (for example, uploading a CV). It runs before the actual route logic and either waves the request through or blocks it.

Step by step:

1. **Read the token from the request** (line 7). Every logged-in request is expected to carry an `Authorization` header shaped like `Bearer <token>`. The code strips off the word `"Bearer "` to get just the token itself. This token is a **JWT (JSON Web Token)** — in one simple sentence, a JWT is a signed piece of text that proves who you are, kind of like a wristband you get at a concert: security can glance at it and trust it's real without calling head office, because it's stamped in a way that's hard to fake.

2. **Check the token exists at all** (lines 9–11). If there's no token, the request is stopped immediately with a `401` error ("No token provided"). No wristband, no entry.

3. **Check the token is valid and not expired** (lines 16–21). The code asks the `jsonwebtoken` library to verify the token's signature and expiry using a secret key only the server knows. If the token was tampered with, is malformed, or has simply expired, the library throws an error — and the code catches that and turns it into a `401` ("Invalid or expired access token") rather than letting a scary raw error message leak out.

4. **Check the token's role is allowed** (lines 26–28). The token also carries a "role" (baked in when it was originally issued). Here, only `"student"` or `"teacher"` roles are accepted — anything else gets a `403` ("Access Denied: Role is not Student or Teacher").

5. **Look the user up in the database** (lines 32–34). Even though the token proves *a* user was logged in at some point, the code still fetches that user's record fresh from the database, deliberately leaving out the `password` and `refreshToken` fields (so sensitive data never accidentally ends up attached to the request). This also catches the case where the account was deleted after the token was issued.

6. **If the user record is gone, stop** (lines 36–38). If nobody in the database matches the ID inside the token, the request is stopped with a `404` ("User record no longer exists").

7. **If everything checks out, let the request through** (lines 40–41). The user's record is attached to `req.user` (so every later piece of code — like the actual route handler — can use it), and `next()` is called, which is the signal that means "this middleware is done, move on to the next thing in line."

**Why the exact status code matters:** `401` means "we don't know who you are" (no token, or a bad/expired one) — the natural response for the frontend is "try refreshing the token, or send the user back to log in." `403` means "we know who you are, but you're not allowed to do this" (wrong role) — refreshing the token won't fix that, so the frontend shouldn't bother retrying. `404` means "that user doesn't exist anymore" — a different problem again. Mixing these up would send the frontend down the wrong recovery path (for example, endlessly trying to refresh a token when the real problem is a deleted account), so picking the right one at each step genuinely matters, not just as a style point.

### `backend/middlewares/multer.middlware.js`

This file sets up file-upload handling using a library called `multer`. In plain terms: when a user uploads their CV from the browser (say, a PDF), it doesn't just magically appear as a JavaScript object on the server — something has to actually receive that raw file data over the network, save it somewhere, and make it available to the rest of the server's code (like `req.file`). That "something" is this middleware.

It exports one thing: `upload` — lines 14–43, an instance of `multer` configured with:

- **Where files get saved** (lines 4–12): a `storage` config that tells multer to write incoming files to the `public/uploads` folder on disk, and to name each saved file using its field name plus the current timestamp plus its original extension (so two uploads never overwrite each other).
- **A size limit** (line 16): files bigger than 10MB are rejected, matching the limit the frontend also enforces.
- **A file-type filter** (lines 17–42): only JPG, JPEG, PNG, PDF, and DOCX files are allowed. It checks both the file's declared MIME type and its extension, and is a little lenient on the MIME type specifically because some browsers/tools send a generic `application/octet-stream` type for DOCX files instead of the "correct" one — so the extension is treated as the real source of truth, and the MIME type is just a secondary sanity check.

**Fun fact:** the filename is `multer.middlware.js` — missing the first "e" in "middleware." That's not a mistake anyone should casually "fix." Every place in the codebase that imports this file uses that exact misspelled name, so the typo is now load-bearing — renaming the file without updating every import that points to it would break the app.
