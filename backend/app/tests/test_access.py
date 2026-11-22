"""Access rules for the four roles. Needs a running API on localhost:8000
started by scripts/dev-backend.sh, which enables the sample accounts.

    pytest app/tests/test_access.py -v
"""
import json
import os
import random
import urllib.error
import urllib.request
import uuid

import pytest

BASE = "http://localhost:8000/api/v1"


def call(path, body=None, token=None, method=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(BASE + path, data=data, headers=headers, method=method or ("POST" if body is not None else "GET"))
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read() or b"{}")


def login(role):
    code, body = call("/auth/demo-login", {"role": role})
    assert code == 200, body
    return body["token"]


@pytest.fixture(scope="module")
def tokens():
    return {role: login(role) for role in ("citizen", "engineer", "admin", "auditor")}


@pytest.mark.parametrize("path", ["/screens/overview", "/screens/roads", "/screens/contractors",
                                  "/screens/ledger/spend", "/screens/regions", "/screens/complaints"])
def test_public_transparency_needs_no_sign_in(path):
    assert call(path)[0] == 200


@pytest.mark.parametrize("path", ["/screens/operations", "/screens/sla", "/screens/conflicts", "/screens/projects",
                                  "/screens/sensors", "/screens/audit", "/screens/me/reports", "/auth/me"])
def test_protected_reads_reject_anonymous(path):
    assert call(path)[0] == 401


def test_citizen_cannot_open_staff_screens(tokens):
    for path in ("/screens/operations", "/screens/audit", "/screens/sensors"):
        assert call(path, token=tokens["citizen"])[0] == 403


def test_citizen_sees_only_own_reports(tokens):
    code, body = call("/screens/me/reports", token=tokens["citizen"])
    assert code == 200
    assert body["citizen"]["citizen_id"] == 2


def test_engineer_queue_is_limited_to_their_ward(tokens):
    code, body = call("/screens/operations", token=tokens["engineer"])
    assert code == 200
    assert {row["authority"] for row in body["queue"]} <= {"MCGM-KW"}


def test_engineer_cannot_use_admin_actions(tokens):
    assert call("/screens/sla/run", {}, tokens["engineer"])[0] == 403
    assert call("/screens/tenders/1/award/1", {}, tokens["engineer"])[0] == 403
    assert call("/screens/contractors/1/blacklist", {"blacklisted": True, "reason": "x"}, tokens["engineer"])[0] == 403


def test_auditor_reads_audit_log_but_cannot_change_anything(tokens):
    assert call("/screens/audit", token=tokens["auditor"])[0] == 200
    assert call("/screens/complaints/1/transition", {"status": "resolved"}, tokens["auditor"])[0] == 403


def test_state_machine_still_applies_to_admin(tokens):
    _, ops = call("/screens/operations", token=tokens["admin"])
    pending = next(row for row in ops["queue"] if row["status"] == "pending")
    code, body = call(f"/screens/complaints/{pending['id']}/transition", {"status": "resolved"}, tokens["admin"])
    assert code == 409
    assert "Invalid complaint transition" in body["detail"]


def test_wrong_password_and_injection_are_rejected():
    assert call("/auth/login", {"email": "commissioner@roadwatch.example", "password": "wrong"})[0] == 401
    assert call("/auth/login", {"email": "' OR 1=1 --", "password": "' OR 1=1 --"})[0] == 401


def remove_test_citizen(email):
    """Delete the throwaway citizen; the cascade removes its report too."""
    import psycopg2
    with psycopg2.connect(
        host=os.environ.get("POSTGRES_HOST", "localhost"), port=os.environ.get("POSTGRES_PORT", "5432"),
        user=os.environ.get("POSTGRES_USER", "postgres"), password=os.environ.get("POSTGRES_PASSWORD", "postgres"),
        dbname=os.environ.get("POSTGRES_DB", "roadwatch"),
    ) as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM citizens WHERE email = %s", (email,))


@pytest.fixture
def test_email():
    email = f"citizen-{uuid.uuid4().hex[:10]}@roadwatch.example"
    yield email
    remove_test_citizen(email)


def test_register_files_report_then_logout(test_email):
    email = test_email
    code, session = call("/auth/register", {
        "first_name": "Test", "last_name": "Citizen", "email": email,
        "password": "correct-horse", "residential_ward": "K-West", "phone_numbers": ["+91-90000-11111"],
    })
    assert code == 200
    token = session["token"]
    assert session["user"]["role"] == "citizen"
    assert call("/auth/register", {
        "first_name": "Test", "last_name": "Again", "email": email,
        "password": "correct-horse", "residential_ward": "K-West",
    })[0] == 409

    code, _ = call("/complaints", {
        "title": "Access test report",
        # Random text and place, so a rerun does not trip the duplicate checks.
        "description": f"{uuid.uuid4().hex} {uuid.uuid4().hex}",
        "category": "missing_signage",
        "geometry": {"type": "Point", "coordinates": [72.86 + random.random() * 0.05, 19.04 + random.random() * 0.05]},
        "clientTempId": str(uuid.uuid4()),
    }, token)
    assert code == 200
    code, mine = call("/screens/me/reports", token=token)
    assert code == 200
    assert [report["title"] for report in mine["reports"]] == ["Access test report"]

    report_id = mine["reports"][0]["id"]
    assert call(f"/screens/me/reports/{report_id}", token=login("citizen"), method="DELETE")[0] == 404
    assert call(f"/screens/me/reports/{report_id}", token=token, method="DELETE")[0] == 200
    assert call("/screens/me/reports", token=token)[1]["reports"] == []

    assert call("/auth/logout", {}, token)[0] == 200
    assert call("/auth/me", token=token)[0] == 401


OLD_WRITE_ROUTES = [
    ("POST", "/complaints/1/decline"),
    ("PUT", "/complaints/1/status"),
    ("PUT", "/complaints/1/vision-priority"),
    ("POST", "/conflicts/roads/detect"),
    ("POST", "/conflicts/authorities/1/resolve"),
    ("PATCH", "/contractors/1"),
    ("PUT", "/projects/1/fund-sources"),
    ("POST", "/projects/1/milestones"),
    ("PATCH", "/approvals/1"),
    ("DELETE", "/roads/1/documents/1"),
]


@pytest.mark.parametrize("method,path", OLD_WRITE_ROUTES)
def test_write_routes_need_staff(method, path, tokens):
    assert call(path, {}, method=method)[0] == 401
    assert call(path, {}, tokens["citizen"], method=method)[0] == 403
    assert call(path, {}, tokens["auditor"], method=method)[0] == 403


def test_audit_log_is_for_admins_and_auditors(tokens):
    assert call("/audit/log")[0] == 401
    assert call("/audit/log", token=tokens["citizen"])[0] == 403
    assert call("/audit/log", token=tokens["auditor"])[0] == 200


def test_engineer_cannot_change_another_wards_report(tokens):
    me = call("/auth/me", token=tokens["engineer"])[1]
    reports = call("/screens/complaints?region=IN")[1]
    foreign = next((r for r in reports if r["assigned_authority_id"] not in (me["authority_id"], None)
                    and r["status"] in ("pending", "routed")), None)
    assert foreign, "sample data should have an open report in another ward"
    assert call(f"/screens/complaints/{foreign['id']}/transition", {"status": "in_progress"}, tokens["engineer"])[0] == 403
    assert call(f"/screens/complaints/{foreign['id']}/escalate", {}, tokens["engineer"])[0] == 403


def test_admin_manages_staff_accounts(tokens):
    email = f"eng-{uuid.uuid4().hex[:8]}@roadwatch.example"
    code, created = call("/auth/users", {"email": email, "display_name": "Test Engineer", "role": "engineer",
                                         "authority_id": 2, "password": "ward-fn-2026"}, tokens["admin"])
    assert code == 200
    try:
        assert call("/auth/users", {"email": "x@roadwatch.example", "display_name": "x", "role": "engineer",
                                    "password": "ward-fn-2026"}, tokens["admin"])[0] == 400
        assert call("/auth/users", {"email": "y@roadwatch.example", "display_name": "y", "role": "admin",
                                    "password": "ward-fn-2026"}, tokens["engineer"])[0] == 403
        code, session = call("/auth/login", {"email": email, "password": "ward-fn-2026"})
        assert code == 200 and session["user"]["authority_id"] == 2
        assert call(f"/auth/users/{created['id']}/password", {"new_password": "reset-pass-2026"}, tokens["admin"])[0] == 200
        assert call("/auth/me", token=session["token"])[0] == 401
    finally:
        assert call(f"/auth/users/{created['id']}", token=tokens["admin"], method="DELETE")[0] == 200


def test_register_errors_and_password_change(test_email):
    body = {"first_name": "Test", "last_name": "Citizen", "email": test_email,
            "password": "correct-horse", "residential_ward": "K-West"}
    code, session = call("/auth/register", body)
    assert code == 200
    code, error = call("/auth/register", body)
    assert code == 409 and "already exists" in error["detail"]
    assert call("/auth/register", {**body, "email": "not-an-email"})[0] == 422
    token = session["token"]
    assert call("/auth/password", {"current_password": "wrong", "new_password": "new-horse-2026"}, token)[0] == 400
    assert call("/auth/password", {"current_password": "correct-horse", "new_password": "new-horse-2026"}, token)[0] == 200
    assert call("/auth/login", {"email": test_email, "password": "new-horse-2026"})[0] == 200


def test_public_reference_data_and_report_history():
    code, ref = call("/screens/reference?region=IN")
    assert code == 200 and ref["authorities"] and ref["contractors"] and ref["projects"]
    assert ref["authorities"][0]["boundary"]["type"] == "Polygon"
    code, history = call("/screens/complaints/1/history")
    assert code == 200 and isinstance(history, list)
    assert call("/auth/google/enabled")[0] == 200


def _sql(statement, params=()):
    import psycopg2
    with psycopg2.connect(
        host=os.environ.get("POSTGRES_HOST", "localhost"), port=os.environ.get("POSTGRES_PORT", "5432"),
        user=os.environ.get("POSTGRES_USER", "postgres"), password=os.environ.get("POSTGRES_PASSWORD", "postgres"),
        dbname=os.environ.get("POSTGRES_DB", "roadwatch"),
    ) as conn, conn.cursor() as cur:
        cur.execute(statement, params)


def test_bump_radar_files_report_after_two_rides():
    # A random spot inside K-West, away from other test data.
    lat, lon = 19.115 + random.random() * 0.01, 72.835 + random.random() * 0.005
    rides = [str(uuid.uuid4()), str(uuid.uuid4())]
    created = []
    try:
        code, first = call("/screens/bumps", {"ride_id": rides[0], "bumps": [
            {"lat": lat, "lon": lon, "intensity": 12.5, "speed_kmh": 25},
            {"lat": lat + 0.00003, "lon": lon, "intensity": 9.0, "speed_kmh": 25}]})
        assert code == 200 and first["new_reports"] == []  # one ride is not enough
        code, second = call("/screens/bumps", {"ride_id": rides[1], "bumps": [
            {"lat": lat + 0.00002, "lon": lon + 0.00001, "intensity": 11.0, "speed_kmh": 30}]})
        assert code == 200 and len(second["new_reports"]) == 1
        created = [r["id"] for r in second["new_reports"]]
        assert second["new_reports"][0]["assigned_authority_id"] is not None  # routed by the trigger
        spots = call("/screens/bumps/clusters")[1]["clusters"]
        assert any(s["complaint_id"] == created[0] and s["confirmed"] for s in spots)
    finally:
        _sql("DELETE FROM ride_bumps WHERE ride_id = ANY(%s::uuid[])", (rides,))
        if created:
            _sql("DELETE FROM complaints WHERE id = ANY(%s)", (created,))


def test_warranty_claims_and_notice_rights(tokens):
    code, data = call("/screens/warranty-claims?region=IN")
    assert code == 200 and data["claims"], "sample Mumbai warranties should cover some reports"
    claim = data["claims"][0]
    assert claim["warranty_start_date"] <= claim["created_at"][:10] <= claim["warranty_end_date"]
    assert call(f"/screens/warranty-claims/{claim['complaint_id']}/notice", {}, tokens["citizen"])[0] == 403
    assert call(f"/screens/warranty-claims/{claim['complaint_id']}/notice", {})[0] == 401


def test_repair_check_needs_owner_resolved_report_and_presence(tokens):
    code, mine = call("/screens/me/reports", token=tokens["citizen"])
    resolved = next(r for r in mine["reports"] if r["status"] == "resolved")
    open_one = next(r for r in mine["reports"] if r["status"] in ("routed", "in_progress"))

    def post(report_id, token, lat, lon):
        boundary = uuid.uuid4().hex
        body = (f'--{boundary}\r\nContent-Disposition: form-data; name="latitude"\r\n\r\n{lat}\r\n'
                f'--{boundary}\r\nContent-Disposition: form-data; name="longitude"\r\n\r\n{lon}\r\n'
                f'--{boundary}\r\nContent-Disposition: form-data; name="photo"; filename="p.jpg"\r\n'
                f'Content-Type: image/jpeg\r\n\r\n').encode() + b"\xff\xd8\xff\xd9" + f"\r\n--{boundary}--\r\n".encode()
        request = urllib.request.Request(f"{BASE}/screens/me/reports/{report_id}/verify-repair", data=body, method="POST",
                                         headers={"Authorization": f"Bearer {token}", "Content-Type": f"multipart/form-data; boundary={boundary}"})
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.status, json.loads(response.read())
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read() or b"{}")

    assert post(open_one["id"], tokens["citizen"], 0, 0)[0] == 409       # not resolved yet
    assert post(resolved["id"], tokens["engineer"], 0, 0)[0] == 403      # citizens only
    code, result = post(resolved["id"], tokens["citizen"], 0.0, 0.0)     # far from Mumbai
    assert code == 200 and result["verdict"] == "too_far"
    _sql("DELETE FROM repair_checks WHERE complaint_id = %s AND verdict = 'too_far'", (resolved["id"],))


def test_img2threejs_pothole_3d_scan_engine(tokens):
    code, listing = call("/screens/pothole-3d?region=IN")
    assert code == 200 and "scans" in listing and "candidates" in listing
    candidate = listing["candidates"][0]
    scan_id = None
    try:
        code, saved = call(
            "/screens/pothole-3d",
            {
                "complaint_id": candidate["id"],
                "road_id": candidate["road_id"],
                "scan_title": "Pytest img2threejs 3D Volumetric Scan",
                "width_m": 1.25,
                "length_m": 0.95,
                "depth_cm": 10.5,
                "volume_liters": 61.4,
                "asphalt_kg": 168.1,
                "tack_coat_liters": 2.6,
                "estimated_cost_inr": 19800,
                "exposed_layer": "Wet Mix Macadam (WMM Sub-Base Exposed)",
                "irc_severity": "CRITICAL (IRC:82 > 9cm)",
                "water_pooling_pct": 40,
                "spalling_index": 0.72,
                "heightmap_json": {"grid_size": 32, "max_depth_cm": 10.5},
                "threejs_code": "export function createPotholeGroup(THREE) { return new THREE.Group(); }",
            },
            tokens["citizen"],
        )
        assert code == 200 and saved["id"]
        scan_id = saved["id"]
        code, after = call("/screens/pothole-3d?region=IN")
        assert code == 200 and any(s["id"] == scan_id for s in after["scans"])
    finally:
        if scan_id:
            _sql("DELETE FROM pothole_3d_scans WHERE id = %s", (scan_id,))


def test_monsoon_shield_risk_and_preventive_dispatch(tokens):
    code, data = call("/screens/monsoon-risk?rainfall_mm_hr=125&region=IN")
    assert code == 200 and data["corridors"] and data["rainfall_mm_hr"] == 125.0
    corridor = data["corridors"][0]
    wo_id = None
    try:
        code, dispatched = call(
            "/screens/monsoon-risk/dispatch",
            {
                "road_id": corridor["road_id"],
                "rainfall_mm_hr": 125.0,
                "action_type": "Pre-Monsoon Storm-Drain Desilting & Polymer Cold-Mix",
                "crew_assigned": "Pytest Monsoon Rapid Unit",
            },
            tokens["engineer"],
        )
        assert code == 200 and dispatched["work_order_id"]
        wo_id = dispatched["work_order_id"]
    finally:
        if wo_id:
            _sql("DELETE FROM preventive_work_orders WHERE id = %s", (wo_id,))


def test_civic_trust_crowd_verification_and_rti_dossier(tokens):
    code, feed = call("/screens/civic-trust?region=IN")
    assert code == 200 and feed["complaints"]
    target_id = feed["complaints"][0]["id"]
    try:
        code, vote = call(
            f"/screens/civic-trust/{target_id}/verify",
            {
                "vote_type": "confirm_hazard",
                "verifier_name": "Pytest Ward Citizen",
                "distance_m": 10.2,
                "comment": "Confirmed crater hazard on site during pytest.",
            },
            tokens["citizen"],
        )
        assert code == 200 and vote["complaint_id"] == target_id
        code, rti = call(f"/screens/civic-trust/{target_id}/rti-dossier")
        assert code == 200 and "RIGHT TO INFORMATION ACT, 2005" in rti["dossier"]
    finally:
        _sql("DELETE FROM complaint_verifications WHERE verifier_name = 'Pytest Ward Citizen'")


def test_safe_corridor_shock_free_router():
    code, data = call("/screens/safe-corridor?vehicle_type=ambulance&region=IN")
    assert code == 200 and data["recommended_safe_corridor"] and data["high_hazard_direct_corridor"]
    assert data["recommended_safe_corridor"]["stability_score"] >= data["high_hazard_direct_corridor"]["stability_score"]

