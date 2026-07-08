"""Pydantic-based data validation models for ROADWATCH write endpoints.

Provides reusable enums, status transition maps, geometry validators,
mixin classes, and concrete validated payload models.
"""

from enum import Enum
from datetime import date
from typing import Any, Dict, Optional, Set

from pydantic import BaseModel, Field, field_validator, model_validator


# ── Enums ──────────────────────────────────────────────────────────────────

class ComplaintCategory(str, Enum):
    POTHOLE = "pothole"
    PAVING_DEFECT = "paving_defect"
    WATERLOGGING = "waterlogging"
    DEBRIS = "debris"
    MISSING_SIGNAGE = "missing_signage"


class ComplaintStatus(str, Enum):
    PENDING = "pending"
    ROUTED = "routed"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class ProjectStatus(str, Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    HALTED = "halted"
    CANCELLED = "cancelled"


class RoadStatus(str, Enum):
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    UNDER_CONSTRUCTION = "under_construction"


# ── Status Transition Maps ─────────────────────────────────────────────────

COMPLAINT_STATUS_TRANSITIONS: Dict[ComplaintStatus, Set[ComplaintStatus]] = {
    ComplaintStatus.PENDING: {ComplaintStatus.ROUTED, ComplaintStatus.REJECTED},
    ComplaintStatus.ROUTED: {ComplaintStatus.IN_PROGRESS, ComplaintStatus.REJECTED},
    ComplaintStatus.IN_PROGRESS: {ComplaintStatus.RESOLVED, ComplaintStatus.REJECTED},
    ComplaintStatus.RESOLVED: set(),
    ComplaintStatus.REJECTED: set(),
}

PROJECT_STATUS_TRANSITIONS: Dict[ProjectStatus, Set[ProjectStatus]] = {
    ProjectStatus.PLANNED: {ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED},
    ProjectStatus.IN_PROGRESS: {ProjectStatus.COMPLETED, ProjectStatus.HALTED, ProjectStatus.CANCELLED},
    ProjectStatus.HALTED: {ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED},
    ProjectStatus.COMPLETED: set(),
    ProjectStatus.CANCELLED: set(),
}


# ── Geometry Validators ────────────────────────────────────────────────────

LAT_MIN, LAT_MAX = -90.0, 90.0
LON_MIN, LON_MAX = -180.0, 180.0


def validate_latitude(v: float) -> float:
    if not (LAT_MIN <= v <= LAT_MAX):
        raise ValueError(f"Latitude must be between {LAT_MIN} and {LAT_MAX}, got {v}")
    return v


def validate_longitude(v: float) -> float:
    if not (LON_MIN <= v <= LON_MAX):
        raise ValueError(f"Longitude must be between {LON_MIN} and {LON_MAX}, got {v}")
    return v


# ── Standalone status-transition validator ────────────────────────────────

def validate_status_transition(
    current_status: str,
    new_status: str,
    transition_map: Dict[Enum, Set[Enum]],
) -> None:
    """Raise ValueError if *new_status* is not reachable from *current_status*."""
    current = current_status.lower()
    new = new_status.lower()

    try:
        current_enum = next(e for e in transition_map if e.value == current)
    except StopIteration:
        raise ValueError(f"Unknown current status: {current_status}")

    try:
        new_enum = next(e for e in transition_map if e.value == new)
    except StopIteration:
        raise ValueError(f"Unknown target status: {new_status}")

    allowed = transition_map.get(current_enum, set())
    if new_enum not in allowed:
        raise ValueError(
            f"Invalid status transition: {current_status.upper()} → "
            f"{new_status.upper()}. Allowed: "
            f"{', '.join(s.value.upper() for s in allowed) if allowed else 'NONE'}"
        )


# ── Mixins ─────────────────────────────────────────────────────────────────


class GeoPointMixin(BaseModel):
    """Validate a GeoJSON Point geometry field named ``geometry``."""

    @field_validator("geometry", check_fields=False)
    @classmethod
    def check_geojson_point(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(v, dict):
            raise ValueError("geometry must be a GeoJSON object")
        if v.get("type") != "Point":
            raise ValueError('Geometry type must be "Point"')
        coords = v.get("coordinates")
        if not isinstance(coords, (list, tuple)) or len(coords) < 2:
            raise ValueError("Point coordinates must have at least 2 elements")
        lon, lat = float(coords[0]), float(coords[1])
        validate_longitude(lon)
        validate_latitude(lat)
        return v


class BudgetRangeMixin(BaseModel):
    """Validate budget fields on project-like payloads."""

    budget_allocated: float
    budget_spent: float = 0.0

    @field_validator("budget_allocated", check_fields=False)
    @classmethod
    def budget_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("budget_allocated must be greater than 0")
        return v

    @model_validator(mode="after")
    def check_budget_spent(self) -> "BudgetRangeMixin":
        if self.budget_spent < 0:
            raise ValueError("budget_spent cannot be negative")
        max_allowed = self.budget_allocated * 1.5
        if self.budget_spent > max_allowed:
            raise ValueError(
                f"budget_spent ({self.budget_spent}) exceeds 150 % of "
                f"budget_allocated ({self.budget_allocated})"
            )
        return self


class ContractorRatingMixin(BaseModel):
    """Validate contractor rating (0.00 – 5.00)."""

    rating: float = 5.00

    @field_validator("rating", check_fields=False)
    @classmethod
    def rating_in_range(cls, v: float) -> float:
        if not (0.00 <= v <= 5.00):
            raise ValueError("Rating must be between 0.00 and 5.00")
        return round(v, 2)


# ── Concrete Validated Models ─────────────────────────────────────────────


class ValidatedComplaintPayload(GeoPointMixin):
    """Validated complaint creation/update payload."""

    id: Optional[int] = None
    clientTempId: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    category: ComplaintCategory
    geometry: Dict[str, Any]
    status: ComplaintStatus = ComplaintStatus.PENDING
    assignedAuthorityId: Optional[int] = None
    roadId: Optional[int] = None
    createdAt: Optional[str] = None
    imageUrl: Optional[str] = None
    imagePreview: Optional[str] = None

    @field_validator("title", "description")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        return v.strip()


class ValidatedProjectPayload(BudgetRangeMixin):
    """Validated project creation/update payload."""

    id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=255)
    road_id: int
    contractor_id: int
    authority_id: int
    budget_allocated: float
    budget_spent: Optional[float] = 0.0
    status: ProjectStatus = ProjectStatus.PLANNED
    start_date: date
    target_end_date: date
    actual_end_date: Optional[date] = None

    @model_validator(mode="after")
    def check_dates(self) -> "ValidatedProjectPayload":
        if self.target_end_date < self.start_date:
            raise ValueError("target_end_date must be on or after start_date")
        if self.actual_end_date is not None and self.actual_end_date < self.start_date:
            raise ValueError("actual_end_date must be on or after start_date")
        return self


class ValidatedContractorPayload(ContractorRatingMixin):
    """Validated contractor payload."""

    id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=255)
    license_number: str = Field(..., min_length=1)
    registration_date: date
    contact_email: str
    contact_phone: Optional[str] = None
    rating: float = 5.00
    projects_completed: int = Field(default=0, ge=0)
    projects_delayed: int = Field(default=0, ge=0)
    blacklisted: bool = False
    blacklisted_reason: Optional[str] = None


class FundSourcePayload(BaseModel):
    """Validated fund source allocation payload."""

    id: Optional[int] = None
    source_name: str = Field(..., min_length=1, max_length=100)
    amount: float = Field(..., gt=0)

    @field_validator("source_name")
    @classmethod
    def valid_source_name(cls, v: str) -> str:
        allowed = {
            "Central Road Infrastructure Fund",
            "State PWD Capital Tiers",
            "Municipal General Portfolios",
            "Taxpayer Distribution Ratios",
            "Central Road Fund",
            "State PWD Allocations",
            "Municipal General Tier",
            "International Multilateral Loans",
        }
        if v not in allowed:
            raise ValueError(f"Invalid fund source. Allowed: {', '.join(sorted(allowed))}")
        return v


class ValidatedVariancePayload(BaseModel):
    """Validated budget variance reason payload."""

    id: Optional[int] = None
    original_budget: Optional[float] = None  # set by server from project
    revised_budget: Optional[float] = None
    variance_amount: float = Field(...)
    variance_pct: Optional[float] = None
    reason: str = Field(..., min_length=1)
    approved_by: Optional[str] = None
    approval_date: Optional[date] = None
    approval_document_url: Optional[str] = None

    @model_validator(mode="after")
    def check_consistency(self) -> "ValidatedVariancePayload":
        if self.revised_budget is not None and self.original_budget is not None:
            expected_variance = self.revised_budget - self.original_budget
            if abs(expected_variance - self.variance_amount) > 0.01:
                raise ValueError(
                    f"variance_amount ({self.variance_amount}) does not match "
                    f"revised_budget - original_budget ({expected_variance})"
                )
        return self


class ValidatedMilestonePayload(BaseModel):
    """Validated project milestone payload."""

    id: Optional[int] = None
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    amount: float = Field(..., ge=0)
    status: str = "pending"
    due_date: Optional[date] = None
    completion_date: Optional[date] = None
    verified_by: Optional[str] = None
    payment_release_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        allowed = {"pending", "in_progress", "completed", "cancelled"}
        if v.lower() not in allowed:
            raise ValueError(f"Invalid milestone status. Allowed: {', '.join(sorted(allowed))}")
        return v.lower()

    @model_validator(mode="after")
    def check_dates(self) -> "ValidatedMilestonePayload":
        if self.completion_date is not None and self.due_date is not None:
            if self.completion_date < self.due_date:
                raise ValueError("completion_date must be on or after due_date")
        return self


class ValidatedContingencyPayload(BaseModel):
    """Validated contingency reserve payload."""

    id: Optional[int] = None
    allocated_amount: float = Field(..., gt=0)
    utilized_amount: float = Field(default=0.0, ge=0)
    status: str = "available"
    approval_required: bool = True
    release_notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        allowed = {"available", "partially_utilized", "fully_utilized", "exhausted"}
        if v.lower() not in allowed:
            raise ValueError(f"Invalid contingency status. Allowed: {', '.join(sorted(allowed))}")
        return v.lower()

    @model_validator(mode="after")
    def check_utilized(self) -> "ValidatedContingencyPayload":
        if self.utilized_amount > self.allocated_amount:
            raise ValueError(
                f"utilized_amount ({self.utilized_amount}) exceeds "
                f"allocated_amount ({self.allocated_amount})"
            )
        # Auto-compute status
        if self.utilized_amount == 0:
            self.status = "available"
        elif self.utilized_amount >= self.allocated_amount:
            self.status = "exhausted"
        elif self.utilized_amount > 0:
            self.status = "partially_utilized"
        return self


class ValidatedApprovalPayload(BaseModel):
    """Validated approval record payload."""

    id: Optional[int] = None
    entity_type: str = Field(..., min_length=1)
    entity_id: int = Field(..., gt=0)
    action: str = Field(..., min_length=1)
    requested_by: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    status: str = "pending"
    comments: Optional[str] = None

    @field_validator("entity_type")
    @classmethod
    def valid_entity_type(cls, v: str) -> str:
        allowed = {"variance", "contingency", "milestone", "project"}
        if v.lower() not in allowed:
            raise ValueError(f"Invalid entity_type. Allowed: {', '.join(sorted(allowed))}")
        return v.lower()

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        allowed = {"pending", "approved", "rejected"}
        if v.lower() not in allowed:
            raise ValueError(f"Invalid approval status. Allowed: {', '.join(sorted(allowed))}")
        return v.lower()