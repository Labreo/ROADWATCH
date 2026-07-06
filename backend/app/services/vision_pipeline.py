import os
import math
import base64
from typing import Dict, Any, List

class ConcentrateAPIConfig:
    """
    Configuration settings for Concentrate API multi-modal payload simulation.
    """
    def __init__(
        self, 
        model_name: str = "gemini-1.5-pro", 
        temperature: float = 0.0, 
        api_endpoint: str = "https://api.concentrate.ai/v1/vision"
    ):
        self.model_name = model_name
        self.temperature = temperature
        self.api_endpoint = api_endpoint
        self.api_key = os.environ.get("CONCENTRATE_API_KEY", "mock-concentrate-key-998811")

# Static list of historical accident logs in the city
HISTORICAL_ACCIDENTS = [
    {
        "id": 1001,
        "title": "Two-wheeler slip on displaced paver blocks",
        "latitude": 19.0620,
        "longitude": 72.8356,
        "date": "2025-12-05",
        "severity": "medium",
        "vehicle_type": "two-wheeler"
    },
    {
        "id": 1002,
        "title": "Auto-rickshaw overturn at deep road crater",
        "latitude": 19.0850,
        "longitude": 72.8982,
        "date": "2026-01-14",
        "severity": "high",
        "vehicle_type": "three-wheeler"
    },
    {
        "id": 1003,
        "title": "Bus braking hydroplane near waterlogged subway descent",
        "latitude": 19.0980,
        "longitude": 72.8362,
        "date": "2026-03-22",
        "severity": "low",
        "vehicle_type": "bus"
    },
    {
        "id": 1004,
        "title": "Two-wheeler collision at curve with missing regulatory signage",
        "latitude": 19.1720,
        "longitude": 72.8580,
        "date": "2025-10-18",
        "severity": "high",
        "vehicle_type": "two-wheeler"
    },
    {
        "id": 1005,
        "title": "Bicycle wheel jam and rider throw due to asphalt cave-in",
        "latitude": 19.1190,
        "longitude": 72.8531,
        "date": "2026-02-10",
        "severity": "medium",
        "vehicle_type": "bicycle"
    }
]

# Municipal ward boundary polygons for spatial checks (GeoJSON coordinates [[lng, lat], ...])
WARD_POLYGONS = {
    "MCGM-KW": [
        [72.80, 19.10], [72.87, 19.10], [72.87, 19.22], [72.80, 19.22], [72.80, 19.10]
    ],
    "MCGM-FN": [
        [72.80, 18.90], [72.88, 18.90], [72.88, 19.03], [72.80, 19.03], [72.80, 18.90]
    ],
    "MCGM-HE": [
        [72.87, 19.00], [72.95, 19.00], [72.95, 19.10], [72.87, 19.10], [72.87, 19.00]
    ]
}

def is_point_in_polygon(x: float, y: float, polygon: List[List[float]]) -> bool:
    """
    Standard Ray Casting algorithm to check if a point (x, y) is inside a polygon.
    """
    inside = False
    n = len(polygon)
    p1x, p1y = polygon[0]
    for i in range(n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xints = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xints:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

class RoadDamageEvaluator:
    """
    Evaluator class simulating multi-modal image evaluation via Concentrate API.
    """
    def __init__(self, config: ConcentrateAPIConfig = None):
        self.config = config or ConcentrateAPIConfig()

    def evaluate_damage(self, image_bytes: bytes, latitude: float, longitude: float) -> Dict[str, Any]:
        """
        Simulates payload configuration, image analysis, and proximity checks.
        """
        # 1. Simulate multi-modal base64 payload representation
        try:
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
        except Exception:
            base64_image = "invalid-or-empty-image-buffer"

        api_payload = {
            "model": self.config.model_name,
            "api_endpoint": self.config.api_endpoint,
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": "Perform damage extraction. Classify defect type, estimate area (sqm), estimate volume (cum)."},
                        {"inline_data": {"mime_type": "image/jpeg", "data": base64_image[:100] + "..."}},
                        {"text": f"GPS telemetry: Lat {latitude}, Lon {longitude}"}
                    ]
                }
            ],
            "generation_config": {
                "temperature": self.config.temperature
            }
        }

        # 2. Determine defect type based on municipal jurisdiction spatial checks
        defect_type = "pothole"
        description = "Detected deep road degradation containing visual characteristics of a pothole crater."
        
        # Ray casting spatial checks
        in_kw = is_point_in_polygon(longitude, latitude, WARD_POLYGONS["MCGM-KW"])
        in_fn = is_point_in_polygon(longitude, latitude, WARD_POLYGONS["MCGM-FN"])
        in_he = is_point_in_polygon(longitude, latitude, WARD_POLYGONS["MCGM-HE"])

        if in_kw:
            defect_type = "pothole"
            description = "Detected a deep asphalt pothole with sharp edges. Significant base layer exposure. High impact risk."
        elif in_fn:
            defect_type = "paving_defect"
            description = "Severely displaced interlocking paver blocks causing uneven road surface and high vibration risk."
        elif in_he:
            defect_type = "waterlogging"
            description = "Stagnant road flooding due to blocked storm drainage inlet. Impeding normal lane operations."
        else:
            # Fallback based on coordinates
            if latitude > 19.15:
                defect_type = "missing_signage"
                description = "Regulatory speed limit or speed breaker warning sign is completely missing from the support post."
            else:
                defect_type = "pothole"
                description = "Pothole defect detected on unclassified municipal road boundary."

        # 3. Create deterministic but realistic approximations based on coordinates hash
        seed = int(abs(latitude * 100000) + abs(longitude * 100000))
        
        if defect_type == "pothole":
            surface_area = round(1.0 + (seed % 15) * 0.1, 2)
            volume = round(0.08 + (seed % 8) * 0.04, 3)
        elif defect_type == "paving_defect":
            surface_area = round(2.5 + (seed % 20) * 0.2, 2)
            volume = round(0.03 + (seed % 5) * 0.02, 3)
        elif defect_type == "waterlogging":
            surface_area = round(12.0 + (seed % 50) * 0.5, 2)
            volume = round(2.0 + (seed % 30) * 0.2, 2)
        else: # missing_signage
            surface_area = 0.4
            volume = 0.0

        # 4. Proximity matches to local historical accident logs (within 0.7 km / 700 meters)
        proximity_accidents = []
        for acc in HISTORICAL_ACCIDENTS:
            dist = self._haversine_distance(latitude, longitude, acc["latitude"], acc["longitude"])
            if dist <= 0.7:
                proximity_accidents.append({
                    "accident_id": acc["id"],
                    "title": acc["title"],
                    "distance_meters": round(dist * 1000, 1),
                    "date": acc["date"],
                    "severity": acc["severity"],
                    "vehicle_type": acc["vehicle_type"]
                })

        # Sort closest first
        proximity_accidents.sort(key=lambda x: x["distance_meters"])

        return {
            "defect_type": defect_type,
            "confidence": round(0.85 + (seed % 15) * 0.01, 2),
            "surface_area_sqm": surface_area,
            "volume_cum": volume,
            "description": description,
            "proximity_accidents": proximity_accidents,
            "simulated_payload": {
                "model": api_payload["model"],
                "endpoint": api_payload["api_endpoint"],
                "payload_snippet": f"User Prompt: {api_payload['contents'][0]['parts'][0]['text']}"
            }
        }

    @staticmethod
    def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculates the great-circle distance between two points in kilometers.
        """
        R = 6371.0 # Earth's radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
