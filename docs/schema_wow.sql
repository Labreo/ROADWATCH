-- =========================================================================
-- ROADWATCH extensions: Bump Radar, warranty clawback and repair checks.
-- Load after seed_wireframes.sql. Safe to run more than once.
-- =========================================================================

-- Bump Radar: road shocks a phone's accelerometer picked up during a ride.
-- Clusters of hits from several rides become a sensor-detected report.
CREATE TABLE IF NOT EXISTS ride_bumps (
    id BIGSERIAL PRIMARY KEY,
    ride_id UUID NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    intensity NUMERIC(6, 2) NOT NULL CHECK (intensity > 0),   -- peak vertical shock, m/s^2
    speed_kmh NUMERIC(6, 1),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    citizen_id INT REFERENCES citizens(id) ON DELETE SET NULL,
    complaint_id INT REFERENCES complaints(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ride_bumps_geom ON ride_bumps USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_ride_bumps_ride ON ride_bumps (ride_id);

-- Proof of repair: a citizen's on-site photo checked by GPS distance and Gemini.
CREATE TABLE IF NOT EXISTS repair_checks (
    id SERIAL PRIMARY KEY,
    complaint_id INT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_id INT REFERENCES citizens(id) ON DELETE SET NULL,
    distance_m NUMERIC(8, 1) NOT NULL,
    verdict VARCHAR(20) NOT NULL CHECK (verdict IN ('repaired', 'not_repaired', 'too_far', 'unclear')),
    confidence NUMERIC(4, 2),
    observation TEXT,
    followup_complaint_id INT REFERENCES complaints(id) ON DELETE SET NULL,
    checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_repair_checks_complaint ON repair_checks (complaint_id);

-- Sample data: the invented Mumbai warranties were 12 months, shorter than
-- MoRTH's 3-year defect liability for renewal works (circular of 21.08.2018).
-- Set the completed Mumbai renewal projects to 3 years from completion.
UPDATE project_warranties w
SET warranty_period_months = 36,
    warranty_end_date = (p.actual_end_date + INTERVAL '36 months')::date,
    status = CASE WHEN p.actual_end_date + INTERVAL '36 months' >= CURRENT_DATE THEN 'active' ELSE w.status END
FROM projects p JOIN authorities a ON a.id = p.authority_id
WHERE w.project_id = p.id AND a.region_code = 'IN' AND p.status = 'completed'
  AND p.actual_end_date IS NOT NULL AND w.warranty_period_months < 36;

-- =========================================================================
-- 4. Img2ThreeJS Procedural 3D Pothole Volumetric Scans & BoQ Registry
-- =========================================================================
CREATE TABLE IF NOT EXISTS pothole_3d_scans (
    id SERIAL PRIMARY KEY,
    complaint_id INT REFERENCES complaints(id) ON DELETE CASCADE,
    road_id INT REFERENCES roads(id) ON DELETE SET NULL,
    scan_title VARCHAR(200) NOT NULL,
    width_m NUMERIC(5, 2) NOT NULL CHECK (width_m > 0),
    length_m NUMERIC(5, 2) NOT NULL CHECK (length_m > 0),
    depth_cm NUMERIC(5, 1) NOT NULL CHECK (depth_cm > 0),
    volume_liters NUMERIC(8, 2) NOT NULL CHECK (volume_liters > 0),
    asphalt_kg NUMERIC(8, 2) NOT NULL CHECK (asphalt_kg > 0),
    tack_coat_liters NUMERIC(6, 2) NOT NULL DEFAULT 1.5,
    estimated_cost_inr NUMERIC(10, 2) NOT NULL CHECK (estimated_cost_inr >= 0),
    exposed_layer VARCHAR(80) NOT NULL,
    irc_severity VARCHAR(40) NOT NULL,
    water_pooling_pct NUMERIC(5, 1) NOT NULL DEFAULT 0,
    spalling_index NUMERIC(4, 2) NOT NULL DEFAULT 0.45,
    heightmap_json JSONB NOT NULL,
    threejs_code TEXT NOT NULL,
    scanned_by VARCHAR(120) NOT NULL DEFAULT 'img2threejs-v2',
    scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pothole_3d_scans_complaint ON pothole_3d_scans (complaint_id);
CREATE INDEX IF NOT EXISTS idx_pothole_3d_scans_road ON pothole_3d_scans (road_id);

-- Seed initial 3D volumetric scans for key Mumbai potholes if table is empty
INSERT INTO pothole_3d_scans (
    complaint_id, road_id, scan_title, width_m, length_m, depth_cm,
    volume_liters, asphalt_kg, tack_coat_liters, estimated_cost_inr,
    exposed_layer, irc_severity, water_pooling_pct, spalling_index,
    heightmap_json, threejs_code, scanned_by
)
SELECT
    c.id,
    c.road_id,
    '3D Volumetric Scan: ' || LEFT(c.title, 140),
    1.15,
    0.92,
    9.4,
    54.80,
    150.02,
    2.40,
    18450.00,
    'Wet Mix Macadam (WMM Sub-Base Exposed)',
    'CRITICAL (IRC:82 > 7.5cm)',
    35.0,
    0.68,
    '{"grid_size": 16, "max_depth_cm": 9.4, "rim_spalling": 0.68, "passes": ["blockout","structural","form","material","surface","lighting","interaction","optimization"]}'::jsonb,
    '// img2threejs procedural factory for complaint #' || c.id || E'\nexport function createPotholeGroup(THREE) {\n  const group = new THREE.Group();\n  group.name = "pothole_crater_' || c.id || E'";\n  return group;\n}',
    'img2threejs-pipeline'
FROM complaints c
WHERE c.category = 'pothole'
  AND NOT EXISTS (SELECT 1 FROM pothole_3d_scans)
ORDER BY c.priority DESC, c.id ASC
LIMIT 4;

-- =========================================================================
-- 5. MonsoonShield: Hydrological Drainage & Preventive Work Orders
-- =========================================================================
CREATE TABLE IF NOT EXISTS preventive_work_orders (
    id SERIAL PRIMARY KEY,
    road_id INT NOT NULL REFERENCES roads(id) ON DELETE CASCADE,
    authority_id INT REFERENCES authorities(id) ON DELETE SET NULL,
    rainfall_mm_hr NUMERIC(6, 1) NOT NULL CHECK (rainfall_mm_hr > 0),
    risk_score INT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    predicted_flood_cm NUMERIC(6, 1) NOT NULL,
    action_type VARCHAR(80) NOT NULL,
    crew_assigned VARCHAR(120) NOT NULL,
    estimated_cost_inr NUMERIC(10, 2) NOT NULL DEFAULT 45000,
    status VARCHAR(30) NOT NULL DEFAULT 'dispatched' CHECK (status IN ('dispatched', 'in_progress', 'completed')),
    dispatched_by VARCHAR(120) NOT NULL,
    dispatched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_preventive_wo_road ON preventive_work_orders (road_id);

-- =========================================================================
-- 6. CivicTrust: Citizen Crowd-Verification & Fraud Guard Ledger
-- =========================================================================
CREATE TABLE IF NOT EXISTS complaint_verifications (
    id SERIAL PRIMARY KEY,
    complaint_id INT NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    citizen_id INT REFERENCES citizens(id) ON DELETE SET NULL,
    verifier_name VARCHAR(120) NOT NULL,
    vote_type VARCHAR(30) NOT NULL CHECK (vote_type IN ('confirm_hazard', 'confirm_fixed', 'flag_fake_closure')),
    distance_m NUMERIC(8, 1) NOT NULL DEFAULT 12.0,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_complaint_verifications_cid ON complaint_verifications (complaint_id);

-- Seed initial community verifications if empty
INSERT INTO complaint_verifications (complaint_id, verifier_name, vote_type, distance_m, comment)
SELECT c.id, 'Kanak Waradkar (Ward K-West RWA)', 'confirm_hazard', 8.4, 'Deep crater right in the middle of the northbound fast lane; two-wheelers swerving dangerously.'
FROM complaints c
WHERE c.category = 'pothole'
  AND NOT EXISTS (SELECT 1 FROM complaint_verifications)
ORDER BY c.priority DESC, c.id ASC
LIMIT 3;

-- Attach generic audit triggers so all 3D scans, monsoon dispatches and crowd verifications appear in audit_log
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['pothole_3d_scans', 'preventive_work_orders', 'complaint_verifications', 'repair_checks'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%1$s ON %1$I', t);
        EXECUTE format('CREATE TRIGGER trg_audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON %1$I
                        FOR EACH ROW EXECUTE FUNCTION audit_trigger_generic()', t);
    END LOOP;
END $$;


