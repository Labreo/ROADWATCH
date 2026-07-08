"""Thread-local audit user context for ROADWATCH.

Uses ``contextvars`` so each async request can set its own ``changed_by``
value that flows through the Database singleton without cross-request leaks.
"""

import contextvars

audit_user: contextvars.ContextVar[str] = contextvars.ContextVar(
    "audit_user", default="system"
)


def set_audit_user(user: str) -> None:
    """Set the current request's audit user (e.g. from X-User-Id header)."""
    audit_user.set(user)


def get_audit_user() -> str:
    """Return the current audit user, or ``'system'`` if not set."""
    return audit_user.get()