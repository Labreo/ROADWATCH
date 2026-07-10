"""
Transparency scoring engine — mirrors frontend logic server-side
so chat context includes transparency score, anomalies, deductions.
"""
from app.services.road_retriever import StructuredRoadRetriever
from app.services.database import db


def calculate_road_transparency(road_id: int) -> dict | None:
    """Calculate transparency score for a road. Returns full breakdown dict or None."""
    road = StructuredRoadRetriever.get_road_by_id(road_id)
    if not road:
        return None

    projects = StructuredRoadRetriever.get_road_projects(road_id) or []
    complaints = StructuredRoadRetriever.get_road_complaints(road_id) or []

    total_sanctioned = sum(p['budget_allocated'] or 0 for p in projects)
    total_spent = sum(p['budget_spent'] or 0 for p in projects)
    base_score = 100
    score_deductions = []
    anomalies = []

    # --- Anomaly detection ---
    for p in projects:
        # Budget overrun
        if p['budget_spent'] > p['budget_allocated']:
            excess = p['budget_spent'] - p['budget_allocated']
            pct = round((excess / p['budget_allocated']) * 100) if p['budget_allocated'] > 0 else 0
            anomalies.append({
                "type": "budget_overrun",
                "severity": "high" if pct > 15 else "medium",
                "description": f"Project '{p['title']}' exceeded budget by ₹{excess:,.0f} ({pct}% overrun)."
            })
            score_deductions.append({"points": 25 if pct > 20 else 15, "category": "budget",
                                     "reason": f"{pct}% cost overrun on {p['title']}"})

        # Contractor variance
        if p['budget_allocated'] > 0:
            variance_ratio = abs((p['budget_spent'] / p['budget_allocated']) - 1)
            if variance_ratio > 0.15:
                pct = round(variance_ratio * 100)
                anomalies.append({
                    "type": "contractor_variance",
                    "severity": "high",
                    "description": f"High variance: spend-allocation ratio deviates {pct}% on '{p['title']}'."
                })
                score_deductions.append({"points": 15, "category": "budget",
                                         "reason": f"Contractor variance {pct}% on {p['title']}"})

        # Delay
        if p['delay_days'] and p['delay_days'] > 0:
            score_deductions.append({"points": 15, "category": "delay",
                                     "reason": f"Delay of {p['delay_days']} days on {p['title']}"})

    # Repeated repairs (early failure)
    sorted_projects = sorted(projects, key=lambda x: (x.get('start_date') or ''))
    for i in range(len(sorted_projects) - 1):
        p1_start = sorted_projects[i].get('start_date') or ''
        p2_start = sorted_projects[i + 1].get('start_date') or ''
        if p1_start and p2_start:
            try:
                from datetime import datetime
                d1 = datetime.strptime(str(p1_start), '%Y-%m-%d')
                d2 = datetime.strptime(str(p2_start), '%Y-%m-%d')
                diff_months = (d2 - d1).days / 30.0
                if diff_months < 18:
                    anomalies.append({
                        "type": "repeated_repair",
                        "severity": "high",
                        "description": f"Repeated repair within {diff_months:.0f} months on same segment."
                    })
                    score_deductions.append({"points": 25, "category": "anomaly",
                                             "reason": f"Repeated repair within {diff_months:.0f} months"})
            except ValueError:
                pass

    # High maintenance frequency
    if len(projects) >= 3:
        anomalies.append({
            "type": "high_maintenance_frequency",
            "severity": "medium",
            "description": f"{len(projects)} projects logged in recent timeline."
        })
        score_deductions.append({"points": 15, "category": "anomaly",
                                 "reason": f"High maintenance freq ({len(projects)} projects)"})

    # Unresolved complaints
    active = [c for c in complaints if c.get('status') not in ('resolved', 'rejected')]
    if active:
        pts = min(20, len(active) * 5)
        score_deductions.append({"points": pts, "category": "complaints",
                                 "reason": f"{len(active)} unresolved complaints"})

    total_deductions = sum(d['points'] for d in score_deductions)
    transparency_score = max(10, base_score - total_deductions)

    return {
        "road_id": road_id,
        "road_name": road['name'],
        "transparency_score": transparency_score,
        "grade": _score_grade(transparency_score),
        "total_sanctioned": total_sanctioned,
        "total_spent": total_spent,
        "spend_pct": round((total_spent / total_sanctioned * 100), 1) if total_sanctioned > 0 else 0,
        "anomalies": anomalies,
        "score_deductions": score_deductions,
        "project_count": len(projects),
        "complaint_count": len(active)
    }


def _score_grade(score: int) -> str:
    if score >= 90: return "A"
    if score >= 80: return "B"
    if score >= 65: return "C"
    if score >= 50: return "D"
    return "F"


def calculate_vfm_index(road_id: int) -> dict | None:
    """Value-for-Money index: (quality_score / cost_per_km) * normalization_factor."""
    road = StructuredRoadRetriever.get_road_by_id(road_id)
    if not road:
        return None

    projects = StructuredRoadRetriever.get_road_projects(road_id) or []
    complaints = StructuredRoadRetriever.get_road_complaints(road_id) or []

    total_spent = sum(p['budget_spent'] or 0 for p in projects)
    length_km = float(road['length_km'])

    if length_km == 0 or total_spent == 0:
        return {"road_id": road_id, "vfm_index": None, "reason": "Insufficient data"}

    spent_per_km = total_spent / length_km

    # Quality score: start at 100, deduct for unresolved complaints, poor road status
    quality_score = 100.0
    active = [c for c in complaints if c.get('status') not in ('resolved', 'rejected')]
    quality_score -= min(40, len(active) * 5)

    status = road.get('status', 'good')
    if status == 'poor':
        quality_score -= 20
    elif status == 'fair':
        quality_score -= 10
    elif status == 'under_construction':
        quality_score -= 5

    quality_score = max(10, quality_score)

    # VfM = quality_score / (spent_per_km / 100000) — scaling factor to bring to 0-100 range
    vfm_raw = quality_score / (spent_per_km / 100000) if spent_per_km > 0 else 0

    # Get region code for normalization
    region_code = road.get('region_code') or 'IN'

    return {
        "road_id": road_id,
        "road_name": road['name'],
        "region_code": region_code,
        "quality_score": round(quality_score, 1),
        "cost_per_km": round(spent_per_km, 2),
        "vfm_raw": round(vfm_raw, 4),
        "vfm_index": round(min(100, vfm_raw * 100), 1),
        "project_count": len(projects),
        "active_complaints": len(active),
    }


def get_citywide_vfm_snapshot() -> dict:
    """Aggregate VfM scores across all roads with per-region normalization."""
    roads = db.query("SELECT id, name FROM roads")
    scores = []
    for r in roads:
        s = calculate_vfm_index(r['id'])
        if s and s['vfm_index'] is not None:
            scores.append(s)

    if not scores:
        return {"roads_analyzed": 0}

    # Per-region min-max normalization
    region_scores: dict[str, list[float]] = {}
    for s in scores:
        rg = s['region_code']
        if rg not in region_scores:
            region_scores[rg] = []
        region_scores[rg].append(s['vfm_index'])

    region_min_max: dict[str, tuple[float, float]] = {}
    for rg, vals in region_scores.items():
        region_min_max[rg] = (min(vals), max(vals))

    normalized_scores = []
    for s in scores:
        rg = s['region_code']
        lo, hi = region_min_max[rg]
        if hi > lo:
            s['vfm_normalized'] = round(((s['vfm_index'] - lo) / (hi - lo)) * 100, 1)
        else:
            s['vfm_normalized'] = 100.0
        normalized_scores.append(s)

    avg_vfm = round(sum(s['vfm_index'] for s in scores) / len(scores), 1)

    return {
        "roads_analyzed": len(scores),
        "average_vfm_index": avg_vfm,
        "regions": {
            rg: {
                "count": len(region_scores[rg]),
                "average": round(sum(region_scores[rg]) / len(region_scores[rg]), 1),
            }
            for rg in region_scores
        },
        "roads": normalized_scores,
    }


def get_citywide_transparency_snapshot() -> dict:
    """Aggregate transparency across all roads."""
    snapshot = StructuredRoadRetriever.get_citywide_budget_snapshot()
    roads = db.query("SELECT id, name FROM roads")
    scores = []
    for r in roads:
        t = calculate_road_transparency(r['id'])
        if t:
            scores.append(t)
    avg_score = round(sum(s['transparency_score'] for s in scores) / len(scores), 1) if scores else 0
    total_anomalies = sum(len(s['anomalies']) for s in scores)
    high_sev = sum(1 for s in scores for a in s['anomalies'] if a.get('severity') == 'high')
    return {
        "roads_analyzed": len(scores),
        "average_transparency_score": avg_score,
        "total_anomalies": total_anomalies,
        "high_severity_anomalies": high_sev,
        "total_sanctioned": snapshot['total_sanctioned_city'] if snapshot else 0,
        "total_spent": snapshot['total_spent_city'] if snapshot else 0,
        "city_spend_pct": snapshot['city_spend_pct'] if snapshot else 0
    }