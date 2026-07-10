from fastapi import APIRouter, HTTPException
from typing import Optional
from app.services.database import db

router = APIRouter()


@router.get("/procurement/tenders")
def list_tenders(
    authority_id: Optional[int] = None,
    status: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
):
    conditions = []
    params = []
    if authority_id is not None:
        conditions.append("t.authority_id = ?")
        params.append(authority_id)
    if status:
        conditions.append("t.status = ?")
        params.append(status)

    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    sql = f"""
    SELECT t.*, a.name AS authority_name, a.department_code AS authority_code,
           (SELECT COUNT(*) FROM tender_bids WHERE tender_id = t.id) AS bid_count
    FROM tenders t
    LEFT JOIN authorities a ON t.authority_id = a.id
    {where}
    ORDER BY t.published_date DESC NULLS LAST, t.created_at DESC
    LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    return db.query(sql, tuple(params))


@router.get("/procurement/tenders/{tender_id}")
def get_tender(tender_id: int):
    tenders = db.query(
        "SELECT t.*, a.name AS authority_name, a.department_code AS authority_code "
        "FROM tenders t "
        "LEFT JOIN authorities a ON t.authority_id = a.id "
        "WHERE t.id = ?",
        (tender_id,),
    )
    if not tenders:
        raise HTTPException(status_code=404, detail="Tender not found")
    return tenders[0]


@router.get("/procurement/tenders/{tender_id}/bids")
def get_tender_bids(tender_id: int):
    tender = db.query("SELECT id FROM tenders WHERE id = ?", (tender_id,))
    if not tender:
        raise HTTPException(status_code=404, detail="Tender not found")

    bids = db.query(
        "SELECT tb.*, c.name AS contractor_name, c.license_number AS contractor_license, "
        "c.rating AS contractor_rating, c.blacklisted AS contractor_blacklisted "
        "FROM tender_bids tb "
        "LEFT JOIN contractors c ON tb.contractor_id = c.id "
        "WHERE tb.tender_id = ? "
        "ORDER BY tb.weighted_total DESC NULLS LAST",
        (tender_id,),
    )
    criteria = db.query(
        "SELECT * FROM evaluation_criteria WHERE tender_id = ? ORDER BY weight_pct DESC",
        (tender_id,),
    )
    return {"tender_id": tender_id, "bids": bids, "evaluation_criteria": criteria}


@router.get("/procurement/contractors/{contractor_id}/bids")
def get_contractor_bids(contractor_id: int):
    return db.query(
        "SELECT tb.*, t.reference_no, t.title AS tender_title, t.status AS tender_status, "
        "t.estimated_value, a.name AS authority_name "
        "FROM tender_bids tb "
        "JOIN tenders t ON tb.tender_id = t.id "
        "LEFT JOIN authorities a ON t.authority_id = a.id "
        "WHERE tb.contractor_id = ? "
        "ORDER BY t.published_date DESC NULLS LAST",
        (contractor_id,),
    )


@router.get("/procurement/roads/{road_id}")
def get_road_procurement(road_id: int):
    tenders = db.query(
        "SELECT t.*, a.name AS authority_name, "
        "(SELECT COUNT(*) FROM tender_bids WHERE tender_id = t.id) AS bid_count "
        "FROM tenders t "
        "LEFT JOIN authorities a ON t.authority_id = a.id "
        "LEFT JOIN projects p ON t.project_id = p.id "
        "WHERE p.road_id = ? "
        "ORDER BY t.published_date DESC NULLS LAST",
        (road_id,),
    )
    return {"road_id": road_id, "tenders": tenders}
