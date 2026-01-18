# AI Career Roadmap Service

FastAPI service that generates personalized career roadmaps from CV/resume text using AI.

## Features

- 🤖 Multiple AI Provider Support (HuggingFace, Groq, OpenAI)
- 🆓 Free tier using HuggingFace Inference API
- 🔄 Easy switching between different AI providers
- 📊 JSON-formatted career roadmap output
- 🚀 RESTful API with FastAPI

## Setup

### 1. Install Dependencies

```bash
cd ai
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

### 3. Get HuggingFace API Key (Free)

1. Go to [HuggingFace](https://huggingface.co/)
2. Sign up/Login
3. Go to Settings → Access Tokens
4. Create a new token
5. Add to `.env` file: `HUGGINGFACE_API_KEY=your_token_here`

### 4. Run the Service

```bash
python run.py
```

The API will be available at `http://localhost:8001`

## API Usage

### Generate Roadmap

**Endpoint:** `POST /ai/roadmap`

**Request Body:**
```json
{
  "job_id": "unique_job_id",
  "cv_text": "Your CV text here..."
}
```

**Response:**
```json
{
  "job_id": "unique_job_id",
  "roadmap": "{\"career_goal\": \"...\", \"steps\": [...]}"
}
```

## Switching AI Providers

Edit `.env` file and change `AI_PROVIDER`:

### Use HuggingFace (Free)
```env
AI_PROVIDER=huggingface
HUGGINGFACE_API_KEY=your_key
```

### Use Groq
```env
AI_PROVIDER=groq
GROQ_API_KEY=your_key
```

### Use OpenAI
```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key
```

## Integration with Express Backend

Your Express backend can call this service:

```javascript
const axios = require('axios');

async function generateRoadmap(jobId, cvText) {
  const response = await axios.post('http://localhost:8001/ai/roadmap', {
    job_id: jobId,
    cv_text: cvText
  });
  return response.data;
}
```

## Available Models

### HuggingFace (Free)
- Default: `mistralai/Mistral-7B-Instruct-v0.2`
- Others: `meta-llama/Llama-2-7b-chat-hf`, `google/flan-t5-xxl`

To change model, edit `HUGGINGFACE_MODEL` in [config.py](app/core/config.py)

## Project Structure

```
ai/
├── app/
│   ├── api/v1/
│   │   └── roadmap.py          # API endpoints
│   ├── core/
│   │   └── config.py           # Configuration
│   ├── schema/
│   │   └── cv.py               # Request/response models
│   ├── services/
│   │   └── ai_service.py       # AI provider logic
│   └── utils/
│       └── prompt.py           # Prompt templates
├── run.py                      # Application entry point
├── requirements.txt            # Dependencies
└── .env                        # Environment variables
```
