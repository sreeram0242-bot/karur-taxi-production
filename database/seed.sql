-- ============================================================================
-- KARUR TAXI (கரூர் டாக்ஸி) SEED DATA & TARIFF CONFIGURATION
-- Hub: Karur District & Industrial Textile Corridor
-- Outstation coverage: Trichy, Erode, Dindigul, Coimbatore, Salem
-- ============================================================================

-- 1. Insert Karur Core Urban & Industrial Geofences
INSERT INTO geofences (id, zone_name, city, boundary, surge_multiplier) VALUES
(
    'a0000001-0000-0000-0000-000000000001',
    'Karur City Core & Central Bus Stand',
    'Karur',
    ST_PolygonFromText('POLYGON((78.0500 10.9300, 78.1100 10.9300, 78.1100 10.9900, 78.0500 10.9900, 78.0500 10.9300))', 4326),
    1.00
),
(
    'a0000001-0000-0000-0000-000000000002',
    'Karur Textile Export SEZ & Thanthonimalai',
    'Karur',
    ST_PolygonFromText('POLYGON((78.0600 10.9100, 78.1200 10.9100, 78.1200 10.9500, 78.0600 10.9500, 78.0600 10.9100))', 4326),
    1.00
),
(
    'a0000001-0000-0000-0000-000000000003',
    'Coimbatore City Core & Gandhipuram',
    'Coimbatore',
    ST_PolygonFromText('POLYGON((76.9400 11.0000, 76.9900 11.0000, 76.9900 11.0400, 76.9400 11.0400, 76.9400 11.0000))', 4326),
    1.00
);

-- 2. Insert Karur Taxi Standard Tariff Rules
-- Auto: ₹40 Base (first 1.8km), ₹14/km, Round trip > 10km, 10% Platform fee
INSERT INTO tariff_plans (category, geofence_id, base_fare, base_km, per_km_rate, per_minute_wait_rate, night_surcharge_multiplier, round_trip_threshold_km, platform_commission_pct) VALUES
('auto', NULL, 40.00, 1.80, 14.00, 1.00, 1.25, 10.00, 10.00),
('mini', NULL, 60.00, 2.00, 16.00, 1.50, 1.25, 10.00, 10.00),
('sedan', NULL, 80.00, 2.00, 18.00, 2.00, 1.25, 10.00, 10.00),
('suv', NULL, 120.00, 3.00, 24.00, 2.50, 1.25, 12.00, 12.00);

-- 3. Insert Admin & Verified Karur Drivers
INSERT INTO users (id, phone_number, full_name, preferred_language, role, rating_avg) VALUES
('b0000001-0000-0000-0000-000000000001', '9840012345', 'Admin Operator (Karur Taxi Head)', 'ta', 'admin', 5.00),
('b0000002-0000-0000-0000-000000000002', '9629661668', 'Senthil Kumar (செந்தில் - கரூர்)', 'ta', 'driver', 4.94),
('b0000003-0000-0000-0000-000000000003', '7871580261', 'Murugan R (முருகன் - கரூர்)', 'ta', 'driver', 4.88),
('b0000004-0000-0000-0000-000000000004', '9443311223', 'Muthu Vel (முத்து)', 'ta', 'passenger', 4.90);

-- 4. Insert Driver Details (Karur Central Bus Stand coordinates: 10.9601° N, 78.0766° E)
INSERT INTO drivers (id, user_id, license_number, aadhaar_masked, status, wallet_balance, languages_spoken, current_location, heading, last_ping_at, total_rides_completed, rating_avg) VALUES
(
    'c0000001-0000-0000-0000-000000000001',
    'b0000002-0000-0000-0000-000000000002',
    'TN-47-20150004920',
    'XXXX-XXXX-4920',
    'online',
    450.00, -- Healthy wallet
    ARRAY['ta', 'en'],
    ST_SetSRID(ST_MakePoint(78.0766, 10.9601), 4326),
    45.0,
    CURRENT_TIMESTAMP,
    1482,
    4.94
),
(
    'c0000002-0000-0000-0000-000000000002',
    'b0000003-0000-0000-0000-000000000003',
    'TN-47-20180008811',
    'XXXX-XXXX-8811',
    'online',
    -120.00, -- Negative but above lock threshold (-300)
    ARRAY['ta'],
    ST_SetSRID(ST_MakePoint(78.0820, 10.9640), 4326),
    90.0,
    CURRENT_TIMESTAMP,
    920,
    4.88
);

-- 5. Insert Vehicles (Karur RTO TN-47)
INSERT INTO vehicles (driver_id, category, make_model, license_plate, color, manufacture_year, rc_number, fitness_certificate_expiry, insurance_expiry, is_air_conditioned) VALUES
(
    'c0000001-0000-0000-0000-000000000001',
    'sedan',
    'Maruti Swift Dzire Tour',
    'TN 47 AJ 4920',
    'Arctic White',
    2022,
    'RC-TN47-99482',
    '2028-12-31',
    '2027-05-15',
    TRUE
),
(
    'c0000002-0000-0000-0000-000000000002',
    'auto',
    'Bajaj Compact 4S RE Auto',
    'TN 47 B 8811',
    'Yellow & Green',
    2021,
    'RC-TN47-12884',
    '2027-08-30',
    '2026-11-20',
    FALSE
);
