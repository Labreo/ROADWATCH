-- ROADWATCH Database Schema
-- Requires PostgreSQL 16+ and PostGIS extensions

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- 0. Regions Config Table
-- Stores country/region metadata for multi-region support
CREATE TABLE regions (
    code VARCHAR(2) PRIMARY KEY,         -- 'IN', 'US', 'GB', 'KE'
    name VARCHAR(100) NOT NULL,           -- 'India', 'United States', etc.
    default_currency VARCHAR(3) NOT NULL, -- 'INR', 'USD', 'GBP', 'KES'
    locale VARCHAR(10) NOT NULL,          -- 'en-IN', 'en-US', 'en-GB', 'en-KE'
    phone_format VARCHAR(50),             -- e.g., '+91-XX-XXXXXXXX'
    bounding_box GEOMETRY(Polygon, 4326), -- Country bounding box for fast region filter
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_regions_bbox ON regions USING GIST (bounding_box);

-- 1. Authorities Table
-- Represents government entities, municipal corporations, or local departments
CREATE TABLE authorities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    department_code VARCHAR(50) NOT NULL UNIQUE,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    region_code VARCHAR(2) REFERENCES regions(code) ON DELETE SET NULL,
    geom_boundary GEOMETRY(Polygon, 4326), -- Administrative jurisdiction boundary
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for spatial queries on authority boundaries
CREATE INDEX idx_authorities_geom ON authorities USING GIST (geom_boundary);
CREATE INDEX idx_authorities_region ON authorities(region_code);


-- 2. Contractors Table
-- Represents construction/maintenance firms bid on projects
CREATE TABLE contractors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    license_number VARCHAR(100) NOT NULL UNIQUE,
    registration_date DATE NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    rating NUMERIC(3, 2) DEFAULT 5.00 CHECK (rating >= 0.00 AND rating <= 5.00),
    projects_completed INT DEFAULT 0 CHECK (projects_completed >= 0),
    projects_delayed INT DEFAULT 0 CHECK (projects_delayed >= 0),
    blacklisted BOOLEAN DEFAULT FALSE,
    blacklisted_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- 3. Roads Table
-- Represents road segments monitored by the system
CREATE TABLE roads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    road_code VARCHAR(100) UNIQUE, -- State Highway or National Highway identifiers
    status VARCHAR(50) NOT NULL DEFAULT 'good' CHECK (status IN ('good', 'fair', 'poor', 'under_construction')),
    length_km NUMERIC(6, 2) NOT NULL CHECK (length_km > 0.00),
    authority_id INT REFERENCES authorities(id) ON DELETE SET NULL,
    geom GEOMETRY(LineString, 4326) NOT NULL, -- Spatial segment representation (lat/lon coordinates)
    road_type VARCHAR(20) NOT NULL DEFAULT 'City' CHECK (road_type IN ('NH','SH','MDR','City','Interstate','US-Highway','State-Highway','Local','Motorway','A-Road','B-Road','C-Road','Urban')),
    last_relaying_date DATE,
    contractor_id INT REFERENCES contractors(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for spatial querying on road paths
CREATE INDEX idx_roads_geom ON roads USING GIST (geom);


-- 4. Projects (Contracts) Table
-- Links roads, contractors, budgets, and scheduling
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    road_id INT NOT NULL REFERENCES roads(id) ON DELETE CASCADE,
    contractor_id INT NOT NULL REFERENCES contractors(id) ON DELETE RESTRICT,
    authority_id INT NOT NULL REFERENCES authorities(id) ON DELETE RESTRICT,
    budget_allocated NUMERIC(15, 2) NOT NULL CHECK (budget_allocated > 0.00),
    budget_spent NUMERIC(15, 2) DEFAULT 0.00 CHECK (budget_spent >= 0.00),
    status VARCHAR(50) NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'halted', 'cancelled')),
    start_date DATE NOT NULL,
    target_end_date DATE NOT NULL,
    actual_end_date DATE,
    delay_days INT DEFAULT 0 CHECK (delay_days >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_dates CHECK (target_end_date >= start_date),
    CONSTRAINT check_actual_date CHECK (actual_end_date IS NULL OR actual_end_date >= start_date)
);

CREATE INDEX idx_projects_road ON projects(road_id);
CREATE INDEX idx_projects_contractor ON projects(contractor_id);


-- 5. Complaints Table
-- Citizen reports regarding defects
CREATE TABLE complaints (
    id SERIAL PRIMARY KEY,
    client_temp_id UUID, -- For offline-to-online sync tracking & idempotency
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('pothole', 'paving_defect', 'waterlogging', 'debris', 'missing_signage')),
    geom GEOMETRY(Point, 4326) NOT NULL, -- Precise coordinate location
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'routed', 'in_progress', 'resolved', 'rejected')),
    escalation_level INT DEFAULT 0 CHECK (escalation_level IN (0, 1, 2)),
    priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
    sla_breached_at TIMESTAMP WITH TIME ZONE,
    last_escalated_at TIMESTAMP WITH TIME ZONE,
    target_resolution_hours INTEGER DEFAULT 48,
    declined_authority_ids INTEGER[] DEFAULT '{}',
    image_url VARCHAR(512),
    assigned_authority_id INT REFERENCES authorities(id) ON DELETE SET NULL,
    road_id INT REFERENCES roads(id) ON DELETE SET NULL, -- Spatial match to nearest road segment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for complaints
CREATE INDEX idx_complaints_geom ON complaints USING GIST (geom);
CREATE INDEX idx_complaints_client_temp_id ON complaints(client_temp_id) WHERE client_temp_id IS NOT NULL;
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_priority ON complaints(priority);

-- 6. SLA Configuration Table
-- Configurable escalation thresholds per category
CREATE TABLE sla_config (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50), -- NULL means fallback/default
    escalation_hours INTEGER NOT NULL,
    escalation_level INTEGER NOT NULL CHECK (escalation_level IN (1, 2)),
    escalate_to_authority_id INTEGER REFERENCES authorities(id) ON DELETE SET NULL,
    notify_template TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. SLA Escalations Audit Trail
-- Records every escalation event for compliance tracking
CREATE TABLE sla_escalations (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE NOT NULL,
    from_level INTEGER NOT NULL DEFAULT 0,
    to_level INTEGER NOT NULL,
    escalated_by VARCHAR(50) DEFAULT 'system',
    escalated_to_authority_id INTEGER REFERENCES authorities(id) ON DELETE SET NULL,
    notified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notification_status VARCHAR(20) DEFAULT 'pending' CHECK (notification_status IN ('pending', 'sent', 'failed'))
);

CREATE INDEX idx_sla_escalations_complaint ON sla_escalations(complaint_id);

-- 8. Authority Webhooks Table
-- Registered webhook endpoints per authority for event notifications
CREATE TABLE authority_webhooks (
    id SERIAL PRIMARY KEY,
    authority_id INTEGER REFERENCES authorities(id) ON DELETE CASCADE NOT NULL UNIQUE,
    webhook_url VARCHAR(512) NOT NULL,
    secret_token VARCHAR(256),
    events TEXT[] DEFAULT '{}', -- subscribed events: complaint.assigned, complaint.escalated, complaint.updated
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Notification Log Table
-- Audit trail for all outbound notifications
CREATE TABLE notification_log (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER REFERENCES complaints(id) ON DELETE SET NULL,
    authority_id INTEGER REFERENCES authorities(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- complaint.assigned, complaint.escalated, complaint.declined
    webhook_url VARCHAR(512),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    response_code INTEGER,
    response_body TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notification_log_complaint ON notification_log(complaint_id);
CREATE INDEX idx_notification_log_status ON notification_log(status);


-- 10. Trigger for Updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_authorities_modtime BEFORE UPDATE ON authorities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contractors_modtime BEFORE UPDATE ON contractors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roads_modtime BEFORE UPDATE ON roads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_complaints_modtime BEFORE UPDATE ON complaints FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Timezone column for regions
ALTER TABLE regions ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata';

-- 12. Region-specific SLA thresholds
-- Add region_code to sla_config for per-region SLA rules
ALTER TABLE sla_config ADD COLUMN IF NOT EXISTS region_code VARCHAR(2) REFERENCES regions(code) ON DELETE SET NULL;

-- 13. Cross-region complaint routing support
-- Self-referential FK for split complaints across regions
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS parent_complaint_id INTEGER REFERENCES complaints(id) ON DELETE SET NULL;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS region_override VARCHAR(2); -- manual region override
CREATE INDEX IF NOT EXISTS idx_complaints_parent ON complaints(parent_complaint_id);

-- 14. Conflict group IDs for duplicate road/authority resolution
ALTER TABLE roads ADD COLUMN IF NOT EXISTS conflict_group_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_roads_conflict_group ON roads(conflict_group_id);

ALTER TABLE authorities ADD COLUMN IF NOT EXISTS conflict_group_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_authorities_conflict_group ON authorities(conflict_group_id);

-- 15. ROAD REGION CROSSINGS TABLE
-- Tracks which portions of a road span which regions
CREATE TABLE IF NOT EXISTS road_region_crossings (
    id SERIAL PRIMARY KEY,
    road_id INTEGER NOT NULL REFERENCES roads(id) ON DELETE CASCADE,
    region_code VARCHAR(2) NOT NULL REFERENCES regions(code) ON DELETE CASCADE,
    geom_segment GEOMETRY(LineString, 4326),
    authority_id INTEGER REFERENCES authorities(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(road_id, region_code)
);

CREATE INDEX IF NOT EXISTS idx_rrc_road ON road_region_crossings(road_id);
CREATE INDEX IF NOT EXISTS idx_rrc_region ON road_region_crossings(region_code);
CREATE INDEX IF NOT EXISTS idx_rrc_geom ON road_region_crossings USING GIST (geom_segment);

-- 16. REGION OVERLAP ROUTES TABLE
-- Defines routing actions for complaints near region boundaries
CREATE TABLE IF NOT EXISTS region_overlap_routes (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    primary_region VARCHAR(2) NOT NULL,
    secondary_region VARCHAR(2) NOT NULL,
    split_action VARCHAR(20) NOT NULL CHECK (split_action IN ('duplicate', 'forward', 'split')),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ror_complaint ON region_overlap_routes(complaint_id);

-- 17. ROAD CONFLICT GROUPS TABLE
CREATE TABLE IF NOT EXISTS road_conflict_groups (
    id SERIAL PRIMARY KEY,
    conflict_key VARCHAR(255) NOT NULL UNIQUE,
    primary_road_id INTEGER REFERENCES roads(id) ON DELETE SET NULL,
    merged_metadata JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. AUTHORITY CONFLICT GROUPS TABLE
CREATE TABLE IF NOT EXISTS authority_conflict_groups (
    id SERIAL PRIMARY KEY,
    conflict_key VARCHAR(255) NOT NULL UNIQUE,
    primary_authority_id INTEGER REFERENCES authorities(id) ON DELETE SET NULL,
    merged_metadata JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 19. Region-specific SLA Config Seed Data (Moved to mock_data.sql to prevent foreign key errors)



-- =========================================================================
-- 13. AUDIT TRAIL TABLE
-- Logs all INSERT/UPDATE/DELETE operations on core tables
-- =========================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(10) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(100) NOT NULL DEFAULT 'system',
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Helper: convert a row to JSONB, handling geometry columns as WKT
CREATE OR REPLACE FUNCTION row_to_jsonb_audit(row_data RECORD, tbl VARCHAR)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    result := to_jsonb(row_data);
    IF tbl IN ('complaints', 'roads') THEN
        IF row_data.geom IS NOT NULL THEN
            result := jsonb_set(result, '{geom}', to_jsonb(ST_AsText(row_data.geom::geometry)), true);
        END IF;
    END IF;
    IF tbl = 'authorities' THEN
        IF row_data.geom_boundary IS NOT NULL THEN
            result := jsonb_set(result, '{geom_boundary}', to_jsonb(ST_AsText(row_data.geom_boundary::geometry)), true);
        END IF;
    END IF;
    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Audit trigger function: complaints
CREATE OR REPLACE FUNCTION audit_trigger_complaints()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by TEXT;
BEGIN
    v_changed_by := COALESCE(NULLIF(current_setting('app.changed_by', true), ''), 'system');
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('complaints', NEW.id, 'INSERT', NULL, row_to_jsonb_audit(NEW, 'complaints'), v_changed_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('complaints', NEW.id, 'UPDATE', row_to_jsonb_audit(OLD, 'complaints'), row_to_jsonb_audit(NEW, 'complaints'), v_changed_by);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('complaints', OLD.id, 'DELETE', row_to_jsonb_audit(OLD, 'complaints'), NULL, v_changed_by);
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger function: projects
CREATE OR REPLACE FUNCTION audit_trigger_projects()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by TEXT;
BEGIN
    v_changed_by := COALESCE(NULLIF(current_setting('app.changed_by', true), ''), 'system');
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('projects', NEW.id, 'INSERT', NULL, row_to_jsonb_audit(NEW, 'projects'), v_changed_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('projects', NEW.id, 'UPDATE', row_to_jsonb_audit(OLD, 'projects'), row_to_jsonb_audit(NEW, 'projects'), v_changed_by);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('projects', OLD.id, 'DELETE', row_to_jsonb_audit(OLD, 'projects'), NULL, v_changed_by);
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger function: contractors
CREATE OR REPLACE FUNCTION audit_trigger_contractors()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by TEXT;
BEGIN
    v_changed_by := COALESCE(NULLIF(current_setting('app.changed_by', true), ''), 'system');
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('contractors', NEW.id, 'INSERT', NULL, row_to_jsonb_audit(NEW, 'contractors'), v_changed_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('contractors', NEW.id, 'UPDATE', row_to_jsonb_audit(OLD, 'contractors'), row_to_jsonb_audit(NEW, 'contractors'), v_changed_by);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('contractors', OLD.id, 'DELETE', row_to_jsonb_audit(OLD, 'contractors'), NULL, v_changed_by);
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Audit trigger function: roads
CREATE OR REPLACE FUNCTION audit_trigger_roads()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by TEXT;
BEGIN
    v_changed_by := COALESCE(NULLIF(current_setting('app.changed_by', true), ''), 'system');
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('roads', NEW.id, 'INSERT', NULL, row_to_jsonb_audit(NEW, 'roads'), v_changed_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('roads', NEW.id, 'UPDATE', row_to_jsonb_audit(OLD, 'roads'), row_to_jsonb_audit(NEW, 'roads'), v_changed_by);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('roads', OLD.id, 'DELETE', row_to_jsonb_audit(OLD, 'roads'), NULL, v_changed_by);
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Register audit triggers (AFTER — reads final committed values)
CREATE TRIGGER trg_audit_complaints AFTER INSERT OR UPDATE OR DELETE ON complaints FOR EACH ROW EXECUTE FUNCTION audit_trigger_complaints();
CREATE TRIGGER trg_audit_projects AFTER INSERT OR UPDATE OR DELETE ON projects FOR EACH ROW EXECUTE FUNCTION audit_trigger_projects();
CREATE TRIGGER trg_audit_contractors AFTER INSERT OR UPDATE OR DELETE ON contractors FOR EACH ROW EXECUTE FUNCTION audit_trigger_contractors();
CREATE TRIGGER trg_audit_roads AFTER INSERT OR UPDATE OR DELETE ON roads FOR EACH ROW EXECUTE FUNCTION audit_trigger_roads();

-- =========================================================================
-- 14. Citizen contact field on complaints
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS citizen_contact VARCHAR(255);

-- 15. Citizen Notifications Table
-- Tracks all outbound citizen SMS/email notifications
CREATE TABLE IF NOT EXISTS citizen_notifications (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
    channel VARCHAR(10) NOT NULL CHECK (channel IN ('sms', 'email')),
    recipient VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('routed', 'escalated', 'resolved', 'rejected', 'updated')),
    template_used VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    provider_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_citizen_notifications_complaint ON citizen_notifications(complaint_id);
CREATE INDEX IF NOT EXISTS idx_citizen_notifications_status ON citizen_notifications(status);

-- 16. Routing Feedback Table
-- Tracks whether citizen confirms the authority routing was correct
CREATE TABLE IF NOT EXISTS routing_feedback (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER REFERENCES complaints(id) ON DELETE CASCADE,
    authority_id INTEGER REFERENCES authorities(id) ON DELETE CASCADE,
    citizen_confirmed BOOLEAN NOT NULL,
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(complaint_id)
);

CREATE INDEX IF NOT EXISTS idx_routing_feedback_authority ON routing_feedback(authority_id);

-- Routing accuracy score column on authorities
ALTER TABLE authorities ADD COLUMN IF NOT EXISTS routing_accuracy_score NUMERIC(5,2) DEFAULT 0.00;

-- 17. ROAD DEFECT HISTORY TABLE
-- Tracks per-road deterioration over time, auto-snapshotted on changes
-- =========================================================================
CREATE TABLE IF NOT EXISTS road_defect_history (
    id BIGSERIAL PRIMARY KEY,
    road_id INTEGER NOT NULL REFERENCES roads(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status_at_time VARCHAR(50) NOT NULL,
    complaint_count INTEGER NOT NULL DEFAULT 0,
    project_count INTEGER NOT NULL DEFAULT 0,
    avg_depth_cm NUMERIC(5,2),
    source VARCHAR(30) NOT NULL CHECK (source IN ('complaint', 'project', 'inspection')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rdh_road_date ON road_defect_history(road_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_rdh_source ON road_defect_history(source);

-- Snapshot road condition when complaint is inserted/updated/deleted
CREATE OR REPLACE FUNCTION snapshot_road_on_complaint_change()
RETURNS TRIGGER AS $$
DECLARE
    v_road_id INTEGER;
    v_status roads.status%TYPE;
    v_complaint_count INTEGER;
    v_project_count INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_road_id := OLD.road_id;
    ELSE
        v_road_id := NEW.road_id;
    END IF;
    IF v_road_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    SELECT status INTO v_status FROM roads WHERE id = v_road_id;
    SELECT COUNT(*) INTO v_complaint_count FROM complaints WHERE road_id = v_road_id AND status NOT IN ('resolved', 'rejected');
    SELECT COUNT(*) INTO v_project_count FROM projects WHERE road_id = v_road_id AND status IN ('planned', 'in_progress');
    INSERT INTO road_defect_history (road_id, snapshot_date, status_at_time, complaint_count, project_count, source)
    VALUES (v_road_id, CURRENT_DATE, v_status, v_complaint_count, v_project_count, 'complaint');
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Snapshot road condition when a project completes / halts / cancels
CREATE OR REPLACE FUNCTION snapshot_road_on_project_complete()
RETURNS TRIGGER AS $$
DECLARE
    v_road_id INTEGER;
    v_status roads.status%TYPE;
    v_complaint_count INTEGER;
    v_project_count INTEGER;
BEGIN
    v_road_id := NEW.road_id;
    IF v_road_id IS NULL THEN
        RETURN NEW;
    END IF;
    SELECT status INTO v_status FROM roads WHERE id = v_road_id;
    SELECT COUNT(*) INTO v_complaint_count FROM complaints WHERE road_id = v_road_id AND status NOT IN ('resolved', 'rejected');
    SELECT COUNT(*) INTO v_project_count FROM projects WHERE road_id = v_road_id AND status IN ('planned', 'in_progress');
    INSERT INTO road_defect_history (road_id, snapshot_date, status_at_time, complaint_count, project_count, source)
    VALUES (v_road_id, CURRENT_DATE, v_status, v_complaint_count, v_project_count, 'project');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rdh_complaint_insert AFTER INSERT ON complaints FOR EACH ROW EXECUTE FUNCTION snapshot_road_on_complaint_change();
CREATE TRIGGER trg_rdh_complaint_update AFTER UPDATE OF status, road_id ON complaints FOR EACH ROW EXECUTE FUNCTION snapshot_road_on_complaint_change();
CREATE TRIGGER trg_rdh_complaint_delete AFTER DELETE ON complaints FOR EACH ROW EXECUTE FUNCTION snapshot_road_on_complaint_change();
CREATE TRIGGER trg_rdh_project_complete AFTER UPDATE OF status ON projects FOR EACH ROW
    WHEN (NEW.status IN ('completed', 'halted', 'cancelled'))
    EXECUTE FUNCTION snapshot_road_on_project_complete();

-- =========================================================================
-- 15. CONTRACTOR NORMALIZED CODE + PERFORMANCE INDEX
-- =========================================================================
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS contractor_code VARCHAR(10) UNIQUE CHECK (contractor_code ~ '^CON-\d{5}$');
ALTER TABLE contractors ADD COLUMN IF NOT EXISTS performance_index NUMERIC(5,2) DEFAULT 0.00 CHECK (performance_index >= 0.00 AND performance_index <= 100.00);

-- Backfill existing contractors with sequential codes
DO $$
DECLARE
    c RECORD;
    seq_num INTEGER := 1;
BEGIN
    FOR c IN SELECT id FROM contractors WHERE contractor_code IS NULL ORDER BY id LOOP
        UPDATE contractors SET contractor_code = 'CON-' || LPAD(seq_num::TEXT, 5, '0') WHERE id = c.id;
        seq_num := seq_num + 1;
    END LOOP;
END $$;

ALTER TABLE contractors ALTER COLUMN contractor_code SET NOT NULL;

-- Trigger: auto-calculate performance_index before insert/update
CREATE OR REPLACE FUNCTION recalculate_performance_index()
RETURNS TRIGGER AS $$
BEGIN
    NEW.performance_index := ROUND(
        (COALESCE(NEW.projects_completed, 0)::NUMERIC / GREATEST(COALESCE(NEW.projects_completed, 0) + COALESCE(NEW.projects_delayed, 0), 1))
        * COALESCE(NEW.rating, 0) * 20, 2
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contractor_perf_index
BEFORE INSERT OR UPDATE OF projects_completed, projects_delayed, rating ON contractors
FOR EACH ROW EXECUTE FUNCTION recalculate_performance_index();

-- =========================================================================
-- 16. FUND SOURCES TABLE
-- Persists per-project funding source allocations (frontend-only before)
-- =========================================================================
CREATE TABLE IF NOT EXISTS fund_sources (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    source_name VARCHAR(100) NOT NULL CHECK (source_name IN (
        'Central Road Infrastructure Fund',
        'State PWD Capital Tiers',
        'Municipal General Portfolios',
        'Taxpayer Distribution Ratios',
        'Central Road Fund',
        'State PWD Allocations',
        'Municipal General Tier',
        'International Multilateral Loans',
        'State Budget',
        'World Bank Loan',
        'Kenya RMLF',
        'UK Department for Transport Grant',
        'FHWA Federal Aid',
        'MDOT State Trunkline Fund',
        'Local Municipal Bond'
    )),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fund_sources_project ON fund_sources(project_id);

-- =========================================================================
-- 17. BUDGET VARIANCE REASONS TABLE
-- Captures why budget variance occurred + approval trail
-- =========================================================================
CREATE TABLE IF NOT EXISTS budget_variance_reasons (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    original_budget NUMERIC(15,2) NOT NULL,
    revised_budget NUMERIC(15,2),
    variance_amount NUMERIC(15,2) NOT NULL,
    variance_pct NUMERIC(5,2),
    reason TEXT NOT NULL,
    approved_by VARCHAR(255),
    approval_date DATE,
    approval_document_url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bvr_project ON budget_variance_reasons(project_id);

-- Audit trigger for budget_variance_reasons
CREATE OR REPLACE FUNCTION audit_trigger_bvr()
RETURNS TRIGGER AS $$
DECLARE
    v_changed_by TEXT;
BEGIN
    v_changed_by := COALESCE(NULLIF(current_setting('app.changed_by', true), ''), 'system');
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('budget_variance_reasons', NEW.id, 'INSERT', NULL, to_jsonb(NEW), v_changed_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('budget_variance_reasons', NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_changed_by);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES ('budget_variance_reasons', OLD.id, 'DELETE', to_jsonb(OLD), NULL, v_changed_by);
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_bvr AFTER INSERT OR UPDATE OR DELETE ON budget_variance_reasons
FOR EACH ROW EXECUTE FUNCTION audit_trigger_bvr();

-- =========================================================================
-- 18. PROJECT MILESTONES TABLE
-- Milestone-based payment tracking with status lifecycle
-- =========================================================================
CREATE TABLE IF NOT EXISTS project_milestones (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_date DATE,
    completion_date DATE,
    verified_by VARCHAR(255),
    payment_release_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_milestone_dates CHECK (completion_date IS NULL OR completion_date >= due_date)
);

CREATE INDEX IF NOT EXISTS idx_milestones_project ON project_milestones(project_id);

CREATE TRIGGER update_milestones_modtime BEFORE UPDATE ON project_milestones
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 19. CONTINGENCY RESERVES TABLE
-- Formal contingency line items per project
-- =========================================================================
CREATE TABLE IF NOT EXISTS contingency_reserves (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(15, 2) NOT NULL CHECK (allocated_amount >= 0),
    utilized_amount NUMERIC(15, 2) DEFAULT 0.00 CHECK (utilized_amount >= 0),
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'partially_utilized', 'fully_utilized', 'exhausted')),
    approval_required BOOLEAN DEFAULT TRUE,
    release_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_contingency_utilized CHECK (utilized_amount <= allocated_amount)
);

CREATE INDEX IF NOT EXISTS idx_contingency_project ON contingency_reserves(project_id);

CREATE TRIGGER update_contingency_modtime BEFORE UPDATE ON contingency_reserves
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 20. ROAD ALIASES TABLE (E4: Cross-Region Road Name Resolver)
-- Maps the same road across different regions (e.g., "NH-48" in India vs local name)
-- =========================================================================
CREATE TABLE IF NOT EXISTS road_aliases (
    id SERIAL PRIMARY KEY,
    road_id INTEGER NOT NULL REFERENCES roads(id) ON DELETE CASCADE,
    alias_name VARCHAR(255) NOT NULL,
    alias_region_code VARCHAR(2) REFERENCES regions(code) ON DELETE CASCADE,
    alias_type VARCHAR(50) DEFAULT 'local' CHECK (alias_type IN ('local', 'national', 'international', 'historical')),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(road_id, alias_name)
);

CREATE INDEX IF NOT EXISTS idx_road_aliases_road ON road_aliases(road_id);
CREATE INDEX IF NOT EXISTS idx_road_aliases_region ON road_aliases(alias_region_code);
CREATE INDEX IF NOT EXISTS idx_road_aliases_name ON road_aliases(alias_name);

-- =========================================================================
-- 21. REGION DATA IMPORT LOG TABLE (E1: OSM Import Tracking)
-- Tracks OSM / external import runs per region for freshness metrics
-- =========================================================================
CREATE TABLE IF NOT EXISTS region_import_log (
    id SERIAL PRIMARY KEY,
    region_code VARCHAR(2) NOT NULL REFERENCES regions(code) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL DEFAULT 'osm',
    roads_imported INTEGER NOT NULL DEFAULT 0,
    roads_skipped INTEGER NOT NULL DEFAULT 0,
    roads_errors INTEGER NOT NULL DEFAULT 0,
    finished_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_region_import_log_region ON region_import_log(region_code);

-- =========================================================================
-- 22. APPROVAL TRAIL TABLE
-- Generic approval records across variance, contingency, milestone, project
-- =========================================================================
CREATE TABLE IF NOT EXISTS approval_trail (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('variance', 'contingency', 'milestone', 'project')),
    entity_id INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    requested_by VARCHAR(255),
    approved_by VARCHAR(255),
    approved_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approval_trail_entity ON approval_trail(entity_type, entity_id);

-- =========================================================================
-- 21. COST PER KM VIEW
-- Normalized cost comparison across road projects
-- =========================================================================
CREATE OR REPLACE VIEW cost_per_km_view AS
SELECT
    p.id AS project_id,
    p.title,
    p.road_id,
    r.name AS road_name,
    r.length_km,
    p.budget_allocated,
    p.budget_spent,
    ROUND(p.budget_allocated / NULLIF(r.length_km, 0), 2) AS allocated_per_km,
    ROUND(p.budget_spent / NULLIF(r.length_km, 0), 2) AS spent_per_km,
    ROUND((p.budget_spent - p.budget_allocated) / NULLIF(r.length_km, 0), 2) AS overrun_per_km,
    p.status,
    p.contractor_id,
    c.name AS contractor_name
FROM projects p
JOIN roads r ON p.road_id = r.id
LEFT JOIN contractors c ON p.contractor_id = c.id;

-- =========================================================================
-- 22. TENDERS TABLE (C1: Procurement Audit Trail)
-- Tracks tender call lifecycle from publication to award
-- =========================================================================
CREATE TABLE IF NOT EXISTS tenders (
    id SERIAL PRIMARY KEY,
    reference_no VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    authority_id INT NOT NULL REFERENCES authorities(id) ON DELETE RESTRICT,
    project_id INT REFERENCES projects(id) ON DELETE SET NULL,
    estimated_value NUMERIC(15, 2) CHECK (estimated_value > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','bid_open','under_evaluation','awarded','cancelled')),
    published_date DATE,
    bid_deadline DATE,
    award_date DATE,
    award_letter_url VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_dates CHECK (bid_deadline IS NULL OR published_date IS NULL OR bid_deadline >= published_date)
);

CREATE INDEX IF NOT EXISTS idx_tenders_authority ON tenders(authority_id);
CREATE INDEX IF NOT EXISTS idx_tenders_project ON tenders(project_id);
CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
CREATE TRIGGER update_tenders_modtime BEFORE UPDATE ON tenders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 23. TENDER BIDS TABLE (C1: Procurement Audit Trail)
-- Per-contractor bid submissions with evaluation scores
-- =========================================================================
CREATE TABLE IF NOT EXISTS tender_bids (
    id SERIAL PRIMARY KEY,
    tender_id INT NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    contractor_id INT NOT NULL REFERENCES contractors(id) ON DELETE RESTRICT,
    financial_quote NUMERIC(15, 2) NOT NULL CHECK (financial_quote > 0),
    technical_score NUMERIC(5, 2) CHECK (technical_score >= 0 AND technical_score <= 100),
    financial_score NUMERIC(5, 2) CHECK (financial_score >= 0 AND financial_score <= 100),
    weighted_total NUMERIC(5, 2) CHECK (weighted_total >= 0 AND weighted_total <= 100),
    evaluator_notes TEXT,
    is_winner BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tender_bids_tender ON tender_bids(tender_id);
CREATE INDEX IF NOT EXISTS idx_tender_bids_contractor ON tender_bids(contractor_id);
CREATE INDEX IF NOT EXISTS idx_tender_bids_winner ON tender_bids(tender_id, is_winner) WHERE is_winner = TRUE;

-- =========================================================================
-- 24. EVALUATION CRITERIA TABLE (C1: Weighted scoring framework)
-- Configurable per-tender evaluation weightings
-- =========================================================================
CREATE TABLE IF NOT EXISTS evaluation_criteria (
    id SERIAL PRIMARY KEY,
    tender_id INT NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
    criterion_name VARCHAR(100) NOT NULL,
    weight_pct NUMERIC(5, 2) NOT NULL CHECK (weight_pct > 0 AND weight_pct <= 100),
    max_score NUMERIC(5, 2) NOT NULL CHECK (max_score > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tender_id, criterion_name)
);

CREATE INDEX IF NOT EXISTS idx_eval_criteria_tender ON evaluation_criteria(tender_id);

-- =========================================================================
-- 25. CPI / INFLATION DATA TABLE (C3: Inflation-Adjusted Comparisons)
-- Annual CPI values per region for inflation adjustment calculations
-- =========================================================================
CREATE TABLE IF NOT EXISTS cpi_data (
    id SERIAL PRIMARY KEY,
    region_code VARCHAR(2) NOT NULL REFERENCES regions(code) ON DELETE CASCADE,
    year INT NOT NULL CHECK (year >= 2000),
    cpi_value NUMERIC(10, 4) NOT NULL CHECK (cpi_value > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(region_code, year)
);

CREATE INDEX IF NOT EXISTS idx_cpi_region_year ON cpi_data(region_code, year);

-- =========================================================================
-- 26. PROJECT BENEFICIARIES TABLE (C5: Beneficiary Tracking)
-- Tracks population served per project
-- =========================================================================
CREATE TABLE IF NOT EXISTS project_beneficiaries (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    population_served INT NOT NULL CHECK (population_served > 0),
    estimated_daily_traffic INT CHECK (estimated_daily_traffic >= 0),
    household_count INT CHECK (household_count >= 0),
    beneficiary_type VARCHAR(50) NOT NULL CHECK (beneficiary_type IN ('residential','commercial','mixed','commuters')),
    data_source VARCHAR(100),
    census_year INT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, beneficiary_type)
);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_project ON project_beneficiaries(project_id);

-- Audit trigger for project_beneficiaries
CREATE TRIGGER trg_audit_beneficiaries AFTER INSERT OR UPDATE OR DELETE ON project_beneficiaries
FOR EACH ROW EXECUTE FUNCTION audit_trigger_projects();

-- =========================================================================
-- 27. BENEFICIARY VIEW — Aggregate population served per road
-- =========================================================================
CREATE OR REPLACE VIEW road_beneficiary_view AS
SELECT
    r.id AS road_id,
    r.name AS road_name,
    COUNT(DISTINCT pb.id) AS beneficiary_records,
    COALESCE(SUM(pb.population_served), 0) AS total_population_served,
    COALESCE(SUM(pb.estimated_daily_traffic), 0) AS total_daily_traffic,
    COALESCE(SUM(pb.household_count), 0) AS total_households,
    COUNT(DISTINCT p.id) AS project_count
FROM roads r
LEFT JOIN projects p ON r.id = p.road_id
LEFT JOIN project_beneficiaries pb ON p.id = pb.project_id
GROUP BY r.id, r.name;

-- =========================================================================
-- 28. ROADS ENRICHMENT COLUMNS (A1: Data Accuracy)
-- Adds data quality dimensions to the roads table
-- =========================================================================
ALTER TABLE roads ADD COLUMN IF NOT EXISTS surface_type VARCHAR(20) CHECK (surface_type IN ('asphalt', 'concrete', 'gravel', 'pavers', 'composite'));
ALTER TABLE roads ADD COLUMN IF NOT EXISTS lane_count INTEGER CHECK (lane_count > 0);
ALTER TABLE roads ADD COLUMN IF NOT EXISTS width_m NUMERIC(5,2) CHECK (width_m > 0);
ALTER TABLE roads ADD COLUMN IF NOT EXISTS aadt INTEGER CHECK (aadt >= 0);
ALTER TABLE roads ADD COLUMN IF NOT EXISTS last_inspection_date DATE;

-- =========================================================================
-- 29. ROAD MATERIALS TABLE (A1: Material quality tracking)
-- Tracks asphalt/concrete grades, mix design, source quarry per project
-- =========================================================================
CREATE TABLE IF NOT EXISTS road_materials (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    material_type VARCHAR(50) NOT NULL CHECK (material_type IN ('asphalt', 'concrete', 'base_course', 'subbase', 'aggregate')),
    specification_grade VARCHAR(100),
    mix_design_ref VARCHAR(100),
    source_quarry VARCHAR(255),
    test_report_url VARCHAR(512),
    test_date DATE,
    approved_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_road_materials_project ON road_materials(project_id);

-- Audit trigger for road_materials
CREATE TRIGGER trg_audit_road_materials AFTER INSERT OR UPDATE OR DELETE ON road_materials
FOR EACH ROW EXECUTE FUNCTION audit_trigger_roads();

-- =========================================================================
-- 30. PROJECT WARRANTIES TABLE (A1: Defect liability tracking)
-- Warranty / defect-liability period on completed projects
-- =========================================================================
CREATE TABLE IF NOT EXISTS project_warranties (
    id SERIAL PRIMARY KEY,
    project_id INT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    warranty_period_months INT NOT NULL CHECK (warranty_period_months > 0),
    warranty_start_date DATE NOT NULL,
    warranty_end_date DATE NOT NULL,
    warranty_type VARCHAR(50) DEFAULT 'defect_liability' CHECK (warranty_type IN ('defect_liability', 'performance', 'maintenance')),
    defect_amount NUMERIC(15,2),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'claimed')),
    claim_count INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_warranty_dates CHECK (warranty_end_date > warranty_start_date)
);

CREATE INDEX IF NOT EXISTS idx_project_warranties_project ON project_warranties(project_id);

-- Audit trigger for project_warranties
CREATE TRIGGER trg_audit_project_warranties AFTER INSERT OR UPDATE OR DELETE ON project_warranties
FOR EACH ROW EXECUTE FUNCTION audit_trigger_projects();

-- =========================================================================
-- 31. ROAD DOCUMENTS TABLE (A5: Photo/Attachment storage)
-- Supports inspection photos, design documents, contractor reports
-- =========================================================================
CREATE TABLE IF NOT EXISTS road_documents (
    id SERIAL PRIMARY KEY,
    road_id INT NOT NULL REFERENCES roads(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL CHECK (doc_type IN ('inspection_photo', 'design_document', 'contractor_report', 'material_certificate', 'other')),
    title VARCHAR(255) NOT NULL,
    file_url VARCHAR(512) NOT NULL,
    file_size_bytes INT,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(100) DEFAULT 'system',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_road_documents_road ON road_documents(road_id);
