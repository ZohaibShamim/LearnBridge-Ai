# Running Learn Bridge AI with Docker

One command brings up the whole stack — **frontend, backend API, background worker, AI service, MongoDB, and Redis** — no local Node/Python/Mongo/Redis needed.

## Prerequisites
- Docker Desktop (or Docker Engine) with Compose v2+.

## 1. Configure
```bash
cp .env.example .env
```
Edit `.env` and fill in:
- **`GROQ_API_KEY`** — free at https://console.groq.com/keys (needed to generate roadmaps/quizzes).
- **`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`** — free at https://cloudinary.com/console (needed to store uploaded CVs).

Everything else has working defaults. The app still starts without these keys — only the CV-upload and AI features need them. OTP codes print to the backend logs when email isn't configured.

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

Open **http://localhost:3000** and register an account.

## What runs
- **frontend** — Next.js (standalone production build).
- **backend** — Express API (auth, CV upload, roadmap/quiz/dashboard).
- **worker** — the BullMQ CV-processing worker (OCR/PDF/DOCX → AI). Runs from the same image as the backend; it's a **separate process by design**, so it's a separate service here.
- **ai** — FastAPI service (roadmap + quiz + skill-gap generation).
- **mongo**, **redis** — data + queue, self-contained with a named volume (`mongo_data`).

## Common commands
```bash
docker compose up --build -d     # run detached
docker compose logs -f backend   # tail a service
docker compose logs -f worker    # watch CV processing (and dev OTP codes on backend)
docker compose down              # stop
docker compose down -v           # stop + wipe the Mongo volume
```

## Notes
- `NEXT_PUBLIC_API_BASE_URL` is **baked into the frontend at build time** (it's a browser-side value). If you remap the backend port, rebuild the frontend: `docker compose build frontend`.
- The frontend/backend URLs use `localhost` because the browser runs on your host; inter-container calls (backend→ai, backend→mongo/redis) use service names automatically.
