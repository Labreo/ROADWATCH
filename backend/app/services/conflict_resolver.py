from typing import Optional
from app.services.database import db


class ConflictResolver:

    @staticmethod
    def detect_road_duplicates(name: str, road_code: str = None, geom_wkt: str = None):
        """
        Find potential duplicate roads across regions.
        Uses name similarity (pg_trgm) + spatial proximity.
        """
        results = []

        # By name similarity
        if name:
            name_sql = """
            SELECT id, name, road_code, status, length_km, authority_id,
                   ST_AsText(geom) AS geom_wkt,
                   similarity(name, ?) AS sim
            FROM roads
            WHERE similarity(name, ?) > 0.3
            ORDER BY sim DESC
            LIMIT 10
            """
            name_results = db.query(name_sql, (name, name))
            for r in name_results:
                results.append({
                    "id": r["id"],
                    "name": r["name"],
                    "road_code": r.get("road_code"),
                    "similarity": float(r["sim"]) if r.get("sim") is not None else 0.0,
                    "match_type": "name",
                    "geom_wkt": r.get("geom_wkt"),
                })

        # By road_code prefix
        if road_code:
            code_sql = """
            SELECT id, name, road_code, status, length_km, authority_id,
                   ST_AsText(geom) AS geom_wkt
            FROM roads
            WHERE road_code LIKE ? || '%'
              AND road_code != ?
            ORDER BY road_code
            LIMIT 10
            """
            code_results = db.query(code_sql, (road_code.split("-")[0] if "-" in road_code else road_code, road_code))
            for r in code_results:
                if not any(x["id"] == r["id"] for x in results):
                    results.append({
                        "id": r["id"],
                        "name": r["name"],
                        "road_code": r.get("road_code"),
                        "similarity": 0.0,
                        "match_type": "road_code_prefix",
                        "geom_wkt": r.get("geom_wkt"),
                    })

        # By spatial proximity
        if geom_wkt:
            spatial_sql = """
            SELECT id, name, road_code,
                   ST_Distance(geom, ST_GeomFromText(?, 4326)) AS dist
            FROM roads
            WHERE ST_DWithin(geom, ST_GeomFromText(?, 4326), 0.05)
              AND id != ?
            ORDER BY dist ASC
            LIMIT 10
            """
            spatial_results = db.query(spatial_sql, (geom_wkt, geom_wkt, -1))
            for r in spatial_results:
                if not any(x["id"] == r["id"] for x in results):
                    results.append({
                        "id": r["id"],
                        "name": r["name"],
                        "road_code": r.get("road_code"),
                        "similarity": 0.0,
                        "match_type": "spatial",
                        "distance": float(r["dist"]) if r.get("dist") is not None else None,
                    })

        return results

    @staticmethod
    def detect_authority_duplicates(name: str, department_code: str = None):
        """
        Find potential duplicate authorities across or within regions.
        """
        results = []
        if name:
            name_sql = """
            SELECT a.id, a.name, a.department_code, a.region_code,
                   similarity(a.name, ?) AS sim
            FROM authorities a
            WHERE similarity(a.name, ?) > 0.3
            ORDER BY sim DESC
            LIMIT 10
            """
            name_results = db.query(name_sql, (name, name))
            for r in name_results:
                results.append({
                    "id": r["id"],
                    "name": r["name"],
                    "department_code": r.get("department_code"),
                    "region_code": r.get("region_code"),
                    "similarity": float(r["sim"]) if r.get("sim") is not None else 0.0,
                    "match_type": "name",
                })

        if department_code:
            code_sql = """
            SELECT a.id, a.name, a.department_code, a.region_code
            FROM authorities a
            WHERE a.department_code LIKE ?
              AND a.department_code != ?
            ORDER BY a.department_code
            LIMIT 10
            """
            code_results = db.query(code_sql, (department_code[:3] + "%", department_code))
            for r in code_results:
                if not any(x["id"] == r["id"] for x in results):
                    results.append({
                        "id": r["id"],
                        "name": r["name"],
                        "department_code": r.get("department_code"),
                        "region_code": r.get("region_code"),
                        "similarity": 0.0,
                        "match_type": "department_code_prefix",
                    })

        return results

    @staticmethod
    def create_road_conflict_group(conflict_key: str, road_ids: list[int], metadata: dict = None):
        """
        Create a conflict group for duplicate roads.
        road_ids should be [primary_id, ...duplicates]
        """
        if not road_ids:
            return None

        group_id = db.execute(
            "INSERT INTO road_conflict_groups (conflict_key, primary_road_id, merged_metadata) "
            "VALUES (?, ?, ?) RETURNING id",
            (conflict_key, road_ids[0], metadata or {}),
        )

        if group_id:
            for rid in road_ids:
                db.execute(
                    "UPDATE roads SET conflict_group_id = ? WHERE id = ?",
                    (group_id, rid),
                )

        return group_id

    @staticmethod
    def create_authority_conflict_group(conflict_key: str, authority_ids: list[int], metadata: dict = None):
        """
        Create a conflict group for duplicate authorities.
        """
        if not authority_ids:
            return None

        group_id = db.execute(
            "INSERT INTO authority_conflict_groups (conflict_key, primary_authority_id, merged_metadata) "
            "VALUES (?, ?, ?) RETURNING id",
            (conflict_key, authority_ids[0], metadata or {}),
        )

        if group_id:
            for aid in authority_ids:
                db.execute(
                    "UPDATE authorities SET conflict_group_id = ? WHERE id = ?",
                    (group_id, aid),
                )

        return group_id

    @staticmethod
    def resolve_road_conflict(group_id: int, resolution: str, resolved_by: str = "system"):
        """
        Resolve a road conflict group.
        resolution: 'merge', 'link', or 'dismiss'
        """
        group = db.query(
            "SELECT * FROM road_conflict_groups WHERE id = ?", (group_id,)
        )
        if not group:
            return None

        group = group[0]
        now_str = "NOW()"

        if resolution == "merge":
            primary_id = group["primary_road_id"]
            db.execute(
                "UPDATE complaints SET road_id = ? WHERE road_id IN ("
                "SELECT id FROM roads WHERE conflict_group_id = ? AND id != ?"
                ")",
                (primary_id, group_id, primary_id),
            )
            db.execute(
                "UPDATE projects SET road_id = ? WHERE road_id IN ("
                "SELECT id FROM roads WHERE conflict_group_id = ? AND id != ?"
                ")",
                (primary_id, group_id, primary_id),
            )
            db.execute(
                "DELETE FROM road_region_crossings WHERE road_id IN ("
                "SELECT id FROM roads WHERE conflict_group_id = ? AND id != ?"
                ")",
                (group_id, primary_id),
            )
        elif resolution == "link":
            pass  # Already linked via conflict_group_id

        db.execute(
            "UPDATE road_conflict_groups SET resolved = TRUE, resolved_at = ?, resolved_by = ? "
            "WHERE id = ?",
            (now_str, resolved_by, group_id),
        )

        return {"status": "resolved", "resolution": resolution, "group_id": group_id}

    @staticmethod
    def resolve_authority_conflict(group_id: int, resolution: str, resolved_by: str = "system"):
        """
        Resolve an authority conflict group.
        """
        group = db.query(
            "SELECT * FROM authority_conflict_groups WHERE id = ?", (group_id,)
        )
        if not group:
            return None

        now_str = "NOW()"

        if resolution == "merge":
            primary_id = group["primary_authority_id"]
            db.execute(
                "UPDATE complaints SET assigned_authority_id = ? WHERE assigned_authority_id IN ("
                "SELECT id FROM authorities WHERE conflict_group_id = ? AND id != ?"
                ")",
                (primary_id, group_id, primary_id),
            )
            db.execute(
                "UPDATE projects SET authority_id = ? WHERE authority_id IN ("
                "SELECT id FROM authorities WHERE conflict_group_id = ? AND id != ?"
                ")",
                (primary_id, group_id, primary_id),
            )
            db.execute(
                "UPDATE roads SET authority_id = ? WHERE authority_id IN ("
                "SELECT id FROM authorities WHERE conflict_group_id = ? AND id != ?"
                ")",
                (primary_id, group_id, primary_id),
            )

        db.execute(
            "UPDATE authority_conflict_groups SET resolved = TRUE, resolved_at = ?, resolved_by = ? "
            "WHERE id = ?",
            (now_str, resolved_by, group_id),
        )

        return {"status": "resolved", "resolution": resolution, "group_id": group_id}

    @staticmethod
    def list_road_conflicts(resolved: bool = None):
        """List all road conflict groups."""
        where = ""
        params = []
        if resolved is not None:
            where = "WHERE resolved = ?"
            params.append(resolved)
        return db.query(
            f"SELECT rcg.*, r.name AS primary_road_name "
            f"FROM road_conflict_groups rcg "
            f"LEFT JOIN roads r ON rcg.primary_road_id = r.id "
            f"{where} ORDER BY rcg.created_at DESC",
            tuple(params),
        )

    @staticmethod
    def list_authority_conflicts(resolved: bool = None):
        """List all authority conflict groups."""
        where = ""
        params = []
        if resolved is not None:
            where = "WHERE resolved = ?"
            params.append(resolved)
        return db.query(
            f"SELECT acg.*, a.name AS primary_authority_name "
            f"FROM authority_conflict_groups acg "
            f"LEFT JOIN authorities a ON acg.primary_authority_id = a.id "
            f"{where} ORDER BY acg.created_at DESC",
            tuple(params),
        )
