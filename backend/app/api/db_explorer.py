"""Database explorer: the schema, its rules and a set of read-only example queries.

Shows how the application's data is stored, for staff and for project reviews.
The example queries are fixed on the server; clients choose one by key and can
never send their own SQL.
"""
from fastapi import APIRouter, Depends, HTTPException
from psycopg2 import sql

from app.api.auth import STAFF, require
from app.services.live_db import rows, tx

router = APIRouter(prefix="/screens/database")

# A point on S.V. Road, Mumbai, used by the spatial examples.
SAMPLE_POINT = "ST_SetSRID(ST_MakePoint(72.8371, 19.1197), 4326)"

QUERIES = [
    {
        "key": "complaints-by-ward",
        "title": "Complaints per ward",
        "concept": "JOIN, GROUP BY and filtered aggregates",
        "sql": """SELECT a.department_code AS ward,
       a.name AS authority,
       COUNT(c.id) AS complaints,
       COUNT(c.id) FILTER (WHERE c.status IN ('pending', 'routed', 'in_progress')) AS open,
       COUNT(c.id) FILTER (WHERE c.sla_breached_at IS NOT NULL) AS sla_breaches
FROM authorities a
JOIN complaints c ON c.assigned_authority_id = a.id
WHERE a.region_code = 'IN'
GROUP BY a.id
ORDER BY complaints DESC
LIMIT 10""",
    },
    {
        "key": "ward-for-point",
        "title": "Which ward owns this spot?",
        "concept": "PostGIS ST_Contains on ward boundaries (used to route every report)",
        "sql": f"""SELECT a.department_code AS ward,
       a.name AS authority,
       a.contact_email
FROM authorities a
WHERE ST_Contains(a.geom_boundary, {SAMPLE_POINT})""",
    },
    {
        "key": "road-for-point",
        "title": "Which road is this spot on?",
        "concept": "PostGIS ST_DWithin within 20 m, the rule that links a report to a road",
        "sql": f"""SELECT r.road_code,
       r.name,
       ROUND(ST_Distance(r.geom::geography, {SAMPLE_POINT}::geography)::numeric, 1) AS metres
FROM roads r
WHERE ST_DWithin(r.geom::geography, {SAMPLE_POINT}::geography, 20)
ORDER BY metres""",
    },
    {
        "key": "contractor-ranking",
        "title": "Contractor ranking",
        "concept": "Window function RANK() over a trigger-maintained score",
        "sql": """SELECT RANK() OVER (ORDER BY performance_index DESC) AS rank,
       name,
       rating,
       projects_completed,
       projects_delayed,
       performance_index,
       blacklisted
FROM contractors
ORDER BY rank
LIMIT 15""",
    },
    {
        "key": "over-budget",
        "title": "Projects over budget",
        "concept": "Computed columns, NULLIF and a JOIN",
        "sql": """SELECT p.title,
       c.name AS contractor,
       p.budget_allocated,
       p.budget_spent,
       ROUND((p.budget_spent - p.budget_allocated) / NULLIF(p.budget_allocated, 0) * 100, 1) AS overrun_pct
FROM projects p
JOIN contractors c ON c.id = p.contractor_id
WHERE p.budget_spent > p.budget_allocated
ORDER BY overrun_pct DESC
LIMIT 10""",
    },
    {
        "key": "monthly-trend",
        "title": "Monthly complaint trend",
        "concept": "Common table expression (WITH) and date_trunc",
        "sql": """WITH monthly AS (
    SELECT date_trunc('month', created_at)::date AS month,
           COUNT(*) AS filed,
           COUNT(*) FILTER (WHERE status = 'resolved') AS resolved
    FROM complaints
    GROUP BY 1
)
SELECT month, filed, resolved,
       ROUND(resolved * 100.0 / filed, 1) AS resolved_pct
FROM monthly
ORDER BY month DESC
LIMIT 12""",
    },
    {
        "key": "status-history",
        "title": "Status history written by a trigger",
        "concept": "AFTER UPDATE trigger on complaints, weak entity keyed by (complaint_id, history_seq)",
        "sql": """SELECT h.complaint_id,
       h.history_seq,
       h.old_status,
       h.new_status,
       h.changed_at,
       h.remarks
FROM status_history h
ORDER BY h.changed_at DESC
LIMIT 12""",
    },
    {
        "key": "citizen-view",
        "title": "Public view, read as the citizen role",
        "concept": "SET ROLE roadwatch_citizen, then SELECT from a view the role is granted",
        "role": "citizen",
        "sql": """SELECT *
FROM v_public_contractor_ranking
LIMIT 10""",
    },
    {
        "key": "citizen-denied",
        "title": "Citizen role reading a base table",
        "concept": "Access control: the database itself refuses (expected to fail)",
        "role": "citizen",
        "sql": """SELECT id, title, citizen_id
FROM complaints
LIMIT 5""",
    },
]
BY_KEY = {q["key"]: q for q in QUERIES}

TABLES_SQL = """
SELECT c.relname AS name,
       obj_description(c.oid, 'pg_class') AS comment,
       (SELECT COUNT(*) FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped) AS columns,
       (SELECT string_agg(a.attname, ', ' ORDER BY array_position(i.indkey::int[], a.attnum::int))
          FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
         WHERE i.indrelid = c.oid AND i.indisprimary) AS primary_key,
       (SELECT COALESCE(json_agg(json_build_object('column', a.attname, 'references', f.relname) ORDER BY a.attname), '[]')
          FROM pg_constraint k
          JOIN pg_class f ON f.oid = k.confrelid
          JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = k.conkey[1]
         WHERE k.conrelid = c.oid AND k.contype = 'f') AS foreign_keys,
       (SELECT COUNT(*) FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'c') AS checks,
       (SELECT COUNT(*) FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'u') AS uniques,
       (SELECT COUNT(*) FROM pg_index i WHERE i.indrelid = c.oid) AS indexes,
       (SELECT COUNT(*) FROM pg_trigger t WHERE t.tgrelid = c.oid AND NOT t.tgisinternal) AS triggers
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> 'spatial_ref_sys'
ORDER BY c.relname
"""

TRIGGERS_SQL = """
SELECT t.tgname AS name,
       c.relname AS table_name,
       p.proname AS function,
       CASE WHEN t.tgtype & 2 = 2 THEN 'BEFORE' WHEN t.tgtype & 64 = 64 THEN 'INSTEAD OF' ELSE 'AFTER' END AS timing,
       concat_ws(' OR ',
                 CASE WHEN t.tgtype & 4 = 4 THEN 'INSERT' END,
                 CASE WHEN t.tgtype & 16 = 16 THEN 'UPDATE' END,
                 CASE WHEN t.tgtype & 8 = 8 THEN 'DELETE' END) AS events
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE NOT t.tgisinternal AND n.nspname = 'public'
ORDER BY c.relname, t.tgname
"""

VIEWS_SQL = """
SELECT v.viewname AS name,
       COALESCE((SELECT string_agg(DISTINCT replace(g.grantee, 'roadwatch_', ''), ', ')
                   FROM information_schema.role_table_grants g
                  WHERE g.table_name = v.viewname AND g.grantee LIKE 'roadwatch\\_%%'
                    AND g.privilege_type = 'SELECT'), '') AS granted_to
FROM pg_views v
WHERE v.schemaname = 'public' AND v.viewname NOT IN ('geography_columns', 'geometry_columns')
ORDER BY v.viewname
"""

FUNCTIONS_SQL = """
SELECT p.proname AS name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public' AND l.lanname = 'plpgsql'
ORDER BY p.proname
"""


@router.get("")
def explorer(user: dict = Depends(require(*STAFF))):
    with tx() as cur:
        cur.execute("SET TRANSACTION READ ONLY")
        cur.execute(TABLES_SQL)
        tables = [dict(r) for r in cur.fetchall()]
        for table in tables:
            cur.execute(sql.SQL("SELECT COUNT(*) AS n FROM {}").format(sql.Identifier(table["name"])))
            table["rows"] = cur.fetchone()["n"]
        cur.execute(TRIGGERS_SQL)
        triggers = [dict(r) for r in cur.fetchall()]
        cur.execute(VIEWS_SQL)
        views = [dict(r) for r in cur.fetchall()]
        cur.execute(FUNCTIONS_SQL)
        functions = [r["name"] for r in cur.fetchall()]
        cur.execute("SELECT rolname FROM pg_roles WHERE rolname LIKE 'roadwatch\\_%%' ORDER BY rolname")
        roles = [r["rolname"] for r in cur.fetchall()]
        cur.execute(
            """SELECT current_setting('server_version') AS postgres, postgis_lib_version() AS postgis,
                      (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexdef ILIKE '%%USING gist%%') AS spatial_indexes"""
        )
        engine = dict(cur.fetchone())
        cur.execute(
            """SELECT id, table_name, record_id, action, changed_by, changed_at
               FROM audit_log ORDER BY id DESC LIMIT 8"""
        )
        recent_changes = [dict(r) for r in cur.fetchall()]
    return {
        "engine": engine,
        "tables": tables,
        "triggers": triggers,
        "views": views,
        "functions": functions,
        "roles": roles,
        "recent_changes": recent_changes,
        "queries": [{k: q[k] for k in ("key", "title", "concept", "sql")} | {"role": q.get("role")} for q in QUERIES],
    }


@router.post("/queries/{key}")
def run_query(key: str, user: dict = Depends(require(*STAFF))):
    query = BY_KEY.get(key)
    if not query:
        raise HTTPException(status_code=404, detail="Unknown example query")
    try:
        with tx(role=query.get("role")) as cur:
            cur.execute("SET TRANSACTION READ ONLY")
            cur.execute("SET LOCAL statement_timeout = '5s'")
            cur.execute(query["sql"])
            columns = [d.name for d in cur.description]
            result = [dict(r) for r in cur.fetchmany(50)]
    except HTTPException as exc:
        # A refusal is a result worth showing, for example the role check.
        return {"key": key, "columns": [], "rows": [], "error": exc.detail}
    return {"key": key, "columns": columns, "rows": result, "error": None}
