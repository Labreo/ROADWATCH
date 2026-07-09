import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

router = APIRouter()


class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "auto"
    target_lang: str = "en"


class TranslateResponse(BaseModel):
    translated_text: str
    detected_source_lang: str
    confidence: float = 1.0


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(req: TranslateRequest):
    """
    Proxy to LibreTranslate or Google Translate API.
    Uses LIBRETRANSLATE_URL env var if configured, otherwise falls back to
    a simple identity pass-through for development.
    """
    api_url = os.environ.get("LIBRETRANSLATE_URL")
    api_key = os.environ.get("CONCENTRATE_TRANSLATION_API_KEY")

    if api_url:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                payload = {
                    "q": req.text,
                    "source": req.source_lang,
                    "target": req.target_lang,
                    "format": "text",
                }
                if api_key:
                    payload["api_key"] = api_key

                resp = await client.post(f"{api_url}/translate", json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    return TranslateResponse(
                        translated_text=data.get("translatedText", req.text),
                        detected_source_lang=data.get("detectedLanguage", {}).get("language", req.source_lang),
                        confidence=data.get("detectedLanguage", {}).get("confidence", 0.8),
                    )
        except Exception:
            pass

    # Fallback: return original text (offline/dev mode)
    return TranslateResponse(
        translated_text=req.text,
        detected_source_lang=req.source_lang if req.source_lang != "auto" else "en",
        confidence=0.0,
    )
