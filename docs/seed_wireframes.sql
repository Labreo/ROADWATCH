-- =========================================================================
-- ROADWATCH sample data scaled to the wireframe totals for Mumbai:
-- 412 roads, 1,284 complaints (184 open) and Rs 412.8 Cr spent of Rs 384 Cr.
--
-- Everything here is invented demo data. Load after schema_documented.sql.
-- The script runs once; it stops if the sample streets already exist.
-- =========================================================================
DO $seed$
BEGIN
    IF EXISTS (SELECT 1 FROM roads WHERE road_code LIKE 'WARD-%') THEN
        RETURN;
    END IF;

    -- Skip audit and history triggers: this is bulk sample data, not activity.
    SET LOCAL session_replication_role = replica;
    PERFORM setseed(0.42);

    -- Contractor names used in the wireframes.
    UPDATE contractors SET name = 'Apex Roadbuilders' WHERE name = 'Apex Infrastructure Ltd';
    UPDATE contractors SET name = 'Omega Infrastructure' WHERE name = 'Omega Infrastructure Corp';
    UPDATE contractors SET name = 'Zenith Construction' WHERE name = 'Zenith Construction Co';

    -- Ward streets up to 412 Indian roads.
    INSERT INTO roads (name, road_code, status, length_km, authority_id, geom, road_type, surface_type, lane_count, width_m, aadt, last_relaying_date, contractor_id)
    SELECT 'Ward ' || a.department_code || ' Street ' || n,
           'WARD-' || lpad(n::text, 5, '0'),
           (ARRAY['good', 'good', 'good', 'fair', 'fair', 'poor', 'under_construction'])[1 + floor(random() * 7)::int],
           GREATEST(ROUND((ST_Length(line.geom::geography) / 1000)::numeric, 2), 0.05),
           a.id, line.geom, 'City', 'asphalt', 2, 7.5,
           (4000 + random() * 16000)::int,
           DATE '2019-01-01' + (random() * 2400)::int,
           (SELECT id FROM contractors WHERE license_number LIKE 'LIC-IN-%' AND NOT blacklisted ORDER BY id LIMIT 1 OFFSET (n % 11))
    FROM generate_series(1, 404) AS n
    CROSS JOIN LATERAL (
        SELECT * FROM authorities
        WHERE department_code = (ARRAY['MCGM-KW', 'MCGM-FN', 'MCGM-HE'])[1 + (n % 3)]
    ) AS a
    CROSS JOIN LATERAL (
        SELECT ST_XMin(a.geom_boundary) + 0.01 + (ST_XMax(a.geom_boundary) - ST_XMin(a.geom_boundary) - 0.02) * random() AS x,
               ST_YMin(a.geom_boundary) + 0.01 + (ST_YMax(a.geom_boundary) - ST_YMin(a.geom_boundary) - 0.02) * random() AS y,
               random() * 2 * pi() AS bearing,
               0.003 + random() * 0.007 AS span
    ) AS p
    CROSS JOIN LATERAL (
        SELECT ST_SetSRID(ST_MakeLine(
            ST_MakePoint(p.x, p.y),
            ST_MakePoint(p.x + cos(p.bearing) * p.span, p.y + sin(p.bearing) * p.span)
        ), 4326) AS geom
    ) AS line
    WHERE (SELECT COUNT(*) FROM roads r JOIN authorities x ON x.id = r.authority_id WHERE x.region_code = 'IN') < 412;

    -- Complaints up to 1,284 Indian reports, 184 of them open.
    WITH sample AS (
        SELECT n,
               (SELECT id FROM roads WHERE road_code = 'WARD-' || lpad((1 + (n * 7) % 404)::text, 5, '0')) AS road_id,
               (ARRAY['pothole', 'paving_defect', 'waterlogging', 'debris', 'missing_signage'])[1 + (n % 5)] AS category
        FROM generate_series(1, 1277) AS n
    )
    INSERT INTO complaints (title, description, category, geom, status, priority, target_resolution_hours,
                            assigned_authority_id, road_id, citizen_id, sla_breached_at, created_at, updated_at)
    SELECT initcap(replace(s.category, '_', ' ')) || ' on ' || r.name,
           'Sample citizen report for demonstration.',
           s.category,
           ST_LineInterpolatePoint(r.geom, 0.5),
           CASE WHEN s.n <= 178 THEN (ARRAY['pending', 'routed', 'in_progress'])[1 + (s.n % 3)]
                WHEN s.n % 40 = 0 THEN 'rejected' ELSE 'resolved' END,
           1 + (s.n % 5), 48, r.authority_id, r.id,
           CASE WHEN s.n % 92 = 0 THEN 2 WHEN s.n % 93 = 0 THEN 3 WHEN s.n % 94 = 0 THEN 4 ELSE 1 END,
           CASE WHEN s.n > 178 AND s.n <= 1200 AND s.n % 8 = 0 THEN NOW() - INTERVAL '20 days' END,
           t.created_at, t.created_at
    FROM sample s
    JOIN roads r ON r.id = s.road_id
    CROSS JOIN LATERAL (
        SELECT CASE WHEN s.n <= 178 THEN NOW() - make_interval(hours => (1 + s.n % 30))
                    ELSE NOW() - make_interval(days => (2 + s.n % 170)) END AS created_at
    ) AS t;

    INSERT INTO status_history (complaint_id, history_seq, old_status, new_status, changed_at, remarks)
    SELECT id, 1, NULL, CASE WHEN status = 'pending' THEN 'pending' ELSE 'routed' END, created_at, 'Received from citizen'
    FROM complaints WHERE description = 'Sample citizen report for demonstration.';

    INSERT INTO status_history (complaint_id, history_seq, old_status, new_status, changed_at, remarks)
    SELECT id, 2, 'routed', status, created_at + make_interval(hours => (6 + id % 28)), 'Repair verified on site'
    FROM complaints
    WHERE description = 'Sample citizen report for demonstration.' AND status IN ('resolved', 'rejected', 'in_progress');

    -- Capital works on the main corridors, bringing totals to the wireframe figures.
    WITH gap AS (
        SELECT 3840000000 - COALESCE(SUM(p.budget_allocated), 0) AS allocated,
               4128000000 - COALESCE(SUM(p.budget_spent), 0) AS spent,
               4128000000 - (SELECT COALESCE(SUM(f.amount), 0) FROM fund_sources f
                             JOIN projects q ON q.id = f.project_id
                             JOIN authorities x ON x.id = q.authority_id WHERE x.region_code = 'IN') AS funded
        FROM projects p JOIN authorities a ON a.id = p.authority_id
        WHERE a.region_code = 'IN' AND p.status <> 'cancelled'
    ),
    corridor AS (
        SELECT r.id, r.authority_id, r.name, ROW_NUMBER() OVER (ORDER BY r.id) AS n
        FROM roads r JOIN authorities a ON a.id = r.authority_id
        WHERE a.region_code = 'IN' AND r.road_code NOT LIKE 'WARD-%'
    ),
    added AS (
        INSERT INTO projects (title, road_id, contractor_id, authority_id, budget_allocated, budget_spent, status, start_date, target_end_date)
        SELECT c.name || ' capacity upgrade',
               c.id,
               (SELECT id FROM contractors WHERE license_number LIKE 'LIC-IN-%' AND NOT blacklisted ORDER BY id LIMIT 1 OFFSET (c.n % 5)),
               c.authority_id,
               ROUND(g.allocated / (SELECT COUNT(*) FROM corridor), 2),
               ROUND(g.spent / (SELECT COUNT(*) FROM corridor), 2),
               'in_progress', DATE '2025-04-01', DATE '2027-03-31'
        FROM corridor c CROSS JOIN gap g
        RETURNING id
    )
    INSERT INTO fund_sources (project_id, source_name, amount)
    SELECT a.id, s.name, ROUND((SELECT funded FROM gap) / (SELECT COUNT(*) FROM corridor) * s.share, 2)
    FROM added a
    CROSS JOIN (VALUES ('Municipal General Tier', 0.45), ('State PWD Allocations', 0.30), ('Central Road Fund', 0.25)) AS s(name, share);
END
$seed$;

SELECT setval(pg_get_serial_sequence('complaints', 'id'), (SELECT MAX(id) FROM complaints));
