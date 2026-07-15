# Frontend — Talking to the Backend (services, auth, state)

## What this is

This group of files handles everything about talking to the backend server and keeping track of who's logged in. "Services" are files whose only job is to make the actual HTTP requests (a "request" here just means "the browser asking the backend server for or sending it some data") — they don't render anything on screen. "Hooks" are reusable pieces of React logic (React is the library this app's UI is built with) that a page can plug into, in this case for checking and managing login state. The "store" holds global app state — data that many different pages might need at once, like "who is the currently logged-in user," without having to pass that data down manually through every component. Together, these files are the plumbing underneath every page: whenever a page needs to log someone in, upload a CV, fetch a roadmap, or check "is this person even allowed to be here," it goes through this plumbing rather than writing its own HTTP calls.

## File by file

### `frontend/config/instance/api.ts`

This file creates one shared **axios instance** (axios is a JavaScript library for making HTTP requests; an "instance" here means a pre-configured version of it) that every other service file in this app uses. Because it's pre-configured, every request automatically gets the right base URL (the backend's address) and the right headers (extra metadata sent with a request, like "here is my login token") without each service file having to repeat that setup.

- `API_BASE_URL` — line 4 (exported line 11). The backend's address, e.g. `http://localhost:8000/api/v1`, read from an environment variable with a hardcoded fallback if that variable isn't set.
- `api` — lines 6–9. The actual axios instance, created with that base URL and `withCredentials: true` (this tells the browser to include cookies — small pieces of data the browser stores and automatically sends back — with every request; that matters because the refresh token, explained below, is stored in a cookie).
- `isAuthEndpoint` — lines 22–25. A small helper that checks whether a request's URL is one of the login/register/OTP/refresh endpoints (listed in `AUTH_ENDPOINTS`, lines 14–20). This matters for the auto-refresh logic below: those endpoints should never trigger a "try to refresh the token" attempt, because a login page failing with "unauthorized" doesn't mean an expired token — it means the login itself failed, and trying to refresh there could cause an infinite loop.
- `processQueue` — lines 33–43. Explained together with the interceptor below, since it's part of the same mechanism.

**The request interceptor (lines 48–69).** An "interceptor" is code that automatically runs before a request is sent out (a request interceptor) or after a response comes back (a response interceptor) — think of it as a checkpoint every request/response has to pass through. This request interceptor's job: grab the current access token (explained in `token.ts` below) and attach it to the request as an `Authorization: Bearer <token>` header (line 56), so the backend knows who's making the request. It also strips out a manually-set `Content-Type` header when the request body is a file upload (`FormData`, lines 59–61), because the browser needs to set that header itself for file uploads to work correctly.

**The response interceptor and automatic token refresh (lines 74–164).** This is the most important part of the file, and it solves a real problem: access tokens are deliberately short-lived (they expire after a while, on purpose, for security — see `token.ts` below), so without this code, a user would get randomly logged out and have to log back in constantly. Instead, here's what happens when a request comes back with a `401 Unauthorized` status (meaning "your token isn't valid/has expired"):

1. First, it checks whether the failing request was itself a login/register/OTP/refresh call (`isAuthEndpoint`, line 86) or specifically the refresh-token call itself (line 92) — in both cases it just gives up and returns the error, rather than trying to refresh (refreshing after a failed refresh would loop forever).
2. Otherwise (line 102), it assumes the access token simply expired, and automatically calls the backend's refresh-token endpoint (lines 124–134) to get a brand-new access token — using the httpOnly cookie (the refresh token) that the browser sends automatically, no code has to touch it directly.
3. If that succeeds, it stores the new access token (`setAccessToken`, line 144), retries the original request that failed with the new token attached (line 148), and the calling code never even notices anything went wrong — the page just gets its data a moment later than usual.
4. If the refresh itself fails (say, the refresh token is also expired or invalid), it clears all stored auth data and redirects the browser to `/login` (lines 149–158).

**The "single-flight" queue, in plain English (lines 27–43, and lines 103–114):** imagine five different parts of a page all fire off requests at the same moment, and all five come back `401` because the token just expired. Without protection, that would trigger five *separate* refresh-token calls all racing each other — wasteful, and potentially confusing for the backend. This code prevents that: a flag called `isRefreshing` (line 27) tracks whether a refresh is already in progress. The *first* failing request sees `isRefreshing` is `false`, sets it to `true`, and starts the one real refresh call. Any of the *other* four requests that fail while that's still happening see `isRefreshing` is already `true`, and instead of starting their own refresh, they just get pushed into a waiting list called `failedQueue` (lines 104–113) and sit there, paused. Once the single real refresh call finishes, `processQueue` (lines 33–43) walks through everyone who was waiting and either retries their request with the fresh token (if the refresh succeeded) or fails them all together (if it didn't) — so, at most, one refresh request ever goes out at a time no matter how many requests failed simultaneously.

---

### `frontend/config/services/auth.service.ts`

Handles registration and the two-step login (login is split into "step 1: password" then "step 2: one-time code," explained more under `useAuthProvider.tsx`'s sibling login page — a one-time code, or OTP, is a short numeric code emailed to the user that proves they also have access to that email inbox, not just the password).

- `registerUser` — lines 71–79. Calls `POST /users/register` to create a new account with the sign-up form's fields (name, email, password, school/degree).
- `loginUserStep1` — lines 81–90. Calls `POST /users/login` with email + password. On success the backend doesn't log the user in yet — it emails them a 6-digit code and returns a short-lived `sessionToken` that step 2 needs.
- `verifyOTPAndLogin` — lines 92–110. Calls `POST /users/verify-otp` with the 6-digit code plus that `sessionToken`. If the backend accepts it, this function immediately stores the returned access token in memory (`setAccessToken`, line 106) — this is the only service function that touches the token store directly, since it's the moment the user actually becomes "logged in."
- `resendOtp` — lines 112–120. Calls `POST /users/resend-otp` (with the same `sessionToken`) to have the backend send a fresh code, e.g. if the first one expired or never arrived.

### `frontend/config/services/cv.service.ts`

Handles uploading a CV (résumé) file and checking on the AI roadmap-generation job it kicks off. It also defines shared types (`Roadmap`, `JobStatus`, etc. — TypeScript type definitions describing the *shape* of the data these calls return, so the rest of the app gets autocomplete and typo-catching) and two small formatting helpers.

- `convertRoleToTitle` — lines 66–77. Not a network call — a pure helper that turns a backend-style role string like `"data_scientist"` into a human-readable title like `"Data Science"` for display.
- `normalizeResources` — lines 87–115. Also not a network call. The AI service can return a step's learning resources (a YouTube link, an article link) in two different shapes; this helper converts either shape into one consistent array so the rest of the UI only has to handle one format.
- `uploadCV` — lines 119–135. Calls `POST /users/upload-cv`, sending the CV file and the chosen target role as a multipart form (a way of sending files over HTTP). This kicks off the backend's background processing job and returns a `jobId` to track it.
- `getJobStatus` — lines 137–140. Calls `GET /users/job/:jobId` to check whether that background job is still processing, finished (with the generated roadmap attached), or failed. Pages poll (call repeatedly every couple seconds) this endpoint while waiting for the AI to finish generating a roadmap.

### `frontend/config/services/dashboard.service.ts`

- `getDashboard` — lines 41–44. Calls `GET /dashboard` to fetch the summary numbers and lists shown on the dashboard page: stats (courses in progress, quizzes completed, average score, etc.), the roadmaps currently being worked on, and recent quiz activity — all in one combined response so the dashboard page doesn't need several separate requests.

### `frontend/config/services/quiz.service.ts`

Handles the quiz system: generating quizzes, fetching them, submitting answers, and reviewing results. A comment at the top of the file (lines 4–5) notes something worth flagging to students: quiz questions are sent to the browser as **index-based** (option 0, 1, 2, 3) rather than including the correct answer, and the correct answer only comes back *after* submitting — this stops someone from reading the correct answer out of the page's own data before taking the quiz.

- `generateQuiz` — lines 96–101. Calls `POST /quizzes/generate` to have the AI create a new quiz on a given topic/difficulty.
- `getOrCreateSubtopicQuiz` — lines 111–116. Calls `POST /quizzes/subtopic`. Rather than always generating a fresh quiz, this either returns an already-generated quiz for one specific roadmap subtopic + difficulty, or creates and caches one if it doesn't exist yet — avoids re-generating (an AI call) the same quiz repeatedly.
- `getAllQuizzes` — lines 118–121. Calls `GET /quizzes` to list every quiz the logged-in user has.
- `getQuizById` — lines 123–126. Calls `GET /quizzes/:quizId` to fetch one specific quiz to take it.
- `submitQuiz` — lines 128–138. Calls `POST /quizzes/:quizId/submit`, sending the user's chosen answers and how long they took. The backend grades it and sends back the score.
- `getAttempt` — lines 140–147. Calls `GET /quizzes/attempt/:attemptId` to review a past attempt in detail — this is the point where the correct answers and explanations are finally included in the response.

### `frontend/config/services/roadmap.service.ts`

Handles saving a generated roadmap permanently, listing a user's saved roadmaps, and tracking progress through one. Note this file imports its shared `ApiResponse` type from `cv.service.ts` (line 2) instead of having its own copy — an existing minor cross-file coupling in the codebase, not something introduced here.

- `saveRoadmap` — lines 50–58. Calls `POST /roadmaps/save` to permanently save a roadmap the AI generated (the raw job result is temporary; saving copies it into its own permanent record).
- `getRoadmaps` — lines 60–63. Calls `GET /roadmaps` to list every roadmap the logged-in user has saved.
- `getRoadmapById` — lines 65–72. Calls `GET /roadmaps/:roadmapId` to fetch one specific saved roadmap, e.g. to view it in detail.
- `deleteRoadmap` — lines 74–81. Calls `DELETE /roadmaps/:roadmapId` to permanently remove a saved roadmap.
- `updateRoadmapProgress` — lines 83–93. Calls `PATCH /roadmaps/:roadmapId/progress`, marking one step of the roadmap as completed (or not), and gets back the updated completion percentage.

---

### `frontend/config/token/token.ts`

This tiny file (only 18 lines) is one of the most security-relevant files in the whole app, even though it barely does anything: it stores the access token in a plain JavaScript variable (`accessToken`, line 1) that lives only in memory (meaning: it exists only while the page/tab is open, and vanishes the instant the page is closed or hard-refreshed) — never in `localStorage` or any other browser storage that would survive a refresh.

- `getAccessToken` — lines 3–5. Returns the current token (or `null` if there isn't one).
- `setAccessToken` — lines 7–9. Stores a new token, called right after login and right after a token refresh.
- `removeAccessToken` — lines 11–13. Clears the token back to `null`.
- `clearAuthData` — lines 15–18. Clears the token (used on logout or when a refresh fails); the refresh token itself is a cookie, so the backend is responsible for clearing that side.

**Why in-memory instead of `localStorage`?** `localStorage` is convenient but any JavaScript running on the page can read it — including malicious code, if the site were ever hit by an XSS attack (cross-site scripting: a security bug where an attacker manages to sneak their own JavaScript into a page a victim is viewing, e.g. through an unsanitized input field or a compromised third-party script). If a token were sitting in `localStorage`, that injected script could simply read it and steal the user's session. By keeping the access token only in a JS variable that lives in this module — and the far more sensitive refresh token in an httpOnly cookie the browser deliberately hides from JavaScript entirely — there's nothing sitting in "public" storage for a malicious script to grab.

**The tradeoff:** because the token lives only in memory, a hard page refresh (or closing and reopening the tab) wipes it out completely — the JavaScript variable resets to `null` like any other in-memory value. This is exactly why `useAuthProvider.tsx` (below) does a "silent refresh on page load": every time the app starts up, before showing anything, it quietly asks the backend for a fresh access token using the httpOnly refresh-token cookie (which *did* survive the refresh), so the user doesn't have to log in again just because they reloaded the page.

---

### `frontend/hooks/auth-hooks/useAuthProvider.tsx`

This is the real, actively-used authentication logic for the whole app — it wraps every page in an `AuthProvider` (line 24) and decides, on every navigation, whether the current visitor is allowed to be where they are.

- `AuthProvider` — lines 24–157. The main component. It tracks two pieces of state: `isLoading` (still figuring out login status) and `isAuthenticated` (logged in or not), and exposes them (plus a few functions) to the rest of the app through React Context (a way to make some data available to any component in the tree without passing it down manually prop-by-prop, lines 152–156).
  - `checkAuth` — lines 35–91. The core "how does it know if you're logged in" logic. First it checks whether an access token already exists in memory (line 39) — if so, it's done, no network call needed. If there's no token but the current page is a public auth page like `/login` or `/signup` (line 47), it doesn't bother trying to refresh — it just marks the user as not logged in. Otherwise, it performs the "silent refresh on page load" described above: it calls the backend's refresh endpoint directly with `axios` (lines 57–64, note this bypasses the shared `api` instance and its interceptors — a small duplication also called out in `api.ts`'s own logic), and if that returns a fresh access token, stores it and marks the user as authenticated; if it fails, it clears everything and marks the user as logged out.
  - `redirectAfterLogin` — lines 94–97. Sends a freshly-logged-in user to `/upload`, the CV upload page — the natural first step in this app's flow.
  - `logout` — lines 99–125. Calls the backend's logout endpoint (best-effort — it still logs the user out locally even if that call fails, lines 116–124), then clears the token, clears the Zustand user store, and redirects to `/login`.
  - The `useEffect` at lines 127–150 is **how it redirects you if you're not logged in**: on every page load/navigation it runs `checkAuth()`, and then: if you're authenticated but sitting on a login/signup page, it bounces you forward to `/upload` (you're already logged in, no need to log in again); if you're *not* authenticated and sitting on a page that isn't public, it bounces you back to `/login`. This imperative redirect-in-a-`useEffect` pattern — not a wrapper component — is the actual mechanism protecting every page in this app.
- `useAuth` — lines 159–165. A small convenience hook other components call to read `isAuthenticated`/`isLoading`/`logout`/etc. from the context set up above. Throws an error if used outside an `AuthProvider` (line 162) — a safety check to catch a component that forgot to be wrapped.

### `frontend/hooks/auth-hooks/useProtectedWrapper.tsx` and `usePublicWrapper.tsx`

Both files export a component named `ProtectedRoute` that's meant to wrap a page and show a loading spinner until `useAuth()` says whether the user is authenticated. On paper, this looks like a second way of protecting routes, separate from the redirect logic in `useAuthProvider.tsx` above.

In practice, based on what's in these two files, **this looks like dead code that isn't actually the mechanism doing the real work**:
- The two files export the exact same component name (`ProtectedRoute`), which alone suggests they aren't both being imported and used side by side somewhere sensible.
- `usePublicWrapper.tsx`'s core check is literally commented out (lines 22–28: the `if (!isAuthenticated) { ... }` block that would normally show a spinner for logged-in-only content is entirely commented, leaving the component that renders regardless).
- The actual redirect-to-login / redirect-to-upload behavior described above already lives entirely inside `useAuthProvider.tsx`'s `useEffect`, which runs automatically for the whole app without any page needing to wrap itself in a `ProtectedRoute` component.

So: if you're explaining this codebase out loud, the honest thing to say is that route protection in this app happens through `useAuthProvider.tsx`'s automatic redirects, and these two wrapper files appear to be an earlier or alternate approach that was left behind, not something actively wired into any page. Worth double-checking with a search across the `app/` folder before fully relying on that conclusion, but nothing in the files themselves suggests they're in active use.

---

### `frontend/store/auth.ts`

This file sets up the app's one global state store using **Zustand** — a small library for storing data that many different components need access to (like "who is currently logged in"), without having to manually pass that data down through every layer of components in between (a pattern called "prop drilling" that gets unwieldy fast). Think of it as a shared box of data any component can reach into directly.

- `useAuthStore` — lines 28–46. The store itself, created with `create` (line 28) and wrapped in Zustand's `persist` middleware (line 29) — "persist" means the store automatically saves its data to `localStorage` and reloads it when the page reopens, so the logged-in user's basic info doesn't vanish on every refresh.
  - State: `user` (the current user's profile info — name, email, etc.) and `isLoading`.
  - Actions: `setUser` (line 36, store a user), `setLoading` (line 37), `clearAuth` and `logout` (lines 38–39, both just reset back to empty/no-user — logout doesn't call the backend here, that's handled by `useAuthProvider.tsx`'s `logout` function instead).
  - `partialize` — line 43. This is the important line: it tells Zustand's `persist` middleware to save **only** the `user` field to `localStorage`, explicitly excluding tokens. This is deliberate, and matches the same reasoning as `token.ts` above: `localStorage` is readable by any JavaScript on the page, so if the access or refresh token were saved here too, that would reopen the exact XSS risk that keeping them out of `localStorage` elsewhere was meant to close. The user's name/email being visible in `localStorage` is a much smaller risk than a token that could be used to impersonate them, so only that gets persisted.

---

### `frontend/lib/utils.ts`

A tiny (7-line) helper file with a single exported function.

- `cn` — lines 5–7. A helper for merging Tailwind CSS class name strings (Tailwind is the CSS framework this app's styling is written in — utility classes like `text-sm`, `bg-red-500`, etc.). "Merging class names" means: sometimes a component gets a base set of classes (say, a default button style) plus extra classes passed in by whoever is using it (say, overriding the color for one specific button) — simply concatenating those strings can leave two conflicting classes both present (e.g. `bg-red-500 bg-blue-500`), and CSS's normal rule for which one wins can be unpredictable. `cn` uses two small libraries together to fix that: `clsx` (lets you pass in classes conditionally, e.g. only include a class if some condition is true, and cleanly ignores `false`/`null`/`undefined` values) and `tailwind-merge` (specifically understands Tailwind's own classes and resolves conflicts so the *last* one specified always wins, e.g. `bg-blue-500` correctly overrides an earlier `bg-red-500` instead of both being sent to the browser). This is a very common small utility in Tailwind-based React apps — used anywhere a component needs to accept a `className` prop and combine it with its own default styling.
