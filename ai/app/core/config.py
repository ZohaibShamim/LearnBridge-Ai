import os
from dotenv import load_dotenv

load_dotenv()

# AI Provider Configuration.
# Use `or default` (not the getenv default arg) so an env var set to an EMPTY string — common
# in Docker/compose (`${VAR:-}`) — falls back to the default instead of overriding it with "".
AI_PROVIDER = os.getenv("AI_PROVIDER") or "groq"  # Options: groq, huggingface, openai

# Hugging Face Configuration (Free)
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
HUGGINGFACE_URL = "https://api-inference.huggingface.co/models/"
HUGGINGFACE_MODEL = os.getenv("HUGGINGFACE_MODEL") or "HuggingFaceH4/zephyr-7b-beta"  # Free model

# Groq Configuration (Free - Very fast and reliable)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.getenv("GROQ_MODEL") or "llama-3.3-70b-versatile"  # Free, fast model

# OpenAI Configuration (primary provider)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_URL = "https://api.openai.com/v1/chat/completions"
# gpt-4o-mini: strong at structured-JSON generation (roadmaps/quizzes) at low cost.
# Override with OPENAI_MODEL=gpt-4o for higher-quality roadmaps.
OPENAI_MODEL = os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
