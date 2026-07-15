# AI Service — Overview

## What this service does

This is the "brain" of Learn Bridge AI, and it's a small Python web service built with a framework called FastAPI (a popular tool for building web APIs in Python quickly). It receives a person's CV text plus a target job role, asks an AI model (like ChatGPT) to write a step-by-step career roadmap, and sends that roadmap back as JSON (a common text format for sending structured data between programs, like a list of labeled fields). Nobody's web browser ever talks to this service directly — it's only ever called by a background "worker" process that's part of the backend, so you can think of it as a helper service that does one job (talk to the AI) and nothing else.

## How the files fit together

This service is split into a few areas, and each has its own doc in this same folder (`docs/ai/`) if you want more detail than this overview gives:

- **`schemas.md`** — covers the data "shapes" the service expects and returns (e.g. what a request must contain, what a roadmap object looks like).
- **`api-routes.md`** — covers the actual URLs (routes) you can call, like `POST /ai/roadmap`, and what each one does.
- **`services.md`** — covers the actual logic: how the service talks to the AI provider (Groq, OpenAI, etc.) and how it enriches a roadmap with real YouTube videos and articles.
- **`prompts.md`** — covers the exact instructions (prompts) sent to the AI model to get it to produce a roadmap in the right format.

This README only covers the three "entry point" files: the file you run to start everything, the file that wires the app together, and the file that reads configuration/settings from the environment.

## File by file

### `ai/run.py`

This is the file you actually run (`python run.py`) to start the AI service. It's short — just 5 lines — but it's the starting point for everything else.

- **Top-level script — lines 1–5**: The file imports `uvicorn` (a program that runs Python web apps and listens for incoming web requests) and then, when you run this file directly (that's what the `if __name__ == "__main__":` check on line 4 means — "only do this if someone ran this exact file, not if it got imported by another file"), it calls `uvicorn.run(...)` on line 5.
  - `"app.main:app"` tells uvicorn where to find the actual application object (it lives in `app/main.py`, in a variable called `app` — more on that below).
  - `host="0.0.0.0"` means "accept connections from any network address," not just from this one computer.
  - `port=8001` means the service listens on port 8001 (so once it's running, it's reachable at `http://localhost:8001`).
  - `reload=True` is a developer convenience: it means "if I edit and save a Python file, automatically restart the server so my changes take effect." In one sentence: it's like a browser that auto-refreshes whenever you save your code, so you don't have to manually stop and restart the server yourself. This is meant for development only, not for a real production server.

### `ai/app/main.py`

This file builds the actual web application and connects the two sets of routes (URLs) it supports. It's only 9 lines but it's the glue that holds the service together.

- **App creation — line 5**: `app = FastAPI(title="AI Career Roadmap API")` creates the FastAPI "app" object. In plain terms, a `FastAPI()` object is the whole web application — it's the thing that knows how to receive incoming web requests and send back responses. Everything else (routes, config) gets attached to this one object. The `title` is just a label used on FastAPI's auto-generated documentation page.
- **Router wiring — lines 2–3 and 7–8**: Lines 2–3 import two "routers" — a router is just a bundle of related URLs/endpoints grouped into one file, kind of like a mini table of contents. One router (`roadmap_router`, defined in `app/api/v1/roadmap.py`) handles the roadmap-generation endpoint; the other (`quiz_router`, defined in `app/api/v1/quiz.py`) handles quiz-related endpoints. Lines 7–8 (`app.include_router(...)`) plug both of those routers into the main `app`, so any URL defined in either file becomes a real, reachable endpoint on this service.

One thing worth explaining out loud in class: this file doesn't set up CORS (Cross-Origin Resource Sharing — a browser security rule that blocks a webpage from one website from calling an API on a different website unless that API explicitly says "this origin is allowed"). That's expected here, not a bug — this service is only ever called by the backend's worker process (a server talking to another server), never directly by a user's browser, so there's no browser-based cross-origin request to permit in the first place. CORS handling instead lives in the backend service, which *is* called directly by the frontend browser.

### `ai/app/core/config.py`

This file's whole job is to read settings out of the environment (environment variables — values set outside the code, usually in a `.env` file, so secrets like API keys don't get hardcoded into the source code) and make them available to the rest of the service as plain Python variables.

- **Loading the `.env` file — lines 1–4**: Imports `os` (Python's built-in way to read environment variables) and `load_dotenv` from the `dotenv` package, then calls `load_dotenv()` on line 4. This reads a local `.env` file (if one exists) and loads its key/value pairs into the environment, so the `os.getenv(...)` calls below can find them.
- **The `or default` pattern — lines 7–8 (comment) and used throughout**: The file has a comment explaining a small but deliberate trick: instead of `os.getenv("VAR", "default")`, it writes `os.getenv("VAR") or "default"`. The difference matters in one specific case — if a deployment tool (like Docker) sets the variable to an *empty string* rather than leaving it unset, `os.getenv("VAR", "default")` would still return the empty string (because the variable technically exists), while `os.getenv("VAR") or "default"` correctly falls back to the default, since an empty string counts as "falsy" in Python.

Every variable this file reads, what it's for, and its default if it has one:

| Variable | Purpose | Default |
|---|---|---|
| `AI_PROVIDER` | Which AI provider to use to generate the roadmap. Options are `groq`, `huggingface`, or `openai`. | `"groq"` |
| `HUGGINGFACE_API_KEY` | The secret API key for calling Hugging Face's AI models (only needed if `AI_PROVIDER=huggingface`). | none — must be set if using this provider |
| `HUGGINGFACE_URL` | The web address Hugging Face's API lives at. Not read from the environment — it's a fixed constant in the code. | `"https://api-inference.huggingface.co/models/"` |
| `HUGGINGFACE_MODEL` | Which specific Hugging Face AI model to use. | `"HuggingFaceH4/zephyr-7b-beta"` |
| `GROQ_API_KEY` | The secret API key for calling Groq's AI models (only needed if `AI_PROVIDER=groq`, which is the default provider). | none — must be set if using this provider |
| `GROQ_URL` | The web address Groq's API lives at. Also a fixed constant, not read from the environment. | `"https://api.groq.com/openai/v1/chat/completions"` |
| `GROQ_MODEL` | Which specific Groq AI model to use. | `"llama-3.3-70b-versatile"` |
| `OPENAI_API_KEY` | The secret API key for calling OpenAI's models (only needed if `AI_PROVIDER=openai`). | none — must be set if using this provider |
| `OPENAI_URL` | The web address OpenAI's API lives at. Also a fixed constant. | `"https://api.openai.com/v1/chat/completions"` |
| `OPENAI_MODEL` | Which specific OpenAI model to use — the code comment notes `gpt-4o-mini` is a good balance of cost and quality for generating structured JSON roadmaps, with `gpt-4o` as a higher-quality (pricier) option. | `"gpt-4o-mini"` |

In short: only one provider's key actually needs to be set at a time — whichever one `AI_PROVIDER` is pointing at. The rest of the keys/URLs/models just sit there unused if you're not using that provider.
