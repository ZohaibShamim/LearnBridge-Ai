# Learn Bridge AI

Upload your CV, pick a target role (or skip it), and get back an AI-generated, month-by-month career roadmap — skills to learn, milestones, and curated videos/articles for each step. Each step can also break down into a few guided **subtopics** with Easy/Medium/Hard quizzes, so you can actually test what you've learned instead of just reading a checklist. Save roadmaps and revisit them anytime. Login is email + password plus a 6-digit OTP sent to your email.

## How it's built

The app is four separate pieces that all have to be running together — it's easy to think something is "broken" when really one piece just isn't started.

1. **Frontend** (Next.js) — the website. Lets you sign up/log in, upload a CV, and view your roadmaps.
2. **Backend** (Express + MongoDB) — the API. Handles auth/OTP, stores your CV upload as a "job", and stores saved roadmaps.
3. **Worker** (a plain Node script, `backend/workers/cv.worker.js`) — picks up the CV job in the background, reads the text out of your CV, and asks the AI service to turn it into a roadmap. **This does not start automatically with the backend — you have to run it yourself, in its own terminal.**
4. **AI service** (FastAPI + Python) — takes CV text + your target role, calls an LLM (OpenAI by default) to write the roadmap, then attaches a real YouTube video + article link to each step/subtopic.

The flow end to end: Frontend uploads a CV → Backend saves it and hands the job to the Worker → Worker reads the CV and calls the AI service → AI service asks the LLM for a roadmap and adds resource links → Worker saves the finished roadmap back on the job → Frontend polls until it's done and shows it to you.

Two extra things need to be running for this to work: **MongoDB** (where everything is stored) and **Redis** (the queue the Backend and Worker use to hand off CV jobs).

## Running it locally

You need **6 things running at once**, each in its own terminal tab:

| # | What | Command | Runs on |
|---|------|---------|---------|
| 1 | MongoDB | already running / reachable (Atlas cloud or local `mongod`) | — |
| 2 | Redis | `redis-server` (or already running locally) | `localhost:6379` |
| 3 | AI service | `cd ai && source env/bin/activate && python run.py` | `localhost:8001` |
| 4 | Backend API | `cd backend && npm run dev` | `localhost:8000` (or whatever `PORT` is set to) |
| 5 | **CV Worker** | `cd backend && node workers/cv.worker.js` | no port — background process |
| 6 | Frontend | `cd frontend && npm run dev` | `localhost:3000` |

Then open **http://localhost:3000** in your browser.

**The one thing people forget:** step 5, the worker. There's no `npm run` shortcut for it and it isn't part of `npm run dev` — if you upload a CV and it just sits there "processing" forever, this is almost always why.

### First-time setup (once per machine)

```bash
# AI service — Python virtual environment
cd ai
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
cp .env.example .env       # then fill in your API key, see below

# Backend
cd ../backend
npm install
# create backend/.env yourself (no example file exists yet) — see below for what it needs

# Frontend
cd ../frontend
npm install
# frontend/.env.local — see below
```

### Environment variables you need to set

**`ai/.env`**
```bash
AI_PROVIDER=openai              # or groq / huggingface
OPENAI_API_KEY=...              # whichever provider you picked, needs its key
OPENAI_MODEL=gpt-4o-mini        # optional override
```
`SERPER_API_KEY` and `YOUTUBE_API_KEY` are optional — without them the AI service falls back to scraping search results directly for the video/article links.

**`backend/.env`**
```bash
PORT=8000
MONGO_URI=...                   # your MongoDB connection string
REDIS_URL=...                   # optional — falls back to localhost:6379 if unset
FRONTEND_URL=http://localhost:3000   # must match wherever the frontend is actually running (CORS)
FASTAPI_URL=http://localhost:8001
ROADMAP_TIMEOUT_MS=120000
ACCESS_TOKEN_SECRET=...
REFRESH_TOKEN_SECRET=...
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
EMAIL_USER=...                  # a Gmail address
EMAIL_PASSWORD=...              # a Gmail App Password, not your normal password — see myaccount.google.com/apppasswords
```

**`frontend/.env.local`**
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1   # must match the backend's actual PORT
```

If the frontend and backend ports don't match what's in these two files, login/upload will silently fail with a CORS or network error — this is the most common setup mistake.

### Trying it out

1. Sign up (or use an existing account) and verify with the OTP emailed to you.
2. Go to **Upload Resume**, pick a target role, and upload a CV (PDF, DOCX, or an image).
3. Watch it process — this takes 30-90 seconds (CV text extraction → LLM roadmap generation → resource lookup for every step).
4. Once it's done, save the roadmap. It shows up on **My Roadmaps**, where you can open it, work through the subtopics, and take the quizzes.

### Running the backend's tests

```bash
cd backend
npm test
```
(Only the registration flow has real test coverage today — everything else needs to be checked by hand through the running app.)

## Tech stack, briefly

- **Frontend**: Next.js (App Router) + React + TypeScript + Tailwind CSS
- **Backend**: Express + MongoDB (Mongoose) + Redis/BullMQ for the background job queue
- **AI service**: FastAPI (Python), calls an LLM provider (OpenAI/Groq/HuggingFace) and enriches results with real resource links

For anything deeper than this — architecture decisions, known rough edges, per-service conventions — see the `CLAUDE.md` files at the repo root and inside `backend/`, `frontend/`, and `ai/`.
