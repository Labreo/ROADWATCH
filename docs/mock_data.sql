-- ROADWATCH Seed Database Mock Data
-- Ensure schema.sql is executed first to create tables.

-- Clear existing data (optional, for clean run)
TRUNCATE TABLE complaints, projects, roads, contractors, authorities RESTART IDENTITY CASCADE;

-- =========================================================================
-- 0. SEED REGIONS
-- =========================================================================
INSERT INTO regions (code, name, default_currency, locale, phone_format, bounding_box) VALUES
('IN', 'India', 'INR', 'en-IN', '+91-XX-XXXXXXXX', ST_GeomFromText('POLYGON((68.1 6.8, 97.4 6.8, 97.4 35.7, 68.1 35.7, 68.1 6.8))', 4326)),
('US', 'United States', 'USD', 'en-US', '+1-XXX-XXX-XXXX', ST_GeomFromText('POLYGON((-125.0 24.5, -66.9 24.5, -66.9 49.4, -125.0 49.4, -125.0 24.5))', 4326)),
('GB', 'United Kingdom', 'GBP', 'en-GB', '+44-XX-XXXXXXXX', ST_GeomFromText('POLYGON((-8.6 49.8, 1.8 49.8, 1.8 60.9, -8.6 60.9, -8.6 49.8))', 4326)),
('KE', 'Kenya', 'KES', 'en-KE', '+254-XX-XXXXXXX', ST_GeomFromText('POLYGON((33.8 -4.7, 41.9 -4.7, 41.9 5.5, 33.8 5.5, 33.8 -4.7))', 4326));

-- =========================================================================
-- 1. SEED AUTHORITIES (5 Records — India only; international added separately)
-- =========================================================================
INSERT INTO authorities (name, department_code, contact_email, contact_phone, region_code, geom_boundary)
VALUES
(
    'City Municipal Corporation - Ward K-West', 
    'MCGM-KW', 
    'ward.kw@mcgm.gov.in', 
    '+91-22-2623-0000',
    'IN',
    ST_GeomFromText('POLYGON((72.80 19.10, 72.87 19.10, 72.87 19.22, 72.80 19.22, 72.80 19.10))', 4326)
),
(
    'City Municipal Corporation - Ward F-North', 
    'MCGM-FN', 
    'ward.fn@mcgm.gov.in', 
    '+91-22-2402-1111',
    'IN',
    ST_GeomFromText('POLYGON((72.80 18.90, 72.88 18.90, 72.88 19.03, 72.80 19.03, 72.80 18.90))', 4326)
),
(
    'City Municipal Corporation - Ward H-East', 
    'MCGM-HE', 
    'ward.he@mcgm.gov.in', 
    '+91-22-2618-2222',
    'IN',
    ST_GeomFromText('POLYGON((72.87 19.00, 72.95 19.00, 72.95 19.10, 72.87 19.10, 72.87 19.00))', 4326)
),
(
    'State Public Works Department - Mumbai Division', 
    'PWD-MUM', 
    'se.mumbai@pwd.gov.in', 
    '+91-22-2202-3333',
    'IN',
    ST_GeomFromText('POLYGON((72.70 18.80, 73.05 18.80, 73.05 19.30, 72.70 19.30, 72.70 18.80))', 4326)
),
(
    'National Highways Authority of India - RO Mumbai', 
    'NHAI-ROM', 
    'romumbai@nhai.org', 
    '+91-22-2756-4444',
    'IN',
    ST_GeomFromText('POLYGON((72.60 18.70, 73.15 18.70, 73.15 19.45, 72.60 19.45, 72.60 18.70))', 4326)
);

-- =========================================================================
-- 1b. SEED INTERNATIONAL AUTHORITIES (US, GB, KE)
-- =========================================================================
-- US: Detroit area authorities
INSERT INTO authorities (name, department_code, contact_email, contact_phone, region_code, geom_boundary) VALUES
(
    'Detroit Department of Public Works (DPW)',
    'DPW-DET',
    'dpw.dispatch@detroitmi.gov',
    '+1-313-224-3901',
    'US',
    ST_GeomFromText('POLYGON((-83.15 42.25, -82.95 42.25, -82.95 42.42, -83.15 42.42, -83.15 42.25))', 4326)
),
(
    'Michigan Department of Transportation (MDOT)',
    'MDOT-LAN',
    'mdot-info@michigan.gov',
    '+1-517-373-2064',
    'US',
    ST_GeomFromText('POLYGON((-84.50 41.70, -82.50 41.70, -82.50 43.50, -84.50 43.50, -84.50 41.70))', 4326)
),
(
    'Federal Highway Administration (FHWA) - Michigan Division',
    'FHWA-MI',
    'michigan.fhwa@dot.gov',
    '+1-517-706-3100',
    'US',
    ST_GeomFromText('POLYGON((-90.0 41.5, -82.0 41.5, -82.0 47.5, -90.0 47.5, -90.0 41.5))', 4326)
),
(
    'Michigan County Road Commission Association',
    'CRCA-MI',
    'info@crcami.org',
    '+1-517-484-9355',
    'US',
    NULL
);
-- GB: London / Camden area authorities
INSERT INTO authorities (name, department_code, contact_email, contact_phone, region_code, geom_boundary) VALUES
(
    'Camden Borough Council - Highways Division',
    'CBC-HIGHWAYS',
    'highways@camden.gov.uk',
    '+44-20-7974-4444',
    'GB',
    ST_GeomFromText('POLYGON((-0.20 51.52, -0.10 51.52, -0.10 51.57, -0.20 51.57, -0.20 51.52))', 4326)
),
(
    'London Highways Joint Committee',
    'LHJC-LON',
    'enquiries@lhjc.org.uk',
    '+44-20-7934-9999',
    'GB',
    ST_GeomFromText('POLYGON((-0.35 51.38, 0.05 51.38, 0.05 51.65, -0.35 51.65, -0.35 51.38))', 4326)
),
(
    'National Highways - South East Division',
    'NH-SE',
    'info@nationalhighways.co.uk',
    '+44-300-123-5000',
    'GB',
    ST_GeomFromText('POLYGON((-1.50 50.80, 1.00 50.80, 1.00 52.50, -1.50 52.50, -1.50 50.80))', 4326)
),
(
    'Local Highway Authority Default',
    'LHA-UK',
    'enquiries@lha.gov.uk',
    '+44-20-7000-0000',
    'GB',
    NULL
);
-- KE: Nairobi area authorities
INSERT INTO authorities (name, department_code, contact_email, contact_phone, region_code, geom_boundary) VALUES
(
    'Nairobi City County - Department of Roads & Transport',
    'NCC-ROADS',
    'roads@nairobi.go.ke',
    '+254-20-2224281',
    'KE',
    ST_GeomFromText('POLYGON((36.70 -1.38, 36.95 -1.38, 36.95 -1.18, 36.70 -1.18, 36.70 -1.38))', 4326)
),
(
    'Kenya Urban Roads Authority (KURA)',
    'KURA-HQ',
    'info@kura.go.ke',
    '+254-20-8013844',
    'KE',
    ST_GeomFromText('POLYGON((36.50 -1.60, 37.20 -1.60, 37.20 -0.90, 36.50 -0.90, 36.50 -1.60))', 4326)
),
(
    'Kenya National Highways Authority (KeNHA)',
    'KeNHA-HQ',
    'dg@kenha.co.ke',
    '+254-20-4971200',
    'KE',
    ST_GeomFromText('POLYGON((33.5 -4.5, 42.0 -4.5, 42.0 5.0, 33.5 5.0, 33.5 -4.5))', 4326)
),
(
    'County Department of Infrastructure',
    'CDI-KE',
    'infrastructure@county.go.ke',
    '+254-20-1111111',
    'KE',
    NULL
);


-- =========================================================================
-- 2. SEED CONTRACTORS (12 Records)
-- =========================================================================
INSERT INTO contractors (name, license_number, registration_date, contact_email, contact_phone, rating, projects_completed, projects_delayed, blacklisted, blacklisted_reason)
VALUES
('Apex Infrastructure Ltd', 'LIC-2015-1102', '2015-04-12', 'contact@apexinfra.com', '+91-22-6123-4567', 4.25, 24, 2, FALSE, NULL),
('BuildWell Roadways Corp', 'LIC-2018-4903', '2018-09-20', 'gov@buildwellroadways.in', '+91-22-6891-9988', 3.80, 18, 4, FALSE, NULL),
('Zenith Construction Group', 'LIC-2012-0051', '2012-01-15', 'tenders@zenithinfra.com', '+91-22-5555-8888', 4.50, 42, 1, FALSE, NULL),
('Shiva Earthmovers & Paving', 'LIC-2020-8812', '2020-06-30', 'shiva.earth@gmail.com', '+91-98200-11223', 2.10, 8, 5, FALSE, NULL), -- Poor rating
('Landmark Infra Projects', 'LIC-2019-3321', '2019-11-05', 'projects@landmarkinfra.in', '+91-22-2591-1020', 3.90, 15, 2, FALSE, NULL),
('Metro Highway Builders', 'LIC-2014-9092', '2014-03-22', 'info@metrobuilders.com', '+91-22-4090-0909', 4.60, 31, 0, FALSE, NULL),
('Coastal Paving Specialists', 'LIC-2021-0022', '2021-02-18', 'ops@coastalpaving.com', '+91-22-8812-3456', 4.10, 6, 0, FALSE, NULL),
('Bharat Roads & Highways Ltd', 'LIC-2010-0010', '2010-05-05', 'contact@bharatroads.co.in', '+91-22-2651-1234', 4.75, 85, 3, FALSE, NULL),
('Skyline Developers & Civil', 'LIC-2022-7711', '2022-08-14', 'bids@skylinedevelopers.com', '+91-99300-88899', 3.40, 4, 1, FALSE, NULL),
('Omega Infrastructure Inc', 'LIC-2016-5621', '2016-10-10', 'legal@omegacorp.com', '+91-22-6712-9900', 1.80, 12, 8, TRUE, 'Failure to complete SV Road drainage project inside contract timelines and high rate of road surface peeling within 3 months of paving.'),
('Precision Asphalt Works', 'LIC-2023-1100', '2023-01-20', 'contact@precisionasphalt.in', '+91-90040-55112', 4.00, 3, 0, FALSE, NULL),
('Pioneer Engineering Corp', 'LIC-2017-3829', '2017-07-07', 'pioneer.engg@rediffmail.com', '+91-22-2877-6655', 3.20, 14, 4, FALSE, NULL);


-- =========================================================================
-- 3. SEED ROADS (12 Records)
-- =========================================================================
INSERT INTO roads (name, road_code, status, length_km, authority_id, geom)
VALUES
(
    'Western Express Highway', 
    'WEH-NH8', 
    'under_construction', 
    25.50, 
    5, -- NHAI
    ST_GeomFromText('LINESTRING(72.8524 19.1012, 72.8530 19.1340, 72.8590 19.1860, 72.8610 19.2300)', 4326)
),
(
    'Eastern Express Highway', 
    'EEH-SH3', 
    'fair', 
    22.10, 
    4, -- PWD
    ST_GeomFromText('LINESTRING(72.9210 19.0410, 72.9340 19.1020, 72.9460 19.1680, 72.9610 19.2150)', 4326)
),
(
    'S.V. Road', 
    'SV-RD-01', 
    'poor', 
    16.80, 
    1, -- Ward K-West
    ST_GeomFromText('LINESTRING(72.8354 19.0601, 72.8360 19.1020, 72.8398 19.1620, 72.8450 19.2080)', 4326)
),
(
    'Link Road', 
    'LNK-RD-02', 
    'under_construction', 
    18.20, 
    1, -- Ward K-West
    ST_GeomFromText('LINESTRING(72.8250 19.0805, 72.8270 19.1240, 72.8310 19.1840, 72.8510 19.2450)', 4326)
),
(
    'LBS Marg', 
    'LBS-RD-03', 
    'poor', 
    21.00, 
    3, -- Ward H-East
    ST_GeomFromText('LINESTRING(72.8890 19.0305, 72.8980 19.0840, 72.9120 19.1360, 72.9350 19.1980)', 4326)
),
(
    'Senapati Bapat Marg', 
    'SBM-RD-04', 
    'good', 
    7.50, 
    2, -- Ward F-North
    ST_GeomFromText('LINESTRING(72.8240 18.9510, 72.8260 18.9850, 72.8290 19.0180)', 4326)
),
(
    'Dr. Ambedkar Road', 
    'AMB-RD-05', 
    'good', 
    8.20, 
    2, -- Ward F-North
    ST_GeomFromText('LINESTRING(72.8480 18.9610, 72.8500 18.9950, 72.8520 19.0280)', 4326)
),
(
    'Jogeshwari-Vikhroli Link Road', 
    'JVLR-SH1', 
    'fair', 
    10.80, 
    4, -- PWD
    ST_GeomFromText('LINESTRING(72.8520 19.1320, 72.8810 19.1290, 72.9050 19.1240, 72.9230 19.1200)', 4326)
),
(
    'Santa Cruz-Chembur Link Road', 
    'SCLR-SH2', 
    'fair', 
    6.40, 
    4, -- PWD
    ST_GeomFromText('LINESTRING(72.8550 19.0710, 72.8790 19.0700, 72.8990 19.0680, 72.9110 19.0650)', 4326)
),
(
    'Ghodbunder Road', 
    'GB-SH42', 
    'good', 
    20.00, 
    4, -- PWD
    ST_GeomFromText('LINESTRING(72.9550 19.2220, 72.9310 19.2520, 72.8990 19.2680, 72.8680 19.2810)', 4326)
),
(
    'Marine Drive', 
    'MD-RD-06', 
    'good', 
    3.60, 
    2, -- Ward F-North
    ST_GeomFromText('LINESTRING(72.8205 18.9210, 72.8210 18.9320, 72.8235 18.9480)', 4326)
),
(
    'Sion-Panvel Highway', 
    'SPH-NH4', 
    'fair', 
    24.80, 
    5, -- NHAI
    ST_GeomFromText('LINESTRING(72.9010 19.0390, 72.9450 19.0430, 72.9980 19.0400, 73.0610 19.0250)', 4326)
);


-- =========================================================================
-- 4. SEED PROJECTS (Contracts to support Budget & Timeline features)
-- =========================================================================
INSERT INTO projects (title, road_id, contractor_id, authority_id, budget_allocated, budget_spent, status, start_date, target_end_date, actual_end_date, delay_days)
VALUES
-- Western Express Highway - Active
('WEH Flyover Resurfacing & Structural Grouting', 1, 1, 5, 240000000.00, 185000000.00, 'in_progress', '2025-06-01', '2026-06-30', NULL, 0),
-- Eastern Express Highway - Completed with minor delay
('EEH Pothole Remediation Campaign 2025', 2, 2, 4, 18000000.00, 19200000.00, 'completed', '2025-09-01', '2025-10-31', '2025-11-12', 12),
-- SV Road - Poor contractor blacklisted
('SV Road Drainage Trenching and Microtunnelling', 3, 10, 1, 95000000.00, 45000000.00, 'halted', '2024-05-10', '2025-05-10', NULL, 378),
-- SV Road - New contractor assigned
('SV Road Emergency Asphalt Laying', 3, 3, 1, 35000000.00, 12000000.00, 'in_progress', '2026-03-01', '2026-08-31', NULL, 0),
-- Link Road - Active
('Link Road Concrete Pavement Upgrade Ph. 2', 4, 6, 1, 145000000.00, 75000000.00, 'in_progress', '2025-10-15', '2026-09-30', NULL, 0),
-- LBS Marg - Active but delayed
('LBS Marg Sewer Line Laying and Patching', 5, 4, 3, 62000000.00, 60000000.00, 'in_progress', '2024-11-01', '2025-11-01', NULL, 203),
-- Senapati Bapat Marg - Completed
('Senapati Bapat Marg Micro-silica concrete topping', 6, 3, 2, 85000000.00, 84200000.00, 'completed', '2023-01-15', '2023-12-15', '2023-12-10', 0),
-- Dr. Ambedkar Road - Completed
('Dr. Ambedkar Road Junction Redesign & Lane Widening', 7, 8, 2, 110000000.00, 108000000.00, 'completed', '2024-02-01', '2025-01-31', '2025-01-20', 0),
-- JVLR - Completed
('JVLR Pothole Repair and Guardrail installation', 8, 5, 4, 12500000.00, 12500000.00, 'completed', '2025-05-01', '2025-06-30', '2025-06-28', 0),
-- SCLR - Active
('SCLR Connector Joint Replacement & Waterproofing', 9, 7, 4, 45000000.00, 22000000.00, 'in_progress', '2025-11-01', '2026-05-31', NULL, 0),
-- Ghodbunder Road - Completed
('Ghodbunder Road Mast-Asphalt Overlay', 10, 8, 4, 190000000.00, 187000000.00, 'completed', '2024-03-01', '2024-12-31', '2024-12-25', 0),
-- Sion-Panvel Highway - Active
('Sion-Panvel Expressway Maintenance & Repair', 12, 11, 5, 80000000.00, 31000000.00, 'in_progress', '2025-12-01', '2026-11-30', NULL, 0);


-- =========================================================================
-- 5. SEED COMPLAINTS (20 Records)
-- =========================================================================
INSERT INTO complaints (client_temp_id, title, description, category, geom, status, escalation_level, image_url, assigned_authority_id, road_id)
VALUES
-- Complaint 1 (WEH - Pothole)
(
    '8f8b8c1a-289e-4b47-b8db-c8db05ab1c1b',
    'Severe Potholes near Andheri Flyover',
    'Multiple deep potholes on the southbound main road. Damaging tires and causing sudden braking.',
    'pothole',
    ST_GeomFromText('POINT(72.8531 19.1190)', 4326),
    'in_progress',
    0,
    'https://images.roadwatch.civic/complaints/pothole_andheri.jpg',
    5, -- NHAI
    1  -- WEH
),
-- Complaint 2 (WEH - Signage)
(
    'c25e8396-857e-4054-9426-1507df0a7b11',
    'Missing diversion board near Metro work',
    'The lane closure indicator is missing. Extremely hazardous at night.',
    'missing_signage',
    ST_GeomFromText('POINT(72.8580 19.1720)', 4326),
    'resolved',
    0,
    'https://images.roadwatch.civic/complaints/missing_sign_weh.jpg',
    5, -- NHAI
    1  -- WEH
),
-- Complaint 3 (SV Road - Paving defect)
(
    'df108bc5-7b56-4c4f-9562-ee2ee9108b34',
    'Uneven Paver Blocks at Bandra Signal',
    'The interlocking bricks have caved in. Creates a massive bump for motorbikes.',
    'paving_defect',
    ST_GeomFromText('POINT(72.8356 19.0620)', 4326),
    'pending',
    0,
    NULL,
    1, -- Ward K-West
    3  -- SV Road
),
-- Complaint 4 (SV Road - Waterlogging)
(
    'a3e0f9b6-8bb0-47b2-9011-477000cc55aa',
    'Monsoon Waterlogging outside station',
    'Water level reaches knee height during high tide rains. Drain inlets are fully clogged.',
    'waterlogging',
    ST_GeomFromText('POINT(72.8362 19.0980)', 4326),
    'in_progress',
    1,
    'https://images.roadwatch.civic/complaints/waterlog_sv_station.jpg',
    1, -- Ward K-West
    3  -- SV Road
),
-- Complaint 5 (Link Road - Debris)
(
    '0a82b012-e7b3-469b-83ee-0062f2bc88d2',
    'Dumping of building debris on left lane',
    'Truckloads of sand and broken concrete bricks left on the road blocking traffic.',
    'debris',
    ST_GeomFromText('POINT(72.8272 19.1260)', 4326),
    'routed',
    0,
    'https://images.roadwatch.civic/complaints/debris_link_rd.jpg',
    1, -- Ward K-West
    4  -- Link Road
),
-- Complaint 6 (LBS Marg - Pothole)
(
    '55d7b51b-1002-4fb0-a7d1-12ef891ab01e',
    'Crater-sized pothole near Kurla junction',
    'Nearly 1.5 feet deep. Several auto-rickshaws have overturned trying to avoid it.',
    'pothole',
    ST_GeomFromText('POINT(72.8982 19.0850)', 4326),
    'in_progress',
    0,
    'https://images.roadwatch.civic/complaints/crater_lbs_kurla.jpg',
    3, -- Ward H-East
    5  -- LBS Marg
),
-- Complaint 7 (LBS Marg - Waterlogging)
(
    'fe2e84c1-65b1-4f10-9111-ee44aa3312b9',
    'Stagnant water near Phoenix mall entrance',
    'Clogged drains from construction are backing up water onto the road.',
    'waterlogging',
    ST_GeomFromText('POINT(72.9030 19.1020)', 4326),
    'pending',
    2,
    NULL,
    3, -- Ward H-East
    5  -- LBS Marg
),
-- Complaint 8 (EEH - Pothole)
(
    '44cc8a0b-12d2-45e0-9002-12efee89b910',
    'Potholes on Vikhroli stretch',
    'Fast-moving traffic is lane-splitting dangerously to avoid three deep potholes.',
    'pothole',
    ST_GeomFromText('POINT(72.9345 19.1080)', 4326),
    'resolved',
    0,
    'https://images.roadwatch.civic/complaints/pothole_eeh_vik.jpg',
    4, -- PWD
    2  -- EEH
),
-- Complaint 9 (EEH - Debris)
(
    '11a0ff8e-a89e-4ff0-aa22-55dbcc234120',
    'Scraped asphalt piles on side shoulder',
    'Scraped road surface from roadwork left on the road shoulder. Blowing dust everywhere.',
    'debris',
    ST_GeomFromText('POINT(72.9465 19.1710)', 4326),
    'routed',
    0,
    NULL,
    4, -- PWD
    2  -- EEH
),
-- Complaint 10 (SBM - Signage)
(
    '33b0fc8a-a77b-4ee0-bb11-44ab0c239455',
    'Fallen speed limit board near school zone',
    'The pole was hit by a truck and is lying flat on the pavement.',
    'missing_signage',
    ST_GeomFromText('POINT(72.8262 18.9860)', 4326),
    'resolved',
    0,
    'https://images.roadwatch.civic/complaints/fallen_sign_sbm.jpg',
    2, -- Ward F-North
    6  -- Senapati Bapat Marg
),
-- Complaint 11 (Dr Ambedkar Road - Paving defect)
(
    'a2bc90fa-61c0-43eb-b8bb-0e0e010cb7c8',
    'Sinking road surface near Dadar TT flyover base',
    'The road surface has depressed, forming a deep depression that fills with water.',
    'paving_defect',
    ST_GeomFromText('POINT(72.8502 18.9960)', 4326),
    'pending',
    1,
    NULL,
    2, -- Ward F-North
    7  -- Dr. Ambedkar Road
),
-- Complaint 12 (JVLR - Pothole)
(
    '88ca3810-bb90-410a-810a-810aee00ff01',
    'JVLR Metro Pillar 12 Potholes',
    'Multiple defects right next to the metro construction barricade.',
    'pothole',
    ST_GeomFromText('POINT(72.8820 19.1285)', 4326),
    'in_progress',
    0,
    'https://images.roadwatch.civic/complaints/pothole_jvlr_pillar12.jpg',
    4, -- PWD
    8  -- JVLR
),
-- Complaint 13 (SCLR - Paving defect)
(
    'cba18b20-cc55-4e00-9900-33dbbfa10022',
    'Expansion joint gaps on SCLR flyover',
    'The steel bridge expansion joints are misaligned, causing heavy shocks to cars.',
    'paving_defect',
    ST_GeomFromText('POINT(72.8795 19.0695)', 4326),
    'pending',
    0,
    NULL,
    4, -- PWD
    9  -- SCLR
),
-- Complaint 14 (Ghodbunder Road - Debris)
(
    '23d4ee09-fa98-4c12-88bb-ee99abcc1234',
    'Spilled gravel near Ovala junction',
    'Dumper truck spilled small gravel stones on the fast lane, making it slippery for two-wheelers.',
    'debris',
    ST_GeomFromText('POINT(72.9315 19.2525)', 4326),
    'resolved',
    0,
    'https://images.roadwatch.civic/complaints/spilled_gravel_gb.jpg',
    4, -- PWD
    10 -- Ghodbunder Road
),
-- Complaint 15 (Marine Drive - Paving defect)
(
    '4c0a8b23-11bb-4ccb-b99b-ee33aa221199',
    'Loose concrete flags near promenade',
    'Footpath stones are loose. Pedestrians trip when stepping on them.',
    'paving_defect',
    ST_GeomFromText('POINT(72.8211 18.9325)', 4326),
    'resolved',
    0,
    NULL,
    2, -- Ward F-North
    11 -- Marine Drive
),
-- Complaint 16 (Sion-Panvel Highway - Pothole)
(
    '00c9e010-aa55-4cc0-8800-4747cc00f0fe',
    'Highway potholes near Mankhurd T-junction',
    'Large asphalt crater that slows down the highway bottleneck entry.',
    'pothole',
    ST_GeomFromText('POINT(72.9250 19.0415)', 4326),
    'in_progress',
    0,
    'https://images.roadwatch.civic/complaints/mankhurd_highway_crater.jpg',
    5, -- NHAI
    12 -- Sion-Panvel Highway
),
-- Complaint 17 (WEH - Pothole)
(
    'ee8890aa-9bb1-4aa0-bb02-33d3d3d3d3d3',
    'Pothole on Malad flyover descent',
    'Located in the middle lane, extremely dangerous due to highway speeds.',
    'pothole',
    ST_GeomFromText('POINT(72.8592 19.1865)', 4326),
    'rejected', -- Rejected since duplicate of ongoing highway work
    0,
    'https://images.roadwatch.civic/complaints/malad_flyover_pothole.jpg',
    5, -- NHAI
    1  -- WEH
),
-- Complaint 18 (Link Road - Waterlogging)
(
    'c092bbfa-ee98-40f8-bb99-383838382211',
    'Water pooling under Oshiwara bridge',
    'Even short showers result in water accumulating in the lower dip of the road.',
    'waterlogging',
    ST_GeomFromText('POINT(72.8312 19.1835)', 4326),
    'pending',
    0,
    NULL,
    1, -- Ward K-West
    4  -- Link Road
),
-- Complaint 19 (LBS Marg - Debris)
(
    'ab01ff23-bb55-4422-9900-121212121212',
    'Discarded steel pipes near Bhandup station',
    'Leftover water pipeline project pipes blocking the footpaths and active street lane.',
    'debris',
    ST_GeomFromText('POINT(72.9348 19.1975)', 4326),
    'routed',
    0,
    'https://images.roadwatch.civic/complaints/lbs_pipes_bhandup.jpg',
    3, -- Ward H-East
    5  -- LBS Marg
),
-- Complaint 20 (Sion-Panvel Highway - Signage)
(
    'aa88c0a9-1a00-47b2-bdcb-7c7c7c7c7c7c',
    'Broken lane divider reflectors near Vashi Bridge',
    'Cat-eye reflectors have broken off. Hard to see lane markings in heavy rain.',
    'missing_signage',
    ST_GeomFromText('POINT(72.9982 19.0402)', 4326),
    'pending',
    0,
    NULL,
    5, -- NHAI
    12 -- Sion-Panvel Highway
);

-- =========================================================================
-- 6. INTERNATIONAL CONTRACTORS (US, GB, KE)
-- =========================================================================
INSERT INTO contractors (name, license_number, registration_date, contact_email, contact_phone, rating, projects_completed, projects_delayed, blacklisted, blacklisted_reason)
VALUES
-- US Contractors
('Great Lakes Infrastructure LLC', 'LIC-US-2018-001', '2018-03-15', 'bids@greatlakesinfra.com', '+1-313-555-0101', 4.30, 35, 2, FALSE, NULL),
('Michigan Paving Company', 'LIC-US-2019-002', '2019-07-22', 'ops@michiganpaving.com', '+1-313-555-0102', 3.90, 22, 3, FALSE, NULL),
('Detroit Roads Alliance', 'LIC-US-2020-003', '2020-01-10', 'contracts@detroitroads.org', '+1-313-555-0103', 2.50, 10, 5, TRUE, 'Failure to complete I-94 resurfacing within contract timeline; substandard asphalt quality.'),

-- GB Contractors
('Thames Highway Contractors Ltd', 'LIC-GB-2016-001', '2016-11-01', 'tenders@thameshighways.co.uk', '+44-20-7946-0101', 4.50, 48, 1, FALSE, NULL),
('Camden Civils & Paving', 'LIC-GB-2021-002', '2021-02-14', 'projects@camdencivils.co.uk', '+44-20-7946-0102', 4.10, 12, 1, FALSE, NULL),
('London Asphalt Solutions', 'LIC-GB-2017-003', '2017-09-05', 'info@londonasphalt.co.uk', '+44-20-7946-0103', 3.60, 28, 6, FALSE, NULL),

-- KE Contractors
('Nairobi Road Builders Ltd', 'LIC-KE-2015-001', '2015-05-20', 'info@nairobiroadbuilders.co.ke', '+254-20-555-0101', 4.20, 30, 3, FALSE, NULL),
('Kenya Infrastructure Group', 'LIC-KE-2018-002', '2018-08-12', 'tenders@kenyainfra.co.ke', '+254-20-555-0102', 3.80, 18, 4, FALSE, NULL),
('Mombasa Roadworks Ltd', 'LIC-KE-2020-003', '2020-03-30', 'projects@mombasaroadworks.co.ke', '+254-20-555-0103', 2.80, 8, 5, FALSE, NULL);

-- =========================================================================
-- 7. INTERNATIONAL ROADS (US, GB, KE)
-- =========================================================================
INSERT INTO roads (name, road_code, status, length_km, authority_id, geom)
VALUES
-- US: Detroit area roads
(
    'I-94 (Edsel Ford Freeway)', 
    'US-I94',
    'fair', 
    45.20, 
    8, -- FHWA-MI
    ST_GeomFromText('LINESTRING(-83.1500 42.3500, -83.1000 42.3550, -83.0500 42.3600, -82.9900 42.3650, -82.9400 42.3700)', 4326)
),
(
    'M-10 (Lodge Freeway)', 
    'US-M10',
    'poor', 
    21.50, 
    8, -- FHWA-MI
    ST_GeomFromText('LINESTRING(-83.1200 42.3200, -83.1150 42.3500, -83.1100 42.3800, -83.1050 42.4100)', 4326)
),
(
    'Woodward Avenue', 
    'US-M1',
    'good', 
    27.00, 
    7, -- MDOT
    ST_GeomFromText('LINESTRING(-83.0800 42.3500, -83.0750 42.3800, -83.0700 42.4100, -83.0650 42.4400)', 4326)
),
(
    'Gratiot Avenue', 
    'US-M3',
    'fair', 
    35.80, 
    7, -- MDOT
    ST_GeomFromText('LINESTRING(-82.9800 42.3500, -82.9700 42.3800, -82.9600 42.4100, -82.9500 42.4400)', 4326)
),
(
    'Michigan Avenue', 
    'US-M12',
    'under_construction', 
    18.60, 
    6, -- DPW-DET
    ST_GeomFromText('LINESTRING(-83.1200 42.3300, -83.1000 42.3350, -83.0800 42.3400, -83.0600 42.3450)', 4326)
),

-- GB: London / Camden area roads
(
    'A41 (Camden High Street)', 
    'GB-A41',
    'fair', 
    8.50, 
    10, -- CBC-HIGHWAYS
    ST_GeomFromText('LINESTRING(-0.1500 51.5300, -0.1450 51.5400, -0.1400 51.5500, -0.1350 51.5600)', 4326)
),
(
    'A502 (Parkway / Finchley Road)', 
    'GB-A502',
    'good', 
    6.20, 
    11, -- LHJC-LON
    ST_GeomFromText('LINESTRING(-0.1700 51.5350, -0.1650 51.5450, -0.1600 51.5550, -0.1550 51.5650)', 4326)
),
(
    'Euston Road (A501)', 
    'GB-A501',
    'poor', 
    3.80, 
    12, -- NH-SE
    ST_GeomFromText('LINESTRING(-0.1400 51.5250, -0.1300 51.5270, -0.1200 51.5280, -0.1100 51.5300)', 4326)
),
(
    'Camden High Street', 
    'GB-CAMDEN-HS',
    'fair', 
    2.10, 
    10, -- CBC-HIGHWAYS
    ST_GeomFromText('LINESTRING(-0.1420 51.5340, -0.1410 51.5420, -0.1400 51.5500)', 4326)
),

-- KE: Nairobi area roads
(
    'Uhuru Highway', 
    'KE-A104',
    'fair', 
    8.00, 
    16, -- KeNHA-HQ
    ST_GeomFromText('LINESTRING(36.8200 -1.2800, 36.8150 -1.2900, 36.8100 -1.3000, 36.8050 -1.3100)', 4326)
),
(
    'Mombasa Road (A109)', 
    'KE-A109',
    'poor', 
    15.00, 
    16, -- KeNHA-HQ
    ST_GeomFromText('LINESTRING(36.8500 -1.3000, 36.8700 -1.3100, 36.8900 -1.3200, 36.9100 -1.3250)', 4326)
),
(
    'Thika Superhighway (A2)', 
    'KE-A2',
    'good', 
    12.50, 
    15, -- KURA-HQ
    ST_GeomFromText('LINESTRING(36.8300 -1.2700, 36.8400 -1.2600, 36.8500 -1.2500, 36.8600 -1.2400)', 4326)
),
(
    'Jogoo Road', 
    'KE-B301',
    'fair', 
    6.80, 
    14, -- NCC-ROADS
    ST_GeomFromText('LINESTRING(36.8600 -1.2900, 36.8700 -1.2950, 36.8800 -1.3000, 36.8900 -1.3050)', 4326)
),
(
    'Lang''ata Road', 
    'KE-C401',
    'under_construction', 
    10.20, 
    14, -- NCC-ROADS
    ST_GeomFromText('LINESTRING(36.7800 -1.3200, 36.7900 -1.3150, 36.8000 -1.3100, 36.8100 -1.3050)', 4326)
);

-- =========================================================================
-- 8. INTERNATIONAL PROJECTS (US, GB, KE)
-- =========================================================================
INSERT INTO projects (title, road_id, contractor_id, authority_id, budget_allocated, budget_spent, status, start_date, target_end_date, actual_end_date, delay_days)
VALUES
-- US Projects
('I-94 Resurfacing & Bridge Repairs', 13, 13, 8, 45000000.00, 28000000.00, 'in_progress', '2025-06-01', '2026-12-31', NULL, 0),
('M-10 Freeway Pothole Remediation', 14, 14, 8, 8500000.00, 8500000.00, 'completed', '2025-03-01', '2025-08-31', '2025-09-15', 15),
('Woodward Avenue Streetscape Phase 2', 15, 13, 7, 12000000.00, 5000000.00, 'in_progress', '2025-11-01', '2026-10-31', NULL, 0),
('Michigan Avenue Drainage Upgrade', 17, 15, 6, 6500000.00, 6500000.00, 'completed', '2024-01-15', '2024-12-31', '2024-12-15', 0),

-- GB Projects
('Camden High Street Safety Improvements', 18, 17, 10, 3500000.00, 2100000.00, 'in_progress', '2025-09-01', '2026-06-30', NULL, 0),
('A502 Finchley Road Carriageway Repair', 19, 16, 11, 4800000.00, 4600000.00, 'completed', '2025-04-01', '2025-10-31', '2025-10-28', 0),
('Euston Road Bus Lane Resurfacing', 20, 18, 12, 2200000.00, 800000.00, 'in_progress', '2026-01-15', '2026-07-31', NULL, 0),

-- KE Projects
('Uhuru Highway Bridge Expansion Joint Repair', 22, 19, 16, 85000000.00, 55000000.00, 'in_progress', '2025-08-01', '2026-08-31', NULL, 0),
('Mombasa Road Drainage Channel Desilting', 23, 20, 16, 25000000.00, 24000000.00, 'completed', '2025-02-01', '2025-07-31', '2025-08-10', 10),
('Lang''ata Road Widening & Overlay', 26, 21, 14, 120000000.00, 45000000.00, 'in_progress', '2025-10-01', '2027-03-31', NULL, 0);

-- =========================================================================
-- 9. INTERNATIONAL COMPLAINTS (US, GB, KE)
-- =========================================================================
INSERT INTO complaints (client_temp_id, title, description, category, geom, status, escalation_level, image_url, assigned_authority_id, road_id)
VALUES
-- US Complaints (I-94, Woodward Ave, Michigan Ave)
(
    '7f7f7f7f-1001-4000-8000-100000000001',
    'Deep potholes on I-94 near Dearborn',
    'Multiple 6-inch deep potholes in the right lane causing tire blowouts.',
    'pothole',
    ST_GeomFromText('POINT(-83.1000 42.3550)', 4326),
    'in_progress',
    0,
    NULL,
    8, -- FHWA-MI
    13 -- I-94
),
(
    '7f7f7f7f-1001-4000-8000-100000000002',
    'Missing lane markings on Woodward Ave',
    'Lane divider paint has completely worn off between 7 Mile and 8 Mile Road.',
    'missing_signage',
    ST_GeomFromText('POINT(-83.0750 42.3800)', 4326),
    'pending',
    0,
    NULL,
    7, -- MDOT
    15 -- Woodward Ave
),
(
    '7f7f7f7f-1001-4000-8000-100000000003',
    'Water pooling on Michigan Ave underpass',
    'Storm drain is clogged causing 6-inch standing water across all lanes.',
    'waterlogging',
    ST_GeomFromText('POINT(-83.0900 42.3380)', 4326),
    'routed',
    1,
    NULL,
    6, -- DPW-DET
    17 -- Michigan Ave
),
-- GB Complaints (Camden High Street, Euston Road)
(
    '7f7f7f7f-1001-4000-8000-200000000001',
    'Sunken manhole cover on Camden High Street',
    'Manhole cover has sunk 4cm below road surface creating hazard for cyclists.',
    'paving_defect',
    ST_GeomFromText('POINT(-0.1420 51.5400)', 4326),
    'in_progress',
    0,
    NULL,
    10, -- CBC-HIGHWAYS
    18 -- A41 / Camden High Street
),
(
    '7f7f7f7f-1001-4000-8000-200000000002',
    'Uneven asphalt patches on Euston Road',
    'Multiple patches from utility works creating bumpy surface for buses.',
    'paving_defect',
    ST_GeomFromText('POINT(-0.1250 51.5280)', 4326),
    'pending',
    0,
    NULL,
    12, -- NH-SE
    20 -- Euston Road
),
-- KE Complaints (Mombasa Road, Jogoo Road)
(
    '7f7f7f7f-1001-4000-8000-300000000001',
    'Large crater on Mombasa Road near Industrial Area',
    'Deep crater spanning half the lane, causing traffic to merge dangerously.',
    'pothole',
    ST_GeomFromText('POINT(36.8800 -1.3150)', 4326),
    'in_progress',
    1,
    NULL,
    16, -- KeNHA-HQ
    23 -- Mombasa Road
),
(
    '7f7f7f7f-1001-4000-8000-300000000002',
    'Flooded underpass on Jogoo Road',
    'Heavy rain has flooded the Makadara underpass to waist height.',
    'waterlogging',
    ST_GeomFromText('POINT(36.8750 -1.2970)', 4326),
    'routed',
    2,
    NULL,
    14, -- NCC-ROADS
    25 -- Jogoo Road
),
(
    '7f7f7f7f-1001-4000-8000-300000000003',
    'Debris from construction on Lang''ata Road',
    'Construction debris and gravel scattered across the road near Carnivore junction.',
    'debris',
    ST_GeomFromText('POINT(36.7950 -1.3120)', 4326),
    'pending',
    0,
    NULL,
    14, -- NCC-ROADS
    26 -- Lang''ata Road
);
