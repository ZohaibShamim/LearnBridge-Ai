# Backend — Overview

## What this service does

The backend is a Node.js web server built with Express (a popular framework — think of it as a toolkit for building web servers in JavaScript). It is the part of Learn Bridge AI that manages user accounts: registering, logging in, and verifying the one-time login code (OTP) sent by email. It also receives the CV file a user uploads, saves and lists a user's saved career roadmaps, and serves quiz and dashboard data. Rather than doing the slow work of reading and processing a CV itself, it hands that job off to a separate background program (a "worker") so the website stays fast and responsive. To remember things permanently — user accounts, roadmaps, uploaded-job records — it talks to MongoDB (a database: basically a place that stores and organizes data on disk so it survives after the server restarts). To hand work off to the worker, it uses Redis (an in-memory data store used here as a queue — a waiting line of jobs the worker picks up one at a time) via a library called BullMQ. This backend is the thing the frontend website (the part users actually see in their browser) talks to over HTTP (the standard protocol/language browsers and servers use to send requests and responses) every time a user clicks something that needs data.

## How the files fit together

This `docs/backend/` folder has one doc per area of the codebase. Once you've read this overview, these are the next places to look, depending on what you want to explain:

- **`models.md`** — the shape of the data stored in MongoDB: what a `User`, `Profile`, `Roadmap`, and `Job` document looks like.
- **`controllers.md`** — the actual logic behind each feature (e.g. what happens, step by step, when someone registers or uploads a CV).
- **`routes.md`** — the list of URLs (endpoints) the backend responds to, and which controller function handles each one.
- **`middlewares.md`** — the small functions that run *before* a controller, such as checking a user is logged in, or handling an uploaded file.
- **`utils.md`** — small reusable helper functions (e.g. formatting a response, connecting to the database, sending an email).
- **`queues-and-workers.md`** — how a CV upload gets handed off to the background worker, and what that worker does with it.

This file (`README.md`) only covers the two files that start the server and wire everything together: `index.js` and `app.js`.

## File by file

### `backend/index.js`

This is the file you run to start the whole backend (`node index.js`). It only does two things, in order:

1. `connectDB()` — lines 2, 6: connects to the MongoDB database before anything else. "Connecting to a database" just means the server opens a line of communication to where all the data lives, so it can later read and write things like user accounts. The server deliberately waits for this to succeed first — see the `.then(...)` on line 6 — because there's no point accepting web requests if the database isn't reachable yet.
2. `app.listen(PORT, ...)` — lines 4, 7–9: once the database connection is ready, the server starts "listening" on a port. A port is just a numbered door on the computer (here, `PORT`, taken from the `process.env.PORT` environment variable, or `8000` if none is set — line 4) that the server watches for incoming requests on. Any request sent to `http://localhost:8000` will knock on that door.
3. Line 8: once listening starts, it logs `Server is running on port ${PORT}` to the console, so whoever started the server can see it's ready.

The `app` object imported on line 1 (`import app from "./app.js"`) is where all the actual request-handling logic lives — that's the next file.

### `backend/app.js`

This file builds the Express application: it sets up some ground rules ("middleware" — functions that every request passes through before reaching the actual feature code) and then connects each group of routes to it.

- **Lines 1–8**: imports. Line 1 brings in Express itself. Line 2 brings in `dotenv`, a small library that reads secret configuration values (like database passwords) from a `.env` file. Lines 3–6 import the four route groups (explained below). Line 7 imports `cookie-parser`, and line 8 imports `cors`.
- **Line 10** (`dotenv.config()`): loads the `.env` file's values into `process.env` so the rest of the app can read things like `PORT` or `FRONTEND_URL`.
- **Line 12** (`const app = express()`): creates the actual Express application object — the thing that will receive and respond to every web request.
- **Lines 14–19** (`app.use(cors({...}))`): sets up CORS (Cross-Origin Resource Sharing). Here's why it's needed: the frontend website runs on its own address (`http://localhost:3000` in development), while this backend runs on a different one (`http://localhost:8000`). Browsers block a webpage from calling a server on a different address by default, as a security measure. CORS is the backend explicitly telling the browser "requests from this specific address (`process.env.FRONTEND_URL`, or `http://localhost:3000` if that's not set — line 16) are allowed." `credentials: true` (line 17) additionally allows cookies (small pieces of data like login sessions) to be sent along with those cross-address requests.
- **Line 21** (`app.use(cookieParser())`): adds cookie-parser, which reads the cookies attached to an incoming request and makes them easy to access in code (instead of having to manually decode the raw cookie text). This is how the backend later reads things like a refresh-token cookie.
- **Line 22** (`app.use(express.json({ limit: "16kb" }))`): tells Express to automatically read incoming request bodies written in JSON format (a common way to send structured data, like `{ "email": "a@b.com" }`) and turn them into a normal JavaScript object the code can use. The `limit: "16kb"` caps how large that JSON body is allowed to be — a safety measure so nobody can crash or slow down the server by sending a huge body.
- **Line 23** (`app.use(express.urlencoded({ extended: true, limit: "16kb" }))`): same idea as line 22, but for the other common body format, URL-encoded form data (the format a plain HTML `<form>` submits by default). Same 16kb size cap.
- **Lines 25–27**: a commented-out (disabled) test route that would have replied with a plain "Learn Bridge AI Backend is running" message — it's left in the file but doesn't run.
- **Lines 28–31**: this is where the four route groups get mounted onto the app — meaning "any request whose URL starts with this prefix gets forwarded to this router file":
  - Line 28: `/api/v1/users` → `userRouter` (from `routes/user.routes.js`) — registration, login, OTP, CV upload.
  - Line 29: `/api/v1/roadmaps` → `roadmapRouter` (from `routes/roadmap.routes.js`) — saving, listing, viewing, deleting roadmaps.
  - Line 30: `/api/v1/quizzes` → `quizRouter` (from `routes/quiz.routes.js`) — quiz-related endpoints.
  - Line 31: `/api/v1/dashboard` → `dashboardRouter` (from `routes/dashboard.routes.js`) — dashboard data.
  - The full details of each individual endpoint (e.g. what `/api/v1/users/register` actually does) belong in `routes.md`, not here.
- **Line 33** (`export default app`): makes this fully-configured `app` object available to `index.js`, which is what actually starts it listening on a port.
