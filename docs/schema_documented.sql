-- =========================================================================
-- ROADWATCH: objects promised by Document 1 (Synopsis), Document 3 (ERD and
-- Schema) and Document 4 (Wireframes) that schema.sql did not yet define.
--
-- Load order: schema.sql -> mock_data.sql -> schema_documented.sql
-- The script is idempotent, so it is safe to run again on a live database.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. CITIZEN and CITIZEN_PHONE (Document 3: strong entity + multivalued attr)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS citizens (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    residential_ward VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS citizen_phones (
    citizen_id INT NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    PRIMARY KEY (citizen_id, phone_number)
);

-- Citizen id 1 owns reports that arrive with no signed-in citizen
-- (WhatsApp, SMS and anonymous web submissions).
INSERT INTO citizens (id, first_name, last_name, email, residential_ward) VALUES
    (1, 'Public', 'Reporter', 'public.reporter@roadwatch.example', 'Unassigned'),
    (2, 'Rohan', 'Shetty', 'rohan.shetty@roadwatch.example', 'K-West'),
    (3, 'Asha', 'Kulkarni', 'asha.kulkarni@roadwatch.example', 'K-West'),
    (4, 'Imran', 'Sayed', 'imran.sayed@roadwatch.example', 'H-East'),
    (5, 'Neha', 'Joshi', 'neha.joshi@roadwatch.example', 'F-North'),
    (6, 'Vikram', 'Patil', 'vikram.patil@roadwatch.example', 'L Ward')
ON CONFLICT (id) DO NOTHING;
SELECT setval('citizens_id_seq', GREATEST((SELECT MAX(id) FROM citizens), 1));

INSERT INTO citizen_phones (citizen_id, phone_number) VALUES
    (2, '+91-90000-00002'), (2, '+91-22-5550-0002'), (3, '+91-90000-00003'),
    (4, '+91-90000-00004'), (5, '+91-90000-00005'), (6, '+91-90000-00006')
ON CONFLICT DO NOTHING;

-- Document 3 types Image_URL as TEXT; compressed photos arrive as data URLs.
ALTER TABLE complaints ALTER COLUMN image_url TYPE TEXT;

-- Document 3 "Files": every complaint is filed by exactly one citizen.
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS citizen_id INT REFERENCES citizens(id) ON DELETE CASCADE;
UPDATE complaints SET citizen_id = 2 + (id % 5) WHERE citizen_id IS NULL;
-- The sample citizens live in Mumbai, so reports elsewhere belong to the public reporter.
UPDATE complaints c SET citizen_id = 1
FROM authorities a
WHERE a.id = c.assigned_authority_id AND a.region_code <> 'IN' AND c.citizen_id <> 1;
ALTER TABLE complaints ALTER COLUMN citizen_id SET DEFAULT 1;
ALTER TABLE complaints ALTER COLUMN citizen_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_complaints_citizen ON complaints(citizen_id);

-- Derived attribute Total_Complaints_Filed (dashed ellipse in the ERD).
CREATE OR REPLACE VIEW citizen_complaint_totals AS
SELECT c.id AS citizen_id, c.first_name, c.last_name, c.residential_ward,
       COUNT(p.id) AS total_complaints_filed
FROM citizens c LEFT JOIN complaints p ON p.citizen_id = c.id
GROUP BY c.id;

-- -------------------------------------------------------------------------
-- 2. STATUS_HISTORY (Document 3: weak entity of Complaint)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS status_history (
    complaint_id INT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    history_seq INT NOT NULL CHECK (history_seq > 0),
    old_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    PRIMARY KEY (complaint_id, history_seq)
);

INSERT INTO status_history (complaint_id, history_seq, old_status, new_status, changed_at, remarks)
SELECT id, 1, NULL, status, created_at, 'Imported from existing complaint record'
FROM complaints c
WHERE NOT EXISTS (SELECT 1 FROM status_history h WHERE h.complaint_id = c.id);

CREATE OR REPLACE FUNCTION record_status_history()
RETURNS TRIGGER AS $$
DECLARE
    v_seq INT;
BEGIN
    IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;
    SELECT COALESCE(MAX(history_seq), 0) + 1 INTO v_seq
    FROM status_history WHERE complaint_id = NEW.id;
    INSERT INTO status_history (complaint_id, history_seq, old_status, new_status, remarks)
    VALUES (NEW.id, v_seq,
            CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END,
            NEW.status,
            NULLIF(current_setting('app.status_remarks', true), ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_status_history ON complaints;
CREATE TRIGGER trg_status_history
AFTER INSERT OR UPDATE OF status ON complaints
FOR EACH ROW EXECUTE FUNCTION record_status_history();

-- -------------------------------------------------------------------------
-- 3. GRIEVANCE STATE MACHINE (Document 1, core goal 2)
--    pending -> routed -> in_progress -> resolved, rejected from any open state
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_complaint_state_machine()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;
    IF NOT (
        (OLD.status = 'pending'     AND NEW.status IN ('routed', 'rejected')) OR
        (OLD.status = 'routed'      AND NEW.status IN ('in_progress', 'rejected')) OR
        (OLD.status = 'in_progress' AND NEW.status IN ('resolved', 'rejected'))
    ) THEN
        RAISE EXCEPTION 'Invalid complaint transition % -> % for complaint %',
            OLD.status, NEW.status, OLD.id
            USING ERRCODE = 'check_violation',
                  HINT = 'Allowed path: pending -> routed -> in_progress -> resolved';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_complaint_state_machine ON complaints;
CREATE TRIGGER trg_complaint_state_machine
BEFORE UPDATE OF status ON complaints
FOR EACH ROW EXECUTE FUNCTION enforce_complaint_state_machine();

-- -------------------------------------------------------------------------
-- 4. PROJECT_MILESTONE weak key and Project.Tender_ID (Document 3)
-- -------------------------------------------------------------------------
ALTER TABLE project_milestones ADD COLUMN IF NOT EXISTS milestone_num INT CHECK (milestone_num > 0);
WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY due_date NULLS LAST, id) AS n
    FROM project_milestones
)
UPDATE project_milestones m SET milestone_num = numbered.n
FROM numbered WHERE numbered.id = m.id AND m.milestone_num IS NULL;

CREATE OR REPLACE FUNCTION assign_milestone_num()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.milestone_num IS NULL THEN
        SELECT COALESCE(MAX(milestone_num), 0) + 1 INTO NEW.milestone_num
        FROM project_milestones WHERE project_id = NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_milestone_num ON project_milestones;
CREATE TRIGGER trg_assign_milestone_num
BEFORE INSERT ON project_milestones
FOR EACH ROW EXECUTE FUNCTION assign_milestone_num();

ALTER TABLE project_milestones ALTER COLUMN milestone_num SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_milestone_weak_key ON project_milestones(project_id, milestone_num);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS tender_id INT UNIQUE REFERENCES tenders(id) ON DELETE SET NULL;
UPDATE projects p SET tender_id = t.id
FROM (SELECT DISTINCT ON (project_id) id, project_id FROM tenders
      WHERE project_id IS NOT NULL ORDER BY project_id, id) t
WHERE t.project_id = p.id AND p.tender_id IS NULL;

-- -------------------------------------------------------------------------
-- 5. TENDER_BID rules (Document 3 composite key, Document 1 blacklist goal)
-- -------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_tender_bid_pair ON tender_bids(tender_id, contractor_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tender_single_winner ON tender_bids(tender_id) WHERE is_winner;

CREATE OR REPLACE FUNCTION reject_blacklisted_bid()
RETURNS TRIGGER AS $$
DECLARE
    v_name TEXT;
    v_blacklisted BOOLEAN;
BEGIN
    SELECT name, blacklisted INTO v_name, v_blacklisted
    FROM contractors WHERE id = NEW.contractor_id;
    IF v_blacklisted THEN
        RAISE EXCEPTION 'Contractor % is blacklisted and cannot bid', v_name
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reject_blacklisted_bid ON tender_bids;
CREATE TRIGGER trg_reject_blacklisted_bid
BEFORE INSERT ON tender_bids
FOR EACH ROW EXECUTE FUNCTION reject_blacklisted_bid();

-- -------------------------------------------------------------------------
-- 6. CONTRACTOR METRICS on project completion (Document 1, core goal 4)
--    Updating these counters also fires trg_contractor_perf_index.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_contractor_stats_on_project()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
        UPDATE contractors
        SET projects_completed = projects_completed + 1,
            projects_delayed = projects_delayed + CASE WHEN COALESCE(NEW.delay_days, 0) > 0 THEN 1 ELSE 0 END
        WHERE id = NEW.contractor_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contractor_stats_on_project ON projects;
CREATE TRIGGER trg_contractor_stats_on_project
AFTER UPDATE OF status ON projects
FOR EACH ROW EXECUTE FUNCTION update_contractor_stats_on_project();

-- -------------------------------------------------------------------------
-- 7. AUTOMATED SLA ESCALATION (Document 1, core goal 3)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION escalate_overdue_complaints()
RETURNS INT AS $$
DECLARE
    r RECORD;
    v_count INT := 0;
BEGIN
    FOR r IN
        SELECT DISTINCT ON (c.id)
               c.id, c.escalation_level AS from_level,
               s.escalation_level AS to_level, s.escalate_to_authority_id
        FROM complaints c
        LEFT JOIN authorities a ON a.id = c.assigned_authority_id
        JOIN sla_config s
          ON (s.category = c.category OR s.category IS NULL)
         AND (s.region_code = a.region_code OR s.region_code IS NULL)
        WHERE c.status IN ('pending', 'routed', 'in_progress')
          AND s.escalation_level > c.escalation_level
          AND NOW() - c.created_at >= make_interval(hours => s.escalation_hours)
        ORDER BY c.id, s.escalation_level DESC, (s.category IS NULL)
    LOOP
        UPDATE complaints
        SET escalation_level = r.to_level,
            last_escalated_at = NOW(),
            sla_breached_at = COALESCE(sla_breached_at, NOW())
        WHERE id = r.id;
        INSERT INTO sla_escalations (complaint_id, from_level, to_level, escalated_to_authority_id)
        VALUES (r.id, r.from_level, r.to_level, r.escalate_to_authority_id);
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------------------
-- 8. IMMUTABLE AUDIT LOG (Document 1, core goal 5)
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION block_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_log is append-only: % is not allowed', TG_OP
        USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_log_immutable ON audit_log;
CREATE TRIGGER trg_audit_log_immutable
BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION block_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_audit_log_no_truncate ON audit_log;
CREATE TRIGGER trg_audit_log_no_truncate
BEFORE TRUNCATE ON audit_log
FOR EACH STATEMENT EXECUTE FUNCTION block_audit_log_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC;

-- Generic audit trigger for tables schema.sql left uncovered.
CREATE OR REPLACE FUNCTION audit_trigger_generic()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by TEXT := COALESCE(NULLIF(current_setting('app.changed_by', true), ''), 'system');
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', NULL, row_to_jsonb_audit(NEW, TG_TABLE_NAME::varchar), v_changed_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_jsonb_audit(OLD, TG_TABLE_NAME::varchar),
                row_to_jsonb_audit(NEW, TG_TABLE_NAME::varchar), v_changed_by);
        RETURN NEW;
    END IF;
    INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_jsonb_audit(OLD, TG_TABLE_NAME::varchar), NULL, v_changed_by);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['project_milestones', 'tenders', 'tender_bids', 'sla_escalations', 'citizens'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON %1$I', t);
        EXECUTE format('CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON %1$I
                        FOR EACH ROW EXECUTE FUNCTION audit_trigger_generic()', t);
    END LOOP;
END $$;

-- -------------------------------------------------------------------------
-- 9. SENSOR TELEMETRY (Document 4, Frame 09)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS iot_sensors (
    id SERIAL PRIMARY KEY,
    sensor_code VARCHAR(30) NOT NULL UNIQUE,
    road_id INT NOT NULL REFERENCES roads(id) ON DELETE CASCADE,
    sensor_type VARCHAR(20) NOT NULL CHECK (sensor_type IN ('strain', 'temperature', 'moisture', 'vibration')),
    chainage_km NUMERIC(6, 2) NOT NULL,
    depth_mm INT NOT NULL DEFAULT 0,
    unit VARCHAR(10) NOT NULL,
    alert_threshold NUMERIC(8, 2),
    battery_pct INT NOT NULL CHECK (battery_pct BETWEEN 0 AND 100),
    last_calibrated DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sensor_readings (
    id BIGSERIAL PRIMARY KEY,
    sensor_id INT NOT NULL REFERENCES iot_sensors(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    reading NUMERIC(10, 3) NOT NULL,
    UNIQUE (sensor_id, recorded_at)
);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_time ON sensor_readings(sensor_id, recorded_at DESC);

INSERT INTO iot_sensors (sensor_code, road_id, sensor_type, chainage_km, depth_mm, unit, alert_threshold, battery_pct, last_calibrated)
SELECT v.code, r.id, v.kind, v.km, v.depth, v.unit, v.lim, v.battery, DATE '2026-09-12'
FROM (VALUES
    ('SEN-WEH-01', 'strain',      10.20,  40, 'µε',  900.0, 92),
    ('SEN-WEH-02', 'temperature', 11.40,  90, '°C',   60.0, 88),
    ('SEN-WEH-03', 'moisture',    12.40, 320, '%',    15.0, 71),
    ('SEN-WEH-04', 'vibration',   13.10,  30, 'G',     5.0, 34)
) AS v(code, kind, km, depth, unit, lim, battery)
JOIN roads r ON r.road_code = 'WEH-NH8'
ON CONFLICT (sensor_code) DO NOTHING;

INSERT INTO sensor_readings (sensor_id, recorded_at, reading)
SELECT s.id, ts,
       CASE s.sensor_type
         WHEN 'moisture'    THEN 9 + 9.4 * GREATEST(0, LEAST(1, h / 18.0)) + sin(h) * 0.2
         WHEN 'temperature' THEN 34 + 16 * sin((h - 6) * pi() / 12) ^ 2
         WHEN 'vibration'   THEN 2.1 + 2.3 * abs(sin(h * pi() / 6))
         ELSE 610 + 180 * abs(sin(h * pi() / 9))
       END
FROM iot_sensors s
CROSS JOIN LATERAL generate_series(
    date_trunc('hour', NOW()) - INTERVAL '23 hours', date_trunc('hour', NOW()), INTERVAL '1 hour') AS ts
CROSS JOIN LATERAL (SELECT 23 - EXTRACT(EPOCH FROM date_trunc('hour', NOW()) - ts) / 3600 AS h) AS hour_index
ON CONFLICT (sensor_id, recorded_at) DO NOTHING;

-- -------------------------------------------------------------------------
-- 10. ROLE-BASED VIEWS (Document 1, section 4)
-- -------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_public_road_scorecard AS
SELECT r.id, r.name, r.road_code, r.status, r.road_type, r.length_km, a.name AS authority,
       COUNT(c.id) FILTER (WHERE c.status NOT IN ('resolved', 'rejected')) AS open_complaints
FROM roads r
LEFT JOIN authorities a ON a.id = r.authority_id
LEFT JOIN complaints c ON c.road_id = r.id
GROUP BY r.id, a.name;

CREATE OR REPLACE VIEW v_public_contractor_ranking AS
SELECT id, contractor_code, name, rating, projects_completed, projects_delayed,
       performance_index, blacklisted,
       RANK() OVER (ORDER BY performance_index DESC) AS performance_rank
FROM contractors;

CREATE OR REPLACE VIEW v_citizen_complaints AS
SELECT c.id, c.citizen_id, c.title, c.category, c.status, c.priority, c.escalation_level,
       c.created_at, a.name AS assigned_authority, r.name AS road_name, c.target_resolution_hours
FROM complaints c
LEFT JOIN authorities a ON a.id = c.assigned_authority_id
LEFT JOIN roads r ON r.id = c.road_id;

CREATE OR REPLACE VIEW v_citizen_status_history AS
SELECT h.complaint_id, c.citizen_id, h.history_seq, h.old_status, h.new_status, h.changed_at, h.remarks
FROM status_history h
JOIN complaints c ON c.id = h.complaint_id;

CREATE OR REPLACE VIEW v_engineer_queue AS
SELECT c.id, c.title, c.category, c.status, c.priority, c.escalation_level,
       c.assigned_authority_id, r.name AS road_name, r.road_code, c.created_at,
       a.department_code AS authority,
       ROUND((c.target_resolution_hours - EXTRACT(EPOCH FROM NOW() - c.created_at) / 3600)::numeric, 1) AS hours_left
FROM complaints c
LEFT JOIN roads r ON r.id = c.road_id
LEFT JOIN authorities a ON a.id = c.assigned_authority_id
WHERE c.status IN ('routed', 'in_progress');

CREATE OR REPLACE VIEW v_admin_jurisdiction_summary AS
SELECT a.id AS authority_id, a.name, a.region_code,
       COUNT(DISTINCT r.id) AS roads,
       COUNT(DISTINCT p.id) AS projects,
       COALESCE(SUM(DISTINCT p.budget_allocated), 0) AS budget_allocated,
       COUNT(DISTINCT c.id) FILTER (WHERE c.status NOT IN ('resolved', 'rejected')) AS open_complaints
FROM authorities a
LEFT JOIN roads r ON r.authority_id = a.id
LEFT JOIN projects p ON p.authority_id = a.id
LEFT JOIN complaints c ON c.assigned_authority_id = a.id
GROUP BY a.id;

CREATE OR REPLACE VIEW v_auditor_sla_breaches AS
SELECT e.id, e.complaint_id, c.title, e.from_level, e.to_level, e.notified_at,
       e.notification_status, a.name AS escalated_to
FROM sla_escalations e
JOIN complaints c ON c.id = e.complaint_id
LEFT JOIN authorities a ON a.id = e.escalated_to_authority_id;

DO $$
DECLARE
    role_name TEXT;
BEGIN
    FOREACH role_name IN ARRAY ARRAY['roadwatch_citizen', 'roadwatch_engineer', 'roadwatch_admin', 'roadwatch_auditor'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN', role_name);
        END IF;
    END LOOP;
END $$;

GRANT SELECT ON v_public_road_scorecard, v_public_contractor_ranking, v_citizen_complaints,
    v_citizen_status_history, citizen_complaint_totals
    TO roadwatch_citizen, roadwatch_engineer, roadwatch_admin, roadwatch_auditor;
GRANT INSERT ON complaints TO roadwatch_citizen;
GRANT SELECT ON v_engineer_queue TO roadwatch_engineer, roadwatch_admin;
GRANT UPDATE (status) ON complaints TO roadwatch_engineer, roadwatch_admin;
GRANT SELECT ON v_admin_jurisdiction_summary TO roadwatch_admin;
GRANT SELECT, INSERT, UPDATE ON tenders, tender_bids, projects, project_milestones, budget_variance_reasons TO roadwatch_admin;
GRANT SELECT ON audit_log, v_auditor_sla_breaches, v_public_contractor_ranking TO roadwatch_auditor;

-- -------------------------------------------------------------------------
-- 11. WEBHOOK SAMPLE DATA for the operations screen (Frame 11)
-- -------------------------------------------------------------------------
INSERT INTO authority_webhooks (authority_id, webhook_url, events)
SELECT a.id, 'http://localhost:8000/api/v1/screens/webhook-sink/' || lower(a.department_code), ARRAY['complaint.assigned', 'complaint.escalated']
FROM authorities a
WHERE a.region_code = 'IN'
  AND NOT EXISTS (SELECT 1 FROM authority_webhooks w WHERE w.authority_id = a.id);

INSERT INTO notification_log (complaint_id, authority_id, event_type, webhook_url, status, response_code)
SELECT c.id, c.assigned_authority_id, 'complaint.assigned',
       'http://localhost:8000/api/v1/screens/webhook-sink/' || lower(a.department_code),
       CASE WHEN c.id % 7 = 0 THEN 'failed' ELSE 'sent' END,
       CASE WHEN c.id % 7 = 0 THEN 503 ELSE 200 END
FROM complaints c
JOIN authorities a ON a.id = c.assigned_authority_id
WHERE a.region_code = 'IN'
  AND NOT EXISTS (SELECT 1 FROM notification_log n WHERE n.complaint_id = c.id);

-- -------------------------------------------------------------------------
-- 12. CONFLICT SAMPLE DATA for the jurisdiction screen (Frame 13)
-- -------------------------------------------------------------------------
INSERT INTO road_conflict_groups (conflict_key, primary_road_id)
SELECT 'CFG-IN-001 Andheri flyover junction', id FROM roads WHERE road_code = 'WEH-NH8'
ON CONFLICT (conflict_key) DO NOTHING;

INSERT INTO road_conflict_groups (conflict_key, primary_road_id)
SELECT 'CFG-IN-002 Bandra link road ramps', id FROM roads WHERE road_code = 'LINK-RD-01'
ON CONFLICT (conflict_key) DO NOTHING;

INSERT INTO authority_conflict_groups (conflict_key, primary_authority_id)
SELECT 'CFG-IN-003 Ward F-North and H-East overlap', id FROM authorities WHERE department_code = 'MCGM-HE'
ON CONFLICT (conflict_key) DO NOTHING;

-- -------------------------------------------------------------------------
-- 13. QCBS WEIGHTS for the procurement screen (Frame 19)
-- -------------------------------------------------------------------------
INSERT INTO evaluation_criteria (tender_id, criterion_name, weight_pct, max_score)
SELECT t.id, c.name, c.weight, 100
FROM tenders t
CROSS JOIN (VALUES ('Past performance', 30), ('Equipment and plant', 20), ('Key staff', 20), ('Financial bid', 30)) AS c(name, weight)
ON CONFLICT (tender_id, criterion_name) DO NOTHING;

-- -------------------------------------------------------------------------
-- 14. SPATIAL AUTO-ROUTING (Document 1 scope: ST_DWithin 20 m + ST_Contains)
--     Runs for every channel (web, WhatsApp, SMS) when the client sent no
--     road or authority of its own.
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_route_complaint()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.road_id IS NULL THEN
        SELECT r.id INTO NEW.road_id
        FROM roads r
        WHERE ST_DWithin(r.geom::geography, NEW.geom::geography, 20)
        ORDER BY r.geom::geography <-> NEW.geom::geography
        LIMIT 1;
    END IF;
    IF NEW.assigned_authority_id IS NULL THEN
        SELECT a.id INTO NEW.assigned_authority_id
        FROM authorities a
        WHERE ST_Contains(a.geom_boundary, NEW.geom)
        ORDER BY ST_Area(a.geom_boundary)
        LIMIT 1;
    END IF;
    IF NEW.assigned_authority_id IS NULL AND NEW.road_id IS NOT NULL THEN
        SELECT r.authority_id INTO NEW.assigned_authority_id FROM roads r WHERE r.id = NEW.road_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_route_complaint ON complaints;
CREATE TRIGGER trg_auto_route_complaint
BEFORE INSERT ON complaints
FOR EACH ROW EXECUTE FUNCTION auto_route_complaint();

UPDATE complaints c SET
    road_id = COALESCE(c.road_id, (
        SELECT r.id FROM roads r WHERE ST_DWithin(r.geom::geography, c.geom::geography, 20)
        ORDER BY r.geom::geography <-> c.geom::geography LIMIT 1)),
    assigned_authority_id = COALESCE(c.assigned_authority_id, (
        SELECT a.id FROM authorities a WHERE ST_Contains(a.geom_boundary, c.geom)
        ORDER BY ST_Area(a.geom_boundary) LIMIT 1))
WHERE c.road_id IS NULL OR c.assigned_authority_id IS NULL;

-- -------------------------------------------------------------------------
-- 15. SIGN-IN (Document 1, section 4: citizen, engineer, admin, auditor)
--     Bcrypt hashes come from pgcrypto; sessions store only a token hash.
--     Sample accounts below are for local demos and share one test password.
-- -------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('citizen', 'engineer', 'admin', 'auditor')),
    citizen_id INT UNIQUE REFERENCES citizens(id) ON DELETE CASCADE,
    authority_id INT REFERENCES authorities(id) ON DELETE SET NULL,
    is_demo BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_citizen_link CHECK ((role = 'citizen') = (citizen_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS app_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id INT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

INSERT INTO app_users (email, password_hash, display_name, role, citizen_id, authority_id, is_demo)
SELECT v.email, crypt('roadwatch-demo', gen_salt('bf', 10)), v.name, v.role, v.citizen_id, a.id, TRUE
FROM (VALUES
    ('rohan.shetty@roadwatch.example', 'Rohan Shetty', 'citizen', 2, NULL),
    ('ward.engineer@roadwatch.example', 'Asha Kulkarni', 'engineer', NULL, 'MCGM-KW'),
    ('commissioner@roadwatch.example', 'Municipal Commissioner', 'admin', NULL, NULL),
    ('auditor@roadwatch.example', 'Public Auditor', 'auditor', NULL, NULL)
) AS v(email, name, role, citizen_id, department)
LEFT JOIN authorities a ON a.department_code = v.department
ON CONFLICT (email) DO NOTHING;

-- -------------------------------------------------------------------------
-- 16. MILESTONE QUALITY TESTS (Document 4, Frame 14)
--     Treasury payout needs every recorded core test to pass.
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS milestone_tests (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL,
    milestone_num INT NOT NULL,
    test_name VARCHAR(100) NOT NULL,
    measured NUMERIC(8, 2) NOT NULL,
    unit VARCHAR(10) NOT NULL,
    spec_min NUMERIC(8, 2),
    spec_max NUMERIC(8, 2),
    tested_on DATE NOT NULL DEFAULT CURRENT_DATE,
    passed BOOLEAN GENERATED ALWAYS AS (
        (spec_min IS NULL OR measured >= spec_min) AND (spec_max IS NULL OR measured <= spec_max)
    ) STORED,
    UNIQUE (project_id, milestone_num, test_name),
    FOREIGN KEY (project_id, milestone_num) REFERENCES project_milestones(project_id, milestone_num) ON DELETE CASCADE
);

INSERT INTO milestone_tests (project_id, milestone_num, test_name, measured, unit, spec_min, spec_max, tested_on)
SELECT m.project_id, m.milestone_num, t.name, t.measured, t.unit, t.spec_min, t.spec_max,
       COALESCE(m.completion_date, CURRENT_DATE)
FROM project_milestones m
CROSS JOIN (VALUES
    ('Compacted thickness', 51.2, 'mm', 50.0, NULL),
    ('Marshall density', 98.4, '%', 97.0, NULL),
    ('Bitumen content', 5.3, '%', 5.0, 5.5)
) AS t(name, measured, unit, spec_min, spec_max)
WHERE m.status = 'completed'
ON CONFLICT (project_id, milestone_num, test_name) DO NOTHING;

CREATE OR REPLACE FUNCTION block_payout_on_failed_test()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_release_date IS NOT NULL AND OLD.payment_release_date IS NULL AND EXISTS (
        SELECT 1 FROM milestone_tests t
        WHERE t.project_id = NEW.project_id AND t.milestone_num = NEW.milestone_num AND NOT t.passed
    ) THEN
        RAISE EXCEPTION 'Payout blocked: a quality test failed for milestone % of project %',
            NEW.milestone_num, NEW.project_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_payout_on_failed_test ON project_milestones;
CREATE TRIGGER trg_block_payout_on_failed_test
BEFORE UPDATE OF payment_release_date ON project_milestones
FOR EACH ROW EXECUTE FUNCTION block_payout_on_failed_test();
