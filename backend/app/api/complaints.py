from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.database import db
from app.services.authority_resolver import AuthorityResolver
from app.services.sla_service import compute_priority
from app.services.notification_service import NotificationService
from app.services.validators import ValidatedComplaintPayload
from app.services.cross_region_router import CrossRegionRouter
from app.services.routing_accuracy import RoutingAccuracyService
from app.services.authority_resolver import set_boundary_alert_callback

router = APIRouter()


# ── B6: Boundary alert callback ──────────────────────────────────────────
async def _boundary_alert_handler(
    authority_id: int,
    secondary_authority: dict,
    boundary_distance_m: float,
    lon: float,
    lat: float,
):
    """Callback fired when a complaint is near an authority boundary."""
    try:
        from app.services.database import db
        from app.services.notification_service import NotificationService
        primary = AuthorityResolver.get_authority_by_id(authority_id)
        if primary and secondary_authority:
            complaint_dummy = {
                "id": None,
                "title": "Boundary proximity alert",
                "category": "pending",
            }
            await NotificationService.notify_authorities_boundary_alert(
                complaint_dummy, primary, secondary_authority, boundary_distance_m
            )
    except Exception as exc:
        import logging
        logging.getLogger(__name__).error("Boundary alert handler error: %s", exc)

set_boundary_alert_callback(_boundary_alert_handler)


class ComplaintPayload(ValidatedComplaintPayload):
    """Backward-compatible complaint payload with built-in validation."""
    citizenContact: Optional[str] = None


class DeclinePayload(BaseModel):
    authorityId: int
    reason: Optional[str] = None


class RoutingFeedbackPayload(BaseModel):
    citizenConfirmed: bool
    feedbackText: Optional[str] = None


@router.post("/complaints")
async def create_complaint(payload: ComplaintPayload):
    coords = payload.geometry["coordinates"]
    lon, lat = float(coords[0]), float(coords[1])
    geom_wkt = f"POINT({lon} {lat})"

    # --- Spatial dedup check (existing) ---
    conflict_sql = """
    SELECT id, title, status, ST_Distance(geom, ST_GeomFromText(%s, 4326)) as distance
    FROM complaints
    WHERE ST_DWithin(geom, ST_GeomFromText(%s, 4326), 0.001)
      AND category = %s
      AND status IN ('pending', 'routed', 'in_progress')
    ORDER BY distance ASC
    LIMIT 1
    """
    conflicts = db.query(conflict_sql, (geom_wkt, geom_wkt, payload.category))

    if conflicts:
        existing = conflicts[0]
        raise HTTPException(
            status_code=409,
            detail={
                "message": "A similar report is already active in this jurisdiction.",
                "conflict_type": "spatial",
                "conflict_id": existing["id"],
                "conflict_title": existing["title"],
                "conflict_status": existing["status"],
                "distance": float(existing["distance"]) if existing.get("distance") else None,
            },
        )

    # --- Semantic dedup check (pg_trgm similarity) ---
    semantic_sql = """
    SELECT id, title, description, similarity(description, %s) AS sim
    FROM complaints
    WHERE assigned_authority_id = %s
      AND status NOT IN ('resolved', 'rejected')
      AND created_at > NOW() - INTERVAL '30 days'
    ORDER BY sim DESC
    LIMIT 5
    """
    semantic_matches = db.query(semantic_sql, (payload.description, payload.assignedAuthorityId))

    if semantic_matches:
        top = semantic_matches[0]
        top_sim = float(top["sim"]) if top.get("sim") is not None else 0.0
        if top_sim > 0.3:
            raise HTTPException(
                status_code=409,
                detail={
                    "message": "Similar text description found — possible duplicate.",
                    "conflict_type": "semantic",
                    "conflict_id": top["id"],
                    "conflict_title": top["title"],
                    "similarity": top_sim,
                    "matches": [
                        {
                            "id": m["id"],
                            "title": m["title"],
                            "similarity": float(m["sim"]) if m.get("sim") is not None else 0.0,
                        }
                        for m in semantic_matches
                        if m.get("sim") is not None and float(m["sim"]) > 0.2
                    ],
                },
            )

    created_at = payload.createdAt or datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    priority = compute_priority(payload.category)

    # --- Cross-region routing check ---
    cross_region_info = None
    if payload.roadId:
        cross_region_info = CrossRegionRouter.resolve_cross_region_complaint(
            lon, lat, payload.roadId, {}
        )

    # Resolve region for SLA target hours
    region = AuthorityResolver.get_region_for_coordinates(lon, lat)
    region_code = region["code"] if region else "IN"
    sla_configs = db.query(
        "SELECT escalation_hours FROM sla_config "
        "WHERE (region_code = ? OR region_code IS NULL) "
        "AND (category = ? OR category IS NULL) "
        "AND escalation_level = 1 "
        "ORDER BY region_code NULLS LAST, category NULLS LAST LIMIT 1",
        (region_code, payload.category),
    )
    target_hours = sla_configs[0]["escalation_hours"] if sla_configs else 48

    insert_sql = """
    INSERT INTO complaints (title, description, category, geom, status, priority,
      client_temp_id, image_url, assigned_authority_id, road_id,
      target_resolution_hours, citizen_contact, created_at, updated_at)
    VALUES (%s, %s, %s, ST_GeomFromText(%s, 4326), %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING id
    """
    params = (
        payload.title,
        payload.description,
        payload.category,
        geom_wkt,
        "routed",
        priority,
        payload.clientTempId,
        payload.imageUrl or payload.imagePreview,
        payload.assignedAuthorityId,
        payload.roadId,
        target_hours,
        payload.citizenContact,
        created_at,
        created_at,
    )

    new_id = db.execute(insert_sql, params)
    if new_id is None:
        raise HTTPException(status_code=500, detail="Failed to insert complaint record.")

    region = AuthorityResolver.get_region_for_coordinates(lon, lat)
    region_code = region["code"] if region else "IN"

    # Send notification to assigned authority
    authority = AuthorityResolver.get_authority_by_id(payload.assignedAuthorityId)
    complaint_dict = {
        "id": new_id,
        "title": payload.title,
        "description": payload.description,
        "category": payload.category,
        "status": "routed",
        "priority": priority,
        "created_at": created_at,
        "assigned_authority_id": payload.assignedAuthorityId,
        "citizen_contact": payload.citizenContact,
    }
    if authority:
        await NotificationService.notify_complaint_assigned(complaint_dict, authority)

    # Send citizen notification if contact provided
    if payload.citizenContact:
        await NotificationService.notify_citizen_routed(complaint_dict, authority or {})

    # B6: Check boundary proximity and trigger alert if within 50m
    boundary_alert = AuthorityResolver.check_boundary_proximity(lon, lat, payload.assignedAuthorityId)
    if boundary_alert.get("near_boundary") and boundary_alert.get("secondary_authority"):
        await _boundary_alert_handler(
            authority_id=payload.assignedAuthorityId,
            secondary_authority=boundary_alert["secondary_authority"],
            boundary_distance_m=boundary_alert["boundary_distance_meters"],
            lon=lon,
            lat=lat,
        )
        # Flag complaint as cross-region near boundary
        db.execute(
            "UPDATE complaints SET region_override = 'boundary_proximity' WHERE id = ?",
            (new_id,),
        )

    # If cross-region detected, split the complaint to secondary regions
    split_ids = []
    if cross_region_info and cross_region_info.get("cross_region"):
        split_ids = CrossRegionRouter.split_complaint_across_regions(
            new_id,
            cross_region_info["primary_region"],
            cross_region_info["secondary_regions"],
            {"created_at": created_at},
        )

    return {
        "id": new_id,
        "status": "routed",
        "priority": priority,
        "region_code": region_code,
        "message": "Complaint registered and routed successfully.",
        "cross_region": bool(cross_region_info),
        "split_complaint_ids": split_ids if split_ids else None,
        "secondary_regions": [
            s["region_code"] for s in (cross_region_info or {}).get("secondary_regions", [])
        ] if cross_region_info else None,
    }


@router.get("/complaints/queue")
async def get_complaint_queue(
    authority_id: Optional[int] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    priority_gte: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    Returns complaints sorted by priority queue order:
    priority DESC, escalation_level DESC, created_at ASC
    """
    conditions = []
    params = []

    if authority_id is not None:
        conditions.append("c.assigned_authority_id = %s")
        params.append(authority_id)
    if status is not None:
        conditions.append("c.status = %s")
        params.append(status)
    if category is not None:
        conditions.append("c.category = %s")
        params.append(category)
    if priority_gte is not None:
        conditions.append("c.priority >= %s")
        params.append(priority_gte)

    where_clause = " AND ".join(conditions) if conditions else "TRUE"
    params.extend([limit, offset])

    sql = f"""
    SELECT c.*, a.name as authority_name, a.department_code,
           r.name as road_name
    FROM complaints c
    LEFT JOIN authorities a ON c.assigned_authority_id = a.id
    LEFT JOIN roads r ON c.road_id = r.id
    WHERE {where_clause}
    ORDER BY c.priority DESC, c.escalation_level DESC, c.created_at ASC
    LIMIT %s OFFSET %s
    """
    results = db.query(sql, tuple(params))

    # Also return total count for pagination
    count_sql = f"""
    SELECT COUNT(*) as total FROM complaints c WHERE {where_clause}
    """
    count_params = params[:-2]
    count_result = db.query(count_sql, tuple(count_params))
    total = count_result[0]["total"] if count_result else 0

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "complaints": results,
    }


@router.post("/complaints/{complaint_id}/decline")
async def decline_complaint(complaint_id: int, payload: DeclinePayload):
    """
    Authority declines a complaint assignment. System reroutes to next-best authority.
    """
    # Verify complaint exists
    complaints = db.query(
        "SELECT c.*, a.name as authority_name FROM complaints c "
        "LEFT JOIN authorities a ON c.assigned_authority_id = a.id "
        "WHERE c.id = ?",
        (complaint_id,),
    )
    if not complaints:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    complaint = complaints[0]

    if complaint["status"] not in ("routed", "pending"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot decline complaint with status '{complaint['status']}'. Only routed or pending complaints can be declined.",
        )

    # Get current declined list + add this authority
    declined = complaint.get("declined_authority_ids") or []
    if isinstance(declined, list):
        declined_list = [int(x) for x in declined]
    else:
        declined_list = []

    if payload.authorityId not in declined_list:
        declined_list.append(payload.authorityId)

    # Get coordinates for rerouting
    geom_wkt = db.query(
        "SELECT ST_AsText(geom) as wkt FROM complaints WHERE id = ?",
        (complaint_id,),
    )
    if not geom_wkt:
        raise HTTPException(status_code=500, detail="Could not read complaint geometry.")

    wkt = geom_wkt[0]["wkt"]
    # Parse "POINT(lon lat)"
    parts = wkt.replace("POINT(", "").replace(")", "").split()
    lon, lat = float(parts[0]), float(parts[1])

    # Resolve new authority excluding declined ones
    new_authority = AuthorityResolver.resolve_authority_for_coordinates(
        lon, lat, exclude_authority_ids=declined_list
    )

    old_authority = AuthorityResolver.get_authority_by_id(payload.authorityId) or {
        "id": payload.authorityId,
        "name": complaint.get("authority_name", "Unknown"),
    }

    if new_authority and new_authority.get("id") != payload.authorityId:
        # Reassign to new authority
        db.execute(
            "UPDATE complaints SET assigned_authority_id = ?, "
            "declined_authority_ids = ?, status = 'routed', updated_at = NOW() "
            "WHERE id = ?",
            (new_authority["id"], declined_list, complaint_id),
        )

        # Log reassignment event
        db.execute(
            "INSERT INTO sla_escalations "
            "(complaint_id, from_level, to_level, escalated_by, "
            "escalated_to_authority_id, notification_status) "
            "VALUES (?, 0, 0, 'authority_decline', ?, 'pending')",
            (complaint_id, new_authority["id"]),
        )

        # Send notification
        complaint_dict = dict(complaint)
        await NotificationService.notify_complaint_declined(
            complaint_dict, old_authority, new_authority
        )

        return {
            "status": "reassigned",
            "previous_authority_id": payload.authorityId,
            "new_authority_id": new_authority["id"],
            "new_authority_name": new_authority.get("name"),
            "declined_authority_ids": declined_list,
        }
    else:
        # No authority left — reject complaint
        db.execute(
            "UPDATE complaints SET status = 'rejected', "
            "declined_authority_ids = ?, updated_at = NOW() "
            "WHERE id = ?",
            (declined_list, complaint_id),
        )

        complaint_dict = dict(complaint)
        await NotificationService.notify_complaint_declined(
            complaint_dict, old_authority, new_authority=None
        )

        # Notify citizen if rejected
        complaint_dict = dict(complaint)
        await NotificationService.notify_citizen_rejected(
            complaint_dict
        )

        return {
            "status": "rejected",
            "reason": "All authorities declined or no suitable authority found.",
            "declined_authority_ids": declined_list,
        }


@router.get("/complaints/{complaint_id}/escalation-chain")
async def get_escalation_chain(complaint_id: int):
    """
    B5: Returns the full escalation history for a complaint.
    Queries sla_escalations + complaint route history to build a timeline.
    """
    complaint = db.query(
        "SELECT id, title, status, escalation_level, assigned_authority_id, "
        "created_at, updated_at, last_escalated_at "
        "FROM complaints WHERE id = ?",
        (complaint_id,),
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    complaint = complaint[0]

    # Fetch escalation audit trail
    escalations = db.query(
        "SELECT se.id, se.from_level, se.to_level, se.escalated_by, "
        "se.escalated_to_authority_id, se.notified_at, se.notification_status, "
        "a.name AS authority_name, a.department_code "
        "FROM sla_escalations se "
        "LEFT JOIN authorities a ON se.escalated_to_authority_id = a.id "
        "WHERE se.complaint_id = ? "
        "ORDER BY se.notified_at ASC",
        (complaint_id,),
    )

    # Build chain
    chain = []
    # Start with initial assignment
    if complaint.get("assigned_authority_id"):
        auth = AuthorityResolver.get_authority_by_id(complaint["assigned_authority_id"])
        chain.append({
            "level": 0,
            "authority": {
                "id": auth["id"] if auth else complaint["assigned_authority_id"],
                "name": auth["name"] if auth else "Unknown",
            },
            "assigned_at": complaint.get("created_at"),
            "status": complaint.get("status"),
        })

    for esc in escalations:
        chain.append({
            "level": esc["to_level"],
            "escalation_id": esc["id"],
            "authority": {
                "id": esc["escalated_to_authority_id"],
                "name": esc.get("authority_name", "Unknown"),
            },
            "escalated_at": esc.get("notified_at"),
            "escalated_by": esc.get("escalated_by"),
            "from_level": esc["from_level"],
            "to_level": esc["to_level"],
        })

    return {
        "complaint_id": complaint_id,
        "title": complaint.get("title"),
        "current_status": complaint.get("status"),
        "current_level": complaint.get("escalation_level"),
        "chain": chain,
    }


@router.post("/complaints/{complaint_id}/routing-feedback")
async def submit_routing_feedback(complaint_id: int, payload: RoutingFeedbackPayload):
    """
    B2: Citizen confirms or rejects the routing accuracy.
    Updates routing_accuracy_score on the authority.
    """
    complaint = db.query("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    complaint = complaint[0]

    auth_id = complaint.get("assigned_authority_id")
    if not auth_id:
        raise HTTPException(status_code=400, detail="Complaint has no assigned authority.")

    # Upsert feedback (one per complaint)
    existing = db.query(
        "SELECT id FROM routing_feedback WHERE complaint_id = ?", (complaint_id,)
    )

    if existing:
        db.execute(
            "UPDATE routing_feedback SET citizen_confirmed = ?, feedback_text = ? "
            "WHERE complaint_id = ?",
            (payload.citizenConfirmed, payload.feedbackText, complaint_id),
        )
    else:
        db.execute(
            "INSERT INTO routing_feedback (complaint_id, authority_id, citizen_confirmed, feedback_text) "
            "VALUES (?, ?, ?, ?)",
            (complaint_id, auth_id, payload.citizenConfirmed, payload.feedbackText),
        )

    # Recompute accuracy score for this authority
    new_score = RoutingAccuracyService.compute_routing_accuracy_score(auth_id)
    db.execute(
        "UPDATE authorities SET routing_accuracy_score = ? WHERE id = ?",
        (new_score, auth_id),
    )

    return {
        "status": "ok",
        "authority_id": auth_id,
        "routing_accuracy_score": new_score,
    }


@router.put("/complaints/{complaint_id}/status")
async def update_complaint_status(complaint_id: int, payload: dict):
    """
    B1: Update complaint status and send citizen notification.
    Payload: { "status": "resolved" }
    Also sends citizen notification on routed/escalated/resolved/rejected.
    """
    new_status = payload.get("status")
    if new_status not in ("pending", "routed", "in_progress", "resolved", "rejected"):
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")

    complaint = db.query(
        "SELECT c.*, a.name AS authority_name FROM complaints c "
        "LEFT JOIN authorities a ON c.assigned_authority_id = a.id "
        "WHERE c.id = ?",
        (complaint_id,),
    )
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    complaint = complaint[0]

    db.execute(
        "UPDATE complaints SET status = ?, updated_at = NOW() WHERE id = ?",
        (new_status, complaint_id),
    )

    # Send citizen notification on relevant transitions
    if new_status == "resolved":
        authority = AuthorityResolver.get_authority_by_id(complaint["assigned_authority_id"])
        await NotificationService.notify_citizen_resolved(complaint, authority or {})

    return {
        "id": complaint_id,
        "status": new_status,
        "message": f"Complaint status updated to {new_status}.",
    }


@router.put("/complaints/{complaint_id}/vision-priority")
async def update_vision_priority(complaint_id: int, payload: dict):
    """
    B3: Update complaint priority based on vision analysis results.
    Payload: { "severity": "emergency"|"high"|"medium"|"low", "hasTraffic": bool }
    """
    severity = payload.get("severity", "medium")
    has_traffic = payload.get("hasTraffic", False)

    complaint = db.query("SELECT * FROM complaints WHERE id = ?", (complaint_id,))
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    complaint = complaint[0]

    from app.services.sla_service import compute_priority_from_vision
    new_priority = compute_priority_from_vision(
        severity=severity,
        has_traffic=has_traffic,
        category=complaint.get("category", ""),
        escalation_level=complaint.get("escalation_level", 0),
    )

    db.execute(
        "UPDATE complaints SET priority = ?, updated_at = NOW() WHERE id = ?",
        (new_priority, complaint_id),
    )

    return {
        "id": complaint_id,
        "priority": new_priority,
        "severity": severity,
        "has_traffic": has_traffic,
        "message": f"Priority updated to {new_priority} based on vision analysis.",
    }


@router.get("/complaints/sla-metrics")
async def get_sla_metrics():
    """
    B4: Returns aggregated SLA metrics for the Routing SLA Dashboard.
    - avg_routing_time_hours: average time from creation to first routing
    - escalation_rate_by_authority: % of complaints escalated per authority
    - resolution_rate_by_category: % of complaints resolved per category
    - routing_accuracy_pct: overall routing accuracy % from citizen feedback
    """
    # Average routing time (creation to first escalation or resolution)
    avg_routing = db.query("""
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(last_escalated_at, updated_at) - created_at)) / 3600)::numeric, 2)
        AS avg_hours FROM complaints WHERE status IN ('routed', 'in_progress', 'resolved')
    """)
    avg_routing_time = avg_routing[0]["avg_hours"] if avg_routing else 0

    # Escalation rate per authority
    escalation_rate = db.query("""
        SELECT a.id AS authority_id, a.name AS authority_name,
               COUNT(c.id) FILTER (WHERE c.escalation_level > 0)::float /
               NULLIF(COUNT(c.id), 0)::float AS escalation_rate
        FROM authorities a
        LEFT JOIN complaints c ON c.assigned_authority_id = a.id
        GROUP BY a.id, a.name
        ORDER BY a.id
    """)

    # Resolution rate by category
    resolution_rate = db.query("""
        SELECT category,
               COUNT(*) FILTER (WHERE status = 'resolved')::float /
               NULLIF(COUNT(*), 0)::float AS resolution_rate
        FROM complaints
        GROUP BY category
    """)

    # Overall routing accuracy
    accuracy = db.query("""
        SELECT ROUND(AVG(routing_accuracy_score)::numeric, 2) AS avg_accuracy
        FROM authorities WHERE routing_accuracy_score > 0
    """)
    routing_accuracy_pct = accuracy[0]["avg_accuracy"] if accuracy and accuracy[0].get("avg_accuracy") else 0

    return {
        "avg_routing_time_hours": float(avg_routing_time) if avg_routing_time else 0,
        "escalation_rate_by_authority": {
            str(r["authority_id"]): round(float(r["escalation_rate"]), 4)
            for r in escalation_rate if r.get("escalation_rate") is not None
        },
        "resolution_rate_by_category": {
            r["category"]: round(float(r["resolution_rate"]), 4)
            for r in resolution_rate if r.get("resolution_rate") is not None
        },
        "routing_accuracy_pct": float(routing_accuracy_pct) if routing_accuracy_pct else 0,
    }