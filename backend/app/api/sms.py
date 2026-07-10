"""
SMS/USSD endpoint for ROADWATCH.

Accepts plain-text queries via POST (simulating carrier SMSC forward).
Responds with plain-text summaries limited to SMS segment length (~160 chars).

Hackathon context:
  This endpoint demonstrates how ROADWATCH would integrate with telecom
  USSD/SMS gateways. In production, a carrier would forward SMS messages
  to this endpoint. For the hackathon, it accepts direct POST requests.

Usage:
  POST /api/v1/integrations/sms
  {
    "from": "+919876543210",
    "text": "ROAD Western Express Highway"
  }

Response (plain text):
  "Western Express Hwy (7.2km): FAIR condition. Last repair: Mar 2026 by
   Zenith Construction. 12 complaints this year."
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class SmsPayload(BaseModel):
    from_number: Optional[str] = None
    text: str = ""


MOCK_ROADS = {
    "western express highway": {
        "name": "Western Express Highway",
        "code": "NH-48",
        "length_km": 7.2,
        "status": "fair",
        "last_repair": "Mar 2026",
        "contractor": "Zenith Construction",
        "complaints_ytd": 12,
    },
    "eastern express highway": {
        "name": "Eastern Express Highway",
        "code": "NH-48",
        "length_km": 24.5,
        "status": "good",
        "last_repair": "Jan 2026",
        "contractor": "Omega Infrastructure",
        "complaints_ytd": 3,
    },
    "sv road": {
        "name": "S.V. Road",
        "code": "W-12",
        "length_km": 4.1,
        "status": "poor",
        "last_repair": "Aug 2025",
        "contractor": "Omega Infrastructure",
        "complaints_ytd": 47,
    },
    "linking road": {
        "name": "Linking Road",
        "code": "W-14",
        "length_km": 3.8,
        "status": "fair",
        "last_repair": "Nov 2025",
        "contractor": "Zenith Construction",
        "complaints_ytd": 18,
    },
}


def build_sms_response(road: dict) -> str:
    """Build a concise SMS-friendly response (target: <160 chars per segment)."""
    status_icon = {"good": "✅", "fair": "⚠️", "poor": "🔴"}.get(road["status"], "❓")
    return (
        f"{road['name']} ({road['code']}, {road['length_km']}km): "
        f"{status_icon} {road['status'].upper()}. "
        f"Last repair: {road['last_repair']} by {road['contractor']}. "
        f"{road['complaints_ytd']} complaints this year."
    )


@router.post("/integrations/sms")
async def sms_webhook(payload: SmsPayload):
    """
    SMS incoming webhook.

    Expects text beginning with 'ROAD ' followed by a road name query.
    Returns a plain-text summary of the road's condition.
    """
    text = payload.text.strip()

    if not text:
        return _help_response()

    if not text.upper().startswith("ROAD "):
        return _help_response()

    query = text[5:].strip().lower()

    if not query:
        return _help_response()

    # Try to match against known roads
    for key, road in MOCK_ROADS.items():
        if query in key or key in query:
            return {"response": build_sms_response(road)}

    # Try partial match
    matches = [(key, road) for key, road in MOCK_ROADS.items()
               if any(word in key for word in query.split())]
    if matches:
        if len(matches) == 1:
            return {"response": build_sms_response(matches[0][1])}
        names = ", ".join(r["name"] for _, r in matches)
        return {"response": f"Multiple matches: {names}. Reply with a more specific road name."}

    return {
        "response": (
            "Road not found. Try: ROAD Western Express Highway, "
            "ROAD S.V. Road, or ROAD Linking Road."
        )
    }


def _help_response() -> dict:
    return {
        "response": (
            "Send: ROAD <name> to check road status. "
            "Example: ROAD Western Express Highway"
        )
    }
