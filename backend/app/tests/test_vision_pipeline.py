import io
from fastapi.testclient import TestClient
from app.main import app
from app.services.vision_pipeline import RoadDamageEvaluator

client = TestClient(app)

def test_road_damage_evaluator_kw():
    evaluator = RoadDamageEvaluator()
    # coordinates inside Ward K-West (MCGM-KW)
    lat = 19.1200
    lon = 72.8400
    res = evaluator.evaluate_damage(b"fake-image-bytes", lat, lon)
    assert res["defect_type"] == "pothole"
    assert res["confidence"] >= 0.8
    assert "pothole" in res["description"].lower()

def test_road_damage_evaluator_proximity():
    evaluator = RoadDamageEvaluator()
    # (19.1190, 72.8531) is accident ID 1005. Test with a coordinate 50 meters away
    lat = 19.1192
    lon = 72.8533
    res = evaluator.evaluate_damage(b"fake-image-bytes", lat, lon)
    assert len(res["proximity_accidents"]) > 0
    assert res["proximity_accidents"][0]["accident_id"] == 1005
    assert res["proximity_accidents"][0]["distance_meters"] < 100.0

def test_analyze_photo_endpoint():
    # Make a multipart post request
    file_data = {
        "image": (
            "test_image.jpg", 
            io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C"), 
            "image/jpeg"
        )
    }
    form_data = {
        "latitude": "19.1190", 
        "longitude": "72.8360"
    }
    
    response = client.post("/api/v1/chat/analyze-photo", files=file_data, data=form_data)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["analysis"]["defect_type"] == "pothole"
    assert data["draft_complaint"]["assignedAuthorityId"] == 1 # MCGM-KW
    assert data["draft_complaint"]["status"] == "pending"
    assert data["draft_complaint"]["roadId"] == 3 # S.V. Road
