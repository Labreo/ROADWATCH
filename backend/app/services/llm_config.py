"""Settings for the Gemini API, reached through its OpenAI-compatible endpoint."""
import os

LLM_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
LLM_MODEL = os.environ.get("LLM_MODEL", "gemini-2.5-flash")


def llm_api_key() -> str:
    return os.environ.get("GEMINI_API_KEY", "")
