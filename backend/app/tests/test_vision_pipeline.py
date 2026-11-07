"""Photo analysis endpoint. The vision model is replaced by a stub, so no API
key or network is needed, but the local database must be running."""
import io
import json
import os

os.environ.setdefault("POSTGRES_HOST", "localhost")

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.vision_pipeline import RoadDamageEvaluator

client = TestClient(app)
PHOTO = ("road.jpg", io.BytesIO(b"\xff\xd8\xff\xe0 not a real photo"), "image/jpeg")
ON_SV_ROAD = {"latitude": "19.1197", "longitude": "72.8371", "persist": "false"}


def stub_vision(monkeypatch, reply: str):
    async def stream(self, image_bytes, latitude, longitude):
        yield reply

    monkeypatch.setattr(RoadDamageEvaluator, "evaluate_damage_stream", stream)


def analyse():
    response = client.post("/api/v1/chat/analyze-photo", files={"image": PHOTO}, data=ON_SV_ROAD)
    assert response.status_code == 200
    return [json.loads(line) for line in response.text.splitlines()]


def test_preview_returns_analysis_without_filing(monkeypatch):
    stub_vision(monkeypatch, json.dumps({
        "defectType": "pothole", "estimatedDepthCm": 12, "estimatedWidthM": 1.2,
        "severity": "high", "hasTraffic": True, "recommendedAction": "Patch the surface",
    }))
    events = analyse()
    telemetry = next(e for e in events if e["type"] == "telemetry")
    assert telemetry["latitude"] == pytest.approx(19.1197)
    metadata = next(e for e in events if e["type"] == "metadata")
    assert metadata["analysis"]["defect_type"] == "pothole"
    assert metadata["analysis"]["depth_cm"] == 12
    assert metadata["draft_complaint"]["id"] is None


def test_preview_reports_unreadable_model_output(monkeypatch):
    stub_vision(monkeypatch, "this is not JSON")
    events = analyse()
    assert any(e["type"] == "error" for e in events)
    assert not any(e["type"] == "metadata" for e in events)
