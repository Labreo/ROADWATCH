-- ROADWATCH Database Schema
-- Requires PostgreSQL 16+ and PostGIS extensions

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Authorities Table
-- Represents government entities, municipal corporations, or local departments
CREATE TABLE authorities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    department_code VARCHAR(50) NOT NULL UNIQUE,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    geom_boundary GEOMETRY(Polygon, 4326), -- Administrative jurisdiction boundary
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for spatial queries on authority boundaries
CREATE INDEX idx_authorities_geom ON authorities USING GIST (geom_boundary);


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


-- 6. Trigger for Updating updated_at timestamp
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
