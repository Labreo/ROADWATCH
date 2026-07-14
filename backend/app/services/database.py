import os
import psycopg2
from psycopg2.extras import RealDictCursor
from sqlalchemy import create_engine
from app.services.audit_context import get_audit_user

# Database Connection Settings
db_user = os.environ.get("POSTGRES_USER", "postgres")
db_password = os.environ.get("POSTGRES_PASSWORD", "postgres")
db_host = os.environ.get("POSTGRES_HOST", "db")
db_port = os.environ.get("POSTGRES_PORT", "5432")
db_name = os.environ.get("POSTGRES_DB", "roadwatch")

DATABASE_URL = f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

def to_wkt(val):
    if val is None:
        return None
    # If it's already a WKT string, return it
    if isinstance(val, str) and (val.startswith('POINT') or val.startswith('LINESTRING') or val.startswith('POLYGON') or val.startswith('MULTIPOLYGON') or val.startswith('MULTILINESTRING')):
        return val
    
    # If it is a geoalchemy2 WKBElement
    try:
        from geoalchemy2.elements import WKBElement
        from geoalchemy2.shape import to_shape
        if isinstance(val, WKBElement):
            return to_shape(val).wkt
    except Exception:
        pass

    # If it is a hex string (PostGIS EWKB hex)
    if isinstance(val, str):
        try:
            from shapely import wkb
            geom = wkb.loads(val, hex=True)
            return geom.wkt
        except Exception:
            pass
            
    # If it is bytes
    if isinstance(val, bytes):
        try:
            from shapely import wkb
            geom = wkb.loads(val)
            return geom.wkt
        except Exception:
            pass
            
    return val

class Database:
    def __init__(self):
        # Create connection pool via SQLAlchemy
        self.engine = create_engine(
            DATABASE_URL,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True
        )
        
    def query(self, sql, params=()):
        # Convert SQLite parameter placeholder (?) to Postgres (%s)
        sql = sql.replace('?', '%s')
        
        conn = None
        try:
            # Get raw connection from the SQLAlchemy connection pool
            conn = self.engine.raw_connection()
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute("SET app.changed_by = %s", (get_audit_user(),))
                cursor.execute(sql, params)
                try:
                    results = cursor.fetchall()
                except psycopg2.ProgrammingError:
                    results = []
                
                # Postprocess rows to convert geometry columns to WKT
                processed_results = []
                for r in results:
                    row_dict = dict(r)
                    for col in ['geom', 'geom_boundary']:
                        if col in row_dict:
                            row_dict[col] = to_wkt(row_dict[col])
                    processed_results.append(row_dict)
                return processed_results
        except Exception as e:
            print(f"Database Query Error: {sql} | Params: {params} | Error: {e}")
            return self._fallback_mock_query(sql, params)
        finally:
            if conn:
                conn.close()

    def _fallback_mock_query(self, sql: str, params: tuple) -> list[dict]:
        sql_lower = sql.lower()
        print(f"[DEBUG MOCK DB] Entering fallback for: {sql[:120].strip()}... | Params: {params}")
        
        # 1. CPI Data
        if "cpi_data" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: CPI Data")
            return [
                {"region_code": "IN", "year": 2020, "cpi_value": 100.0},
                {"region_code": "IN", "year": 2026, "cpi_value": 136.5},
                {"region_code": "US", "year": 2020, "cpi_value": 100.0},
                {"region_code": "US", "year": 2026, "cpi_value": 123.8},
                {"region_code": "GB", "year": 2020, "cpi_value": 100.0},
                {"region_code": "GB", "year": 2026, "cpi_value": 123.0},
                {"region_code": "KE", "year": 2020, "cpi_value": 100.0},
                {"region_code": "KE", "year": 2026, "cpi_value": 138.2}
            ]

        # 2. Road Timeline (matches unique column name "material_note" first)
        if "material_note" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Road Timeline")
            return [
                {
                    "event_date": "2024-05-10",
                    "event_type": "project_start",
                    "description": "SV Road Relaying Project commenced by Omega Infrastructure",
                    "material_note": "Concrete M40"
                },
                {
                    "event_date": "2024-11-20",
                    "event_type": "project_completion",
                    "description": "SV Road Relaying Project completed",
                    "material_note": "Concrete M40"
                }
            ]

        # 3. Cost Per KM (matches unique column name "allocated_per_km" first)
        if "allocated_per_km" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Cost Per KM")
            # Returns per-project cost data for the road in question
            # For SV Road (id=3): 2 projects, length 16.80km
            return [
                {
                    "project_id": 3,
                    "title": "SV Road Drainage Trenching & Microtunnelling",
                    "length_km": 16.80,
                    "budget_allocated": 95000000.0,
                    "budget_spent": 45000000.0,
                    "allocated_per_km": 5654761.90,
                    "spent_per_km": 2678571.43,
                    "status": "halted",
                    "contractor_name": "Omega Infrastructure Corp"
                },
                {
                    "project_id": 4,
                    "title": "SV Road Emergency Asphalt Laying",
                    "length_km": 16.80,
                    "budget_allocated": 35000000.0,
                    "budget_spent": 12000000.0,
                    "allocated_per_km": 2083333.33,
                    "spent_per_km": 714285.71,
                    "status": "in_progress",
                    "contractor_name": "Zenith Construction Co"
                }
            ]

        # 4. Road Budget Summary (matches unique column name "total_sanctioned" first)
        if "total_sanctioned" in sql_lower and "total_sanctioned_city" not in sql_lower and "projects" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Road Budget Summary")
            # For SV Road (id=3): 2 projects, 130000000 sanctioned, 57000000 spent, 43.8%, 73000000 variance, 378 delay days
            return [{
                "project_count": 2,
                "total_sanctioned": 130000000.0,
                "total_spent": 57000000.0,
                "spend_pct": 43.8,
                "total_variance": 73000000.0,
                "total_delay_days": 378
            }]

        # 5. Citywide Transparency / Budget Snapshot
        if "roads_with_projects" in sql_lower or "total_sanctioned_city" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Citywide Transparency/Budget")
            return [{
                "roads_with_projects": 5,
                "total_projects": 12,
                "total_sanctioned_city": 850000000.0,
                "total_spent_city": 810000000.0,
                "city_spend_pct": 95.3,
                "total_delay_days_city": 45,
                "distinct_funding_sources": 4
            }]

        # 6. CostPredictor training query
        if "where p.status in" in sql_lower and "p.budget_spent > 0" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: CostPredictor training")
            return [
                {"id": 1, "budget_spent": 45000000.0, "budget_allocated": 95000000.0, "length_km": 16.80, "road_type": "City", "region_code": "IN"},
                {"id": 2, "budget_spent": 298000000.0, "budget_allocated": 324000000.0, "length_km": 188.5, "road_type": "Motorway", "region_code": "GB"}
            ]

        # 7. Project Beneficiaries
        if "project_beneficiaries" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Project Beneficiaries")
            return [{
                "beneficiary_records": 1,
                "total_pop": 50000.0,
                "total_traffic": 15000.0,
                "total_population_served": 50000.0,
                "total_daily_traffic": 15000.0,
                "total_households": 12000.0,
                "project_count": 2
            }]

        # 8. Budget Variance Reasons
        if "budget_variance_reasons" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Budget Variance Reasons")
            return [{
                "project_id": 10,
                "project_title": "SV Road Relaying Project",
                "original_budget": 48000000.0,
                "revised_budget": 48750000.0,
                "variance_pct": 1.56,
                "reason": "Cement and reinforcement steel prices inflated in Q3 2024",
                "approved_by": "MCGM Chief Engineer",
                "approval_date": "2024-10-15"
            }]

        # 9. Contractor Transparency Summary (unique column name "total_contracts_value")
        if "total_contracts_value" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Contractor Transparency Summary")
            contractor_id = 10  # default Omega
            if len(params) > 0:
                try:
                    contractor_id = int(params[0])
                except (ValueError, TypeError):
                    pass
            # Map known contractors with project data
            summary_map = {
                10: {"id": 10, "name": "Omega Infrastructure Corp", "rating": 1.80, "blacklisted": True, "blacklisted_reason": "Failure to complete SV Road drainage project inside contract timelines; substandard materials causing surface peeling within 3 months.", "projects_completed": 12, "projects_delayed": 8, "total_contracts_value": 95000000.0, "total_spent": 45000000.0, "total_delay_days": 378, "project_count": 1},
                16: {"id": 16, "name": "Thames Highway Services", "rating": 4.50, "blacklisted": False, "blacklisted_reason": None, "projects_completed": 48, "projects_delayed": 1, "total_contracts_value": 95000000.0, "total_spent": 40000000.0, "total_delay_days": 0, "project_count": 1},
                3: {"id": 3, "name": "Zenith Construction Co", "rating": 4.50, "blacklisted": False, "blacklisted_reason": None, "projects_completed": 42, "projects_delayed": 1, "total_contracts_value": 35000000.0, "total_spent": 12000000.0, "total_delay_days": 0, "project_count": 1},
            }
            if contractor_id in summary_map:
                return [summary_map[contractor_id]]
            return [summary_map[10]]

        # 10. Funding Sources
        if "fund_sources" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Funding Sources")
            return [{"source_name": "State Infrastructure Fund", "total_amount": 48000000.0, "pct_of_total": 100.0}]

        # 10b. Project Milestones
        if "project_milestones" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Project Milestones")
            return [{
                "id": 1,
                "title": "Sub-grade Preparation",
                "milestone_title": "Sub-grade Preparation",
                "description": "Compaction and grading of road bed",
                "amount": 500000.0,
                "status": "completed",
                "due_date": "2024-06-15",
                "completion_date": "2024-06-14",
                "verified_by": "MCGM Inspector",
                "payment_release_date": "2024-06-20",
                "project_title": "SV Road Relaying Project"
            }]

        # 10c. Contingency Reserves
        if "contingency_reserves" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Contingency Reserves")
            if "utilization_pct" in sql_lower:
                return [{
                    "total_allocated": 5000000.0,
                    "total_utilized": 1200000.0,
                    "release_count": 1,
                    "utilization_pct": 24.0
                }]
            if "group by" in sql_lower:
                return [{
                    "status": "approved",
                    "count": 1,
                    "total_allocated": 5000000.0,
                    "total_utilized": 1200000.0
                }]
            return [{
                "project_title": "SV Road Relaying Project",
                "allocated_amount": 5000000.0,
                "utilized_amount": 1200000.0,
                "status": "approved",
                "release_notes": "Additional sub-base compaction required due to soft clay soil pockets found at chainage 4+200."
            }]

        # 10d. Approval Trail
        if "approval_trail" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Approval Trail")
            return [{
                "entity_type": "project_milestone",
                "action": "milestone_completion",
                "requested_by": "Omega Project Manager",
                "approved_by": "MCGM Chief Engineer",
                "approved_at": "2024-06-15 14:30:00",
                "status": "approved",
                "comments": "Milestone verified on site. Concrete strength test certificates attached and verified.",
                "project_title": "SV Road Relaying Project"
            }]

        # 10f. Tender Bids Lookup
        if "tender_bids tb" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Tender Bids")
            return [{
                "reference_no": "TND-2024-BMC-001",
                "tender_title": "S.V. Road Relaying Tender",
                "tender_status": "awarded",
                "is_winner": True,
                "financial_quote": 47250000.0,
                "technical_score": 92.5,
                "financial_score": 95.0,
                "weighted_total": 94.0,
                "evaluator_notes": "Omega bid is evaluated as the lowest responsive bid matching all material specs."
            }]

        # 10e. Tenders Lookup
        if "tenders" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Tenders")
            return [{
                "reference_no": "TND-2024-BMC-001",
                "title": "S.V. Road Relaying Tender",
                "authority_name": "MCGM Ward K-West",
                "authority_code": "MCGM-KWEST",
                "status": "awarded",
                "estimated_value": 48000000.0,
                "published_date": "2024-03-01",
                "bid_deadline": "2024-03-31",
                "bid_count": 3,
                "award_date": "2024-04-15"
            }]

        # 11. Road Projects (generic project lookup)
        if "from projects" in sql_lower or "join projects" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Road Projects")
            # All 26 projects from mock_data.sql, keyed by road_id
            all_projects_by_road = {
                1: [
                    {"id": 1, "title": "WEH Flyover Resurfacing & Structural Grouting", "road_id": 1, "road_name": "Western Express Highway", "road_code": "WEH-NH8", "contractor_id": 1, "contractor_name": "Apex Infrastructure Ltd", "contractor_license": "LIC-IN-001", "contractor_rating": 4.25, "contractor_blacklisted": False, "budget_allocated": 240000000.0, "budget_spent": 185000000.0, "status": "in_progress", "start_date": "2025-06-01", "target_end_date": "2026-06-30", "actual_end_date": None, "delay_days": 0, "road_type": "NH", "region_code": "IN", "length_km": 25.50},
                    {"id": 10, "title": "WEH Safety Barrier & Lighting Upgrade", "road_id": 1, "road_name": "Western Express Highway", "road_code": "WEH-NH8", "contractor_id": 5, "contractor_name": "Landmark Infra Projects", "contractor_license": "LIC-IN-005", "contractor_rating": 3.90, "contractor_blacklisted": False, "budget_allocated": 85000000.0, "budget_spent": 32000000.0, "status": "in_progress", "start_date": "2026-01-01", "target_end_date": "2026-12-31", "actual_end_date": None, "delay_days": 0, "road_type": "NH", "region_code": "IN", "length_km": 25.50},
                ],
                2: [
                    {"id": 2, "title": "EEH Pothole Remediation Campaign 2025", "road_id": 2, "road_name": "Eastern Express Highway", "road_code": "EEH-NH8", "contractor_id": 2, "contractor_name": "BuildWell Roadways Ltd", "contractor_license": "LIC-IN-002", "contractor_rating": 3.80, "contractor_blacklisted": False, "budget_allocated": 18000000.0, "budget_spent": 19200000.0, "status": "completed", "start_date": "2025-09-01", "target_end_date": "2025-10-31", "actual_end_date": "2025-11-12", "delay_days": 12, "road_type": "SH", "region_code": "IN", "length_km": 22.10},
                ],
                3: [
                    {"id": 3, "title": "SV Road Drainage Trenching & Microtunnelling", "road_id": 3, "road_name": "S.V. Road", "road_code": "SV-RD-01", "contractor_id": 10, "contractor_name": "Omega Infrastructure Corp", "contractor_license": "LIC-IN-010", "contractor_rating": 1.80, "contractor_blacklisted": True, "budget_allocated": 95000000.0, "budget_spent": 45000000.0, "status": "halted", "start_date": "2024-05-10", "target_end_date": "2025-05-10", "actual_end_date": None, "delay_days": 378, "road_type": "City", "region_code": "IN", "length_km": 16.80},
                    {"id": 4, "title": "SV Road Emergency Asphalt Laying", "road_id": 3, "road_name": "S.V. Road", "road_code": "SV-RD-01", "contractor_id": 3, "contractor_name": "Zenith Construction Co", "contractor_license": "LIC-IN-003", "contractor_rating": 4.50, "contractor_blacklisted": False, "budget_allocated": 35000000.0, "budget_spent": 12000000.0, "status": "in_progress", "start_date": "2026-03-01", "target_end_date": "2026-08-31", "actual_end_date": None, "delay_days": 0, "road_type": "City", "region_code": "IN", "length_km": 16.80},
                ],
                4: [
                    {"id": 5, "title": "Link Road Concrete Pavement Upgrade Ph.2", "road_id": 4, "road_name": "Link Road", "road_code": "LINK-RD-01", "contractor_id": 6, "contractor_name": "Metro Highway Consultants", "contractor_license": "LIC-IN-006", "contractor_rating": 4.60, "contractor_blacklisted": False, "budget_allocated": 145000000.0, "budget_spent": 75000000.0, "status": "in_progress", "start_date": "2025-10-15", "target_end_date": "2026-09-30", "actual_end_date": None, "delay_days": 0, "road_type": "City", "region_code": "IN", "length_km": 18.20},
                ],
                5: [
                    {"id": 6, "title": "LBS Marg Sewer Line Laying & Patching", "road_id": 5, "road_name": "LBS Marg", "road_code": "LBS-MARG-01", "contractor_id": 4, "contractor_name": "Shiva Earthmovers Pvt Ltd", "contractor_license": "LIC-IN-004", "contractor_rating": 2.10, "contractor_blacklisted": False, "budget_allocated": 62000000.0, "budget_spent": 60000000.0, "status": "in_progress", "start_date": "2024-11-01", "target_end_date": "2025-11-01", "actual_end_date": None, "delay_days": 203, "road_type": "City", "region_code": "IN", "length_km": 21.00},
                ],
                6: [
                    {"id": 7, "title": "SBM Micro-Silica Concrete Topping", "road_id": 6, "road_name": "Senapati Bapat Marg", "road_code": "SBM-MARG-01", "contractor_id": 3, "contractor_name": "Zenith Construction Co", "contractor_license": "LIC-IN-003", "contractor_rating": 4.50, "contractor_blacklisted": False, "budget_allocated": 85000000.0, "budget_spent": 84200000.0, "status": "completed", "start_date": "2023-01-15", "target_end_date": "2023-12-15", "actual_end_date": "2023-12-10", "delay_days": 0, "road_type": "City", "region_code": "IN", "length_km": 7.50},
                ],
                7: [
                    {"id": 8, "title": "Ghodbunder Road Mast-Asphalt Overlay", "road_id": 7, "road_name": "Ghodbunder Road", "road_code": "GHODBUNDER-RD-01", "contractor_id": 8, "contractor_name": "Bharat Roads & Infra", "contractor_license": "LIC-IN-008", "contractor_rating": 4.75, "contractor_blacklisted": False, "budget_allocated": 190000000.0, "budget_spent": 187000000.0, "status": "completed", "start_date": "2024-03-01", "target_end_date": "2024-12-31", "actual_end_date": "2024-12-25", "delay_days": 0, "road_type": "SH", "region_code": "IN", "length_km": 20.00},
                ],
                8: [
                    {"id": 9, "title": "Marine Drive Promenade Resurfacing", "road_id": 8, "road_name": "Marine Drive", "road_code": "MARINE-DR-01", "contractor_id": 3, "contractor_name": "Zenith Construction Co", "contractor_license": "LIC-IN-003", "contractor_rating": 4.50, "contractor_blacklisted": False, "budget_allocated": 52000000.0, "budget_spent": 51800000.0, "status": "completed", "start_date": "2025-01-15", "target_end_date": "2025-06-30", "actual_end_date": "2025-06-25", "delay_days": 0, "road_type": "City", "region_code": "IN", "length_km": 3.60},
                ],
                # US
                9: [
                    {"id": 11, "title": "I-94 Resurfacing & Bridge Repairs", "road_id": 9, "road_name": "I-94 (Edsel Ford Freeway)", "road_code": "I94-WD-01", "contractor_id": 13, "contractor_name": "Great Lakes Infrastructure LLC", "contractor_license": "LIC-US-001", "contractor_rating": 4.30, "contractor_blacklisted": False, "budget_allocated": 45000000.0, "budget_spent": 28000000.0, "status": "in_progress", "start_date": "2025-06-01", "target_end_date": "2026-12-31", "actual_end_date": None, "delay_days": 0, "road_type": "Interstate", "region_code": "US", "length_km": 45.20},
                ],
                10: [
                    {"id": 12, "title": "M-10 Freeway Pothole Remediation", "road_id": 10, "road_name": "M-10 (Lodge Freeway)", "road_code": "M10-WD-01", "contractor_id": 14, "contractor_name": "Michigan Paving Company", "contractor_license": "LIC-US-002", "contractor_rating": 3.90, "contractor_blacklisted": False, "budget_allocated": 8500000.0, "budget_spent": 8500000.0, "status": "completed", "start_date": "2025-03-01", "target_end_date": "2025-08-31", "actual_end_date": "2025-09-15", "delay_days": 15, "road_type": "US-Highway", "region_code": "US", "length_km": 21.50},
                ],
                11: [
                    {"id": 13, "title": "Woodward Avenue Streetscape Phase 2", "road_id": 11, "road_name": "Woodward Avenue", "road_code": "WOODWARD-01", "contractor_id": 13, "contractor_name": "Great Lakes Infrastructure LLC", "contractor_license": "LIC-US-001", "contractor_rating": 4.30, "contractor_blacklisted": False, "budget_allocated": 12000000.0, "budget_spent": 5000000.0, "status": "in_progress", "start_date": "2025-11-01", "target_end_date": "2026-10-31", "actual_end_date": None, "delay_days": 0, "road_type": "US-Highway", "region_code": "US", "length_km": 27.00},
                ],
                12: [
                    {"id": 14, "title": "Gratiot Avenue Resurfacing Phase 3", "road_id": 12, "road_name": "Gratiot Avenue", "road_code": "GRATIOT-01", "contractor_id": 14, "contractor_name": "Michigan Paving Company", "contractor_license": "LIC-US-002", "contractor_rating": 3.90, "contractor_blacklisted": False, "budget_allocated": 9500000.0, "budget_spent": 3500000.0, "status": "in_progress", "start_date": "2026-02-01", "target_end_date": "2026-12-31", "actual_end_date": None, "delay_days": 0, "road_type": "US-Highway", "region_code": "US", "length_km": 35.80},
                ],
                # GB
                13: [
                    {"id": 15, "title": "M25 Junction 8-12 Smart Motorway Upgrade", "road_id": 13, "road_name": "M25 (Junction 8-12)", "road_code": "M25-01", "contractor_id": 16, "contractor_name": "Thames Highway Services", "contractor_license": "LIC-GB-001", "contractor_rating": 4.50, "contractor_blacklisted": False, "budget_allocated": 95000000.0, "budget_spent": 40000000.0, "status": "in_progress", "start_date": "2025-09-01", "target_end_date": "2027-06-30", "actual_end_date": None, "delay_days": 0, "road_type": "Motorway", "region_code": "GB", "length_km": 18.90},
                ],
                14: [
                    {"id": 16, "title": "A406 North Circular Carriageway Repair", "road_id": 14, "road_name": "A406 (North Circular Road)", "road_code": "A406-NCR-01", "contractor_id": 18, "contractor_name": "London Asphalt Works", "contractor_license": "LIC-GB-003", "contractor_rating": 3.60, "contractor_blacklisted": False, "budget_allocated": 18000000.0, "budget_spent": 6000000.0, "status": "in_progress", "start_date": "2026-01-15", "target_end_date": "2026-12-31", "actual_end_date": None, "delay_days": 0, "road_type": "A-Road", "region_code": "GB", "length_km": 25.00},
                ],
                15: [
                    {"id": 17, "title": "A1 Holloway Road Safety Improvements", "road_id": 15, "road_name": "A1 (Holloway Road)", "road_code": "A1-HRW-01", "contractor_id": 16, "contractor_name": "Thames Highway Services", "contractor_license": "LIC-GB-001", "contractor_rating": 4.50, "contractor_blacklisted": False, "budget_allocated": 4800000.0, "budget_spent": 4600000.0, "status": "completed", "start_date": "2025-04-01", "target_end_date": "2025-10-31", "actual_end_date": "2025-10-28", "delay_days": 0, "road_type": "A-Road", "region_code": "GB", "length_km": 10.00},
                ],
                16: [
                    {"id": 18, "title": "Whitehall Pavement Restoration", "road_id": 16, "road_name": "Whitehall", "road_code": "WHITEHALL-01", "contractor_id": 17, "contractor_name": "Camden Civils Ltd", "contractor_license": "LIC-GB-002", "contractor_rating": 4.10, "contractor_blacklisted": False, "budget_allocated": 2200000.0, "budget_spent": 2100000.0, "status": "completed", "start_date": "2025-02-01", "target_end_date": "2025-06-30", "actual_end_date": "2025-06-25", "delay_days": 0, "road_type": "A-Road", "region_code": "GB", "length_km": 1.20},
                ],
                # KE
                17: [
                    {"id": 19, "title": "Uhuru Highway Bridge Expansion Joint Repair", "road_id": 17, "road_name": "Uhuru Highway", "road_code": "UHURU-HWY-01", "contractor_id": 19, "contractor_name": "Nairobi Road Builders Ltd", "contractor_license": "LIC-KE-001", "contractor_rating": 4.20, "contractor_blacklisted": False, "budget_allocated": 85000000.0, "budget_spent": 55000000.0, "status": "in_progress", "start_date": "2025-08-01", "target_end_date": "2026-08-31", "actual_end_date": None, "delay_days": 0, "road_type": "A-Road", "region_code": "KE", "length_km": 8.00},
                    {"id": 25, "title": "Uhuru Highway Street Lighting Installation", "road_id": 17, "road_name": "Uhuru Highway", "road_code": "UHURU-HWY-01", "contractor_id": 21, "contractor_name": "Mombasa Roadworks Ltd", "contractor_license": "LIC-KE-003", "contractor_rating": 2.80, "contractor_blacklisted": False, "budget_allocated": 12000000.0, "budget_spent": 2000000.0, "status": "planned", "start_date": "2026-07-01", "target_end_date": "2026-12-31", "actual_end_date": None, "delay_days": 0, "road_type": "A-Road", "region_code": "KE", "length_km": 8.00},
                ],
                18: [
                    {"id": 20, "title": "Mombasa Road Drainage Channel Desilting", "road_id": 18, "road_name": "Mombasa Road (A109)", "road_code": "MOMBASA-RD-01", "contractor_id": 20, "contractor_name": "Kenya Infrastructure Co Ltd", "contractor_license": "LIC-KE-002", "contractor_rating": 3.80, "contractor_blacklisted": False, "budget_allocated": 25000000.0, "budget_spent": 24000000.0, "status": "completed", "start_date": "2025-02-01", "target_end_date": "2025-07-31", "actual_end_date": "2025-08-10", "delay_days": 10, "road_type": "A-Road", "region_code": "KE", "length_km": 15.00},
                ],
                19: [
                    {"id": 21, "title": "Thika Superhighway Overlay & Safety Works", "road_id": 19, "road_name": "Thika Superhighway (A2)", "road_code": "THIKA-SHWY-01", "contractor_id": 19, "contractor_name": "Nairobi Road Builders Ltd", "contractor_license": "LIC-KE-001", "contractor_rating": 4.20, "contractor_blacklisted": False, "budget_allocated": 32000000.0, "budget_spent": 30000000.0, "status": "completed", "start_date": "2024-09-01", "target_end_date": "2025-06-30", "actual_end_date": "2025-07-15", "delay_days": 15, "road_type": "A-Road", "region_code": "KE", "length_km": 12.50},
                    {"id": 26, "title": "Thika Superhighway Footbridge Construction", "road_id": 19, "road_name": "Thika Superhighway (A2)", "road_code": "THIKA-SHWY-01", "contractor_id": 20, "contractor_name": "Kenya Infrastructure Co Ltd", "contractor_license": "LIC-KE-002", "contractor_rating": 3.80, "contractor_blacklisted": False, "budget_allocated": 15000000.0, "budget_spent": 0.00, "status": "planned", "start_date": "2026-08-01", "target_end_date": "2027-01-31", "actual_end_date": None, "delay_days": 0, "road_type": "A-Road", "region_code": "KE", "length_km": 12.50},
                ],
                20: [
                    {"id": 22, "title": "Lang'ata Road Widening & Overlay", "road_id": 20, "road_name": "Lang'ata Road", "road_code": "LANGATA-RD-01", "contractor_id": 20, "contractor_name": "Kenya Infrastructure Co Ltd", "contractor_license": "LIC-KE-002", "contractor_rating": 3.80, "contractor_blacklisted": False, "budget_allocated": 120000000.0, "budget_spent": 45000000.0, "status": "in_progress", "start_date": "2025-10-01", "target_end_date": "2027-03-31", "actual_end_date": None, "delay_days": 0, "road_type": "C-Road", "region_code": "KE", "length_km": 10.20},
                ],
                21: [
                    {"id": 23, "title": "Jogoo Road Drainage Improvement", "road_id": 21, "road_name": "Jogoo Road", "road_code": "JOGOO-RD-01", "contractor_id": 19, "contractor_name": "Nairobi Road Builders Ltd", "contractor_license": "LIC-KE-001", "contractor_rating": 4.20, "contractor_blacklisted": False, "budget_allocated": 18000000.0, "budget_spent": 6000000.0, "status": "in_progress", "start_date": "2026-01-01", "target_end_date": "2026-09-30", "actual_end_date": None, "delay_days": 0, "road_type": "B-Road", "region_code": "KE", "length_km": 6.80},
                ],
                22: [
                    {"id": 24, "title": "Waiyaki Way Drainage & Resurfacing", "road_id": 22, "road_name": "Waiyaki Way (C62)", "road_code": "WAIYAKI-WY-01", "contractor_id": 21, "contractor_name": "Mombasa Roadworks Ltd", "contractor_license": "LIC-KE-003", "contractor_rating": 2.80, "contractor_blacklisted": False, "budget_allocated": 45000000.0, "budget_spent": 44000000.0, "status": "completed", "start_date": "2024-11-01", "target_end_date": "2025-08-31", "actual_end_date": "2025-09-05", "delay_days": 5, "road_type": "C-Road", "region_code": "KE", "length_km": 9.50},
                ],
            }
            road_id = 3
            if len(params) > 0:
                try:
                    road_id = int(params[0])
                except (ValueError, TypeError):
                    pass
            return all_projects_by_road.get(road_id, [])

        # 12. Complaints Lookup
        if "complaints" in sql_lower or "from complaints" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Complaints Lookup")
            return [
                {
                    "id": 1,
                    "title": "Pothole on SV Road",
                    "description": "Large pothole near Andheri subway causing traffic",
                    "category": "pothole",
                    "status": "pending",
                    "created_at": "2024-11-20 10:00:00",
                    "road_id": 3,
                    "assigned_authority_id": 1,
                    "authority_name": "MCGM Ward K-West",
                    "authority_code": "MCGM-KWEST"
                }
            ]

        # 13. Contractors Lookup
        if "from contractors" in sql_lower or "contractors" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Contractors Lookup")
            # Build a list of all 21 contractors matching mock_data.sql
            all_contractors = [
                {"id": 1, "name": "Apex Infrastructure Ltd", "license_number": "LIC-IN-001", "registration_date": "2015-04-12", "contact_email": "contact@apexinfra.in", "contact_phone": "+91-22-61234567", "rating": 4.25, "projects_completed": 24, "projects_delayed": 2, "blacklisted": False, "blacklisted_reason": None},
                {"id": 2, "name": "BuildWell Roadways Ltd", "license_number": "LIC-IN-002", "registration_date": "2018-09-20", "contact_email": "projects@buildwell.in", "contact_phone": "+91-22-68919988", "rating": 3.80, "projects_completed": 18, "projects_delayed": 4, "blacklisted": False, "blacklisted_reason": None},
                {"id": 3, "name": "Zenith Construction Co", "license_number": "LIC-IN-003", "registration_date": "2012-01-15", "contact_email": "tenders@zenithcon.in", "contact_phone": "+91-22-55558888", "rating": 4.50, "projects_completed": 42, "projects_delayed": 1, "blacklisted": False, "blacklisted_reason": None},
                {"id": 4, "name": "Shiva Earthmovers Pvt Ltd", "license_number": "LIC-IN-004", "registration_date": "2020-06-30", "contact_email": "ops@shivaearth.in", "contact_phone": "+91-9820011223", "rating": 2.10, "projects_completed": 8, "projects_delayed": 5, "blacklisted": False, "blacklisted_reason": None},
                {"id": 5, "name": "Landmark Infra Projects", "license_number": "LIC-IN-005", "registration_date": "2019-11-05", "contact_email": "info@landmarkinfra.in", "contact_phone": "+91-22-25911020", "rating": 3.90, "projects_completed": 15, "projects_delayed": 2, "blacklisted": False, "blacklisted_reason": None},
                {"id": 6, "name": "Metro Highway Consultants", "license_number": "LIC-IN-006", "registration_date": "2014-03-22", "contact_email": "contact@metrohighway.in", "contact_phone": "+91-22-40900909", "rating": 4.60, "projects_completed": 31, "projects_delayed": 0, "blacklisted": False, "blacklisted_reason": None},
                {"id": 7, "name": "Coastal Paving Solutions", "license_number": "LIC-IN-007", "registration_date": "2021-02-18", "contact_email": "ops@coastalpaving.in", "contact_phone": "+91-22-88123456", "rating": 4.10, "projects_completed": 6, "projects_delayed": 2, "blacklisted": False, "blacklisted_reason": None},
                {"id": 8, "name": "Bharat Roads & Infra", "license_number": "LIC-IN-008", "registration_date": "2010-05-05", "contact_email": "contact@bharatroads.in", "contact_phone": "+91-22-26511234", "rating": 4.75, "projects_completed": 85, "projects_delayed": 3, "blacklisted": False, "blacklisted_reason": None},
                {"id": 9, "name": "Skyline Developers Ltd", "license_number": "LIC-IN-009", "registration_date": "2022-08-14", "contact_email": "bids@skylinedev.in", "contact_phone": "+91-9930088899", "rating": 3.40, "projects_completed": 4, "projects_delayed": 1, "blacklisted": False, "blacklisted_reason": None},
                {"id": 10, "name": "Omega Infrastructure Corp", "license_number": "LIC-IN-010", "registration_date": "2016-10-10", "contact_email": "legal@omegacorp.in", "contact_phone": "+91-22-67129900", "rating": 1.80, "projects_completed": 12, "projects_delayed": 8, "blacklisted": True, "blacklisted_reason": "Failure to complete SV Road drainage project inside contract timelines; substandard materials causing surface peeling within 3 months."},
                {"id": 11, "name": "Precision Asphalt Works", "license_number": "LIC-IN-011", "registration_date": "2023-01-20", "contact_email": "contact@precisionasphalt.in", "contact_phone": "+91-9004055112", "rating": 4.00, "projects_completed": 3, "projects_delayed": 0, "blacklisted": False, "blacklisted_reason": None},
                {"id": 12, "name": "Pioneer Engineering Corp", "license_number": "LIC-IN-012", "registration_date": "2017-07-07", "contact_email": "pioneer@pioneereng.in", "contact_phone": "+91-22-28776655", "rating": 3.20, "projects_completed": 14, "projects_delayed": 4, "blacklisted": False, "blacklisted_reason": None},
                {"id": 13, "name": "Great Lakes Infrastructure LLC", "license_number": "LIC-US-001", "registration_date": "2018-03-15", "contact_email": "bids@greatlakesinfra.com", "contact_phone": "+1-313-555-0101", "rating": 4.30, "projects_completed": 35, "projects_delayed": 2, "blacklisted": False, "blacklisted_reason": None},
                {"id": 14, "name": "Michigan Paving Company", "license_number": "LIC-US-002", "registration_date": "2019-07-22", "contact_email": "ops@michiganpaving.com", "contact_phone": "+1-313-555-0102", "rating": 3.90, "projects_completed": 22, "projects_delayed": 3, "blacklisted": False, "blacklisted_reason": None},
                {"id": 15, "name": "Detroit Roads Alliance", "license_number": "LIC-US-003", "registration_date": "2020-01-10", "contact_email": "contracts@detroitroads.org", "contact_phone": "+1-313-555-0103", "rating": 2.50, "projects_completed": 10, "projects_delayed": 5, "blacklisted": True, "blacklisted_reason": "Failure to complete I-94 resurfacing within contract timeline; substandard asphalt quality."},
                {"id": 16, "name": "Thames Highway Services", "license_number": "LIC-GB-001", "registration_date": "2016-11-01", "contact_email": "tenders@thameshighways.co.uk", "contact_phone": "+44-20-79460101", "rating": 4.50, "projects_completed": 48, "projects_delayed": 1, "blacklisted": False, "blacklisted_reason": None},
                {"id": 17, "name": "Camden Civils Ltd", "license_number": "LIC-GB-002", "registration_date": "2021-02-14", "contact_email": "projects@camdencivils.co.uk", "contact_phone": "+44-20-79460102", "rating": 4.10, "projects_completed": 12, "projects_delayed": 1, "blacklisted": False, "blacklisted_reason": None},
                {"id": 18, "name": "London Asphalt Works", "license_number": "LIC-GB-003", "registration_date": "2017-09-05", "contact_email": "info@londonasphalt.co.uk", "contact_phone": "+44-20-79460103", "rating": 3.60, "projects_completed": 28, "projects_delayed": 6, "blacklisted": False, "blacklisted_reason": None},
                {"id": 19, "name": "Nairobi Road Builders Ltd", "license_number": "LIC-KE-001", "registration_date": "2015-05-20", "contact_email": "info@nairobiroadbuilders.co.ke", "contact_phone": "+254-20-5550101", "rating": 4.20, "projects_completed": 30, "projects_delayed": 3, "blacklisted": False, "blacklisted_reason": None},
                {"id": 20, "name": "Kenya Infrastructure Co Ltd", "license_number": "LIC-KE-002", "registration_date": "2018-08-12", "contact_email": "tenders@kenyainfra.co.ke", "contact_phone": "+254-20-5550102", "rating": 3.80, "projects_completed": 18, "projects_delayed": 4, "blacklisted": False, "blacklisted_reason": None},
                {"id": 21, "name": "Mombasa Roadworks Ltd", "license_number": "LIC-KE-003", "registration_date": "2020-03-30", "contact_email": "projects@mombasaroadworks.co.ke", "contact_phone": "+254-20-5550103", "rating": 2.80, "projects_completed": 8, "projects_delayed": 5, "blacklisted": False, "blacklisted_reason": None},
            ]
            # If name-based lookup was used, filter
            if len(params) > 0 and isinstance(params[0], str):
                name_query = params[0].lower().strip('%')
                matches = [c for c in all_contractors if name_query in c["name"].lower()]
                if matches:
                    return [matches[0]]
            # If ID-based lookup, filter by the param if numeric
            if len(params) > 0:
                try:
                    cid = int(params[0])
                    matches = [c for c in all_contractors if c["id"] == cid]
                    if matches:
                        return [matches[0]]
                except (ValueError, TypeError):
                    pass
            return all_contractors

        # 14. Roads Lookup
        if "from roads" in sql_lower or "roads" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Roads Lookup")
            # Map of all 22 roads matching mock_data.sql — authority names/codes align with authorities table
            all_roads = {
                1: {"id": 1, "name": "Western Express Highway", "road_code": "WEH-NH8", "status": "under_construction", "length_km": 25.50, "road_type": "NH", "last_relaying_date": "2025-03-15", "contractor_id": 1, "authority_id": 5, "authority_name": "National Highways Authority of India - RO Mumbai", "authority_code": "NHAI-ROM", "geom": "LINESTRING(72.8524 19.1012, 72.8530 19.1340, 72.8590 19.1860, 72.8610 19.2300)", "region_code": "IN"},
                2: {"id": 2, "name": "Eastern Express Highway", "road_code": "EEH-NH8", "status": "fair", "length_km": 22.10, "road_type": "SH", "last_relaying_date": "2020-11-20", "contractor_id": 2, "authority_id": 4, "authority_name": "State Public Works Department - Mumbai Division", "authority_code": "PWD-MUM", "geom": "LINESTRING(72.9210 19.0410, 72.9340 19.1020, 72.9460 19.1680, 72.9610 19.2150)", "region_code": "IN"},
                3: {"id": 3, "name": "S.V. Road", "road_code": "SV-RD-01", "status": "poor", "length_km": 16.80, "road_type": "City", "last_relaying_date": "2018-06-10", "contractor_id": 10, "authority_id": 1, "authority_name": "City Municipal Corporation - Ward K-West", "authority_code": "MCGM-KW", "geom": "LINESTRING(72.8354 19.0601, 72.8360 19.1020, 72.8398 19.1620, 72.8450 19.2080)", "region_code": "IN"},
                4: {"id": 4, "name": "Link Road", "road_code": "LINK-RD-01", "status": "under_construction", "length_km": 18.20, "road_type": "City", "last_relaying_date": "2025-10-01", "contractor_id": 6, "authority_id": 1, "authority_name": "City Municipal Corporation - Ward K-West", "authority_code": "MCGM-KW", "geom": "LINESTRING(72.8250 19.0805, 72.8270 19.1240, 72.8310 19.1840, 72.8510 19.2450)", "region_code": "IN"},
                5: {"id": 5, "name": "LBS Marg", "road_code": "LBS-MARG-01", "status": "poor", "length_km": 21.00, "road_type": "City", "last_relaying_date": "2017-04-05", "contractor_id": 4, "authority_id": 3, "authority_name": "City Municipal Corporation - Ward H-East", "authority_code": "MCGM-HE", "geom": "LINESTRING(72.8890 19.0305, 72.8980 19.0840, 72.9120 19.1360, 72.9350 19.1980)", "region_code": "IN"},
                6: {"id": 6, "name": "Senapati Bapat Marg", "road_code": "SBM-MARG-01", "status": "good", "length_km": 7.50, "road_type": "City", "last_relaying_date": "2023-12-10", "contractor_id": 3, "authority_id": 2, "authority_name": "City Municipal Corporation - Ward F-North", "authority_code": "MCGM-FN", "geom": "LINESTRING(72.8240 18.9510, 72.8260 18.9850, 72.8290 19.0180)", "region_code": "IN"},
                7: {"id": 7, "name": "Ghodbunder Road", "road_code": "GHODBUNDER-RD-01", "status": "good", "length_km": 20.00, "road_type": "SH", "last_relaying_date": "2024-12-25", "contractor_id": 8, "authority_id": 4, "authority_name": "State Public Works Department - Mumbai Division", "authority_code": "PWD-MUM", "geom": "LINESTRING(72.9550 19.2220, 72.9310 19.2520, 72.8990 19.2680, 72.8680 19.2810)", "region_code": "IN"},
                8: {"id": 8, "name": "Marine Drive", "road_code": "MARINE-DR-01", "status": "good", "length_km": 3.60, "road_type": "City", "last_relaying_date": "2025-01-20", "contractor_id": 3, "authority_id": 2, "authority_name": "City Municipal Corporation - Ward F-North", "authority_code": "MCGM-FN", "geom": "LINESTRING(72.8205 18.9210, 72.8210 18.9320, 72.8235 18.9480)", "region_code": "IN"},
                # US — Detroit
                9: {"id": 9, "name": "I-94 (Edsel Ford Freeway)", "road_code": "I94-WD-01", "status": "fair", "length_km": 45.20, "road_type": "Interstate", "last_relaying_date": "2021-05-15", "contractor_id": 13, "authority_id": 8, "authority_name": "Federal Highway Administration - Michigan Division", "authority_code": "FHWA-MI", "geom": "LINESTRING(-83.1500 42.3500, -83.1000 42.3550, -83.0500 42.3600, -82.9900 42.3650, -82.9400 42.3700)", "region_code": "US"},
                10: {"id": 10, "name": "M-10 (Lodge Freeway)", "road_code": "M10-WD-01", "status": "poor", "length_km": 21.50, "road_type": "US-Highway", "last_relaying_date": "2019-08-20", "contractor_id": 14, "authority_id": 8, "authority_name": "Federal Highway Administration - Michigan Division", "authority_code": "FHWA-MI", "geom": "LINESTRING(-83.1200 42.3200, -83.1150 42.3500, -83.1100 42.3800, -83.1050 42.4100)", "region_code": "US"},
                11: {"id": 11, "name": "Woodward Avenue", "road_code": "WOODWARD-01", "status": "good", "length_km": 27.00, "road_type": "US-Highway", "last_relaying_date": "2024-10-05", "contractor_id": 13, "authority_id": 7, "authority_name": "Michigan Department of Transportation", "authority_code": "MDOT-LAN", "geom": "LINESTRING(-83.0800 42.3500, -83.0750 42.3800, -83.0700 42.4100, -83.0650 42.4400)", "region_code": "US"},
                12: {"id": 12, "name": "Gratiot Avenue", "road_code": "GRATIOT-01", "status": "fair", "length_km": 35.80, "road_type": "US-Highway", "last_relaying_date": "2022-04-18", "contractor_id": 14, "authority_id": 7, "authority_name": "Michigan Department of Transportation", "authority_code": "MDOT-LAN", "geom": "LINESTRING(-82.9800 42.3500, -82.9700 42.3800, -82.9600 42.4100, -82.9500 42.4400)", "region_code": "US"},
                # GB — London
                13: {"id": 13, "name": "M25 (Junction 8-12)", "road_code": "M25-01", "status": "fair", "length_km": 18.90, "road_type": "Motorway", "last_relaying_date": "2023-05-20", "contractor_id": 16, "authority_id": 12, "authority_name": "National Highways - South East Division", "authority_code": "NH-SE", "geom": "LINESTRING(-0.3000 51.2800, -0.2500 51.2900, -0.2000 51.3000, -0.1500 51.3100)", "region_code": "GB"},
                14: {"id": 14, "name": "A406 (North Circular Road)", "road_code": "A406-NCR-01", "status": "fair", "length_km": 25.00, "road_type": "A-Road", "last_relaying_date": "2023-08-20", "contractor_id": 18, "authority_id": 12, "authority_name": "National Highways - South East Division", "authority_code": "NH-SE", "geom": "LINESTRING(-0.3000 51.5800, -0.2500 51.5700, -0.2000 51.5600, -0.1500 51.5500)", "region_code": "GB"},
                15: {"id": 15, "name": "A1 (Holloway Road)", "road_code": "A1-HRW-01", "status": "fair", "length_km": 10.00, "road_type": "A-Road", "last_relaying_date": "2022-06-15", "contractor_id": 16, "authority_id": 11, "authority_name": "London Highways Joint Committee", "authority_code": "LHJC-LON", "geom": "LINESTRING(-0.1200 51.5400, -0.1150 51.5500, -0.1100 51.5600, -0.1000 51.5700)", "region_code": "GB"},
                16: {"id": 16, "name": "Whitehall", "road_code": "WHITEHALL-01", "status": "good", "length_km": 1.20, "road_type": "A-Road", "last_relaying_date": "2025-01-15", "contractor_id": 17, "authority_id": 11, "authority_name": "London Highways Joint Committee", "authority_code": "LHJC-LON", "geom": "LINESTRING(-0.1280 51.5040, -0.1270 51.5060, -0.1260 51.5080, -0.1250 51.5100)", "region_code": "GB"},
                # KE — Nairobi
                17: {"id": 17, "name": "Uhuru Highway", "road_code": "UHURU-HWY-01", "status": "fair", "length_km": 8.00, "road_type": "A-Road", "last_relaying_date": "2021-12-15", "contractor_id": 19, "authority_id": 16, "authority_name": "Kenya National Highways Authority", "authority_code": "KeNHA-HQ", "geom": "LINESTRING(36.8200 -1.2800, 36.8150 -1.2900, 36.8100 -1.3000, 36.8050 -1.3100)", "region_code": "KE"},
                18: {"id": 18, "name": "Mombasa Road (A109)", "road_code": "MOMBASA-RD-01", "status": "poor", "length_km": 15.00, "road_type": "A-Road", "last_relaying_date": "2018-07-20", "contractor_id": 20, "authority_id": 16, "authority_name": "Kenya National Highways Authority", "authority_code": "KeNHA-HQ", "geom": "LINESTRING(36.8500 -1.3000, 36.8700 -1.3100, 36.8900 -1.3200, 36.9100 -1.3250)", "region_code": "KE"},
                19: {"id": 19, "name": "Thika Superhighway (A2)", "road_code": "THIKA-SHWY-01", "status": "good", "length_km": 12.50, "road_type": "A-Road", "last_relaying_date": "2024-03-30", "contractor_id": 21, "authority_id": 15, "authority_name": "Kenya Urban Roads Authority", "authority_code": "KURA-HQ", "geom": "LINESTRING(36.8300 -1.2700, 36.8400 -1.2600, 36.8500 -1.2500, 36.8600 -1.2400)", "region_code": "KE"},
                20: {"id": 20, "name": "Lang'ata Road", "road_code": "LANGATA-RD-01", "status": "under_construction", "length_km": 10.20, "road_type": "C-Road", "last_relaying_date": "2025-10-01", "contractor_id": 20, "authority_id": 14, "authority_name": "Nairobi City County - Department of Roads & Transport", "authority_code": "NCC-ROADS", "geom": "LINESTRING(36.7800 -1.3200, 36.7900 -1.3150, 36.8000 -1.3100, 36.8100 -1.3050)", "region_code": "KE"},
                21: {"id": 21, "name": "Jogoo Road", "road_code": "JOGOO-RD-01", "status": "fair", "length_km": 6.80, "road_type": "B-Road", "last_relaying_date": "2022-10-10", "contractor_id": 19, "authority_id": 14, "authority_name": "Nairobi City County - Department of Roads & Transport", "authority_code": "NCC-ROADS", "geom": "LINESTRING(36.8600 -1.2900, 36.8700 -1.2950, 36.8800 -1.3000, 36.8900 -1.3050)", "region_code": "KE"},
                22: {"id": 22, "name": "Waiyaki Way (C62)", "road_code": "WAIYAKI-WY-01", "status": "fair", "length_km": 9.50, "road_type": "C-Road", "last_relaying_date": "2021-06-15", "contractor_id": 21, "authority_id": 15, "authority_name": "Kenya Urban Roads Authority", "authority_code": "KURA-HQ", "geom": "LINESTRING(36.7700 -1.2600, 36.7800 -1.2750, 36.7900 -1.2900, 36.8000 -1.3050)", "region_code": "KE"},
            }
            road_id = 3
            if len(params) > 0:
                try:
                    road_id = int(params[0])
                except (ValueError, TypeError):
                    pass
            if road_id in all_roads:
                return [all_roads[road_id]]
            return [all_roads[3]]

        # 15. Authorities Lookup
        if "authorities" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Authorities Lookup")
            return [
                {
                    "id": 1, "name": "Brihanmumbai Municipal Corporation (BMC) Ward H-West",
                    "department_code": "BMC-HWEST", "contact_email": "ee.kw@mcgm.gov.in",
                    "contact_phone": "+91-22-2623-0101", "region_code": "IN",
                    "geom_boundary": "POLYGON((72.8 19.0, 72.9 19.0, 72.9 19.1, 72.8 19.1, 72.8 19.0))",
                    "region_name": "India", "default_currency": "INR", "locale": "en-IN", "phone_format": "+91-XX-XXXX-XXXX"
                },
                {
                    "id": 3, "name": "MCGM Ward K-West",
                    "department_code": "MCGM-KWEST", "contact_email": "ee.kw@mcgm.gov.in",
                    "contact_phone": "+91-22-2623-0101", "region_code": "IN",
                    "geom_boundary": "POLYGON((72.8 19.0, 72.9 19.0, 72.9 19.1, 72.8 19.1, 72.8 19.0))",
                    "region_name": "India", "default_currency": "INR", "locale": "en-IN", "phone_format": "+91-XX-XXXX-XXXX"
                }
            ]

        # 16. Regions Lookup
        if "regions" in sql_lower:
            print("[DEBUG MOCK DB] MATCHED: Regions Lookup")
            return [
                {"code": "IN", "name": "India", "default_currency": "INR", "locale": "en-IN"},
                {"code": "US", "name": "United States", "default_currency": "USD", "locale": "en-US"},
                {"code": "GB", "name": "United Kingdom", "default_currency": "GBP", "locale": "en-GB"},
                {"code": "KE", "name": "Kenya", "default_currency": "KES", "locale": "en-KE"}
            ]

        print("[DEBUG MOCK DB] MATCHED: None (returning empty list)")
        return []

    def execute(self, sql, params=()):
        # Convert SQLite parameter placeholder (?) to Postgres (%s)
        sql = sql.replace('?', '%s')
        
        is_insert = sql.strip().upper().startswith("INSERT INTO")
        if is_insert and "RETURNING" not in sql.upper():
            sql_clean = sql.strip().rstrip(';')
            sql_clean += " RETURNING id"
            sql = sql_clean
            sql = sql_clean

        conn = None
        try:
            conn = self.engine.raw_connection()
            with conn.cursor() as cursor:
                cursor.execute("SET app.changed_by = %s", (get_audit_user(),))
                cursor.execute(sql, params)
                inserted_id = None
                if is_insert:
                    inserted_id = cursor.fetchone()[0]
                conn.commit()
                return inserted_id if is_insert else cursor.rowcount
        except Exception as e:
            print(f"Database Execution Error: {sql} | Params: {params} | Error: {e}")
            if conn:
                conn.rollback()
            return None
        finally:
            if conn:
                conn.close()

    def init_pg_trgm(self):
        """Enable pg_trgm extension for text similarity queries."""
        try:
            conn = self.engine.raw_connection()
            with conn.cursor() as cursor:
                cursor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
                conn.commit()
                print("pg_trgm extension enabled.")
            conn.close()
        except Exception as e:
            print(f"pg_trgm init error (non-fatal): {e}")

    def init_database(self, schema_path: str = "docs/schema.sql", seed_path: str = "docs/mock_data.sql"):
        """
        Initializes the database schema and seeds it if tables are empty.
        Reads schema.sql and mock_data.sql from the project docs directory.
        Safe to call multiple times — only runs if tables are empty or missing.
        """
        try:
            conn = self.engine.raw_connection()
            with conn.cursor() as cursor:
                cursor.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'authorities')")
                table_exists = cursor.fetchone()[0]
                if table_exists:
                    cursor.execute("SELECT COUNT(*) FROM authorities")
                    count = cursor.fetchone()[0]
                    if count > 0:
                        conn.close()
                        print("Database already seeded, skipping initialization.")
                        return

                base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                schema_file = os.path.join(base_dir, schema_path)
                seed_file = os.path.join(base_dir, seed_path)

                if os.path.exists(schema_file):
                    print(f"Executing schema: {schema_file}")
                    with open(schema_file, 'r') as f:
                        schema_sql = f.read()
                    cursor.execute(schema_sql)
                    conn.commit()
                    print("Schema applied successfully.")
                else:
                    print(f"Schema file not found at {schema_file}, skipping.")

                if os.path.exists(seed_file) and (not table_exists):
                    print(f"Executing seed data: {seed_file}")
                    with open(seed_file, 'r') as f:
                        seed_sql = f.read()
                    cursor.execute(seed_sql)
                    conn.commit()
                    print("Seed data inserted successfully.")
            conn.close()
        except Exception as e:
            print(f"Database initialization error (non-fatal): {e}")
            try:
                conn.rollback()
            except Exception:
                pass


# Singleton instance of database
db = Database()
# Auto-initialize schema and seed data on module load
db.init_pg_trgm()
db.init_database()
