-- ROADWATCH Seed Database Mock Data
-- Ensure schema.sql is executed first to create tables.

-- Clear existing data (optional, for clean run)
TRUNCATE TABLE complaints, projects, roads, contractors, authorities RESTART IDENTITY CASCADE;

-- =========================================================================
-- 1. SEED AUTHORITIES (5 Records)
-- =========================================================================
INSERT INTO authorities (name, department_code, contact_email, contact_phone, geom_boundary)
VALUES
(
    'City Municipal Corporation - Ward K-West', 
    'MCGM-KW', 
    'ward.kw@mcgm.gov.in', 
    '+91-22-2623-0000', 
    ST_GeomFromText('POLYGON((72.80 19.10, 72.87 19.10, 72.87 19.22, 72.80 19.22, 72.80 19.10))', 4326)
),
(
    'City Municipal Corporation - Ward F-North', 
    'MCGM-FN', 
    'ward.fn@mcgm.gov.in', 
    '+91-22-2402-1111', 
    ST_GeomFromText('POLYGON((72.80 18.90, 72.88 18.90, 72.88 19.03, 72.80 19.03, 72.80 18.90))', 4326)
),
(
    'City Municipal Corporation - Ward H-East', 
    'MCGM-HE', 
    'ward.he@mcgm.gov.in', 
    '+91-22-2618-2222', 
    ST_GeomFromText('POLYGON((72.87 19.00, 72.95 19.00, 72.95 19.10, 72.87 19.10, 72.87 19.00))', 4326)
),
(
    'State Public Works Department - Mumbai Division', 
    'PWD-MUM', 
    'se.mumbai@pwd.gov.in', 
    '+91-22-2202-3333', 
    ST_GeomFromText('POLYGON((72.70 18.80, 73.05 18.80, 73.05 19.30, 72.70 19.30, 72.70 18.80))', 4326)
),
(
    'National Highways Authority of India - RO Mumbai', 
    'NHAI-ROM', 
    'romumbai@nhai.org', 
    '+91-22-2756-4444', 
    ST_GeomFromText('POLYGON((72.60 18.70, 73.15 18.70, 73.15 19.45, 72.60 19.45, 72.60 18.70))', 4326)
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
