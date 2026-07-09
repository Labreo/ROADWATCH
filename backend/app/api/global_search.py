from typing import Optional
from fastapi import APIRouter, Query
from app.services.database import db

router = APIRouter()


@router.get("/roads/global-search")
async def global_road_search(
    q: str = Query(..., min_length=1),
    min_similarity: float = Query(0.2, ge=0, le=1),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Search for roads by name across ALL regions using pg_trgm similarity.
    Returns results grouped by region.
    """
    like_pattern = f"%{q}%"

    results = db.query(
        """
        SELECT r.id, r.name, r.road_code, r.status, r.length_km,
               r.authority_id, a.name AS authority_name,
               a.region_code, rgn.name AS region_name,
               similarity(r.name, ?) AS sim
        FROM roads r
        LEFT JOIN authorities a ON r.authority_id = a.id
        LEFT JOIN regions rgn ON a.region_code = rgn.code
        WHERE r.name ILIKE ?
           OR r.road_code ILIKE ?
           OR similarity(r.name, ?) > ?
        ORDER BY sim DESC, r.name ASC
        LIMIT ?
        """,
        (q, like_pattern, like_pattern, q, min_similarity, limit),
    )

    # Group by region
    grouped = {}
    for road in results:
        rc = road.get("region_code") or "IN"
        if rc not in grouped:
            grouped[rc] = {
                "region_code": rc,
                "region_name": road.get("region_name") or rc,
                "roads": [],
            }
        grouped[rc]["roads"].append(road)

    return {
        "query": q,
        "total": len(results),
        "results": list(grouped.values()),
    }


@router.get("/roads/{road_id}/cross-region-match")
async def cross_region_road_match(road_id: int):
    """
    Find roads with similar names or road_code patterns in other regions.
    """
    source = db.query(
        "SELECT r.*, a.region_code FROM roads r "
        "LEFT JOIN authorities a ON r.authority_id = a.id "
        "WHERE r.id = ?",
        (road_id,),
    )
    if not source:
        return {"road_id": road_id, "matches": []}

    source_road = source[0]
    source_region = source_road.get("region_code") or "IN"

    matches = []

    # Match by name similarity in other regions
    name_matches = db.query(
        """
        SELECT r.id, r.name, r.road_code, r.status, r.length_km,
               a.region_code, rgn.name AS region_name,
               similarity(r.name, ?) AS sim
        FROM roads r
        LEFT JOIN authorities a ON r.authority_id = a.id
        LEFT JOIN regions rgn ON a.region_code = rgn.code
        WHERE (a.region_code IS DISTINCT FROM ? OR a.region_code IS NULL)
          AND similarity(r.name, ?) > 0.2
        ORDER BY sim DESC
        LIMIT 10
        """,
        (source_road["name"], source_region, source_road["name"]),
    )

    for m in name_matches:
        matches.append({
            "matched_road_id": m["id"],
            "matched_road_name": m["name"],
            "matched_road_code": m.get("road_code"),
            "region_code": m.get("region_code") or "IN",
            "region_name": m.get("region_name") or m.get("region_code") or "IN",
            "similarity": float(m["sim"]) if m.get("sim") is not None else 0.0,
            "match_type": "name_similarity",
        })

    # Match by road_code prefix pattern (e.g., "NH-" matches "NH-8" and "NH-4")
    if source_road.get("road_code"):
        code_prefix = source_road["road_code"].split("-")[0] if "-" in source_road["road_code"] else source_road["road_code"]
        code_matches = db.query(
            """
            SELECT r.id, r.name, r.road_code, r.status,
                   a.region_code, rgn.name AS region_name
            FROM roads r
            LEFT JOIN authorities a ON r.authority_id = a.id
            LEFT JOIN regions rgn ON a.region_code = rgn.code
            WHERE r.road_code LIKE ? || '-%'
              AND r.id != ?
              AND (a.region_code IS DISTINCT FROM ? OR a.region_code IS NULL)
            ORDER BY r.road_code
            LIMIT 10
            """,
            (code_prefix, road_id, source_region),
        )

        for m in code_matches:
            if not any(x["matched_road_id"] == m["id"] for x in matches):
                matches.append({
                    "matched_road_id": m["id"],
                    "matched_road_name": m["name"],
                    "matched_road_code": m.get("road_code"),
                    "region_code": m.get("region_code") or "IN",
                    "region_name": m.get("region_name") or m.get("region_code") or "IN",
                    "similarity": 0.0,
                    "match_type": "road_code_analogy",
                })

    return {
        "source_road_id": road_id,
        "source_road_name": source_road["name"],
        "source_region": source_region,
        "matches": matches,
    }
