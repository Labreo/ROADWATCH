"""Sign-in for the four roles in Document 1: citizen, engineer, admin and auditor.

Passwords are bcrypt hashes made by pgcrypto. Sessions are random tokens, and
only their SHA-256 hash is stored.
"""
import hashlib
import os
import secrets
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.services.live_db import one, tx

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
        value = value.strip().lower()
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("Enter a valid email address")
        return value


@router.post("/register")
def register(body: Register):
    with tx(body.email) as cur:
        cur.execute(
            "INSERT INTO citizens (first_name, last_name, email, residential_ward) VALUES (%s, %s, %s, %s) RETURNING id",
            (body.first_name.strip(), body.last_name.strip(), body.email, body.residential_ward.strip()),
        )
        citizen_id = cur.fetchone()["id"]
        for phone in body.phone_numbers:
            if phone.strip():
                cur.execute(
                    "INSERT INTO citizen_phones (citizen_id, phone_number) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                    (citizen_id, phone.strip()[:20]),
                )
        cur.execute(
            """INSERT INTO app_users (email, password_hash, display_name, role, citizen_id)
               VALUES (%s, crypt(%s, gen_salt('bf', 10)), %s, 'citizen', %s)
               RETURNING id, email, display_name, role, citizen_id, authority_id""",
            (body.email, body.password, f"{body.first_name.strip()} {body.last_name.strip()}", citizen_id),
        )
        user = dict(cur.fetchone())
    return _start_session(user)


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
