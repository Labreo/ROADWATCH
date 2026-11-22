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
