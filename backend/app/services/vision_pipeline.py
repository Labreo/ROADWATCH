import os
import base64
from typing import Dict, Any

class ConcentrateAPIConfig:
    def __init__(
        self,
        model_name: str = "gemini-3.5-flash",
        temperature: float = 0.0,
    ):
        self.model_name = model_name
        self.temperature = temperature
        self.api_key = os.environ.get("CONCENTRATE_API_KEY", "")
        self.api_endpoint = "https://api.concentrate.ai/v1/chat/completions"

class RoadDamageEvaluator:
    def __init__(self, config: ConcentrateAPIConfig = None):
        self.config = config or ConcentrateAPIConfig()

    async def evaluate_damage_stream(self, image_bytes: bytes, latitude: float, longitude: float):
        import json
        import httpx

        api_key = self.config.api_key
        if not api_key:
            yield json.dumps({"type": "error", "content": "CONCENTRATE_API_KEY is not configured."})
            return

        base64_image = base64.b64encode(image_bytes).decode("utf-8")

        payload = {
            "model": self.config.model_name,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are an expert municipal infrastructure inspector for the ROADWATCH platform. "
                        "Analyze the road/infrastructure damage image and return ONLY a raw JSON object "
                        "(no markdown fences, no extra text) with exactly these keys:\n"
                        '"defectType": one of "pothole", "waterlogging", "paving_defect", "missing_signage"\n'
                        '"estimatedDepthCm": number\n'
                        '"estimatedWidthM": number\n'
                        '"severity": one of "emergency", "high", "medium", "low"\n'
                        '"hasTraffic": boolean — true if the defect appears to be on a high-traffic road or near an intersection\n'
                        '"recommendedAction": string describing the exact repair action to take'
                    )
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"GPS Telemetry: Lat {latitude}, Lon {longitude}. Perform road damage extraction."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            "temperature": self.config.temperature,
            "stream": True
        }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", self.config.api_endpoint, json=payload, headers=headers) as response:
                if response.status_code != 200:
                    error_text = await response.aread()
                    yield json.dumps({"type": "error", "content": f"Concentrate API error {response.status_code}: {error_text.decode(errors='replace')}"})
                    return

                async for line in response.iter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            chunk_data = json.loads(data_str)
                            delta = chunk_data.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except Exception:
                            pass
