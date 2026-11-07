"""Direct PostgreSQL access for the screen and auth APIs.

Unlike ``db`` this has no mock fallback, so a rejected trigger (state machine,
blacklist, audit lock) reaches the client with PostgreSQL's own message.
"""
from contextlib import contextmanager
from typing import Optional

import psycopg2
from fastapi import HTTPException
from psycopg2.extras import RealDictCursor

from app.services.database import DATABASE_URL

DB_ROLES = {"citizen", "engineer", "admin", "auditor"}


@contextmanager
def tx(actor: str = "system", remarks: str = "", role: Optional[str] = None):
    """Open a transaction, optionally restricted to one of the application's database roles."""
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=3)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT set_config('app.changed_by', %s, true), set_config('app.status_remarks', %s, true)",
                (actor, remarks),
            )
            if role is not None:
                if role not in DB_ROLES:
                    raise HTTPException(status_code=403, detail="Unknown role")
                cur.execute(f"SET LOCAL ROLE roadwatch_{role}")
            yield cur
        conn.commit()
    except psycopg2.errors.InsufficientPrivilege as exc:
        conn.rollback()
        raise HTTPException(status_code=403, detail=(exc.diag.message_primary or str(exc)).strip())
    except psycopg2.errors.Error as exc:
        conn.rollback()
        message = (exc.diag.message_primary or str(exc)).strip()
        if isinstance(exc, (psycopg2.errors.CheckViolation, psycopg2.errors.UniqueViolation,
                            psycopg2.errors.ForeignKeyViolation)):
            raise HTTPException(status_code=409, detail=message)
        raise HTTPException(status_code=500, detail=message)
    except psycopg2.OperationalError as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}")
    finally:
        conn.close()


def rows(sql: str, params: tuple = (), role: Optional[str] = None) -> list:
    with tx(role=role) as cur:
        cur.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]


def one(sql: str, params: tuple = (), role: Optional[str] = None) -> Optional[dict]:
    result = rows(sql, params, role)
    return result[0] if result else None
