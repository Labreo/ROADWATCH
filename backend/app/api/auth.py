"""Sign-in for the four roles in Document 1: citizen, engineer, admin and auditor.

Passwords are bcrypt hashes made by pgcrypto. Sessions are random tokens, and
only their SHA-256 hash is stored.
"""
import base64
import hashlib
import os
import secrets
import time
from typing import List, Literal, Optional
from urllib.parse import urlencode, urlparse

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field, field_validator

from app.services.live_db import one, rows, tx

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_HOURS = 12
STAFF = ("engineer", "admin", "auditor")
WRITERS = ("engineer", "admin")
USER_COLUMNS = "u.id, u.email, u.display_name, u.role, u.citizen_id, u.authority_id"


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def optional_user(authorization: Optional[str] = Header(default=None)) -> Optional[dict]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    return one(
        f"""SELECT {USER_COLUMNS} FROM app_sessions s JOIN app_users u ON u.id = s.user_id
            WHERE s.token_hash = %s AND s.expires_at > NOW()""",
        (_hash(authorization[7:].strip()),),
    )


def current_user(user: Optional[dict] = Depends(optional_user)) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Sign in to continue.")
    return user


def require(*roles: str):
    def check(user: dict = Depends(current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Your role cannot do this.")
        return user
    return check


def _start_session(user: dict) -> dict:
    token = secrets.token_urlsafe(32)
    with tx(user["email"]) as cur:
        cur.execute("DELETE FROM app_sessions WHERE expires_at < NOW()")
        cur.execute(
            "INSERT INTO app_sessions (token_hash, user_id, expires_at) "
            "VALUES (%s, %s, NOW() + make_interval(hours => %s))",
            (_hash(token), user["id"], SESSION_HOURS),
        )
    return {"token": token, "user": user}


def clean_email(value: str) -> str:
    value = value.strip().lower()
    local, _, domain = value.partition("@")
    if not local or "." not in domain or " " in value:
        raise ValueError("Enter a valid email address")
    return value


class Login(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(max_length=200)


@router.post("/login")
def login(body: Login):
    user = one(
        f"""SELECT {USER_COLUMNS} FROM app_users u
            WHERE lower(u.email) = lower(%s) AND u.password_hash = crypt(%s, u.password_hash)""",
        (body.email.strip(), body.password),
    )
    if not user:
        raise HTTPException(status_code=401, detail="Wrong email or password.")
    return _start_session(user)


class Register(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: str = Field(max_length=255)
    password: str = Field(min_length=8, max_length=200)
    residential_ward: str = Field(min_length=1, max_length=100)
    phone_numbers: List[str] = Field(default_factory=list, max_length=5)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        return clean_email(value)


def _email_taken(email: str) -> bool:
    return one("SELECT 1 AS taken FROM app_users WHERE lower(email) = lower(%s)", (email,)) is not None


def _create_citizen_user(cur, email: str, first: str, last: str, ward: str, password: Optional[str],
                         phones: List[str] = ()) -> dict:
    """Create (or reuse) the citizen row and its sign-in account in one transaction.

    A citizen row can exist without an account (sample data, WhatsApp/SMS reports);
    registering with that email claims it instead of failing on the unique email.
    """
    cur.execute("SELECT id FROM citizens WHERE lower(email) = lower(%s)", (email,))
    found = cur.fetchone()
    if found:
        citizen_id = found["id"]
    else:
        cur.execute(
            "INSERT INTO citizens (first_name, last_name, email, residential_ward) VALUES (%s, %s, %s, %s) RETURNING id",
            (first, last, email, ward),
        )
        citizen_id = cur.fetchone()["id"]
    for phone in phones:
        if phone.strip():
            cur.execute(
                "INSERT INTO citizen_phones (citizen_id, phone_number) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (citizen_id, phone.strip()[:20]),
            )
    # Accounts made through Google get a random password nobody knows; they can set one later.
    cur.execute(
        """INSERT INTO app_users (email, password_hash, display_name, role, citizen_id)
           VALUES (%s, crypt(%s, gen_salt('bf', 10)), %s, 'citizen', %s)
           RETURNING id, email, display_name, role, citizen_id, authority_id""",
        (email, password or secrets.token_urlsafe(32), f"{first} {last}".strip(), citizen_id),
    )
    return dict(cur.fetchone())


@router.post("/register")
def register(body: Register):
    if _email_taken(body.email):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Sign in instead.")
    with tx(body.email) as cur:
        user = _create_citizen_user(
            cur, body.email, body.first_name.strip(), body.last_name.strip(), body.residential_ward.strip(),
            body.password, body.phone_numbers,
        )
    return _start_session(user)


@router.get("/wards")
def wards(region: str = "IN"):
    """Wards and departments a citizen can pick as their home ward when registering."""
    found = rows(
        "SELECT id, name, department_code FROM authorities WHERE region_code = %s ORDER BY id", (region,))
    for ward in found:
        name = ward["name"]
        ward["label"] = name.split("Ward ", 1)[1] if "Ward " in name else name
    return found


class PasswordChange(BaseModel):
    current_password: str = Field(max_length=200)
    new_password: str = Field(min_length=8, max_length=200)


@router.post("/password")
def change_password(body: PasswordChange, user: dict = Depends(current_user)):
    ok = one("SELECT 1 AS ok FROM app_users WHERE id = %s AND password_hash = crypt(%s, password_hash)",
             (user["id"], body.current_password))
    if not ok:
        raise HTTPException(status_code=400, detail="Your current password is not correct.")
    with tx(user["email"]) as cur:
        cur.execute("UPDATE app_users SET password_hash = crypt(%s, gen_salt('bf', 10)) WHERE id = %s",
                    (body.new_password, user["id"]))
    return {"changed": True}


# -------------------------------------------------------------------------
# Staff accounts: only an administrator creates engineers, admins and auditors.
# -------------------------------------------------------------------------
class StaffIn(BaseModel):
    email: str = Field(max_length=255)
    display_name: str = Field(min_length=1, max_length=200)
    role: Literal["engineer", "admin", "auditor"]
    authority_id: Optional[int] = None
    password: str = Field(min_length=8, max_length=200)

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        return clean_email(value)


class PasswordReset(BaseModel):
    new_password: str = Field(min_length=8, max_length=200)


@router.get("/users")
def list_users(user: dict = Depends(require("admin"))):
    return rows(
        """SELECT u.id, u.email, u.display_name, u.role, u.authority_id, a.department_code AS authority,
                  u.is_demo, u.created_at,
                  (SELECT MAX(s.expires_at) FROM app_sessions s WHERE s.user_id = u.id) AS session_until
           FROM app_users u LEFT JOIN authorities a ON a.id = u.authority_id
           ORDER BY (u.role = 'citizen'), u.role, u.id""")


@router.post("/users")
def create_staff(body: StaffIn, user: dict = Depends(require("admin"))):
    if body.role == "engineer" and not body.authority_id:
        raise HTTPException(status_code=400, detail="Choose the ward an engineer works for.")
    if _email_taken(body.email):
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    with tx(user["email"]) as cur:
        cur.execute(
            """INSERT INTO app_users (email, password_hash, display_name, role, authority_id)
               VALUES (%s, crypt(%s, gen_salt('bf', 10)), %s, %s, %s)
               RETURNING id, email, display_name, role, citizen_id, authority_id""",
            (body.email, body.password, body.display_name.strip(), body.role,
             body.authority_id if body.role == "engineer" else None),
        )
        return dict(cur.fetchone())


@router.post("/users/{user_id}/password")
def reset_password(user_id: int, body: PasswordReset, user: dict = Depends(require("admin"))):
    with tx(user["email"]) as cur:
        cur.execute("UPDATE app_users SET password_hash = crypt(%s, gen_salt('bf', 10)) WHERE id = %s RETURNING id",
                    (body.new_password, user_id))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Account not found")
        cur.execute("DELETE FROM app_sessions WHERE user_id = %s", (user_id,))
    return {"reset": user_id}


@router.delete("/users/{user_id}")
def remove_staff(user_id: int, user: dict = Depends(require("admin"))):
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="You cannot remove your own account.")
    with tx(user["email"]) as cur:
        cur.execute("DELETE FROM app_users WHERE id = %s AND role <> 'citizen' AND NOT is_demo RETURNING id", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=409, detail="Only staff accounts you created can be removed.")
    return {"removed": user_id}


# -------------------------------------------------------------------------
# Sign in with Google (OAuth 2.0 authorization code flow with PKCE).
# Turned on by GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. Google's verified
# email signs in the matching account, or creates a citizen account.
# -------------------------------------------------------------------------
GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO = "https://openidconnect.googleapis.com/v1/userinfo"
_pending: dict = {}  # state -> (verifier, return_to, created)


def _google_config():
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
    return (client_id, secret) if client_id and secret else None


def _frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")


def _callback_url() -> str:
    return os.environ.get("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/google/callback")


def _safe_return(return_to: Optional[str]) -> str:
    base = _frontend_url()
    if return_to and urlparse(return_to).netloc == urlparse(base).netloc:
        return return_to.split("#")[0]
    return base + "/"


def _back_to_app(return_to: str, **fragment) -> RedirectResponse:
    # The token travels in the URL fragment, which browsers never send to a server.
    return RedirectResponse(f"{return_to}#{urlencode(fragment)}", status_code=302)


@router.get("/google/enabled")
def google_enabled():
    return {"enabled": _google_config() is not None}


@router.get("/google/start")
def google_start(return_to: Optional[str] = Query(default=None)):
    config = _google_config()
    if not config:
        raise HTTPException(status_code=404, detail="Google sign-in is not set up on this server.")
    now = time.time()
    for key in [k for k, v in _pending.items() if now - v[2] > 600]:
        _pending.pop(key, None)
    state = secrets.token_urlsafe(24)
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    _pending[state] = (verifier, _safe_return(return_to), now)
    params = {
        "client_id": config[0],
        "redirect_uri": _callback_url(),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "prompt": "select_account",
    }
    return RedirectResponse(f"{GOOGLE_AUTH}?{urlencode(params)}", status_code=302)


@router.get("/google/callback")
async def google_callback(state: str = "", code: str = "", error: str = ""):
    pending = _pending.pop(state, None)
    if not pending or time.time() - pending[2] > 600:
        return _back_to_app(_frontend_url() + "/", auth_error="Google sign-in expired. Please try again.")
    verifier, return_to, _ = pending
    if error or not code:
        return _back_to_app(return_to, auth_error="Google sign-in was cancelled.")
    config = _google_config()
    if not config:
        return _back_to_app(return_to, auth_error="Google sign-in is not set up on this server.")
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            token = await client.post(GOOGLE_TOKEN, data={
                "client_id": config[0], "client_secret": config[1], "code": code,
                "code_verifier": verifier, "grant_type": "authorization_code", "redirect_uri": _callback_url(),
            })
            token.raise_for_status()
            info = await client.get(GOOGLE_USERINFO, headers={"Authorization": f"Bearer {token.json()['access_token']}"})
            info.raise_for_status()
            profile = info.json()
    except (httpx.HTTPError, KeyError, ValueError):
        return _back_to_app(return_to, auth_error="Google did not confirm the sign-in. Please try again.")
    email = (profile.get("email") or "").strip().lower()
    if not email or not profile.get("email_verified"):
        return _back_to_app(return_to, auth_error="Your Google account has no verified email.")
    user = one(f"SELECT {USER_COLUMNS} FROM app_users u WHERE lower(u.email) = %s", (email,))
    if not user:
        with tx(email) as cur:
            user = _create_citizen_user(
                cur, email, (profile.get("given_name") or email.split("@")[0])[:100],
                (profile.get("family_name") or "")[:100], "Unassigned", None)
    session = _start_session(user)
    return _back_to_app(return_to, auth_token=session["token"])


class DemoLogin(BaseModel):
    role: str


@router.post("/demo-login")
def demo_login(body: DemoLogin):
    """One-click sample accounts for local demos. Off unless ROADWATCH_DEMO_LOGIN=1."""
    if os.environ.get("ROADWATCH_DEMO_LOGIN") != "1":
        raise HTTPException(status_code=404, detail="Not found")
    user = one(
        f"SELECT {USER_COLUMNS} FROM app_users u WHERE u.is_demo AND u.role = %s ORDER BY u.id LIMIT 1",
        (body.role,),
    )
    if not user:
        raise HTTPException(status_code=404, detail="No sample account for that role")
    return _start_session(user)


@router.get("/demo-enabled")
def demo_enabled():
    return {"enabled": os.environ.get("ROADWATCH_DEMO_LOGIN") == "1"}


@router.get("/me")
def me(user: dict = Depends(current_user)):
    return user


@router.post("/logout")
def logout(authorization: Optional[str] = Header(default=None)):
    if authorization and authorization.lower().startswith("bearer "):
        with tx() as cur:
            cur.execute("DELETE FROM app_sessions WHERE token_hash = %s", (_hash(authorization[7:].strip()),))
    return {"signed_out": True}
