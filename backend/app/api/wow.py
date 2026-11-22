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
