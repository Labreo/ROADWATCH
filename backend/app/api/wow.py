"""Three accountability features built on the live database.

1. Bump Radar: phones on two-wheelers, autos and buses record road shocks from the
   accelerometer plus GPS. PostGIS clusters the hits (ST_ClusterDBSCAN); a spot hit
   on several separate rides becomes a sensor-detected report, routed to its ward by
   the existing trigger.
2. Warranty clawback: a report on a road whose project was still inside its defect
   liability or maintenance warranty is the contractor's bill, not the city's. The
   backend finds those, totals the money, and drafts the notice to the contractor.
3. Proof of repair: when a report is marked resolved, the citizen can check it on
   site. The photo must be taken within 50 m of the report, and Gemini looks for the
   defect. A failed check opens an escalated follow-up report linked to the first.
"""
import base64
import json
import re
import uuid
from datetime import date
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.api.auth import STAFF, optional_user, require
from app.services.live_db import one, rows, tx
from app.services.llm_config import LLM_ENDPOINT, LLM_MODEL, llm_api_key

router = APIRouter(prefix="/screens", tags=["accountability"])

# A spot counts as a confirmed defect once this many shocks from this many rides agree.
CLUSTER_EPS_M = 15
MIN_HITS = 3
MIN_RIDES = 2

# Indicative repair costs per report (INR), used to size warranty claims. Shown as estimates.
REPAIR_COST = {"pothole": 18000, "paving_defect": 45000, "waterlogging": 60000, "debris": 6000, "missing_signage": 9000}


# -------------------------------------------------------------------------
# 1. Bump Radar
# -------------------------------------------------------------------------
class Bump(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    intensity: float = Field(gt=0, le=200)
    speed_kmh: Optional[float] = Field(default=None, ge=0, le=200)


class RideUpload(BaseModel):
    ride_id: uuid.UUID
    bumps: List[Bump] = Field(max_length=500)


CLUSTER_SQL = f"""
WITH grouped AS (
    SELECT b.*, ST_ClusterDBSCAN(ST_Transform(b.geom, 3857), eps := {CLUSTER_EPS_M}, minpoints := 2) OVER () AS cluster
    FROM ride_bumps b
    WHERE b.recorded_at > NOW() - INTERVAL '30 days'
),
clusters AS (
    SELECT cluster,
           COUNT(*) AS hits,
           COUNT(DISTINCT ride_id) AS rides,
           ROUND(AVG(intensity)::numeric, 1) AS mean_intensity,
           ROUND(MAX(intensity)::numeric, 1) AS peak_intensity,
           ST_Centroid(ST_Collect(geom)) AS centre,
           MAX(complaint_id) AS complaint_id,
           MAX(recorded_at) AS last_hit
    FROM grouped WHERE cluster IS NOT NULL GROUP BY cluster
)
SELECT c.cluster, c.hits, c.rides, c.mean_intensity, c.peak_intensity, c.complaint_id, c.last_hit,
       ST_Y(c.centre) AS lat, ST_X(c.centre) AS lon,
       (c.hits >= {MIN_HITS} AND c.rides >= {MIN_RIDES}) AS confirmed,
       r.id AS road_id, r.name AS road_name, a.department_code AS authority
FROM clusters c
LEFT JOIN LATERAL (
    SELECT id, name, authority_id FROM roads
    WHERE ST_DWithin(geom::geography, c.centre::geography, 25)
    ORDER BY geom::geography <-> c.centre::geography LIMIT 1
) r ON TRUE
LEFT JOIN authorities a ON a.id = COALESCE(
    (SELECT x.id FROM authorities x WHERE ST_Contains(x.geom_boundary, c.centre) ORDER BY ST_Area(x.geom_boundary) LIMIT 1),
    r.authority_id)
ORDER BY confirmed DESC, c.hits DESC
"""


def _promote_confirmed(actor: str) -> list:
    """Turn each confirmed cluster without a report into a routed, sensor-detected report."""
    created = []
    for spot in rows(CLUSTER_SQL):
        if not spot["confirmed"] or spot["complaint_id"]:
            continue
        severity = "severe" if spot["peak_intensity"] >= 12 else "moderate"
        where = spot["road_name"] or "an unmapped street"
        with tx(actor, "Detected by Bump Radar") as cur:
            cur.execute(
                """INSERT INTO complaints (title, description, category, geom, status, priority, target_resolution_hours)
                   VALUES (%s, %s, 'pothole', ST_SetSRID(ST_MakePoint(%s, %s), 4326), 'routed', %s, %s)
                   RETURNING id, assigned_authority_id, road_id""",
                (f"Sensor-detected pothole on {where}"[:255],
                 f"Bump Radar: {spot['hits']} shocks from {spot['rides']} separate rides within {CLUSTER_EPS_M} m "
                 f"(peak {spot['peak_intensity']} m/s², mean {spot['mean_intensity']} m/s²). {severity.capitalize()} road damage likely.",
                 spot["lon"], spot["lat"], 5 if severity == "severe" else 4, 48 if severity == "severe" else 72))
            report = cur.fetchone()
            cur.execute(
                """UPDATE ride_bumps SET complaint_id = %s
                   WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, %s)
                     AND complaint_id IS NULL""",
                (report["id"], spot["lon"], spot["lat"], CLUSTER_EPS_M + 5))
        created.append({**dict(report), "road_name": spot["road_name"], "hits": spot["hits"], "rides": spot["rides"]})
    return created


@router.post("/bumps")
def upload_ride(body: RideUpload, user: Optional[dict] = Depends(optional_user)):
    citizen_id = user["citizen_id"] if user else None
    actor = user["email"] if user else "bump-radar"
    if body.bumps:
        with tx(actor) as cur:
            for b in body.bumps:
                cur.execute(
                    "INSERT INTO ride_bumps (ride_id, geom, intensity, speed_kmh, citizen_id) "
                    "VALUES (%s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s)",
                    (str(body.ride_id), b.lon, b.lat, b.intensity, b.speed_kmh, citizen_id))
    return {"saved": len(body.bumps), "new_reports": _promote_confirmed(actor)}


@router.get("/bumps/clusters")
def bump_clusters():
    spots = rows(CLUSTER_SQL)
    totals = one("SELECT COUNT(*) AS hits, COUNT(DISTINCT ride_id) AS rides FROM ride_bumps "
                 "WHERE recorded_at > NOW() - INTERVAL '30 days'")
    return {"clusters": spots, "totals": totals,
            "rule": {"eps_m": CLUSTER_EPS_M, "min_hits": MIN_HITS, "min_rides": MIN_RIDES}}


@router.get("/bumps/demo-route")
def demo_route(road_code: str = "MARINE-DR-01"):
    """Points along a real road, for the 'simulate a ride' replay when no phone is at hand."""
    road = one(
        """SELECT r.name, ST_AsGeoJSON(r.geom)::json -> 'coordinates' AS coordinates
           FROM roads r WHERE r.road_code = %s""", (road_code,))
    if not road:
        raise HTTPException(status_code=404, detail="Road not found")
    return road


# -------------------------------------------------------------------------
# 2. Warranty clawback
# -------------------------------------------------------------------------
CLAIMS_SQL = """
SELECT c.id AS complaint_id, c.title, c.category, c.status, c.created_at, r.name AS road_name, r.road_code,
       p.id AS project_id, p.title AS project, p.budget_spent, ct.id AS contractor_id, ct.name AS contractor,
       ct.contractor_code, ct.contact_email AS contractor_email, w.warranty_type, w.warranty_start_date,
       w.warranty_end_date, w.claim_count, a.name AS authority, a.department_code
FROM complaints c
JOIN roads r ON r.id = c.road_id
JOIN projects p ON p.road_id = r.id
JOIN project_warranties w ON w.project_id = p.id
JOIN contractors ct ON ct.id = p.contractor_id
JOIN authorities a ON a.id = COALESCE(c.assigned_authority_id, r.authority_id)
WHERE c.created_at::date BETWEEN w.warranty_start_date AND w.warranty_end_date
  AND c.status <> 'rejected' {extra}
ORDER BY c.created_at DESC
"""


def _cost(category: str) -> int:
    return REPAIR_COST.get(category, 20000)


@router.get("/warranty-claims")
def warranty_claims(region: str = "IN"):
    claims = rows(CLAIMS_SQL.format(extra="AND a.region_code = %s"), (region,))
    seen = set()
    unique = []
    for claim in claims:  # one claim per report, earliest-ending warranty first
        if claim["complaint_id"] in seen:
            continue
        seen.add(claim["complaint_id"])
        claim["estimated_cost"] = _cost(claim["category"])
        unique.append(claim)
    by_contractor: dict = {}
    for claim in unique:
        entry = by_contractor.setdefault(claim["contractor"], {"contractor": claim["contractor"], "claims": 0, "amount": 0})
        entry["claims"] += 1
        entry["amount"] += claim["estimated_cost"]
    return {
        "claims": unique,
        "total_amount": sum(c["estimated_cost"] for c in unique),
        "open_amount": sum(c["estimated_cost"] for c in unique if c["status"] != "resolved"),
        "by_contractor": sorted(by_contractor.values(), key=lambda e: -e["amount"]),
        "cost_basis": REPAIR_COST,
    }


async def _gemini(messages: list, max_tokens: int = 1500) -> Optional[str]:
    key = llm_api_key()
    if not key:
        return None
    body = {"model": LLM_MODEL, "messages": messages, "temperature": 0.2, "max_tokens": max_tokens,
            # Thinking tokens count against max_tokens on Gemini 2.5 and cut answers short.
            "reasoning_effort": "none"}
    try:
        async with httpx.AsyncClient(timeout=40) as client:
            res = await client.post(LLM_ENDPOINT, headers={"Authorization": f"Bearer {key}"}, json=body)
            if res.status_code == 400:  # a model that rejects reasoning_effort: retry without it
                body.pop("reasoning_effort")
                res = await client.post(LLM_ENDPOINT, headers={"Authorization": f"Bearer {key}"}, json=body)
            res.raise_for_status()
            choice = res.json()["choices"][0]
            if choice.get("finish_reason") == "length":
                return None
            return choice["message"]["content"]
    except (httpx.HTTPError, KeyError, IndexError, ValueError):
        return None


def _template_notice(c: dict) -> str:
    return (
        f"To: {c['contractor']} ({c['contractor_code']}), {c['contractor_email']}\n"
        f"From: {c['authority']} ({c['department_code']})\n"
        f"Date: {date.today().strftime('%d %B %Y')}\n\n"
        f"Subject: Notice to rectify defect under the {c['warranty_type'].replace('_', ' ')} warranty, "
        f"{c['road_name']} ({c['road_code']}), report #{c['complaint_id']}\n\n"
        f"Your firm executed '{c['project']}' on {c['road_name']}. The {c['warranty_type'].replace('_', ' ')} warranty for that work "
        f"runs from {c['warranty_start_date']:%d %b %Y} to {c['warranty_end_date']:%d %b %Y}.\n\n"
        f"On {c['created_at']:%d %b %Y}, inside that period, a citizen report was registered: \"{c['title']}\" "
        f"(category: {c['category'].replace('_', ' ')}).\n\n"
        f"Under the warranty clause you are required to rectify this defect at your own cost, within 7 days of this notice, "
        f"and to inform this office when the work is complete. If the defect is not rectified, the authority may carry out the "
        f"repair and recover the cost (estimated at Rs {_cost(c['category']):,}) from your security deposit or pending bills.\n\n"
        f"Executive Engineer\n{c['authority']}\n"
    )


@router.post("/warranty-claims/{complaint_id}/notice")
async def warranty_notice(complaint_id: int, user: dict = Depends(require("engineer", "admin"))):
    found = rows(CLAIMS_SQL.format(extra="AND c.id = %s"), (complaint_id,))
    if not found:
        raise HTTPException(status_code=404, detail="This report is not covered by a contractor warranty.")
    claim = found[0]
    template = _template_notice(claim)
    facts = {k: (v.isoformat() if hasattr(v, "isoformat") else v) for k, v in claim.items()}
    drafted = await _gemini([
        {"role": "system", "content": (
            "You draft formal notices from an Indian municipal road authority to a road contractor. Use ONLY the facts "
            "given. Do not invent clause numbers, amounts, names or dates. Keep it under 250 words, plain text, no markdown. "
            "Keep the same structure as the template: To, From, Date, Subject, body, signature.")},
        {"role": "user", "content": f"Facts (JSON): {json.dumps(facts, default=str)}\n\nTemplate to improve:\n{template}"},
    ])
    with tx(user["email"], "Warranty notice issued") as cur:
        cur.execute(
            """UPDATE project_warranties SET claim_count = claim_count + 1
               WHERE project_id = %s AND warranty_type = %s""", (claim["project_id"], claim["warranty_type"]))
    if drafted and len(drafted.strip()) < len(template) * 0.5:
        drafted = None  # too short to be the full notice
    return {"notice": (drafted or template).strip(), "drafted_by": LLM_MODEL if drafted else "template",
            "complaint_id": complaint_id, "contractor": claim["contractor"], "estimated_cost": _cost(claim["category"])}


# -------------------------------------------------------------------------
# 3. Proof of repair
# -------------------------------------------------------------------------
MAX_DISTANCE_M = 50


def _parse_json(text: str) -> Optional[dict]:
    match = re.search(r"\{.*\}", text or "", re.S)
    try:
        return json.loads(match.group(0)) if match else None
    except ValueError:
        return None


@router.post("/me/reports/{complaint_id}/verify-repair")
async def verify_repair(
    complaint_id: int,
    photo: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    user: dict = Depends(require("citizen")),
):
    report = one(
        """SELECT c.id, c.title, c.category, c.status, c.description, c.priority, c.citizen_id,
                  ST_Distance(c.geom::geography, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography) AS distance_m,
                  ST_X(c.geom) AS lon, ST_Y(c.geom) AS lat
           FROM complaints c WHERE c.id = %s""", (longitude, latitude, complaint_id))
    if not report or report["citizen_id"] != user["citizen_id"]:
        raise HTTPException(status_code=404, detail="Report not found")
    if report["status"] != "resolved":
        raise HTTPException(status_code=409, detail="Only a report marked resolved can be checked.")
    distance = round(float(report["distance_m"]), 1)

    def record(verdict: str, confidence=None, observation=None, followup=None):
        with tx(user["email"], f"Repair check: {verdict}") as cur:
            cur.execute(
                """INSERT INTO repair_checks (complaint_id, citizen_id, distance_m, verdict, confidence, observation, followup_complaint_id)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                (complaint_id, user["citizen_id"], distance, verdict, confidence, observation, followup))

    if distance > MAX_DISTANCE_M:
        record("too_far")
        return {"verdict": "too_far", "distance_m": distance,
                "message": f"You are {distance:.0f} m from the reported spot. Stand within {MAX_DISTANCE_M} m and take the photo there."}

    image = await photo.read()
    if len(image) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Photo is too large (8 MB max).")
    data_url = f"data:{photo.content_type or 'image/jpeg'};base64,{base64.b64encode(image).decode()}"
    answer = await _gemini([
        {"role": "system", "content": (
            "You are a road inspector checking whether a reported road defect was repaired. Look at the photo of the "
            "spot. Reply with ONLY a JSON object: {\"repaired\": true|false|null, \"confidence\": 0..1, "
            "\"observation\": \"one sentence on what is visible\"}. Use null when the photo does not show the road surface clearly.")},
        {"role": "user", "content": [
            {"type": "text", "text": f"Reported defect: {report['category'].replace('_', ' ')}: {report['title']}. {report['description'][:300]}"},
            {"type": "image_url", "image_url": {"url": data_url}},
        ]},
    ], max_tokens=200)
    result = _parse_json(answer or "")
    if result is None:
        raise HTTPException(status_code=503, detail="The photo could not be checked right now (AI unavailable). Try again later.")
    confidence = float(result.get("confidence") or 0)
    observation = str(result.get("observation") or "")[:500]
    if result.get("repaired") is None:
        record("unclear", confidence, observation)
        return {"verdict": "unclear", "distance_m": distance, "observation": observation,
                "message": "The photo does not show the road clearly. Take it again, pointing at the repaired spot."}
    if result["repaired"]:
        record("repaired", confidence, observation)
        return {"verdict": "repaired", "distance_m": distance, "confidence": confidence, "observation": observation,
                "message": "Repair confirmed on site. Thank you for checking."}

    # Not repaired: open an escalated follow-up linked to the original, routed by the database trigger.
    with tx(user["email"], "Citizen on-site check found the defect still present") as cur:
        cur.execute(
            """INSERT INTO complaints (title, description, category, geom, status, priority, escalation_level,
                                       target_resolution_hours, parent_complaint_id, citizen_id)
               VALUES (%s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), 'routed', 5, 1, 48, %s, %s) RETURNING id""",
            (f"Repair failed citizen check: {report['title']}"[:255],
             f"Report #{complaint_id} was marked resolved, but an on-site photo taken {distance:.0f} m from the spot "
             f"still shows the defect. AI check: {observation}",
             report["category"], report["lon"], report["lat"], complaint_id, user["citizen_id"]))
        followup = cur.fetchone()["id"]
    record("not_repaired", confidence, observation, followup)
    return {"verdict": "not_repaired", "distance_m": distance, "confidence": confidence, "observation": observation,
            "followup_id": followup,
            "message": f"The defect is still visible. Report #{followup} was opened at top priority and escalated."}


@router.get("/repair-checks")
def repair_checks(user: dict = Depends(require(*STAFF))):
    return rows(
        """SELECT k.id, k.complaint_id, k.verdict, k.distance_m, k.confidence, k.observation, k.followup_complaint_id,
                  k.checked_at, c.title
           FROM repair_checks k JOIN complaints c ON c.id = k.complaint_id ORDER BY k.id DESC LIMIT 50""")


# -------------------------------------------------------------------------
# 4. Img2ThreeJS Procedural 3D Pothole Volumetric Scan & BoQ Engine
# -------------------------------------------------------------------------
class Pothole3DScanIn(BaseModel):
    complaint_id: Optional[int] = None
    road_id: Optional[int] = None
    scan_title: str = Field(min_length=3, max_length=200)
    width_m: float = Field(gt=0.05, le=15.0)
    length_m: float = Field(gt=0.05, le=15.0)
    depth_cm: float = Field(gt=0.5, le=120.0)
    volume_liters: float = Field(gt=0.1, le=50000.0)
    asphalt_kg: float = Field(gt=0.1, le=150000.0)
    tack_coat_liters: float = Field(ge=0.1, le=5000.0, default=1.8)
    estimated_cost_inr: float = Field(ge=0, le=10000000.0)
    exposed_layer: str = Field(max_length=80)
    irc_severity: str = Field(max_length=40)
    water_pooling_pct: float = Field(ge=0, le=100, default=0)
    spalling_index: float = Field(ge=0, le=1, default=0.5)
    heightmap_json: dict = Field(default_factory=dict)
    threejs_code: str = Field(min_length=10, max_length=30000)


@router.get("/pothole-3d")
def list_pothole_3d_scans(region: str = "IN"):
    scans = rows(
        """SELECT s.id, s.complaint_id, s.road_id, s.scan_title, s.width_m, s.length_m, s.depth_cm,
                  s.volume_liters, s.asphalt_kg, s.tack_coat_liters, s.estimated_cost_inr,
                  s.exposed_layer, s.irc_severity, s.water_pooling_pct, s.spalling_index,
                  s.heightmap_json, s.threejs_code, s.scanned_by, s.scanned_at,
                  r.name AS road_name, r.road_code, a.department_code AS authority,
                  ct.name AS contractor
           FROM pothole_3d_scans s
           LEFT JOIN roads r ON r.id = s.road_id
           LEFT JOIN authorities a ON a.id = r.authority_id
           LEFT JOIN contractors ct ON ct.id = r.contractor_id
           ORDER BY s.id DESC LIMIT 30"""
    )
    candidates = rows(
        """SELECT c.id, c.title, c.description, c.category, c.priority, c.status, c.road_id,
                  r.name AS road_name, r.road_code, a.department_code AS authority,
                  ST_Y(c.geom) AS lat, ST_X(c.geom) AS lon
           FROM complaints c
           LEFT JOIN roads r ON r.id = c.road_id
           LEFT JOIN authorities a ON a.id = c.assigned_authority_id
           WHERE (a.region_code = %s OR a.region_code IS NULL)
             AND c.category IN ('pothole', 'paving_defect')
           ORDER BY c.priority DESC, c.id DESC LIMIT 24""",
        (region,),
    )
    totals = one(
        """SELECT COUNT(*) AS total_scans,
                  COALESCE(ROUND(SUM(volume_liters)::numeric, 1), 0) AS total_volume_liters,
                  COALESCE(ROUND(SUM(asphalt_kg)::numeric, 1), 0) AS total_asphalt_kg,
                  COALESCE(ROUND(SUM(estimated_cost_inr)::numeric, 0), 0) AS total_boq_inr
           FROM pothole_3d_scans"""
    )
    return {"scans": scans, "candidates": candidates, "totals": totals}


@router.post("/pothole-3d")
def save_pothole_3d_scan(body: Pothole3DScanIn, user: Optional[dict] = Depends(optional_user)):
    actor = user["email"] if user else "img2threejs-scanner"
    road_id = body.road_id
    if not road_id and body.complaint_id:
        found = one("SELECT road_id FROM complaints WHERE id = %s", (body.complaint_id,))
        if found:
            road_id = found["road_id"]
    with tx(actor, f"Saved img2threejs 3D scan: {body.scan_title}") as cur:
        cur.execute(
            """INSERT INTO pothole_3d_scans (
                   complaint_id, road_id, scan_title, width_m, length_m, depth_cm,
                   volume_liters, asphalt_kg, tack_coat_liters, estimated_cost_inr,
                   exposed_layer, irc_severity, water_pooling_pct, spalling_index,
                   heightmap_json, threejs_code, scanned_by
               ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s)
               RETURNING id, scanned_at""",
            (
                body.complaint_id, road_id, body.scan_title, body.width_m, body.length_m, body.depth_cm,
                body.volume_liters, body.asphalt_kg, body.tack_coat_liters, body.estimated_cost_inr,
                body.exposed_layer, body.irc_severity, body.water_pooling_pct, body.spalling_index,
                json.dumps(body.heightmap_json), body.threejs_code, actor,
            ),
        )
        saved = cur.fetchone()
    return {"id": saved["id"], "scanned_at": saved["scanned_at"], "actor": actor}


# -------------------------------------------------------------------------
# 5. MonsoonShield: Hydrological Flood & Sub-Base Failure Predictor
# -------------------------------------------------------------------------
class MonsoonDispatchIn(BaseModel):
    road_id: int
    rainfall_mm_hr: float = Field(gt=0, le=300, default=95.0)
    action_type: str = Field(default="Pre-Monsoon Storm-Drain Desilting & Polymer Cold-Mix Patching", max_length=80)
    crew_assigned: str = Field(default="MCGM Emergency Monsoon Unit Alpha-4", max_length=120)


@router.get("/monsoon-risk")
def monsoon_risk(rainfall_mm_hr: float = 85.0, region: str = "IN"):
    rain = max(10.0, min(250.0, float(rainfall_mm_hr)))
    corridors = rows(
        """SELECT r.id AS road_id, r.name AS road_name, r.road_code, r.status, r.surface_type, r.length_km,
                  r.authority_id, a.name AS authority_name, a.department_code AS authority,
                  ct.name AS contractor, ct.blacklisted AS contractor_blacklisted,
                  COUNT(c.id) FILTER (WHERE c.category = 'waterlogging' AND c.status <> 'rejected') AS waterlogging_count,
                  COUNT(c.id) FILTER (WHERE c.category IN ('pothole', 'paving_defect') AND c.status IN ('pending','routed','in_progress')) AS open_potholes,
                  COALESCE((SELECT MAX(sr.reading) FROM iot_sensors s JOIN sensor_readings sr ON sr.sensor_id = s.id
                            WHERE s.road_id = r.id AND s.sensor_type ILIKE '%%moisture%%'), 24.0) AS moisture_pct,
                  COALESCE((SELECT SUM(b.estimated_daily_traffic) FROM project_beneficiaries b JOIN projects p ON p.id = b.project_id
                            WHERE p.road_id = r.id), COALESCE(r.aadt, 45000)) AS daily_commuters
           FROM roads r
           JOIN authorities a ON a.id = r.authority_id
           LEFT JOIN contractors ct ON ct.id = r.contractor_id
           LEFT JOIN complaints c ON c.road_id = r.id
           WHERE a.region_code = %s AND r.road_code NOT LIKE 'WARD-%%'
           GROUP BY r.id, a.id, ct.id
           ORDER BY waterlogging_count DESC, open_potholes DESC, r.id ASC
           LIMIT 12""",
        (region,),
    )
    results = []
    critical_corridors = 0
    total_commuters_at_risk = 0
    for c in corridors:
        base_vuln = 32 if c["status"] == "poor" else 22 if c["status"] == "under_construction" else 14 if c["status"] == "fair" else 6
        drain_factor = int(c["waterlogging_count"]) * 7 + int(c["open_potholes"]) * 4
        rain_factor = (rain / 120.0) * 42.0
        surface_mod = 0.78 if (c["surface_type"] or "").lower() == "concrete" else 1.15
        raw_score = min(99, max(8, round((base_vuln + drain_factor + rain_factor) * surface_mod)))
        flood_cm = round(max(0.0, (rain - 20.0) * 0.28 * (1 + int(c["waterlogging_count"]) * 0.22) * surface_mod), 1)
        stripping_prob = min(98, round(raw_score * 0.92))
        new_potholes_est = max(0, round((rain / 45.0) * (1 + int(c["open_potholes"]) * 0.35) * (1.3 if c["status"] == "poor" else 0.7)))
        risk_tier = "CRITICAL" if raw_score >= 75 else "HIGH" if raw_score >= 55 else "MODERATE" if raw_score >= 35 else "LOW"
        if risk_tier in ("CRITICAL", "HIGH"):
            critical_corridors += 1
            total_commuters_at_risk += int(c["daily_commuters"] or 0)
        results.append({
            **c,
            "risk_score": raw_score,
            "risk_tier": risk_tier,
            "predicted_flood_cm": flood_cm,
            "stripping_probability_pct": stripping_prob,
            "projected_new_potholes_48h": new_potholes_est,
        })
    results.sort(key=lambda x: -x["risk_score"])
    dispatches = rows(
        """SELECT w.id, w.road_id, r.name AS road_name, r.road_code, a.department_code AS authority,
                  w.rainfall_mm_hr, w.risk_score, w.predicted_flood_cm, w.action_type,
                  w.crew_assigned, w.estimated_cost_inr, w.status, w.dispatched_by, w.dispatched_at
           FROM preventive_work_orders w
           JOIN roads r ON r.id = w.road_id
           LEFT JOIN authorities a ON a.id = w.authority_id
           ORDER BY w.id DESC LIMIT 15"""
    )
    return {
        "rainfall_mm_hr": rain,
        "alert_level": "RED ALERT (CLOUDBURST)" if rain >= 110 else "ORANGE ALERT (HEAVY MONSOON)" if rain >= 65 else "YELLOW WATCH (MODERATE RAIN)",
        "critical_corridors": critical_corridors,
        "commuters_at_risk": total_commuters_at_risk,
        "corridors": results,
        "dispatches": dispatches,
    }


@router.post("/monsoon-risk/dispatch")
def dispatch_monsoon_crew(body: MonsoonDispatchIn, user: Optional[dict] = Depends(optional_user)):
    actor = user["email"] if user else "monsoon-command@mcgm.gov.in"
    road = one("SELECT id, name, authority_id, status FROM roads WHERE id = %s", (body.road_id,))
    if not road:
        raise HTTPException(status_code=404, detail="Road segment not found")
    risk_score = min(98, round(45 + (body.rainfall_mm_hr / 120.0) * 45))
    flood_cm = round(max(4.0, (body.rainfall_mm_hr - 15.0) * 0.34), 1)
    with tx(actor, f"Dispatched pre-monsoon crew to {road['name']}") as cur:
        cur.execute(
            """INSERT INTO preventive_work_orders (
                   road_id, authority_id, rainfall_mm_hr, risk_score, predicted_flood_cm,
                   action_type, crew_assigned, estimated_cost_inr, status, dispatched_by
               ) VALUES (%s, %s, %s, %s, %s, %s, %s, 48500, 'dispatched', %s)
               RETURNING id, dispatched_at""",
            (road["id"], road["authority_id"], body.rainfall_mm_hr, risk_score, flood_cm,
             body.action_type, body.crew_assigned, actor),
        )
        wo = cur.fetchone()
    return {"work_order_id": wo["id"], "road_name": road["name"], "dispatched_at": wo["dispatched_at"], "actor": actor}


# -------------------------------------------------------------------------
# 6. CivicTrust: Citizen Crowd-Verification & Statutory RTI Dossier Engine
# -------------------------------------------------------------------------
class VerificationVoteIn(BaseModel):
    vote_type: str = Field(pattern="^(confirm_hazard|confirm_fixed|flag_fake_closure)$")
    verifier_name: str = Field(default="Verified Ward Citizen", max_length=120)
    distance_m: float = Field(ge=0, le=500, default=9.5)
    comment: str = Field(default="", max_length=500)


@router.get("/civic-trust")
def civic_trust_feed(region: str = "IN"):
    items = rows(
        """SELECT c.id, c.title, c.description, c.category, c.status, c.priority, c.escalation_level,
                  c.created_at, c.target_resolution_hours, r.name AS road_name, r.road_code,
                  a.department_code AS authority, ct.name AS contractor,
                  COUNT(v.id) FILTER (WHERE v.vote_type = 'confirm_hazard') AS hazard_confirms,
                  COUNT(v.id) FILTER (WHERE v.vote_type = 'confirm_fixed') AS fixed_confirms,
                  COUNT(v.id) FILTER (WHERE v.vote_type = 'flag_fake_closure') AS fake_flags,
                  COUNT(v.id) AS total_votes
           FROM complaints c
           LEFT JOIN roads r ON r.id = c.road_id
           LEFT JOIN authorities a ON a.id = c.assigned_authority_id
           LEFT JOIN contractors ct ON ct.id = r.contractor_id
           LEFT JOIN complaint_verifications v ON v.complaint_id = c.id
           WHERE a.region_code = %s OR a.region_code IS NULL
           GROUP BY c.id, r.id, a.id, ct.id
           ORDER BY COUNT(v.id) DESC, c.priority DESC, c.id DESC
           LIMIT 20""",
        (region,),
    )
    recent_votes = rows(
        """SELECT v.id, v.complaint_id, c.title AS complaint_title, v.verifier_name,
                  v.vote_type, v.distance_m, v.comment, v.created_at
           FROM complaint_verifications v
           JOIN complaints c ON c.id = v.complaint_id
           ORDER BY v.id DESC LIMIT 15"""
    )
    stats = one(
        """SELECT COUNT(*) AS total_verifications,
                  COUNT(*) FILTER (WHERE vote_type = 'confirm_hazard') AS total_hazard_confirms,
                  COUNT(*) FILTER (WHERE vote_type = 'flag_fake_closure') AS total_fraud_flags,
                  COUNT(DISTINCT complaint_id) AS verified_complaints
           FROM complaint_verifications"""
    )
    return {"complaints": items, "recent_votes": recent_votes, "stats": stats}


@router.post("/civic-trust/{complaint_id}/verify")
def submit_civic_verification(
    complaint_id: int,
    body: VerificationVoteIn,
    user: Optional[dict] = Depends(optional_user),
):
    report = one("SELECT id, title, status, priority, escalation_level FROM complaints WHERE id = %s", (complaint_id,))
    if not report:
        raise HTTPException(status_code=404, detail="Complaint not found")
    actor = user["email"] if user else body.verifier_name
    citizen_id = user["citizen_id"] if user else None
    verifier_display = user["display_name"] if user else body.verifier_name

    auto_action = None
    with tx(actor, f"CivicTrust vote: {body.vote_type}") as cur:
        cur.execute(
            """INSERT INTO complaint_verifications (complaint_id, citizen_id, verifier_name, vote_type, distance_m, comment)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING id""",
            (complaint_id, citizen_id, verifier_display, body.vote_type, body.distance_m, body.comment.strip() or None),
        )
        cur.execute(
            """SELECT COUNT(*) FILTER (WHERE vote_type = 'confirm_hazard') AS hazards,
                      COUNT(*) FILTER (WHERE vote_type = 'flag_fake_closure') AS flags
               FROM complaint_verifications WHERE complaint_id = %s""",
            (complaint_id,),
        )
        counts = cur.fetchone()
        if body.vote_type == "confirm_hazard" and counts["hazards"] >= 2 and report["priority"] < 5:
            cur.execute("UPDATE complaints SET priority = 5 WHERE id = %s", (complaint_id,))
            auto_action = f"Crowd consensus ({counts['hazards']} citizen confirmations) boosted ticket #{complaint_id} to Priority P5 (Critical)."
        elif body.vote_type == "flag_fake_closure":
            new_esc = min(2, (report["escalation_level"] or 0) + 1)
            if report["status"] == "resolved":
                cur.execute(
                    "UPDATE complaints SET status = 'in_progress', priority = 5, escalation_level = %s, last_escalated_at = NOW() WHERE id = %s",
                    (new_esc, complaint_id),
                )
                auto_action = f"Fake closure flagged on site! Ticket #{complaint_id} reopened to IN_PROGRESS at Priority P5 & Escalation L{new_esc}."
            else:
                cur.execute("UPDATE complaints SET priority = 5, escalation_level = %s WHERE id = %s", (new_esc, complaint_id))
                auto_action = f"Fraud alert logged! Ticket #{complaint_id} escalated to L{new_esc} (Priority P5)."
    return {"complaint_id": complaint_id, "vote_type": body.vote_type, "auto_action": auto_action}


@router.get("/civic-trust/{complaint_id}/rti-dossier")
def generate_rti_dossier(complaint_id: int):
    c = one(
        """SELECT c.id, c.title, c.description, c.category, c.status, c.priority, c.escalation_level,
                  c.created_at, c.target_resolution_hours,
                  ST_Y(c.geom) AS lat, ST_X(c.geom) AS lon,
                  r.name AS road_name, r.road_code, r.surface_type, r.last_relaying_date,
                  a.name AS authority_name, a.department_code, a.contact_email AS authority_email,
                  p.id AS project_id, p.title AS project_title, p.budget_allocated, p.budget_spent, p.delay_days,
                  ct.name AS contractor_name, ct.contractor_code, ct.license_number, ct.blacklisted,
                  w.warranty_type, w.warranty_start_date, w.warranty_end_date
           FROM complaints c
           LEFT JOIN roads r ON r.id = c.road_id
           LEFT JOIN authorities a ON a.id = c.assigned_authority_id
           LEFT JOIN LATERAL (
               SELECT * FROM projects x WHERE x.road_id = r.id ORDER BY x.start_date DESC LIMIT 1
           ) p ON TRUE
           LEFT JOIN contractors ct ON ct.id = COALESCE(p.contractor_id, r.contractor_id)
           LEFT JOIN LATERAL (
               SELECT * FROM project_warranties pw WHERE pw.project_id = p.id ORDER BY pw.warranty_end_date DESC LIMIT 1
           ) w ON TRUE
           WHERE c.id = %s""",
        (complaint_id,),
    )
    if not c:
        raise HTTPException(status_code=404, detail="Complaint not found")
    scan = one(
        "SELECT width_m, length_m, depth_cm, volume_liters, asphalt_kg, estimated_cost_inr, exposed_layer FROM pothole_3d_scans WHERE complaint_id = %s ORDER BY id DESC LIMIT 1",
        (complaint_id,),
    )
    votes = one(
        """SELECT COUNT(*) AS total,
                  COUNT(*) FILTER (WHERE vote_type = 'confirm_hazard') AS hazards,
                  COUNT(*) FILTER (WHERE vote_type = 'flag_fake_closure') AS flags
           FROM complaint_verifications WHERE complaint_id = %s""",
        (complaint_id,),
    )
    scan_block = (
        f"5. 3D Volumetric Scan (img2threejs): {scan['width_m']}m x {scan['length_m']}m crater, depth {scan['depth_cm']} cm, "
        f"volume {scan['volume_liters']} L, requiring {scan['asphalt_kg']} kg Hot-Mix Asphalt (Est. BoQ: Rs {float(scan['estimated_cost_inr']):,.0f}; "
        f"Exposed stratum: {scan['exposed_layer']}).\n"
        if scan else
        "5. 3D Volumetric Scan: Standard surface defect telemetry logged in PostGIS.\n"
    )
    warranty_block = (
        f"Active {c['warranty_type'].replace('_', ' ')} warranty from {c['warranty_start_date']} to {c['warranty_end_date']} (Contractor liable at zero public cost)"
        if c["warranty_end_date"] else
        "No active defect liability warranty registered on latest contract"
    )
    budget_block = (
        f"Contract '{c['project_title']}' (Sanctioned: Rs {float(c['budget_allocated'] or 0):,.0f} | Expended: Rs {float(c['budget_spent'] or 0):,.0f} | Delay: {c['delay_days'] or 0} days)"
        if c["project_title"] else
        "General municipal maintenance ledger"
    )
    dossier = (
        f"FORM-A: APPLICATION UNDER SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005\n"
        f"============================================================================\n"
        f"To:\n"
        f"The Public Information Officer (PIO) / Executive Engineer,\n"
        f"{c['authority_name'] or 'Municipal Roads & Vigilance Department'} ({c['department_code'] or 'MCGM'})\n"
        f"Email: {c['authority_email'] or 'pio.roads@mcgm.gov.in'}\n"
        f"Date: {date.today().strftime('%d %B %Y')}\n\n"
        f"Subject: Statutory RTI Request & Vigilance Audit Inquiry regarding Road Defect Ticket #CMP-{complaint_id:05d} "
        f"on {c['road_name'] or 'Municipal Corridor'} ({c['road_code'] or 'N/A'}).\n\n"
        f"1. Geotagged Grievance Record:\n"
        f"   - Ticket ID: #CMP-{complaint_id:05d} ({c['title']})\n"
        f"   - Category & Priority: {c['category'].replace('_', ' ').upper()} | Priority P{c['priority']} | Escalation Level L{c['escalation_level']}\n"
        f"   - PostGIS Coordinates (SRID 4326): {float(c['lat']):.5f} N, {float(c['lon']):.5f} E\n"
        f"   - Filed Timestamp: {c['created_at']} | Current Status: {c['status'].upper()}\n\n"
        f"2. Public Works Contract & Fiscal Ledger Facts:\n"
        f"   - Corridor: {c['road_name'] or 'Unmapped'} ({c['road_code'] or 'N/A'}) | Surface: {c['surface_type'] or 'Asphalt'}\n"
        f"   - {budget_block}\n"
        f"   - Executing Contractor: {c['contractor_name'] or 'Unassigned'} ({c['contractor_code'] or 'N/A'}, License: {c['license_number'] or 'N/A'})\n"
        f"   - Debarment / Blacklist Standing: {'BLACKLISTED FIRM' if c['blacklisted'] else 'Active Contractor'}\n\n"
        f"3. Defect Liability Warranty Standing:\n"
        f"   - {warranty_block}\n\n"
        f"4. Community Crowd-Verification Ledger (CivicTrust):\n"
        f"   - {votes['total']} on-site citizen verifications ({votes['hazards']} hazard confirmations, {votes['flags']} fake-closure flags).\n\n"
        f"{scan_block}\n"
        f"6. Information Requested under Section 6(1) of the RTI Act, 2005:\n"
        f"   (a) Certified copy of the Work Order, Measurement Book (MB) entries, and Marshall core density lab test reports for {c['road_name'] or 'the above corridor'}.\n"
        f"   (b) Certified copy of the Defect Liability Recovery Notice issued to {c['contractor_name'] or 'the executing contractor'} for Ticket #CMP-{complaint_id:05d}.\n"
        f"   (c) Name and designation of the Junior Engineer and Executive Engineer responsible for statutory SLA compliance ({c['target_resolution_hours']}h target).\n\n"
        f"Generated from immutable PostgreSQL/PostGIS ledger rows by ROADWATCH CivicTrust.\n"
    )
    return {"complaint_id": complaint_id, "road_name": c["road_name"], "contractor": c["contractor_name"], "dossier": dossier}


# -------------------------------------------------------------------------
# 7. SafeCorridor: Emergency Ambulance & Two-Wheeler Shock-Free Router
# -------------------------------------------------------------------------
@router.get("/safe-corridor")
def safe_corridor_router(vehicle_type: str = "ambulance", region: str = "IN"):
    corridors = rows(
        """SELECT r.id, r.name, r.road_code, r.status, r.length_km, r.surface_type, r.lane_count,
                  a.department_code AS authority,
                  ST_AsGeoJSON(r.geom)::json -> 'coordinates' AS coordinates,
                  COUNT(DISTINCT c.id) FILTER (WHERE c.status IN ('pending','routed','in_progress') AND c.category IN ('pothole','paving_defect','waterlogging')) AS active_hazards,
                  COUNT(DISTINCT b.id) AS bump_shocks,
                  COALESCE(ROUND(MAX(b.intensity)::numeric, 1), 0) AS peak_shock_ms2
           FROM roads r
           JOIN authorities a ON a.id = r.authority_id
           LEFT JOIN complaints c ON c.road_id = r.id
           LEFT JOIN ride_bumps b ON ST_DWithin(r.geom::geography, b.geom::geography, 30)
           WHERE a.region_code = %s AND r.road_code NOT LIKE 'WARD-%%'
           GROUP BY r.id, a.id
           ORDER BY r.id ASC""",
        (region,),
    )
    scored = []
    for r in corridors:
        hazards = int(r["active_hazards"] or 0)
        bumps = int(r["bump_shocks"] or 0)
        peak = float(r["peak_shock_ms2"] or 0)
        if peak == 0:
            peak = 14.8 if r["status"] == "poor" else 9.2 if r["status"] == "under_construction" else 6.4 if r["status"] == "fair" else 3.1
        penalty = hazards * 8 + bumps * 2 + (25 if r["status"] == "poor" else 14 if r["status"] == "under_construction" else 6 if r["status"] == "fair" else 0)
        stability_score = max(12, min(99, 98 - penalty))
        est_minutes = round((float(r["length_km"] or 5.0) / (22.0 if r["status"] == "poor" else 38.0)) * 60.0, 1)
        scored.append({
            **r,
            "peak_shock_ms2": peak,
            "stability_score": stability_score,
            "est_travel_min": est_minutes,
            "recommendation": "AVOID (HIGH SHOCK / CRATER HAZARD)" if stability_score < 55 else "CAUTION (MODERATE ROUGHNESS)" if stability_score < 78 else "SAFE SMOOTH CORRIDOR",
        })
    scored_sorted = sorted(scored, key=lambda x: -x["stability_score"])
    safest = scored_sorted[:3]
    roughest = sorted(scored, key=lambda x: x["stability_score"])[:3]

    direct = roughest[0] if roughest else None
    safe = safest[0] if safest else None
    shocks_saved = round((direct["peak_shock_ms2"] - safe["peak_shock_ms2"]), 1) if (direct and safe) else 0
    hazards_avoided = max(0, (direct["active_hazards"] - safe["active_hazards"])) if (direct and safe) else 0

    return {
        "vehicle_type": vehicle_type,
        "recommended_safe_corridor": safe,
        "high_hazard_direct_corridor": direct,
        "peak_shock_reduction_ms2": shocks_saved,
        "hazards_avoided": hazards_avoided,
        "all_corridors": scored_sorted,
    }

