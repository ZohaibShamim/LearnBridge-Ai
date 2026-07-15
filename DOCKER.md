# Running Learn Bridge AI with Docker

One command brings up the whole stack — **frontend, backend API, background worker, AI service, MongoDB, and Redis** — no local Node/Python/Mongo/Redis needed.

## Prerequisites
- Docker Desktop (or Docker Engine) with Compose v2+.

## 1. Configure
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- **`OPENAI_API_KEY`** — https://platform.openai.com/api-keys. This is the default AI provider, and the only one that reliably generates the per-step "subtopics" the guided-learning quizzes need — Groq/HuggingFace still work for a plain roadmap, just without that guarantee.
- **`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`** — free at https://cloudinary.com/console (needed to store uploaded CVs).
- **`EMAIL_USER` / `EMAIL_PASSWORD`** — a Gmail address and an [App Password](https://myaccount.google.com/apppasswords) (not your normal password). **Required** — login/signup emails a 6-digit code and there's no fallback if this is blank, so the app can't log anyone in without it.

Everything else (JWT secrets, ports, DB/queue URLs) already has working defaults for local use.

## 2. Run
```bash
docker compose up --build
```
First build takes a few minutes. When it's up:

| Service   | URL / Port                     |
|-----------|--------------------------------|
| Frontend  | http://localhost:3000          |
| Backend   | http://localhost:8010/api/v1   |
| AI service| http://localhost:8001          |
| MongoDB   | internal (`mongo:27017`)       |
| Redis     | internal (`redis:6379`)        |

Open **http://localhost:3000**, sign up, check your email for the OTP code, and try uploading a CV.

## What runs
- **frontend** — Next.js (standalone production build).
- **backend** — Express API (auth, CV upload, roadmap/quiz/dashboard).
- **worker** — the BullMQ CV-processing worker (OCR/PDF/DOCX → AI). Runs from the same image as the backend; it's a **separate process by design**, so it's a separate service here.
- **ai** — FastAPI service (roadmap + quiz + skill-gap generation).
- **mongo**, **redis** — data + queue, self-contained with a named volume (`mongo_data`).

## Common commands
```bash
docker compose up --build -d     # run detached
docker compose logs -f backend   # tail the API
docker compose logs -f worker    # watch CV processing (upload -> OCR -> AI -> saved roadmap)
docker compose logs -f ai        # watch roadmap generation on the AI service side
docker compose down              # stop
docker compose down -v           # stop + wipe the Mongo volume (fresh database next run)
```

## Notes
- `NEXT_PUBLIC_API_BASE_URL` is **baked into the frontend at build time** (it's a browser-side value). If you remap the backend port, rebuild the frontend: `docker compose build frontend`.
- The frontend/backend URLs use `localhost` because the browser runs on your host; inter-container calls (backend→ai, backend→mongo/redis) use service names automatically — you don't need to change anything for those.
- OTP codes are **always emailed**, never printed to the logs — if login/signup fails right after submitting the form, it's almost always `EMAIL_USER`/`EMAIL_PASSWORD` missing or wrong in `.env`. Check `docker compose logs -f backend` for the actual SMTP error.
- For more detail on how the pieces fit together (not Docker-specific), see the root `README.md` and the `docs/` folder.
