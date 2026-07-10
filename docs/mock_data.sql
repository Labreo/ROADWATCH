-- ROADWATCH Seed Database Mock Data
-- Complete replacement: seeds ALL tables with realistic 4-region data (IN, US, GB, KE)
-- Ensure schema.sql is executed first to create tables.
-- This file uses INSERT only (no TRUNCATE, CREATE TABLE, or ALTER TABLE).

-- =========================================================================
-- 0. REGIONS (4 rows)
-- =========================================================================
INSERT INTO regions (code, name, default_currency, locale, phone_format, bounding_box, timezone) VALUES
('IN', 'India', 'INR', 'en-IN', '+91-XX-XXXXXXXX', ST_GeomFromText('POLYGON((68.1 6.8, 97.4 6.8, 97.4 35.7, 68.1 35.7, 68.1 6.8))', 4326), 'Asia/Kolkata'),
('US', 'United States', 'USD', 'en-US', '+1-XXX-XXX-XXXX', ST_GeomFromText('POLYGON((-125.0 24.5, -66.9 24.5, -66.9 49.4, -125.0 49.4, -125.0 24.5))', 4326), 'America/Detroit'),
('GB', 'United Kingdom', 'GBP', 'en-GB', '+44-XX-XXXXXXXX', ST_GeomFromText('POLYGON((-8.6 49.8, 1.8 49.8, 1.8 60.9, -8.6 60.9, -8.6 49.8))', 4326), 'Europe/London'),
('KE', 'Kenya', 'KES', 'en-KE', '+254-XX-XXXXXXX', ST_GeomFromText('POLYGON((33.8 -4.7, 41.9 -4.7, 41.9 5.5, 33.8 5.5, 33.8 -4.7))', 4326), 'Africa/Nairobi');

-- =========================================================================
-- 1. AUTHORITIES (17 rows: 5 IN + 4 US + 4 GB + 4 KE)
-- =========================================================================
INSERT INTO authorities (name, department_code, contact_email, contact_phone, region_code, geom_boundary) VALUES
-- IN: Mumbai area
('City Municipal Corporation - Ward K-West', 'MCGM-KW', 'ward.kw@mcgm.gov.in', '+91-22-2623-0000', 'IN',
 ST_GeomFromText('POLYGON((72.80 19.10, 72.87 19.10, 72.87 19.22, 72.80 19.22, 72.80 19.10))', 4326)),
('City Municipal Corporation - Ward F-North', 'MCGM-FN', 'ward.fn@mcgm.gov.in', '+91-22-2402-1111', 'IN',
 ST_GeomFromText('POLYGON((72.80 18.90, 72.88 18.90, 72.88 19.03, 72.80 19.03, 72.80 18.90))', 4326)),
('City Municipal Corporation - Ward H-East', 'MCGM-HE', 'ward.he@mcgm.gov.in', '+91-22-2618-2222', 'IN',
 ST_GeomFromText('POLYGON((72.87 19.00, 72.95 19.00, 72.95 19.10, 72.87 19.10, 72.87 19.00))', 4326)),
('State Public Works Department - Mumbai Division', 'PWD-MUM', 'se.mumbai@pwd.gov.in', '+91-22-2202-3333', 'IN',
 ST_GeomFromText('POLYGON((72.70 18.80, 73.05 18.80, 73.05 19.30, 72.70 19.30, 72.70 18.80))', 4326)),
('National Highways Authority of India - RO Mumbai', 'NHAI-ROM', 'romumbai@nhai.org', '+91-22-2756-4444', 'IN',
 ST_GeomFromText('POLYGON((72.60 18.70, 73.15 18.70, 73.15 19.45, 72.60 19.45, 72.60 18.70))', 4326)),
-- US: Detroit area
('Detroit Department of Public Works', 'DPW-DET', 'dpw.dispatch@detroitmi.gov', '+1-313-224-3901', 'US',
 ST_GeomFromText('POLYGON((-83.15 42.25, -82.95 42.25, -82.95 42.42, -83.15 42.42, -83.15 42.25))', 4326)),
('Michigan Department of Transportation', 'MDOT-LAN', 'mdot-info@michigan.gov', '+1-517-373-2064', 'US',
 ST_GeomFromText('POLYGON((-84.50 41.70, -82.50 41.70, -82.50 43.50, -84.50 43.50, -84.50 41.70))', 4326)),
('Federal Highway Administration - Michigan Division', 'FHWA-MI', 'michigan.fhwa@dot.gov', '+1-517-706-3100', 'US',
 ST_GeomFromText('POLYGON((-90.0 41.5, -82.0 41.5, -82.0 47.5, -90.0 47.5, -90.0 41.5))', 4326)),
('County Road Commission Association of Michigan', 'CRCA-MI', 'info@crcami.org', '+1-517-484-9355', 'US', NULL),
-- GB: London area
('Camden Borough Council - Highways Division', 'CBC-HIGHWAYS', 'highways@camden.gov.uk', '+44-20-7974-4444', 'GB',
 ST_GeomFromText('POLYGON((-0.20 51.52, -0.10 51.52, -0.10 51.57, -0.20 51.57, -0.20 51.52))', 4326)),
('London Highways Joint Committee', 'LHJC-LON', 'enquiries@lhjc.org.uk', '+44-20-7934-9999', 'GB',
 ST_GeomFromText('POLYGON((-0.35 51.38, 0.05 51.38, 0.05 51.65, -0.35 51.65, -0.35 51.38))', 4326)),
('National Highways - South East Division', 'NH-SE', 'info@nationalhighways.co.uk', '+44-300-123-5000', 'GB',
 ST_GeomFromText('POLYGON((-1.50 50.80, 1.00 50.80, 1.00 52.50, -1.50 52.50, -1.50 50.80))', 4326)),
('Local Highway Authority - Default', 'LHA-UK', 'enquiries@lha.gov.uk', '+44-20-7000-0000', 'GB', NULL),
-- KE: Nairobi area
('Nairobi City County - Department of Roads & Transport', 'NCC-ROADS', 'roads@nairobi.go.ke', '+254-20-2224281', 'KE',
 ST_GeomFromText('POLYGON((36.70 -1.38, 36.95 -1.38, 36.95 -1.18, 36.70 -1.18, 36.70 -1.38))', 4326)),
('Kenya Urban Roads Authority', 'KURA-HQ', 'info@kura.go.ke', '+254-20-8013844', 'KE',
 ST_GeomFromText('POLYGON((36.50 -1.60, 37.20 -1.60, 37.20 -0.90, 36.50 -0.90, 36.50 -1.60))', 4326)),
('Kenya National Highways Authority', 'KeNHA-HQ', 'dg@kenha.co.ke', '+254-20-4971200', 'KE',
 ST_GeomFromText('POLYGON((33.5 -4.5, 42.0 -4.5, 42.0 5.0, 33.5 5.0, 33.5 -4.5))', 4326)),
('County Department of Infrastructure', 'CDI-KE', 'infrastructure@county.go.ke', '+254-20-1111111', 'KE', NULL);

-- =========================================================================
-- 2. CONTRACTORS (21 rows: 12 IN + 3 US + 3 GB + 3 KE)
-- =========================================================================
INSERT INTO contractors (name, license_number, registration_date, contact_email, contact_phone, rating, projects_completed, projects_delayed, blacklisted, blacklisted_reason) VALUES
-- IN (12)
('Apex Infrastructure Ltd', 'LIC-IN-001', '2015-04-12', 'contact@apexinfra.in', '+91-22-61234567', 4.25, 24, 2, FALSE, NULL),
('BuildWell Roadways Ltd', 'LIC-IN-002', '2018-09-20', 'projects@buildwell.in', '+91-22-68919988', 3.80, 18, 4, FALSE, NULL),
('Zenith Construction Co', 'LIC-IN-003', '2012-01-15', 'tenders@zenithcon.in', '+91-22-55558888', 4.50, 42, 1, FALSE, NULL),
('Shiva Earthmovers Pvt Ltd', 'LIC-IN-004', '2020-06-30', 'ops@shivaearth.in', '+91-9820011223', 2.10, 8, 5, FALSE, NULL),
('Landmark Infra Projects', 'LIC-IN-005', '2019-11-05', 'info@landmarkinfra.in', '+91-22-25911020', 3.90, 15, 2, FALSE, NULL),
('Metro Highway Consultants', 'LIC-IN-006', '2014-03-22', 'contact@metrohighway.in', '+91-22-40900909', 4.60, 31, 0, FALSE, NULL),
('Coastal Paving Solutions', 'LIC-IN-007', '2021-02-18', 'ops@coastalpaving.in', '+91-22-88123456', 4.10, 6, 2, FALSE, NULL),
('Bharat Roads & Infra', 'LIC-IN-008', '2010-05-05', 'contact@bharatroads.in', '+91-22-26511234', 4.75, 85, 3, FALSE, NULL),
('Skyline Developers Ltd', 'LIC-IN-009', '2022-08-14', 'bids@skylinedev.in', '+91-9930088899', 3.40, 4, 1, FALSE, NULL),
('Omega Infrastructure Corp', 'LIC-IN-010', '2016-10-10', 'legal@omegacorp.in', '+91-22-67129900', 1.80, 12, 8, TRUE, 'Failure to complete SV Road drainage project inside contract timelines; substandard materials causing surface peeling within 3 months.'),
('Precision Asphalt Works', 'LIC-IN-011', '2023-01-20', 'contact@precisionasphalt.in', '+91-9004055112', 4.00, 3, 0, FALSE, NULL),
('Pioneer Engineering Corp', 'LIC-IN-012', '2017-07-07', 'pioneer@pioneereng.in', '+91-22-28776655', 3.20, 14, 4, FALSE, NULL),
-- US (3)
('Great Lakes Infrastructure LLC', 'LIC-US-001', '2018-03-15', 'bids@greatlakesinfra.com', '+1-313-555-0101', 4.30, 35, 2, FALSE, NULL),
('Michigan Paving Company', 'LIC-US-002', '2019-07-22', 'ops@michiganpaving.com', '+1-313-555-0102', 3.90, 22, 3, FALSE, NULL),
('Detroit Roads Alliance', 'LIC-US-003', '2020-01-10', 'contracts@detroitroads.org', '+1-313-555-0103', 2.50, 10, 5, TRUE, 'Failure to complete I-94 resurfacing within contract timeline; substandard asphalt quality.'),
-- GB (3)
('Thames Highway Services', 'LIC-GB-001', '2016-11-01', 'tenders@thameshighways.co.uk', '+44-20-79460101', 4.50, 48, 1, FALSE, NULL),
('Camden Civils Ltd', 'LIC-GB-002', '2021-02-14', 'projects@camdencivils.co.uk', '+44-20-79460102', 4.10, 12, 1, FALSE, NULL),
('London Asphalt Works', 'LIC-GB-003', '2017-09-05', 'info@londonasphalt.co.uk', '+44-20-79460103', 3.60, 28, 6, FALSE, NULL),
-- KE (3)
('Nairobi Road Builders Ltd', 'LIC-KE-001', '2015-05-20', 'info@nairobiroadbuilders.co.ke', '+254-20-5550101', 4.20, 30, 3, FALSE, NULL),
('Kenya Infrastructure Co Ltd', 'LIC-KE-002', '2018-08-12', 'tenders@kenyainfra.co.ke', '+254-20-5550102', 3.80, 18, 4, FALSE, NULL),
('Mombasa Roadworks Ltd', 'LIC-KE-003', '2020-03-30', 'projects@mombasaroadworks.co.ke', '+254-20-5550103', 2.80, 8, 5, FALSE, NULL);

-- =========================================================================
-- 3. ROADS (22 rows: 8 IN + 4 US + 4 GB + 6 KE)
-- Authority IDs: 1-5 IN, 6-9 US, 10-13 GB, 14-17 KE
-- Contractor IDs: 1-12 IN, 13-15 US, 16-18 GB, 19-21 KE
-- =========================================================================
INSERT INTO roads (name, road_code, status, length_km, authority_id, geom, road_type, last_relaying_date, contractor_id, surface_type, lane_count, width_m, aadt, last_inspection_date) VALUES
-- IN roads (1-8)
('Western Express Highway', 'WEH-NH8', 'under_construction', 25.50, 5,
 ST_GeomFromText('LINESTRING(72.8524 19.1012, 72.8530 19.1340, 72.8590 19.1860, 72.8610 19.2300)', 4326),
 'NH', '2025-03-15', 1, 'asphalt', 6, 35.50, 185000, '2025-06-15'),
('Eastern Express Highway', 'EEH-NH8', 'fair', 22.10, 4,
 ST_GeomFromText('LINESTRING(72.9210 19.0410, 72.9340 19.1020, 72.9460 19.1680, 72.9610 19.2150)', 4326),
 'SH', '2020-11-20', 2, 'asphalt', 4, 22.00, 95000, '2024-12-10'),
('S.V. Road', 'SV-RD-01', 'poor', 16.80, 1,
 ST_GeomFromText('LINESTRING(72.8354 19.0601, 72.8360 19.1020, 72.8398 19.1620, 72.8450 19.2080)', 4326),
 'City', '2018-06-10', 10, 'asphalt', 4, 14.50, 62000, '2025-01-20'),
('Link Road', 'LINK-RD-01', 'under_construction', 18.20, 1,
 ST_GeomFromText('LINESTRING(72.8250 19.0805, 72.8270 19.1240, 72.8310 19.1840, 72.8510 19.2450)', 4326),
 'City', '2025-10-01', 6, 'concrete', 4, 18.00, 48000, '2025-04-10'),
('LBS Marg', 'LBS-MARG-01', 'poor', 21.00, 3,
 ST_GeomFromText('LINESTRING(72.8890 19.0305, 72.8980 19.0840, 72.9120 19.1360, 72.9350 19.1980)', 4326),
 'City', '2017-04-05', 4, 'asphalt', 4, 16.00, 78000, '2024-08-05'),
('Senapati Bapat Marg', 'SBM-MARG-01', 'good', 7.50, 2,
 ST_GeomFromText('LINESTRING(72.8240 18.9510, 72.8260 18.9850, 72.8290 19.0180)', 4326),
 'City', '2023-12-10', 3, 'concrete', 6, 28.00, 35000, '2025-05-30'),
('Ghodbunder Road', 'GHODBUNDER-RD-01', 'good', 20.00, 4,
 ST_GeomFromText('LINESTRING(72.9550 19.2220, 72.9310 19.2520, 72.8990 19.2680, 72.8680 19.2810)', 4326),
 'SH', '2024-12-25', 8, 'asphalt', 6, 30.00, 85000, '2025-05-20'),
('Marine Drive', 'MARINE-DR-01', 'good', 3.60, 2,
 ST_GeomFromText('LINESTRING(72.8205 18.9210, 72.8210 18.9320, 72.8235 18.9480)', 4326),
 'City', '2025-01-20', 3, 'concrete', 4, 28.00, 15000, '2025-06-10'),
-- US roads (9-12)
('I-94 (Edsel Ford Freeway)', 'I94-WD-01', 'fair', 45.20, 8,
 ST_GeomFromText('LINESTRING(-83.1500 42.3500, -83.1000 42.3550, -83.0500 42.3600, -82.9900 42.3650, -82.9400 42.3700)', 4326),
 'Interstate', '2021-05-15', 13, 'asphalt', 6, 35.00, 155000, '2025-03-01'),
('M-10 (Lodge Freeway)', 'M10-WD-01', 'poor', 21.50, 8,
 ST_GeomFromText('LINESTRING(-83.1200 42.3200, -83.1150 42.3500, -83.1100 42.3800, -83.1050 42.4100)', 4326),
 'US-Highway', '2019-08-20', 14, 'asphalt', 4, 22.00, 85000, '2024-11-15'),
('Woodward Avenue', 'WOODWARD-01', 'good', 27.00, 7,
 ST_GeomFromText('LINESTRING(-83.0800 42.3500, -83.0750 42.3800, -83.0700 42.4100, -83.0650 42.4400)', 4326),
 'US-Highway', '2024-10-05', 13, 'asphalt', 4, 24.00, 72000, '2025-05-10'),
('Gratiot Avenue', 'GRATIOT-01', 'fair', 35.80, 7,
 ST_GeomFromText('LINESTRING(-82.9800 42.3500, -82.9700 42.3800, -82.9600 42.4100, -82.9500 42.4400)', 4326),
 'US-Highway', '2022-04-18', 14, 'asphalt', 4, 20.00, 55000, '2024-09-20'),
-- GB roads (13-16)
('M25 (Junction 8-12)', 'M25-01', 'fair', 18.90, 12,
 ST_GeomFromText('LINESTRING(-0.3000 51.2800, -0.2500 51.2900, -0.2000 51.3000, -0.1500 51.3100)', 4326),
 'Motorway', '2023-05-20', 16, 'asphalt', 6, 36.00, 180000, '2025-04-01'),
('A406 (North Circular Road)', 'A406-NCR-01', 'fair', 25.00, 12,
 ST_GeomFromText('LINESTRING(-0.3000 51.5800, -0.2500 51.5700, -0.2000 51.5600, -0.1500 51.5500)', 4326),
 'A-Road', '2023-08-20', 18, 'asphalt', 4, 22.00, 85000, '2025-03-05'),
('A1 (Holloway Road)', 'A1-HRW-01', 'fair', 10.00, 11,
 ST_GeomFromText('LINESTRING(-0.1200 51.5400, -0.1150 51.5500, -0.1100 51.5600, -0.1000 51.5700)', 4326),
 'A-Road', '2022-06-15', 16, 'asphalt', 4, 20.00, 55000, '2024-12-10'),
('Whitehall', 'WHITEHALL-01', 'good', 1.20, 11,
 ST_GeomFromText('LINESTRING(-0.1280 51.5040, -0.1270 51.5060, -0.1260 51.5080, -0.1250 51.5100)', 4326),
 'A-Road', '2025-01-15', 17, 'pavers', 4, 28.00, 18000, '2025-06-10'),
-- KE roads (17-22)
('Uhuru Highway', 'UHURU-HWY-01', 'fair', 8.00, 16,
 ST_GeomFromText('LINESTRING(36.8200 -1.2800, 36.8150 -1.2900, 36.8100 -1.3000, 36.8050 -1.3100)', 4326),
 'A-Road', '2021-12-15', 19, 'asphalt', 4, 20.00, 68000, '2025-03-25'),
('Mombasa Road (A109)', 'MOMBASA-RD-01', 'poor', 15.00, 16,
 ST_GeomFromText('LINESTRING(36.8500 -1.3000, 36.8700 -1.3100, 36.8900 -1.3200, 36.9100 -1.3250)', 4326),
 'A-Road', '2018-07-20', 20, 'asphalt', 4, 18.00, 55000, '2024-10-30'),
('Thika Superhighway (A2)', 'THIKA-SHWY-01', 'good', 12.50, 15,
 ST_GeomFromText('LINESTRING(36.8300 -1.2700, 36.8400 -1.2600, 36.8500 -1.2500, 36.8600 -1.2400)', 4326),
 'A-Road', '2024-03-30', 21, 'asphalt', 6, 35.00, 95000, '2025-05-05'),
('Lang''ata Road', 'LANGATA-RD-01', 'under_construction', 10.20, 14,
 ST_GeomFromText('LINESTRING(36.7800 -1.3200, 36.7900 -1.3150, 36.8000 -1.3100, 36.8100 -1.3050)', 4326),
 'C-Road', '2025-10-01', 20, 'gravel', 2, 8.00, 8500, '2025-01-12'),
('Jogoo Road', 'JOGOO-RD-01', 'fair', 6.80, 14,
 ST_GeomFromText('LINESTRING(36.8600 -1.2900, 36.8700 -1.2950, 36.8800 -1.3000, 36.8900 -1.3050)', 4326),
 'B-Road', '2022-10-10', 19, 'asphalt', 2, 10.00, 22000, '2024-11-18'),
('Waiyaki Way (C62)', 'WAIYAKI-WY-01', 'fair', 9.50, 15,
 ST_GeomFromText('LINESTRING(36.7700 -1.2600, 36.7800 -1.2750, 36.7900 -1.2900, 36.8000 -1.3050)', 4326),
 'C-Road', '2021-06-15', 21, 'asphalt', 4, 16.00, 38000, '2024-08-15');

-- =========================================================================
-- 4. PROJECTS (26 rows: 10 IN + 4 US + 4 GB + 8 KE)
-- 1-2 projects per road. Budgets: IN=crores, US=millions USD, GB=millions GBP, KE=millions KES
-- =========================================================================
INSERT INTO projects (title, road_id, contractor_id, authority_id, budget_allocated, budget_spent, status, start_date, target_end_date, actual_end_date, delay_days) VALUES
-- IN projects (road 1-8, some with 2 projects)
('WEH Flyover Resurfacing & Structural Grouting', 1, 1, 5, 240000000.00, 185000000.00, 'in_progress', '2025-06-01', '2026-06-30', NULL, 0),
('EEH Pothole Remediation Campaign 2025', 2, 2, 4, 18000000.00, 19200000.00, 'completed', '2025-09-01', '2025-10-31', '2025-11-12', 12),
('SV Road Drainage Trenching & Microtunnelling', 3, 10, 1, 95000000.00, 45000000.00, 'halted', '2024-05-10', '2025-05-10', NULL, 378),
('SV Road Emergency Asphalt Laying', 3, 3, 1, 35000000.00, 12000000.00, 'in_progress', '2026-03-01', '2026-08-31', NULL, 0),
('Link Road Concrete Pavement Upgrade Ph.2', 4, 6, 1, 145000000.00, 75000000.00, 'in_progress', '2025-10-15', '2026-09-30', NULL, 0),
('LBS Marg Sewer Line Laying & Patching', 5, 4, 3, 62000000.00, 60000000.00, 'in_progress', '2024-11-01', '2025-11-01', NULL, 203),
('SBM Micro-Silica Concrete Topping', 6, 3, 2, 85000000.00, 84200000.00, 'completed', '2023-01-15', '2023-12-15', '2023-12-10', 0),
('Ghodbunder Road Mast-Asphalt Overlay', 7, 8, 4, 190000000.00, 187000000.00, 'completed', '2024-03-01', '2024-12-31', '2024-12-25', 0),
('Marine Drive Promenade Resurfacing', 8, 3, 2, 52000000.00, 51800000.00, 'completed', '2025-01-15', '2025-06-30', '2025-06-25', 0),
('WEH Safety Barrier & Lighting Upgrade', 1, 5, 5, 85000000.00, 32000000.00, 'in_progress', '2026-01-01', '2026-12-31', NULL, 0),
-- US projects (road 9-12)
('I-94 Resurfacing & Bridge Repairs', 9, 13, 8, 45000000.00, 28000000.00, 'in_progress', '2025-06-01', '2026-12-31', NULL, 0),
('M-10 Freeway Pothole Remediation', 10, 14, 8, 8500000.00, 8500000.00, 'completed', '2025-03-01', '2025-08-31', '2025-09-15', 15),
('Woodward Avenue Streetscape Phase 2', 11, 13, 7, 12000000.00, 5000000.00, 'in_progress', '2025-11-01', '2026-10-31', NULL, 0),
('Gratiot Avenue Resurfacing Phase 3', 12, 14, 7, 9500000.00, 3500000.00, 'in_progress', '2026-02-01', '2026-12-31', NULL, 0),
-- GB projects (road 13-16)
('M25 Junction 8-12 Smart Motorway Upgrade', 13, 16, 12, 95000000.00, 40000000.00, 'in_progress', '2025-09-01', '2027-06-30', NULL, 0),
('A406 North Circular Carriageway Repair', 14, 18, 12, 18000000.00, 6000000.00, 'in_progress', '2026-01-15', '2026-12-31', NULL, 0),
('A1 Holloway Road Safety Improvements', 15, 16, 11, 4800000.00, 4600000.00, 'completed', '2025-04-01', '2025-10-31', '2025-10-28', 0),
('Whitehall Pavement Restoration', 16, 17, 11, 2200000.00, 2100000.00, 'completed', '2025-02-01', '2025-06-30', '2025-06-25', 0),
-- KE projects (road 17-22)
('Uhuru Highway Bridge Expansion Joint Repair', 17, 19, 16, 85000000.00, 55000000.00, 'in_progress', '2025-08-01', '2026-08-31', NULL, 0),
('Mombasa Road Drainage Channel Desilting', 18, 20, 16, 25000000.00, 24000000.00, 'completed', '2025-02-01', '2025-07-31', '2025-08-10', 10),
('Thika Superhighway Overlay & Safety Works', 19, 19, 15, 32000000.00, 30000000.00, 'completed', '2024-09-01', '2025-06-30', '2025-07-15', 15),
('Lang''ata Road Widening & Overlay', 20, 20, 14, 120000000.00, 45000000.00, 'in_progress', '2025-10-01', '2027-03-31', NULL, 0),
('Jogoo Road Drainage Improvement', 21, 19, 14, 18000000.00, 6000000.00, 'in_progress', '2026-01-01', '2026-09-30', NULL, 0),
('Waiyaki Way Drainage & Resurfacing', 22, 21, 15, 45000000.00, 44000000.00, 'completed', '2024-11-01', '2025-08-31', '2025-09-05', 5),
('Uhuru Highway Street Lighting Installation', 17, 21, 16, 12000000.00, 2000000.00, 'planned', '2026-07-01', '2026-12-31', NULL, 0),
('Thika Superhighway Footbridge Construction', 19, 20, 15, 15000000.00, 0.00, 'planned', '2026-08-01', '2027-01-31', NULL, 0);

-- =========================================================================
-- 5. FUND SOURCES (1-3 per project, 50 rows)
-- =========================================================================
INSERT INTO fund_sources (project_id, source_name, amount) VALUES
-- Project 1: WEH Resurfacing
(1, 'Central Road Infrastructure Fund', 150000000.00),
(1, 'State PWD Capital Tiers', 90000000.00),
-- Project 2: EEH Pothole
(2, 'State PWD Allocations', 18000000.00),
-- Project 3: SV Drainage (halted)
(3, 'Municipal General Tier', 50000000.00),
(3, 'State PWD Allocations', 45000000.00),
-- Project 4: SV Emergency
(4, 'Municipal General Portfolios', 35000000.00),
-- Project 5: Link Road Concrete
(5, 'Central Road Fund', 100000000.00),
(5, 'Municipal General Portfolios', 45000000.00),
-- Project 6: LBS Marg Sewer
(6, 'Municipal General Tier', 35000000.00),
(6, 'State PWD Allocations', 27000000.00),
-- Project 7: SBM Concrete
(7, 'Municipal General Portfolios', 50000000.00),
(7, 'State PWD Allocations', 35000000.00),
-- Project 8: Ghodbunder Overlay
(8, 'State PWD Capital Tiers', 120000000.00),
(8, 'Central Road Infrastructure Fund', 70000000.00),
-- Project 9: Marine Drive
(9, 'Municipal General Portfolios', 52000000.00),
-- Project 10: WEH Safety
(10, 'Central Road Fund', 50000000.00),
(10, 'State PWD Capital Tiers', 35000000.00),
-- Project 11: I-94 Resurfacing
(11, 'FHWA Federal Aid', 30000000.00),
(11, 'MDOT State Trunkline Fund', 15000000.00),
-- Project 12: M-10 Pothole
(12, 'MDOT State Trunkline Fund', 6000000.00),
(12, 'Local Municipal Bond', 2500000.00),
-- Project 13: Woodward Streetscape
(13, 'Local Municipal Bond', 7000000.00),
(13, 'MDOT State Trunkline Fund', 5000000.00),
-- Project 14: Gratiot Resurfacing
(14, 'MDOT State Trunkline Fund', 6000000.00),
(14, 'Local Municipal Bond', 3500000.00),
-- Project 15: M25 Smart Motorway
(15, 'UK Department for Transport Grant', 95000000.00),
-- Project 16: A406 Carriageway
(16, 'UK Department for Transport Grant', 18000000.00),
-- Project 17: A1 Safety
(17, 'UK Department for Transport Grant', 4800000.00),
-- Project 18: Whitehall
(18, 'UK Department for Transport Grant', 2200000.00),
-- Project 19: Uhuru Highway Bridge
(19, 'Kenya RMLF', 50000000.00),
(19, 'International Multilateral Loans', 35000000.00),
-- Project 20: Mombasa Road Drainage
(20, 'Kenya RMLF', 15000000.00),
(20, 'World Bank Loan', 10000000.00),
-- Project 21: Thika Overlay
(21, 'Kenya RMLF', 20000000.00),
(21, 'International Multilateral Loans', 12000000.00),
-- Project 22: Lang'ata Widening
(22, 'Kenya RMLF', 70000000.00),
(22, 'World Bank Loan', 50000000.00),
-- Project 23: Jogoo Drainage
(23, 'Kenya RMLF', 12000000.00),
(23, 'International Multilateral Loans', 6000000.00),
-- Project 24: Waiyaki Way
(24, 'Kenya RMLF', 30000000.00),
(24, 'World Bank Loan', 15000000.00),
-- Project 25: Uhuru Lighting
(25, 'Kenya RMLF', 8000000.00),
(25, 'International Multilateral Loans', 4000000.00),
-- Project 26: Thika Footbridge
(26, 'International Multilateral Loans', 10000000.00),
(26, 'World Bank Loan', 5000000.00);

-- =========================================================================
-- 6. BUDGET VARIANCE REASONS (8 rows)
-- =========================================================================
INSERT INTO budget_variance_reasons (project_id, original_budget, revised_budget, variance_amount, variance_pct, reason, approved_by, approval_date) VALUES
(2, 18000000.00, 19200000.00, 1200000.00, 6.67, 'Cost overrun due to additional utility relocation work required during excavation', 'Chief Engineer, PWD Mumbai', '2025-10-20'),
(3, 95000000.00, 45000000.00, -50000000.00, -52.63, 'Project halted after contractor blacklisted; funds reallocated pending fresh tender', 'Secretary, MCGM', '2025-06-15'),
(6, 62000000.00, 60000000.00, -2000000.00, -3.23, 'Revised scope reduction after O&M survey revealed fewer sewer blockages than estimated', 'Chief Engineer, MCGM HE', '2025-02-10'),
(11, 45000000.00, 28000000.00, -17000000.00, -37.78, 'Phased approach adopted; Phase 1 only. Remaining budget held for FY2026', 'State Transportation Director, MDOT', '2025-11-01'),
(15, 95000000.00, 40000000.00, -55000000.00, -57.89, 'Smart motorway scope reduced to junction 8-10; junctions 10-12 deferred to next spending review', 'Programme Director, National Highways', '2025-12-01'),
(22, 120000000.00, 45000000.00, -75000000.00, -62.50, 'Value engineering: Widening deferred to Phase 2; only overlay and drainage executed in Phase 1', 'County Engineer, Nairobi', '2026-01-15'),
(24, 45000000.00, 44000000.00, -1000000.00, -2.22, 'Minor savings from competitive re-tendering of asphalt supply contract', 'Director, KURA', '2025-07-20'),
(12, 8500000.00, 8500000.00, 0.00, 0.00, 'On-budget delivery; delay caused by utility coordination, not cost overrun', 'Project Manager, MDOT', '2025-09-20');

-- =========================================================================
-- 7. COMPLAINTS (15 rows: 7 IN + 3 US + 2 GB + 3 KE)
-- =========================================================================
INSERT INTO complaints (client_temp_id, title, description, category, geom, status, escalation_level, priority, target_resolution_hours, citizen_contact, assigned_authority_id, road_id, created_at) VALUES
-- IN complaints
('8f8b8c1a-289e-4b47-b8db-c8db05ab1c1b', 'Severe Potholes near Andheri Flyover', 'Multiple deep potholes on the southbound main road. Damaging tires and causing sudden braking.', 'pothole', ST_GeomFromText('POINT(72.8531 19.1190)', 4326), 'in_progress', 0, 4, 48, '+91-9876543210', 5, 1, '2025-12-01T08:30:00Z'),
('c25e8396-857e-4054-9426-1507df0a7b11', 'Missing diversion board near Metro work', 'The lane closure indicator is missing. Extremely hazardous at night.', 'missing_signage', ST_GeomFromText('POINT(72.8580 19.1720)', 4326), 'resolved', 0, 3, 72, '+91-9876543211', 5, 1, '2025-10-15T14:00:00Z'),
('df108bc5-7b56-4c4f-9562-ee2ee9108b34', 'Uneven Paver Blocks at Bandra Signal', 'The interlocking bricks have caved in. Creates a massive bump for motorbikes.', 'paving_defect', ST_GeomFromText('POINT(72.8356 19.0620)', 4326), 'pending', 0, 2, 72, '+91-9876543212', 1, 3, '2026-06-20T09:15:00Z'),
('a3e0f9b6-8bb0-47b2-9011-477000cc55aa', 'Monsoon Waterlogging outside station', 'Water level reaches knee height during high tide rains. Drain inlets are fully clogged.', 'waterlogging', ST_GeomFromText('POINT(72.8362 19.0980)', 4326), 'in_progress', 1, 5, 24, '+91-9876543213', 1, 3, '2026-07-05T07:00:00Z'),
('0a82b012-e7b3-469b-83ee-0062f2bc88d2', 'Dumping of building debris on left lane', 'Truckloads of sand and broken concrete bricks left on the road blocking traffic.', 'debris', ST_GeomFromText('POINT(72.8272 19.1260)', 4326), 'routed', 0, 3, 48, '+91-9876543214', 1, 4, '2026-06-28T11:45:00Z'),
('55d7b51b-1002-4fb0-a7d1-12ef891ab01e', 'Crater-sized pothole near Kurla junction', 'Nearly 1.5 feet deep. Several auto-rickshaws have overturned trying to avoid it.', 'pothole', ST_GeomFromText('POINT(72.8982 19.0850)', 4326), 'in_progress', 0, 5, 48, '+91-9876543215', 3, 5, '2026-07-08T16:30:00Z'),
('fe2e84c1-65b1-4f10-9111-ee44aa3312b9', 'Stagnant water near Phoenix mall entrance', 'Clogged drains from construction are backing up water onto the road.', 'waterlogging', ST_GeomFromText('POINT(72.9030 19.1020)', 4326), 'pending', 2, 4, 24, '+91-9876543216', 3, 5, '2026-07-09T06:00:00Z'),
-- US complaints
('7f7f7f7f-1001-4000-8000-100000000001', 'Deep potholes on I-94 near Dearborn', 'Multiple 6-inch deep potholes in the right lane causing tire blowouts.', 'pothole', ST_GeomFromText('POINT(-83.1000 42.3550)', 4326), 'in_progress', 0, 4, 24, '+1-313-555-1001', 8, 9, '2026-06-15T10:00:00Z'),
('7f7f7f7f-1001-4000-8000-100000000002', 'Missing lane markings on Woodward Ave', 'Lane divider paint has completely worn off between 7 Mile and 8 Mile Road.', 'missing_signage', ST_GeomFromText('POINT(-83.0750 42.3800)', 4326), 'pending', 0, 2, 36, '+1-313-555-1002', 7, 11, '2026-07-01T14:30:00Z'),
('7f7f7f7f-1001-4000-8000-100000000003', 'Water pooling on M-10 underpass', 'Storm drain is clogged causing 6-inch standing water across all lanes.', 'waterlogging', ST_GeomFromText('POINT(-83.1120 42.3500)', 4326), 'routed', 1, 3, 12, '+1-313-555-1003', 8, 10, '2026-07-06T09:00:00Z'),
-- GB complaints
('7f7f7f7f-1001-4000-8000-200000000001', 'Sunken manhole cover on A1 Holloway Road', 'Manhole cover has sunk 4cm below road surface creating hazard for cyclists.', 'paving_defect', ST_GeomFromText('POINT(-0.1150 51.5500)', 4326), 'in_progress', 0, 3, 48, '+44-20-79460001', 11, 15, '2026-06-20T11:00:00Z'),
('7f7f7f7f-1001-4000-8000-200000000002', 'Uneven asphalt patches on A406', 'Multiple patches from utility works creating bumpy surface for buses.', 'paving_defect', ST_GeomFromText('POINT(-0.2200 51.5650)', 4326), 'pending', 0, 2, 48, '+44-20-79460002', 12, 14, '2026-07-03T08:00:00Z'),
-- KE complaints
('7f7f7f7f-1001-4000-8000-300000000001', 'Large crater on Mombasa Road near Industrial Area', 'Deep crater spanning half the lane, causing traffic to merge dangerously.', 'pothole', ST_GeomFromText('POINT(36.8800 -1.3150)', 4326), 'in_progress', 1, 5, 72, '+254-20-5552001', 16, 18, '2026-06-10T07:30:00Z'),
('7f7f7f7f-1001-4000-8000-300000000002', 'Flooded underpass on Jogoo Road', 'Heavy rain has flooded the Makadara underpass to waist height.', 'waterlogging', ST_GeomFromText('POINT(36.8750 -1.2970)', 4326), 'routed', 2, 4, 48, '+254-20-5552002', 14, 21, '2026-07-07T06:00:00Z'),
('7f7f7f7f-1001-4000-8000-300000000003', 'Debris from construction on Lang''ata Road', 'Construction debris and gravel scattered across the road near Carnivore junction.', 'debris', ST_GeomFromText('POINT(36.7950 -1.3120)', 4326), 'pending', 0, 2, 72, '+254-20-5552003', 14, 20, '2026-07-09T10:00:00Z');

-- =========================================================================
-- 8. PROJECT MILESTONES (2-3 per project, 52 rows)
-- =========================================================================
INSERT INTO project_milestones (project_id, title, description, amount, status, due_date, completion_date, verified_by, payment_release_date) VALUES
-- Project 1: WEH Resurfacing
(1, 'Site Mobilization & Traffic Management Setup', 'Deploy signage, barriers, and diversion plans', 5000000.00, 'completed', '2025-07-01', '2025-06-28', 'Project Engineer, NHAI', '2025-07-15'),
(1, 'Asphalt Milling & Base Course Repair', 'Mill 50mm of existing surface, repair base failures', 80000000.00, 'in_progress', '2026-01-31', NULL, NULL, NULL),
(1, 'Final Wearing Course & Line Marking', 'Lay SMA wearing course, apply thermoplastic markings', 100000000.00, 'pending', '2026-06-15', NULL, NULL, NULL),
-- Project 2: EEH Pothole
(2, 'Pothole Survey & Quantification', 'GPS-tagged survey of all potholes on EEH stretch', 1000000.00, 'completed', '2025-09-15', '2025-09-10', 'Junior Engineer, PWD', '2025-09-25'),
(2, 'Cold Mix Patching & Compaction', 'Patch 450 potholes with cold mix asphalt', 12000000.00, 'completed', '2025-10-15', '2025-10-20', 'Section Officer, PWD', '2025-11-05'),
(2, 'Final Inspection & Quality Check', 'Core sampling and ride quality assessment', 5000000.00, 'completed', '2025-10-31', '2025-11-12', 'Chief Engineer, PWD', '2025-11-20'),
-- Project 3: SV Drainage (halted)
(3, 'Trench Excavation & Pipe Laying (Phase 1)', 'Excavate 2km of drainage trench', 30000000.00, 'completed', '2024-08-31', '2024-08-25', 'Site Supervisor, MCGM', '2024-09-15'),
(3, 'Phase 2 Trenching & Microtunnelling', 'Continue trenching and start microtunnelling under junctions', 45000000.00, 'cancelled', '2025-03-31', NULL, NULL, NULL),
-- Project 4: SV Emergency
(4, 'Emergency Surface Milling', 'Mill damaged surface layer', 5000000.00, 'completed', '2026-03-15', '2026-03-12', 'Project Manager, MCGM', '2026-03-25'),
(4, 'Asphalt Overlay 50mm Thick', 'Lay DBM + BC overlay', 25000000.00, 'in_progress', '2026-07-31', NULL, NULL, NULL),
-- Project 5: Link Road Concrete
(5, 'Subgrade Preparation & DLC Laying', 'Prepare subgrade and lay dry lean concrete base', 30000000.00, 'completed', '2025-12-31', '2025-12-28', 'Quality Engineer, MCGM', '2026-01-15'),
(5, 'PQC Pavement Construction', 'Lay 300mm PQC in 7m panels', 80000000.00, 'in_progress', '2026-06-30', NULL, NULL, NULL),
(5, 'Joint Cutting & Sealing', 'Cut and seal contraction joints', 15000000.00, 'pending', '2026-09-15', NULL, NULL, NULL),
-- Project 6: LBS Marg Sewer
(6, 'Stage 1: Khar to Bandra Sewer Laying', 'Lay 600mm dia sewer pipe for 3km', 25000000.00, 'completed', '2025-03-31', '2025-03-28', 'Project Engineer, MCGM', '2025-04-15'),
(6, 'Stage 2: Bandra to Kurla Sewer Laying', 'Lay 600mm dia sewer pipe for 4km', 25000000.00, 'in_progress', '2026-06-30', NULL, NULL, NULL),
-- Project 7: SBM Concrete
(7, 'Demolition & Subgrade Work', 'Remove old asphalt, prepare subgrade', 15000000.00, 'completed', '2023-03-15', '2023-03-10', 'Engineer, MCGM FN', '2023-03-30'),
(7, 'PQC Laying & Curing', 'Lay 250mm PQC with curing compound', 50000000.00, 'completed', '2023-09-30', '2023-09-25', 'Chief Engineer, MCGM', '2023-10-15'),
(7, 'Footpath & Median Finishing', 'Complete paver block footpaths and median', 20000000.00, 'completed', '2023-12-15', '2023-12-10', 'Superintendent, MCGM', '2023-12-28'),
-- Project 8: Ghodbunder Overlay
(8, 'Milling & Tack Coat', 'Mill 40mm surface, apply tack coat', 30000000.00, 'completed', '2024-05-31', '2024-05-25', 'Engineer, PWD', '2024-06-15'),
(8, 'Mast-Asphalt Overlay Laying', 'Lay 50mm SMA mast-asphalt', 120000000.00, 'completed', '2024-10-31', '2024-10-28', 'Chief Engineer, PWD', '2024-11-15'),
(8, 'Road Markings & Signage', 'Apply thermoplastic markings, install signs', 20000000.00, 'completed', '2024-12-31', '2024-12-25', 'Safety Officer, PWD', '2025-01-10'),
-- Project 9: Marine Drive
(9, 'Promenade Demolition', 'Remove old concrete flags', 8000000.00, 'completed', '2025-02-28', '2025-02-20', 'Engineer, MCGM FN', '2025-03-10'),
(9, 'New Concrete Flag Laying', 'Lay interlocking concrete flags', 30000000.00, 'completed', '2025-05-31', '2025-05-25', 'Supervisor, MCGM', '2025-06-10'),
(9, 'Lighting & Handrail Installation', 'Install LED lighting and SS handrails', 10000000.00, 'completed', '2025-06-30', '2025-06-25', 'Safety Officer, MCGM', '2025-07-10'),
-- Project 10: WEH Safety
(10, 'Design & Engineering', 'Detailed design of barrier and lighting system', 5000000.00, 'completed', '2026-02-28', '2026-02-20', 'Design Engineer, NHAI', '2026-03-10'),
(10, 'Crash Barrier Installation', 'Install metal beam crash barriers', 45000000.00, 'in_progress', '2026-08-31', NULL, NULL, NULL),
(10, 'LED Lighting Installation', 'Install LED streetlights', 30000000.00, 'pending', '2026-12-15', NULL, NULL, NULL),
-- Project 11: I-94
(11, 'Pavement Assessment & Design', 'FWD testing and pavement design', 2000000.00, 'completed', '2025-07-31', '2025-07-25', 'Pavement Engineer, FHWA', '2025-08-15'),
(11, 'Milling & Base Repair (Eastbound)', 'Mill and repair 5 miles eastbound', 15000000.00, 'in_progress', '2026-06-30', NULL, NULL, NULL),
(11, 'Overlay & Markings (Eastbound)', 'Pave and mark eastbound lanes', 20000000.00, 'pending', '2026-12-15', NULL, NULL, NULL),
-- Project 12: M-10 Pothole
(12, 'Pothole Patching (All Lanes)', 'Machine-patch all potholes on M-10', 5000000.00, 'completed', '2025-05-31', '2025-05-28', 'Project Manager, MDOT', '2025-06-15'),
(12, 'Crack Sealing & Surface Treatment', 'Seal cracks and apply fog seal', 3500000.00, 'completed', '2025-08-31', '2025-09-15', 'Supervisor, MDOT', '2025-09-30'),
-- Project 15: M25 Smart Motorway
(15, 'Detailed Design & Consultation', 'Stakeholder consultation and detailed design', 5000000.00, 'completed', '2025-12-31', '2025-12-20', 'Design Manager, NHSE', '2026-01-15'),
(15, 'Gantry Installation (J8-J10)', 'Install 12 electronic information gantries', 35000000.00, 'in_progress', '2026-09-30', NULL, NULL, NULL),
(15, 'Control System Integration', 'Integrate with National Highways control centre', 25000000.00, 'pending', '2027-04-30', NULL, NULL, NULL),
-- Project 19: Uhuru Highway Bridge
(19, 'Bridge Joint Removal', 'Remove old expansion joints', 10000000.00, 'completed', '2025-09-30', '2025-09-25', 'Bridge Engineer, KeNHA', '2025-10-15'),
(19, 'New Joint Installation', 'Install modular expansion joints', 45000000.00, 'in_progress', '2026-04-30', NULL, NULL, NULL),
(19, 'Deck Waterproofing & Asphalt Overlay', 'Waterproof deck and relay asphalt', 20000000.00, 'pending', '2026-08-15', NULL, NULL, NULL),
-- Project 22: Lang'ata
(22, 'Drainage Design & Earthworks', 'Design drainage system, start earthworks', 15000000.00, 'completed', '2026-01-31', '2026-01-25', 'Engineer, NCC', '2026-02-15'),
(22, 'Pavement Overlay', 'Lay 100mm asphalt overlay', 60000000.00, 'in_progress', '2026-09-30', NULL, NULL, NULL),
(22, 'Sidewalk & Drainage Finishing', 'Complete sidewalks and drainage channels', 25000000.00, 'pending', '2027-03-15', NULL, NULL, NULL),
-- Project 24: Waiyaki Way
(24, 'Drainage Channel Construction', 'Construct 2km of lined drainage channels', 15000000.00, 'completed', '2025-02-28', '2025-02-22', 'Engineer, KURA', '2025-03-15'),
(24, 'Asphalt Resurfacing', 'Mill and relay 50mm asphalt', 20000000.00, 'completed', '2025-07-31', '2025-08-05', 'Chief Engineer, KURA', '2025-08-20'),
(24, 'Road Markings & Signage', 'Line marking and sign installation', 5000000.00, 'completed', '2025-08-31', '2025-09-05', 'Safety Officer, KURA', '2025-09-20');

-- =========================================================================
-- 9. CONTINGENCY RESERVES (1-2 per project, 26 rows)
-- =========================================================================
INSERT INTO contingency_reserves (project_id, allocated_amount, utilized_amount, status, release_notes) VALUES
(1, 12000000.00, 5000000.00, 'partially_utilized', 'Released for unexpected rock excavation during milling'),
(2, 900000.00, 900000.00, 'fully_utilized', 'Fully utilized for additional utility relocation'),
(3, 5000000.00, 5000000.00, 'exhausted', 'Exhausted on contractor termination costs'),
(4, 3500000.00, 0.00, 'available', 'Held for potential night work surcharges'),
(5, 10000000.00, 2000000.00, 'partially_utilized', 'Partial release for concrete mix design optimization'),
(6, 3000000.00, 3000000.00, 'fully_utilized', 'Used for unexpected rock excavation'),
(7, 5000000.00, 1000000.00, 'partially_utilized', 'Minor release for decorative paver adjustment'),
(8, 10000000.00, 0.00, 'available', 'Unused - project completed under budget'),
(9, 3000000.00, 0.00, 'available', 'Unused - project completed on time'),
(10, 5000000.00, 0.00, 'available', 'Held for potential traffic management extensions'),
(11, 3000000.00, 0.00, 'available', 'Reserved for unforeseen ground conditions'),
(12, 500000.00, 500000.00, 'fully_utilized', 'Used for extended lane closure permits'),
(13, 1000000.00, 0.00, 'available', 'Held for streetscape material cost fluctuations'),
(14, 500000.00, 0.00, 'available', 'Reserved for traffic management'),
(15, 5000000.00, 1000000.00, 'partially_utilized', 'Partial release for ecological survey'),
(16, 1000000.00, 0.00, 'available', 'Held for utility coordination'),
(17, 250000.00, 0.00, 'available', 'Unused - project completed on budget'),
(18, 150000.00, 0.00, 'available', 'Unused - minor project completed'),
(19, 5000000.00, 1000000.00, 'partially_utilized', 'Released for additional traffic management'),
(20, 1500000.00, 1500000.00, 'fully_utilized', 'Used for emergency desilting of blocked channels'),
(21, 2000000.00, 0.00, 'available', 'Reserved for material price escalation'),
(22, 8000000.00, 2000000.00, 'partially_utilized', 'Partial release for land acquisition compensation'),
(23, 1000000.00, 0.00, 'available', 'Held for potential rock excavation'),
(24, 2500000.00, 2500000.00, 'fully_utilized', 'Used for additional drainage outlets'),
(25, 800000.00, 0.00, 'available', 'Reserved for design changes'),
(26, 1000000.00, 0.00, 'available', 'Held for foundation investigation');

-- =========================================================================
-- 10. SLA CONFIG (8 rows: per category + region)
-- =========================================================================
INSERT INTO sla_config (category, escalation_hours, escalation_level, escalate_to_authority_id, notify_template, region_code) VALUES
('pothole', 48, 1, 4, 'Complaint #{id}: {title} unactioned for {hours}h. Escalated to PWD Mumbai.', 'IN'),
('pothole', 96, 2, 5, 'Complaint #{id}: {title} unactioned for {hours}h. Escalated to NHAI RO Mumbai.', 'IN'),
('waterlogging', 24, 1, 1, 'Complaint #{id}: {title} unactioned for {hours}h. Escalated to Ward K-West.', 'IN'),
('waterlogging', 48, 2, 3, 'Complaint #{id}: {title} unactioned for {hours}h. Escalated to Ward H-East.', 'IN'),
('pothole', 24, 1, 8, 'Complaint #{id}: {title} unactioned for {hours}h. Escalated to FHWA Michigan.', 'US'),
('waterlogging', 12, 1, 6, 'Complaint #{id}: {title} unactioned for {hours}h. Escalated to Detroit DPW.', 'US'),
('pothole', 72, 1, 16, 'Complaint #{id}: {title} unactioned for {hours}h. Escalated to KeNHA.', 'KE'),
('paving_defect', 48, 1, 10, 'Complaint #{id}: {title} unactioned for {hours}h. Escalated to Camden Borough Highways.', 'GB');

-- =========================================================================
-- 11. CPI DATA (4 regions x 5 years = 20 rows)
-- =========================================================================
INSERT INTO cpi_data (region_code, year, cpi_value) VALUES
('IN', 2020, 156.20), ('IN', 2021, 162.80), ('IN', 2022, 170.50), ('IN', 2023, 178.40), ('IN', 2024, 185.10),
('US', 2020, 258.80), ('US', 2021, 270.97), ('US', 2022, 292.66), ('US', 2023, 304.70), ('US', 2024, 313.60),
('GB', 2020, 108.90), ('GB', 2021, 112.60), ('GB', 2022, 120.60), ('GB', 2023, 128.90), ('GB', 2024, 133.40),
('KE', 2020, 112.50), ('KE', 2021, 118.20), ('KE', 2022, 126.80), ('KE', 2023, 136.40), ('KE', 2024, 143.20);

-- =========================================================================
-- 12. ROAD ALIASES (14 rows)
-- =========================================================================
INSERT INTO road_aliases (road_id, alias_name, alias_region_code, alias_type, is_primary) VALUES
(1, 'NH-48', 'IN', 'national', TRUE),
(1, 'WEH', 'IN', 'local', FALSE),
(2, 'NH-8 Spur', 'IN', 'national', FALSE),
(3, 'Swami Vivekanand Road', 'IN', 'historical', FALSE),
(5, 'LBS Marg', 'IN', 'local', TRUE),
(9, 'Edsel Ford Freeway', 'US', 'local', FALSE),
(10, 'Lodge Freeway', 'US', 'local', FALSE),
(11, 'M-1', 'US', 'national', FALSE),
(12, 'M-3', 'US', 'national', FALSE),
(13, 'London Orbital Motorway', 'GB', 'national', FALSE),
(14, 'North Circular Road', 'GB', 'local', TRUE),
(17, 'A104', 'KE', 'national', FALSE),
(18, 'A109', 'KE', 'national', TRUE),
(19, 'A2', 'KE', 'national', TRUE);

-- =========================================================================
-- 13. TENDERS (7 tenders)
-- =========================================================================
INSERT INTO tenders (reference_no, title, description, authority_id, project_id, estimated_value, status, published_date, bid_deadline, award_date) VALUES
('TND-IN-2025-001', 'WEH Resurfacing & Structural Grouting', 'Comprehensive resurfacing of WEH including flyover structural grouting', 5, 1, 250000000.00, 'awarded', '2025-04-01', '2025-05-15', '2025-05-30'),
('TND-IN-2025-002', 'Link Road Concrete Pavement Upgrade', 'Concrete pavement upgrade for Link Road Phase 2', 1, 5, 150000000.00, 'awarded', '2025-08-01', '2025-09-15', '2025-10-01'),
('TND-US-2025-001', 'I-94 Resurfacing & Bridge Repairs', 'Pavement rehabilitation and bridge joint replacement on I-94', 8, 11, 48000000.00, 'awarded', '2025-04-15', '2025-05-30', '2025-06-10'),
('TND-GB-2025-001', 'M25 Smart Motorway J8-10 Upgrade', 'Design and build of smart motorway systems between Junction 8-10', 12, 15, 100000000.00, 'awarded', '2025-06-01', '2025-07-31', '2025-08-15'),
('TND-KE-2025-001', 'Uhuru Highway Bridge Joint Replacement', 'Replacement of expansion joints on Uhuru Highway bridge', 16, 19, 90000000.00, 'awarded', '2025-06-15', '2025-07-31', '2025-08-10'),
('TND-KE-2026-001', 'Jogoo Road Drainage & Resurfacing', 'Comprehensive drainage improvement and resurfacing of Jogoo Road', 14, 23, 20000000.00, 'published', '2025-12-01', '2026-01-31', NULL),
('TND-IN-2026-001', 'WEH Safety Barrier & Lighting', 'Installation of crash barriers and LED lighting on WEH', 5, 10, 90000000.00, 'published', '2025-11-01', '2025-12-31', NULL);

-- =========================================================================
-- 14. TENDER BIDS (2-3 bids per tender, 18 rows)
-- =========================================================================
INSERT INTO tender_bids (tender_id, contractor_id, financial_quote, technical_score, financial_score, weighted_total, evaluator_notes, is_winner) VALUES
-- TND-IN-2025-001 (WEH Resurfacing)
(1, 1, 240000000.00, 88.50, 85.00, 86.75, 'Strong technical proposal, competitive pricing', TRUE),
(1, 3, 255000000.00, 82.00, 80.00, 81.00, 'Higher cost but acceptable technical approach', FALSE),
(1, 6, 235000000.00, 70.00, 88.00, 79.00, 'Lowest cost but weak technical submission', FALSE),
-- TND-IN-2025-002 (Link Road Concrete)
(2, 6, 145000000.00, 92.00, 82.00, 87.00, 'Best technical score, reasonable pricing', TRUE),
(2, 8, 140000000.00, 78.00, 85.00, 81.50, 'Lower cost but weaker technical proposal', FALSE),
-- TND-US-2025-001 (I-94)
(3, 13, 45000000.00, 90.00, 80.00, 85.00, 'Excellent technical approach, good value', TRUE),
(3, 14, 42000000.00, 75.00, 88.00, 81.50, 'Lower cost but weaker QA/QC plan', FALSE),
(3, 15, 48000000.00, 65.00, 72.00, 68.50, 'Blacklisted concerns, lowest technical score', FALSE),
-- TND-GB-2025-001 (M25 Smart Motorway)
(4, 16, 95000000.00, 91.00, 83.00, 87.00, 'Best overall, strong smart motorway experience', TRUE),
(4, 18, 92000000.00, 78.00, 86.00, 82.00, 'Lower cost but less motorway experience', FALSE),
-- TND-KE-2025-001 (Uhuru Highway Bridge)
(5, 19, 85000000.00, 85.00, 80.00, 82.50, 'Strong bridge experience, good value', TRUE),
(5, 20, 82000000.00, 72.00, 84.00, 78.00, 'Lower cost but weaker technical', FALSE),
(5, 21, 88000000.00, 68.00, 76.00, 72.00, 'Highest cost, lowest technical score', FALSE),
-- TND-KE-2026-001 (Jogoo Road)
(6, 19, 18000000.00, 78.00, 85.00, 81.50, 'Good technical approach, competitive pricing', FALSE),
(6, 20, 17500000.00, 82.00, 88.00, 85.00, 'Best overall, awaiting award decision', FALSE),
(6, 21, 19000000.00, 70.00, 78.00, 74.00, 'Higher cost, lower technical score', FALSE),
-- TND-IN-2026-001 (WEH Safety)
(7, 5, 85000000.00, 80.00, 82.00, 81.00, 'Good technical proposal, awaiting evaluation', FALSE),
(7, 1, 82000000.00, 85.00, 86.00, 85.50, 'Strongest bidder, awaiting award decision', FALSE);

-- =========================================================================
-- 15. PROJECT BENEFICIARIES (8 rows)
-- =========================================================================
INSERT INTO project_beneficiaries (project_id, population_served, estimated_daily_traffic, household_count, beneficiary_type, data_source, census_year) VALUES
(1, 2500000, 185000, 650000, 'mixed', 'MCGM Transport Census', 2023),
(2, 1500000, 95000, 380000, 'mixed', 'PWD Traffic Survey', 2023),
(5, 800000, 48000, 200000, 'residential', 'MCGM Ward Data', 2022),
(7, 500000, 35000, 125000, 'commercial', 'BMC Town Planning', 2022),
(11, 1200000, 155000, 480000, 'commuters', 'MDOT AADT Report', 2024),
(15, 2000000, 180000, 800000, 'mixed', 'National Highways Traffic Data', 2024),
(19, 800000, 68000, 200000, 'mixed', 'KeNHA Traffic Survey', 2023),
(22, 350000, 8500, 85000, 'residential', 'Nairobi County Census', 2022);

-- =========================================================================
-- 16. ROAD MATERIALS (8 rows)
-- =========================================================================
INSERT INTO road_materials (project_id, material_type, specification_grade, mix_design_ref, source_quarry, test_report_url, test_date, approved_by) VALUES
(1, 'asphalt', 'VG-40 Polymer Modified Bitumen', 'MDR-001-WEH-SMA', 'Plateau Minerals, Pune', 'https://qa.roadwatch.civic/tests/WEH-SMA-001.pdf', '2025-05-15', 'Quality Manager, NHAI'),
(1, 'aggregate', '20mm Graded Aggregate', 'AGR-002-WEH', 'Aravalli Quarry, Palghar', 'https://qa.roadwatch.civic/tests/WEH-AGR-002.pdf', '2025-05-10', 'Materials Engineer, NHAI'),
(5, 'concrete', 'M40 Grade PQC', 'PQC-001-LINK-M40', 'Concrete Mix Plant, Marol', 'https://qa.roadwatch.civic/tests/LINK-PQC-001.pdf', '2025-09-20', 'Quality Engineer, MCGM'),
(5, 'base_course', 'GSB Grade III', 'GSB-001-LINK', 'Bhandup Quarry', 'https://qa.roadwatch.civic/tests/LINK-GSB-001.pdf', '2025-08-15', 'Site Engineer, MCGM'),
(11, 'asphalt', 'PG 64-22 Binder', 'MIX-I94-ARZ', 'Detroit Asphalt Plant', 'https://qa.roadwatch.civic/tests/I94-ARZ-001.pdf', '2025-05-01', 'Materials Engineer, FHWA'),
(15, 'asphalt', 'AC30 HRA Binder', 'MIX-M25-HRA', 'Heathrow Asphalt Plant', 'https://qa.roadwatch.civic/tests/M25-HRA-001.pdf', '2025-08-10', 'Quality Manager, National Highways'),
(19, 'asphalt', 'A-1 Grade Bitumen', 'MIX-UHURU-SMA', 'Nairobi Asphalt Plant', 'https://qa.roadwatch.civic/tests/UHURU-SMA-001.pdf', '2025-07-15', 'Materials Engineer, KeNHA'),
(22, 'subbase', 'CBR 30% Laterite', 'SUB-LANG-001', 'Karen Quarry, Nairobi', 'https://qa.roadwatch.civic/tests/LANG-SUB-001.pdf', '2025-09-10', 'Geotechnical Engineer, NCC');

-- =========================================================================
-- 17. PROJECT WARRANTIES (7 rows)
-- =========================================================================
INSERT INTO project_warranties (project_id, warranty_period_months, warranty_start_date, warranty_end_date, warranty_type, defect_amount, status) VALUES
(2, 12, '2025-11-12', '2026-11-12', 'defect_liability', 1800000.00, 'active'),
(7, 24, '2023-12-10', '2025-12-10', 'maintenance', 5000000.00, 'active'),
(8, 12, '2024-12-25', '2025-12-25', 'defect_liability', 9000000.00, 'active'),
(9, 12, '2025-06-25', '2026-06-25', 'defect_liability', 3000000.00, 'active'),
(12, 12, '2025-09-15', '2026-09-15', 'defect_liability', 500000.00, 'active'),
(17, 24, '2025-10-28', '2027-10-28', 'performance', 250000.00, 'active'),
(20, 12, '2025-08-10', '2026-08-10', 'defect_liability', 1500000.00, 'active');

-- =========================================================================
-- 18. ROAD DEFECT HISTORY (12 rows)
-- =========================================================================
INSERT INTO road_defect_history (road_id, snapshot_date, status_at_time, complaint_count, project_count, source) VALUES
(1, '2025-01-01', 'fair', 11, 0, 'inspection'),
(1, '2025-03-15', 'under_construction', 14, 1, 'project'),
(3, '2025-01-01', 'poor', 37, 1, 'complaint'),
(3, '2026-03-01', 'poor', 52, 2, 'project'),
(5, '2025-01-01', 'poor', 27, 1, 'inspection'),
(5, '2025-11-01', 'poor', 32, 1, 'project'),
(9, '2025-01-01', 'fair', 13, 0, 'inspection'),
(9, '2025-06-01', 'under_construction', 16, 1, 'project'),
(13, '2025-01-01', 'fair', 7, 0, 'inspection'),
(13, '2025-09-01', 'under_construction', 10, 1, 'project'),
(17, '2025-01-01', 'fair', 7, 0, 'inspection'),
(17, '2025-08-01', 'under_construction', 9, 1, 'project');

-- =========================================================================
-- 19. REGION IMPORT LOG (4 rows)
-- =========================================================================
INSERT INTO region_import_log (region_code, source, roads_imported, roads_skipped, roads_errors, finished_at) VALUES
('IN', 'osm', 842, 35, 3, '2025-01-15T10:30:00Z'),
('US', 'osm', 1245, 52, 7, '2025-02-01T14:00:00Z'),
('GB', 'osm', 678, 22, 2, '2025-01-20T11:45:00Z'),
('KE', 'osm', 389, 18, 5, '2025-01-25T09:15:00Z');

-- =========================================================================
-- 20. ROUTING FEEDBACK (8 rows)
-- =========================================================================
INSERT INTO routing_feedback (complaint_id, authority_id, citizen_confirmed, feedback_text) VALUES
(1, 5, TRUE, 'Correctly assigned to NHAI. They responded within 24 hours.'),
(2, 5, TRUE, 'Signage was restored within 3 days.'),
(3, 1, FALSE, 'This is a state highway issue, not municipal. Should be PWD.'),
(5, 1, TRUE, 'Debris was cleared promptly.'),
(8, 4, TRUE, 'The pothole was filled within the week.'),
(11, 8, TRUE, 'FHWA team inspected the next day.'),
(13, 11, TRUE, 'Camden Highways patched the manhole cover.'),
(14, 14, FALSE, 'This should be KeNHA, not Nairobi County. Mombasa Road is a national highway.');

-- =========================================================================
-- 21. BACKFILL CONTRACTOR CODES (21 rows, sequential CON-XXXXX)
-- =========================================================================
DO $$
DECLARE
    c RECORD;
    seq_num INTEGER := 1;
BEGIN
    FOR c IN SELECT id FROM contractors ORDER BY id LOOP
        UPDATE contractors
        SET contractor_code = 'CON-' || LPAD(seq_num::TEXT, 5, '0'),
            performance_index = ROUND((COALESCE(projects_completed, 0)::NUMERIC / GREATEST(COALESCE(projects_completed, 0) + COALESCE(projects_delayed, 0), 1)) * COALESCE(rating, 0) * 20, 2)
        WHERE id = c.id;
        seq_num := seq_num + 1;
    END LOOP;
END $$;

-- =========================================================================
-- 22. AUDIT LOG (sample entries for testing)
-- =========================================================================
INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, changed_by) VALUES
('complaints', 1, 'INSERT', NULL, '{"title":"Severe Potholes near Andheri Flyover","category":"pothole","status":"pending"}', 'citizen_app'),
('complaints', 1, 'UPDATE', '{"status":"pending"}', '{"title":"Severe Potholes near Andheri Flyover","category":"pothole","status":"in_progress"}', 'operator_nhai'),
('projects', 1, 'INSERT', NULL, '{"title":"WEH Flyover Resurfacing & Structural Grouting","status":"in_progress"}', 'system'),
('contractors', 10, 'UPDATE', '{"name":"Omega Infrastructure Corp","rating":2.50}', '{"name":"Omega Infrastructure Corp","rating":1.80,"blacklisted":true}', 'auditor'),
('roads', 1, 'UPDATE', '{"name":"Western Express Highway","status":"fair"}', '{"name":"Western Express Highway","status":"under_construction"}', 'system');

-- =========================================================================
-- 23. CITIZEN NOTIFICATIONS (sample entries)
-- =========================================================================
INSERT INTO citizen_notifications (complaint_id, channel, recipient, event_type, template_used, status) VALUES
(1, 'sms', '+91-9876543210', 'routed', 'complaint_routed', 'sent'),
(2, 'sms', '+91-9876543211', 'resolved', 'complaint_resolved', 'sent'),
(8, 'sms', '+91-9876543215', 'routed', 'complaint_routed', 'sent'),
(11, 'email', 'citizen@example.com', 'routed', 'complaint_routed', 'sent'),
(14, 'sms', '+254-20-5552001', 'routed', 'complaint_routed', 'sent');

-- =========================================================================
-- 24. REGION OVERLAP ROUTES (sample)
-- =========================================================================
INSERT INTO region_overlap_routes (complaint_id, primary_region, secondary_region, split_action, resolved) VALUES
(1, 'IN', 'IN', 'forward', FALSE),
(11, 'US', 'US', 'forward', FALSE);

-- =========================================================================
-- 25. APPROVAL TRAIL (sample entries)
-- =========================================================================
INSERT INTO approval_trail (entity_type, entity_id, action, requested_by, approved_by, approved_at, status, comments) VALUES
('variance', 1, 'Budget Revision Approved', 'Project Manager, PWD', 'Chief Engineer, PWD', '2025-10-25T14:30:00Z', 'approved', 'Approved due to utility relocation necessity'),
('contingency', 1, 'Contingency Release Requested', 'Site Engineer, NHAI', 'Project Director, NHAI', '2025-08-15T10:00:00Z', 'approved', 'Approved for rock excavation'),
('variance', 3, 'Budget Reallocation', 'Chief Engineer, MCGM', 'Municipal Commissioner', '2025-06-20T16:00:00Z', 'approved', 'Funds reallocated to emergency repairs'),
('project', 3, 'Project Halted', 'Project Manager, MCGM', 'Chief Engineer, MCGM', '2025-06-10T09:00:00Z', 'approved', 'Contractor blacklisted, project halted pending retender');

-- =========================================================================
-- 26. ROAD REGION CROSSINGS (sample)
-- =========================================================================
INSERT INTO road_region_crossings (road_id, region_code, geom_segment, authority_id) VALUES
(1, 'IN', ST_GeomFromText('LINESTRING(72.8524 19.1012, 72.8610 19.2300)', 4326), 5),
(9, 'US', ST_GeomFromText('LINESTRING(-83.1500 42.3500, -82.9400 42.3700)', 4326), 8);

-- =========================================================================
-- END OF MOCK DATA
-- =========================================================================