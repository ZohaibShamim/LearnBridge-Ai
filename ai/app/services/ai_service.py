import requests
import json
from app.core.config import (
    AI_PROVIDER,
    HUGGINGFACE_API_KEY, HUGGINGFACE_URL, HUGGINGFACE_MODEL,
    GROQ_API_KEY, GROQ_URL, GROQ_MODEL,
    OPENAI_API_KEY, OPENAI_URL, OPENAI_MODEL
)
from app.utils.prompt import roadmap_prompt

# Default system prompt used by the roadmap flow. Kept as the parameter default so the
# existing roadmap path is unchanged; the quiz flow passes its own system prompt.
DEFAULT_SYSTEM_PROMPT = "You are a professional career advisor that generates structured JSON responses."


def call_ai(prompt: str, system_prompt: str = DEFAULT_SYSTEM_PROMPT) -> str:
    """
    Generic entry point: send a prompt (with an optional system prompt) to the configured
    provider and return the raw text. Reused by both roadmap and quiz generation so there is
    one provider-dispatch path, not two.
    """
    if AI_PROVIDER == "huggingface":
        return _call_huggingface(prompt, system_prompt)
    elif AI_PROVIDER == "groq":
        return _call_groq(prompt, system_prompt)
    elif AI_PROVIDER == "openai":
        return _call_openai(prompt, system_prompt)
    else:
        raise ValueError(f"Unsupported AI provider: {AI_PROVIDER}")


def generate_roadmap_from_cv(cv_text: str, role: str = None) -> str:
    """
    Generate a career roadmap from CV text using the configured AI provider.
    Supports multiple providers: HuggingFace (free), Groq, OpenAI
    
    Args:
        cv_text: The extracted text from the user's CV
        role: The target career role (e.g., 'data_scientist', 'software_engineer', 'machine_learning', 'ai')
    """
    # Add logging to verify role is received
    print(f"[DEBUG] Role received: {role}")
    print(f"[DEBUG] Role type: {type(role)}")
    
    prompt = roadmap_prompt(cv_text, role)
    
    print(f"[DEBUG] Generated prompt includes role: {role in prompt if role else 'No role'}")
    
    if AI_PROVIDER == "huggingface":
        return _call_huggingface(prompt)
    elif AI_PROVIDER == "groq":
        return _call_groq(prompt)
    elif AI_PROVIDER == "openai":
        return _call_openai(prompt)
    else:
        raise ValueError(f"Unsupported AI provider: {AI_PROVIDER}")

def _call_huggingface(prompt: str, system_prompt: str = DEFAULT_SYSTEM_PROMPT) -> str:
    """
    Call Hugging Face Inference API (Free)
    """
    if not HUGGINGFACE_API_KEY:
        raise ValueError("HUGGINGFACE_API_KEY not set in environment variables")

    headers = {
        "Authorization": f"Bearer {HUGGINGFACE_API_KEY}",
        "Content-Type": "application/json"
    }

    # Format prompt for instruction-tuned models (Zephyr format)
    formatted_prompt = f"<|system|>\n{system_prompt}</s>\n<|user|>\n{prompt}</s>\n<|assistant|>\n"
    
    payload = {
        "inputs": formatted_prompt,
        "parameters": {
            "max_new_tokens": 1500,
            "temperature": 0.4,
            "top_p": 0.95,
            "do_sample": True,
            "return_full_text": False
        },
        "options": {
            "wait_for_model": True,
            "use_cache": False
        }
    }
    
    url = f"{HUGGINGFACE_URL}{HUGGINGFACE_MODEL}"
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        error_msg = f"HuggingFace API error: {e}"
        if response.status_code == 410:
            error_msg = f"Model {HUGGINGFACE_MODEL} is no longer available. Please update HUGGINGFACE_MODEL in config."
        elif response.status_code == 503:
            error_msg = "Model is loading, please retry in a few seconds."
        elif response.status_code == 401:
            error_msg = "Invalid HuggingFace API key. Please check your HUGGINGFACE_API_KEY."
        raise Exception(error_msg)
    except requests.exceptions.Timeout:
        raise Exception("HuggingFace API timeout. Please try again.")
    except Exception as e:
        raise Exception(f"HuggingFace API request failed: {str(e)}")
    
    result = response.json()
    
    # Handle response format
    if isinstance(result, list) and len(result) > 0:
        return result[0].get("generated_text", "")
    elif isinstance(result, dict):
        if "error" in result:
            raise Exception(f"HuggingFace API error: {result['error']}")
        return result.get("generated_text", "")
    else:
        return str(result)

def _call_groq(prompt: str, system_prompt: str = DEFAULT_SYSTEM_PROMPT) -> str:
    """
    Call Groq API (Fast and Free)
    """
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not set in environment variables. Get one free at https://console.groq.com/keys")

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.4,
        "max_tokens": 4000
    }

    try:
        response = requests.post(GROQ_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        error_msg = f"Groq API error: {e}"
        if response.status_code == 401:
            error_msg = "Invalid Groq API key. Get a free key at https://console.groq.com/keys"
        elif response.status_code == 429:
            error_msg = "Groq rate limit reached. Please wait a moment and try again."
        raise Exception(error_msg)
    except requests.exceptions.Timeout:
        raise Exception("Groq API timeout. Please try again.")
    except Exception as e:
        raise Exception(f"Groq API request failed: {str(e)}")
    
    return response.json()["choices"][0]["message"]["content"]

def _call_openai(prompt: str, system_prompt: str = DEFAULT_SYSTEM_PROMPT) -> str:
    """
    Call OpenAI Chat Completions API. Uses JSON mode so the model returns a valid JSON
    object directly (both roadmap and quiz prompts already ask for JSON, which JSON mode
    requires). Mirrors the Groq path's error handling.
    """
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not set in environment variables. Get one at https://platform.openai.com/api-keys")

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.4,
        "max_tokens": 4000,
        "response_format": {"type": "json_object"}
    }

    try:
        response = requests.post(OPENAI_URL, headers=headers, json=payload, timeout=60)
        response.raise_for_status()
    except requests.exceptions.HTTPError as e:
        error_msg = f"OpenAI API error: {e}"
        if response.status_code == 401:
            error_msg = "Invalid OpenAI API key. Check OPENAI_API_KEY at https://platform.openai.com/api-keys"
        elif response.status_code == 429:
            error_msg = "OpenAI rate limit or insufficient quota. Please wait or check your billing."
        raise Exception(error_msg)
    except requests.exceptions.Timeout:
        raise Exception("OpenAI API timeout. Please try again.")
    except Exception as e:
        raise Exception(f"OpenAI API request failed: {str(e)}")

    return response.json()["choices"][0]["message"]["content"]
