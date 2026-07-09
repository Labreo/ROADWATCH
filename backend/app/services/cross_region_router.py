from typing import Optional
from app.services.database import db
from app.services.authority_resolver import AuthorityResolver
from app.services.notification_service import NotificationService


class CrossRegionRouter:

    @staticmethod
    def detect_road_region_overlaps(road_id: int):
        """
        Check if a road spans multiple regions by intersecting its geom
        with the region bounding boxes.
        Returns list of {region_code, region_name, authority_id, authority_name}
        """
        sql = """
        SELECT r.code AS region_code, r.name AS region_name,
               a.id AS authority_id, a.name AS authority_name
        FROM regions r
        JOIN roads rd ON ST_Intersects(rd.geom, r.bounding_box)
        LEFT JOIN authorities a ON a.region_code = r.code
            AND ST_Contains(a.geom_boundary, ST_StartPoint(rd.geom))
        WHERE rd.id = ?
        ORDER BY r.code
        """
        results = db.query(sql, (road_id,))
        return results

    @staticmethod
    def get_road_region_crossings(road_id: int):
        """Get stored road_region_crossings for a road."""
        sql = """
        SELECT rrc.*, r.name AS region_name
        FROM road_region_crossings rrc
        JOIN regions r ON rrc.region_code = r.code
        WHERE rrc.road_id = ?
        ORDER BY rrc.id
        """
        return db.query(sql, (road_id,))

    @staticmethod
    def is_near_region_boundary(lon: float, lat: float, road_id: int, buffer_deg: float = 0.02) -> bool:
        """
        Check if a point is near a region boundary by seeing if it's within
        buffer_deg of the intersection of the road with region bounding boxes.
        """
        sql = """
        SELECT COUNT(*) AS cnt FROM regions r
        JOIN roads rd ON rd.id = ?
        WHERE ST_DWithin(
            ST_GeomFromText(?, 4326),
            r.bounding_box,
            ?
        ) AND NOT ST_Contains(r.bounding_box, ST_GeomFromText(?, 4326))
        """
        point_wkt = f"POINT({lon} {lat})"
        result = db.query(sql, (road_id, point_wkt, buffer_deg, point_wkt))
        return result and result[0]["cnt"] > 0

    @staticmethod
    def resolve_cross_region_complaint(lon: float, lat: float, road_id: int, complaint_data: dict):
        """
        When a complaint is filed near a road that spans multiple regions:
        1. Detect which regions the road crosses
        2. Resolve primary authority for the point coordinates
        3. If the road belongs to a different region than the point, flag as cross-region
        4. Return routing info with cross-region metadata

        Returns dict with:
          - primary_region, primary_authority
          - cross_region: bool
          - secondary_regions: list of {region_code, authority_id, action}
        """
        regions_hit = CrossRegionRouter.detect_road_region_overlaps(road_id)
        if not regions_hit:
            return None

        primary_authority = AuthorityResolver.resolve_authority_for_coordinates(lon, lat)
        primary_region_code = primary_authority.get("region_code", "IN") if primary_authority else "IN"

        # Check if the road crosses into other regions
        other_regions = [r for r in regions_hit if r["region_code"] != primary_region_code]
        if not other_regions:
            return None

        # For each secondary region, find the appropriate authority
        secondary_regions = []
        for region_info in other_regions:
            alt_authority = AuthorityResolver.resolve_authority_for_coordinates(lon, lat)
            if alt_authority and alt_authority.get("region_code") == region_info["region_code"]:
                sec_auth = alt_authority
            else:
                auth_list = db.query(
                    "SELECT a.*, r.name AS region_name, r.default_currency, r.locale, r.phone_format "
                    "FROM authorities a "
                    "LEFT JOIN regions r ON a.region_code = r.code "
                    "WHERE a.region_code = ? "
                    "ORDER BY a.id ASC LIMIT 1",
                    (region_info["region_code"],),
                )
                sec_auth = auth_list[0] if auth_list else None

            secondary_regions.append({
                "region_code": region_info["region_code"],
                "region_name": region_info.get("region_name"),
                "authority_id": sec_auth["id"] if sec_auth else None,
                "authority_name": sec_auth["name"] if sec_auth else None,
                "action": "forward",
            })

        return {
            "primary_region": primary_region_code,
            "primary_authority": primary_authority,
            "cross_region": True,
            "secondary_regions": secondary_regions,
        }

    @staticmethod
    def split_complaint_across_regions(
        complaint_id: int,
        primary_region: str,
        secondary_regions: list,
        original_data: dict,
    ):
        """
        Create child complaint records for secondary regions.
        Returns list of new complaint IDs.
        """
        new_ids = []
        now = original_data.get("created_at", "NOW()")

        for sec in secondary_regions:
            if not sec.get("authority_id"):
                continue

            insert_sql = """
            INSERT INTO complaints (
                title, description, category, geom, status, priority,
                client_temp_id, image_url, assigned_authority_id, road_id,
                target_resolution_hours, created_at, updated_at,
                parent_complaint_id, region_override
            )
            SELECT
                CONCAT(title, ' (', ?, ' routed)'),
                description, category, geom, 'pending', priority,
                gen_random_uuid(), image_url, ?, road_id,
                target_resolution_hours, ?, ?,
                ?, ?
            FROM complaints WHERE id = ?
            RETURNING id
            """
            new_id = db.execute(
                insert_sql,
                (
                    sec["region_code"],
                    sec["authority_id"],
                    now,
                    now,
                    complaint_id,
                    sec["region_code"],
                    complaint_id,
                ),
            )
            if new_id:
                new_ids.append(new_id)

                # Record the split in region_overlap_routes
                db.execute(
                    "INSERT INTO region_overlap_routes "
                    "(complaint_id, primary_region, secondary_region, split_action) "
                    "VALUES (?, ?, ?, 'duplicate')",
                    (complaint_id, primary_region, sec["region_code"]),
                )

        return new_ids
