"""
Demo / play endpoint for scripted 5-minute live demo scenarios.
Returns NDJSON streaming responses that hit all 5 judging criteria.
"""

import json
import asyncio
import random
from typing import Optional, AsyncIterator

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/v1/demo", tags=["demo"])


class ScenarioStep(BaseModel):
    """One message exchange in a demo scenario."""
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str
    citations: list[dict] = Field(default_factory=list)
    suggested_actions: list[dict] = Field(default_factory=list)
    evidence: list[dict] = Field(default_factory=list)
    suggested_prompts: list[str] = Field(default_factory=list)


class Scenario(BaseModel):
    """Full demo scenario with metadata."""
    id: str
    title: str
    subtitle: str
    description: str
    criteria: list[int]
    duration: str
    steps: list[ScenarioStep]


# ─── Scenario A: Recurring Failure Root Cause + Contractor Accountability ───
SCENARIO_A = Scenario(
    id="scenario-a",
    title="Why Did S.V. Road Fail?",
    subtitle="Recurring Failure Root Cause + Contractor Accountability",
    description="Covers root cause diagnostics (sub-base compaction, utility trenching overlap), contractor defect liability, and watchlist enforcement. Covers judging criteria 1 & 3.",
    criteria=[1, 3],
    duration="~90s",
    steps=[
        ScenarioStep(
            role="user",
            content="Why is S.V. Road damaged again? It was just repaired last year.",
        ),
        ScenarioStep(
            role="assistant",
            content=(
                "S.V. Road (Santacruz to Bandra) scored a **health index of 32/100**"
                " — the lowest in Ward H-West. Root cause analysis reveals three compounding failures:\n\n"
                "- **Sub-base compaction at only 62%** (minimum 80% required for arterial roads)."
                " Core boring logs from March 2026 confirm the granular sub-base layer never reached design density.\n"
                "- **Overlapping utility trenching** — Between Oct 2025 and Feb 2026, three separate agencies"
                " (telecom, sewer, water main) excavated the same carriageway. None performed certified reinstatement.\n"
                "- **Asphalt binder substitution** — Chemical chromatography of binder samples shows standard"
                " commercial grade (VG-10) was used instead of the specified polymer-modified binder (PMB-40).\n\n"
                "Contractor **Omega Infrastructure Ltd.** completed this work under tender BMC-RD-2025-0092"
                " (₹4.8 Cr). The **3-year defect liability period is still active**, meaning Omega is legally"
                " bound to relay the full segment at zero additional cost. However, Omega has since been"
                " **blacklisted** (Order BMC-VIG-2026/A-41) and cannot bid on new municipal tenders."
            ),
            citations=[
                {"type": "road", "id": 1, "name": "S.V. Road (Santacruz to Bandra)", "code": "SVR-LD01", "status": "poor", "length": 4.8},
                {"type": "contractor", "id": 3, "name": "Omega Infrastructure Ltd.", "rating": 1.85, "blacklisted": True},
            ],
            suggested_actions=[
                {"type": "navigate_to_road", "target_id": 1, "label": "View S.V. Road on Map"},
                {"type": "navigate_to_contractor", "target_id": 3, "label": "View Omega Blacklist Record"},
                {"type": "report_complaint_on_road", "target_id": 1, "label": "File Official Complaint"},
            ],
            evidence=[
                {
                    "title": "Sub-Base Compaction Deficit",
                    "items": [
                        "Compression index: 62% (Required: >80%)",
                        "Asphalt binder density: 1.8 g/cm³ (Required: 2.3 g/cm³)",
                        "Water absorption: 8.5% (Excessive — indicates void ratio >12%)",
                    ],
                },
                {
                    "title": "Utility Excavation Timeline (6-month window)",
                    "items": [
                        "Telecom cable trenching — Oct 2025 (no compaction test on record)",
                        "Sewer repair excavation — Dec 2025",
                        "Water main leak repair — Feb 2026",
                    ],
                },
                {
                    "title": "Defect Liability Enforcement",
                    "items": [
                        "Tender BMC-RD-2025-0092: 3-Year DLP active until Oct 2028",
                        "Contractor must relay at own cost; BMC penalty clause: 2% / month of delay",
                        "BMC Vigilance Reference: BMC-VIG-2026/A-41",
                    ],
                },
            ],
            suggested_prompts=[
                "How much money was spent on S.V. Road?",
                "Show me the budget breakdown",
                "Who is financially liable for the repairs?",
            ],
        ),
    ],
)


# ─── Scenario B: Budget Transparency + Materials Fraud ───
SCENARIO_B = Scenario(
    id="scenario-b",
    title="Where Did the Money Go?",
    subtitle="Budget Transparency + Materials Fraud",
    description="Covers budget sanction vs. expenditure tracking, material substitution fraud, unapproved variance detection. Covers judging criteria 2 & 3.",
    criteria=[2, 3],
    duration="~80s",
    steps=[
        ScenarioStep(
            role="user",
            content="Show me the budget breakdown for S.V. Road. I want to see where the ₹4.8 Crores went.",
        ),
        ScenarioStep(
            role="assistant",
            content=(
                "Financial ledger for S.V. Road (Tender BMC-RD-2025-0092) shows"
                " **₹4,72,50,000 spent out of ₹4,80,00,000 sanctioned** — **98.4% utilization**."
                " However, the Road Accountability Division flagged an **unapproved variance of 14%**"
                " in material procurement costs.\n\n"
                "**Key discrepancy:** The tender specified polymer-modified bitumen binder (PMB-40)"
                " at ₹78,500/tonne, but procurement invoices show standard VG-10 binder at ₹49,200/tonne"
                " was billed at PMB-40 rates. Core sample chromatography from 7 test pits confirms"
                " VG-10 was used throughout. The difference of **₹29,300/tonne × 240 tonnes = ₹70,32,000**"
                " was invoiced for material not delivered.\n\n"
                "Contractor **Omega Infrastructure Ltd.** has been flagged for this substitution."
                " The Municipal Vigilance Commission has frozen the final milestone payment"
                " of ₹7,50,000 pending investigation.\n\n"
                "**Budget utilization by category:**\n"
                "- **Earthwork & sub-base:** ₹1,82,00,000 (38.5%)\n"
                "- **Bituminous layer:** ₹1,55,00,000 (32.8%) — **flagged**\n"
                "- **Drainage & utilities:** ₹78,50,000 (16.6%)\n"
                "- **Safety & markings:** ₹57,00,000 (12.1%)"
            ),
            citations=[
                {"type": "road", "id": 1, "name": "S.V. Road (Santacruz to Bandra)", "code": "SVR-LD01", "status": "poor", "length": 4.8},
                {"type": "contractor", "id": 3, "name": "Omega Infrastructure Ltd.", "rating": 1.85, "blacklisted": True},
            ],
            suggested_actions=[
                {"type": "navigate_to_road", "target_id": 1, "label": "View Budget Details"},
                {"type": "navigate_to_contractor", "target_id": 3, "label": "Audit Omega Invoices"},
            ],
            evidence=[
                {
                    "title": "Financial Transparency Audit",
                    "items": [
                        "Sanctioned Budget: ₹4,80,00,000",
                        "Total Spent: ₹4,72,50,000 (98.4%)",
                        "Unapproved Variance: 14% in materials category",
                        "Frozen milestone: ₹7,50,000 (pending investigation)",
                    ],
                },
                {
                    "title": "Material Substitution Fraud — Chromatography Results",
                    "items": [
                        "Specified: PMB-40 polymer-modified binder @ ₹78,500/tonne",
                        "Delivered: VG-10 commercial binder @ ₹49,200/tonne",
                        "Over-invoiced: ₹29,300/tonne × 240 tonnes = ₹70,32,000",
                        "Test pits with VG-10 confirmation: 7 of 7 (100%)",
                    ],
                },
                {
                    "title": "Vigilance Action",
                    "items": [
                        "Reference: BMC-VIG-2026/A-41",
                        "Omega blacklisted from new tenders (3 years)",
                        "Mandatory weekly third-party audits on active projects",
                    ],
                },
            ],
            suggested_prompts=[
                "Which contractors are blacklisted in Mumbai?",
                "What is the citywide budget utilization rate?",
                "Report a new road defect",
            ],
        ),
    ],
)


# ─── Scenario C: Citizen Complaint → Authority Routing → Contractor Dispatch ───
SCENARIO_C = Scenario(
    id="scenario-c",
    title="Report & Track a Hazard",
    subtitle="Citizen Complaint → Authority Routing → Contractor Dispatch",
    description="Covers end-to-end complaint lifecycle: offline-capable filing, geospatial authority matching, SLA-constrained routing to contractor dispatch with IoT validation. Covers judging criteria 4 & 5.",
    criteria=[4, 5],
    duration="~110s",
    steps=[
        ScenarioStep(
            role="user",
            content=(
                "I want to report a dangerous pothole on S.V. Road near Bandra station."
                " There's standing water and the road surface is caving in."
            ),
        ),
        ScenarioStep(
            role="assistant",
            content=(
                "Your report has been received and processed. Here is your **routing summary:**\n\n"
                "**Your Location** pinpoints the hazard at **S.V. Road, Bandra West** (19.0980°N, 72.8362°E).\n\n"
                "**Authority Match:** The system ran a geospatial boundary check using PostGIS ST_Contains."
                " Your report falls under **BMC Ward H-West, Roads & Traffic Department**,"
                " supervised by Executive Engineer Mr. R.K. Joshi.\n\n"
                "**Defect Classification:** The AI vision pipeline classifies this as a"
                " **Class 1 structural failure** (subsidence >50mm with standing water)"
                " — priority escalation level **P1 (Critical)**.\n\n"
                "**SLA Response:** Under BMC Accountability Ordinance 2025, Class 1 defects require"
                " contractor mobilization within **4 hours** and permanent repair within **48 hours**."
                " A 48-hour SLA clock has started.\n\n"
                "**Auto-Dispatch:** The system has dispatched **Zenith Construction Ltd.**"
                " (rating: 4.2/5) under work order **WO-HW-2026-4482**."
                " Their repair crew GPS tracker is active and ETA is **25 minutes**.\n\n"
                "**Your Grievance Ticket #RW-2026-8899** has been created."
                " You will receive SMS updates at each milestone."
            ),
            citations=[
                {"type": "road", "id": 1, "name": "S.V. Road (Santacruz to Bandra)", "code": "SVR-LD01", "status": "poor", "length": 4.8},
                {"type": "contractor", "id": 1, "name": "Zenith Construction Ltd.", "rating": 4.2, "blacklisted": False},
                {"type": "authority", "id": 1, "name": "Brihanmumbai Municipal Corporation (BMC)", "code": "BMC-HWEST"},
            ],
            suggested_actions=[
                {"type": "navigate_to_road", "target_id": 1, "label": "View Hazard on Map"},
                {"type": "report_complaint_on_road", "target_id": 1, "label": "Submit Photo Evidence"},
            ],
            evidence=[
                {
                    "title": "Citizen Report Telemetry",
                    "items": [
                        "Report ID: RW-2026-8899",
                        "Location: 19.0980°N, 72.8362°E (S.V. Road, Bandra West)",
                        "Classification: Class 1 — Structural Failure (subsidence >50mm)",
                        "Priority: P1 (Critical) | SLA: 48-hour repair clock",
                    ],
                },
                {
                    "title": "Authority & Dispatch Chain",
                    "items": [
                        "Matched Authority: BMC Ward H-West (via PostGIS ST_Contains)",
                        "Executive Engineer: Mr. R.K. Joshi — ee.roads.hw@mcgm.gov.in",
                        "Dispatched Contractor: Zenith Construction Ltd. (Rating: 4.2/5)",
                        "Work Order: WO-HW-2026-4482 | Crew ETA: 25 min",
                    ],
                },
                {
                    "title": "Offline Resilience",
                    "items": [
                        "Report was queued locally (IndexedDB) with compressed photo <500KB",
                        "Background Sync auto-submitted when connectivity restored",
                        "Reconciliation ID matches server record",
                    ],
                },
            ],
            suggested_prompts=[
                "Track my complaint status",
                "Show me the repair work order",
                "View SLA compliance for Ward H-West",
            ],
        ),
    ],
)


SCENARIOS = {
    s.id: s for s in [SCENARIO_A, SCENARIO_B, SCENARIO_C]
}


async def stream_ndjson(scenario: Scenario) -> AsyncIterator[str]:
    """Stream scenario steps as NDJSON with realistic typing delays."""
    for step in scenario.steps:
        if step.role == "user":
            # User message — emit as a single event
            yield json.dumps({"type": "user", "content": step.content}) + "\n"
            await asyncio.sleep(0.3)
        else:
            # Assistant response — stream word-by-word, then emit metadata
            words = step.content.split(" ")
            current = ""
            for i, word in enumerate(words):
                current += (" " if i > 0 else "") + word
                yield json.dumps({
                    "type": "content",
                    "content": word + (" " if i < len(words) - 1 else ""),
                    "full_response": current,
                }) + "\n"
                # Realistic typing: short words faster, long words slower
                delay = max(0.008, min(0.045, len(word) * 0.003))
                await asyncio.sleep(delay + random.uniform(-0.003, 0.003))

            # Emit metadata block
            meta = {
                "type": "metadata",
                "citations": [dict(c) for c in step.citations],
                "suggested_actions": [dict(a) for a in step.suggested_actions],
                "suggested_prompts": step.suggested_prompts,
            }
            if step.evidence:
                meta["evidence"] = [dict(e) for e in step.evidence]
            yield json.dumps(meta) + "\n"

    # Done signal
    yield json.dumps({"type": "done", "scenario_id": scenario.id}) + "\n"


@router.get("/scenarios")
async def list_scenarios():
    """Return metadata for all available demo scenarios."""
    return {
        "scenarios": [
            {
                "id": s.id,
                "title": s.title,
                "subtitle": s.subtitle,
                "description": s.description,
                "criteria": s.criteria,
                "duration": s.duration,
            }
            for s in SCENARIOS.values()
        ]
    }


@router.get("/play")
async def play_scenario(
    scenario_id: str = Query("scenario-a", description="Scenario ID to play"),
    speed: float = Query(1.0, description="Playback speed multiplier (0.5-3.0)"),
):
    """
    Play a scripted demo scenario as NDJSON stream.

    Each step is streamed as:
      {"type":"user","content":"..."}
      {"type":"content","content":"word ","full_response":"..."}
      {"type":"metadata","citations":[...],"suggested_actions":[...],"suggested_prompts":[...],"evidence":[...]}
      {"type":"done","scenario_id":"..."}
    """
    scenario = SCENARIOS.get(scenario_id)
    if not scenario:
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=404,
            content={"error": f"Scenario '{scenario_id}' not found. Available: {list(SCENARIOS.keys())}"},
        )

    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        stream_ndjson(scenario),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "X-Content-Type-Options": "nosniff",
        },
    )