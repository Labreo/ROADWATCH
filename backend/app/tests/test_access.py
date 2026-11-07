"""Access rules for the four roles. Needs a running API on localhost:8000
started by scripts/dev-backend.sh, which enables the sample accounts.

    pytest app/tests/test_access.py -v
"""
import json
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


def test_register_files_report_then_logout():
    email = f"citizen-{uuid.uuid4().hex[:10]}@roadwatch.example"
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
