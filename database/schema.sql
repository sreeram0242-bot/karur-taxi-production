-- ============================================================================
-- TAMIL NADU CALL-TAXI PLATFORM - PRODUCTION POSTGIS DATABASE SCHEMA
-- Target Database: PostgreSQL 16+ with PostGIS 3.4+
-- Optimized for: OCI ARM64 (Ampere A1), Tier-2/Tier-3 TN Logistics
-- SRID: 4326 (WGS 84 GPS Lat/Lon) & 3857 (Spherical Mercator for distances)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "postgis_topology";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- ============================================================================
-- 1. ENUMS & DOMAINS
-- ============================================================================
CREATE TYPE user_role AS ENUM ('passenger', 'driver', 'operator', 'admin', 'superadmin');
CREATE TYPE vehicle_category AS ENUM ('auto', 'mini', 'sedan', 'suv');
CREATE TYPE driver_status AS ENUM ('offline', 'online', 'busy', 'suspended', 'pending_kyc');
CREATE TYPE ride_status AS ENUM (
    'requested',
    'searching',
    'driver_assigned',
    'arrived_at_pickup',
    'in_progress',
    'completed',
    'cancelled_by_passenger',
    'cancelled_by_driver',
    'cancelled_by_system'
);
CREATE TYPE payment_mode AS ENUM ('cash', 'upi', 'wallet');
CREATE TYPE payment_status AS ENUM ('pending', 'collected', 'failed', 'refunded');
CREATE TYPE kyc_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE transaction_type AS ENUM ('ride_commission', 'recharge', 'penalty', 'incentive', 'refund');

-- ============================================================================
-- 2. USERS (PASSENGERS & SYSTEM USERS)
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(15) UNIQUE NOT NULL, -- Format: '9876543210' (10-digit Indian SIM)
    full_name VARCHAR(100),
    preferred_language VARCHAR(10) DEFAULT 'ta', -- 'ta' (Tamil), 'en' (English)
    role user_role DEFAULT 'passenger' NOT NULL,
    emergency_contacts JSONB DEFAULT '[]'::jsonb, -- Array of up to 3 numbers for SOS
    rating_avg NUMERIC(3, 2) DEFAULT 5.00,
    total_trips INT DEFAULT 0,
    fcm_token TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone_number);

-- ============================================================================
-- 3. DRIVERS & VEHICLES
-- ============================================================================
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(30) UNIQUE NOT NULL,
    aadhaar_masked VARCHAR(12) NOT NULL, -- e.g., 'XXXXXXXX1234'
    status driver_status DEFAULT 'pending_kyc' NOT NULL,
    wallet_balance NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    is_wallet_locked BOOLEAN DEFAULT FALSE, -- Locked when wallet_balance < -300.00
    languages_spoken TEXT[] DEFAULT ARRAY['ta', 'en'],
    
    -- Real-time tracking attributes
    current_location GEOMETRY(Point, 4326),
    heading NUMERIC(5, 2) DEFAULT 0.00, -- Heading in degrees (0 - 359.99)
    last_ping_at TIMESTAMPTZ,
    
    -- "Go-Home" destination feature (limited to 2x per 24 hours)
    go_home_location GEOMETRY(Point, 4326),
    go_home_trips_today INT DEFAULT 0,
    go_home_reset_at DATE DEFAULT CURRENT_DATE,

    total_rides_completed INT DEFAULT 0,
    rating_avg NUMERIC(3, 2) DEFAULT 4.90,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_location ON drivers USING GIST(current_location);
CREATE INDEX idx_drivers_wallet_locked ON drivers(is_wallet_locked);

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID UNIQUE NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    category vehicle_category NOT NULL,
    make_model VARCHAR(100) NOT NULL, -- e.g., 'Maruti Suzuki Dzire', 'Bajaj Compact RE'
    license_plate VARCHAR(20) UNIQUE NOT NULL, -- e.g., 'TN 38 BK 4920'
    color VARCHAR(30) DEFAULT 'White',
    manufacture_year INT,
    rc_number VARCHAR(30) NOT NULL,
    fitness_certificate_expiry DATE NOT NULL,
    insurance_expiry DATE NOT NULL,
    is_air_conditioned BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehicles_category ON vehicles(category);

-- ============================================================================
-- 4. GEOZONES & TARIFF RULES (DYNAMIC POLYGON ENGINE)
-- ============================================================================
CREATE TABLE geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_name VARCHAR(100) NOT NULL, -- e.g., 'Coimbatore Central', 'Madurai Airport'
    city VARCHAR(50) NOT NULL,       -- e.g., 'Coimbatore', 'Chennai', 'Salem'
    boundary GEOMETRY(Polygon, 4326) NOT NULL,
    surge_multiplier NUMERIC(3, 2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_geofences_boundary ON geofences USING GIST(boundary);

CREATE TABLE tariff_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category vehicle_category NOT NULL,
    geofence_id UUID REFERENCES geofences(id) ON DELETE SET NULL, -- NULL = Default City Tariff
    base_fare NUMERIC(8, 2) NOT NULL,        -- e.g., ₹50.00
    base_km NUMERIC(5, 2) NOT NULL,          -- Included km (e.g., 2.0 km)
    per_km_rate NUMERIC(8, 2) NOT NULL,      -- e.g., ₹16.00/km
    per_minute_wait_rate NUMERIC(6, 2) NOT NULL DEFAULT 1.50,
    night_surcharge_multiplier NUMERIC(3, 2) DEFAULT 1.25, -- 25% extra between 10PM - 6AM
    round_trip_threshold_km NUMERIC(5, 2) DEFAULT 10.00,  -- Distances > 10km calculate two-way
    platform_commission_pct NUMERIC(4, 2) DEFAULT 10.00,  -- 10% commission on non-cash
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. RIDES & TRIP EXECUTION
-- ============================================================================
CREATE TABLE rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_code VARCHAR(12) UNIQUE NOT NULL, -- Short readable code: 'TRIP-4920'
    passenger_id UUID NOT NULL REFERENCES users(id),
    driver_id UUID REFERENCES drivers(id),
    vehicle_id UUID REFERENCES vehicles(id),
    
    status ride_status DEFAULT 'requested' NOT NULL,
    category vehicle_category NOT NULL,
    
    -- Geospatial coordinates
    pickup_location GEOMETRY(Point, 4326) NOT NULL,
    pickup_address TEXT NOT NULL,
    drop_location GEOMETRY(Point, 4326) NOT NULL,
    drop_address TEXT NOT NULL,
    
    -- Planned vs Actual Route
    estimated_distance_meters INT NOT NULL,
    estimated_duration_seconds INT NOT NULL,
    actual_distance_meters INT,
    actual_duration_seconds INT,
    route_polyline_summary TEXT, -- Encoded overview polyline for fast display
    
    -- Security OTP (Mandatory 4-digit ride-start PIN)
    otp_code VARCHAR(4) NOT NULL, 
    
    -- Financials & Fare Breakdown
    base_fare NUMERIC(8, 2) NOT NULL,
    distance_fare NUMERIC(8, 2) NOT NULL,
    waiting_fare NUMERIC(8, 2) DEFAULT 0.00,
    night_charge NUMERIC(8, 2) DEFAULT 0.00,
    toll_charges NUMERIC(8, 2) DEFAULT 0.00,
    parking_charges NUMERIC(8, 2) DEFAULT 0.00,
    surge_amount NUMERIC(8, 2) DEFAULT 0.00,
    discount_amount NUMERIC(8, 2) DEFAULT 0.00,
    total_fare NUMERIC(8, 2) NOT NULL,
    commission_amount NUMERIC(8, 2) NOT NULL, -- Platform share
    
    payment_mode payment_mode DEFAULT 'cash' NOT NULL,
    payment_status payment_status DEFAULT 'pending' NOT NULL,
    
    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    cancelled_by user_role
);

CREATE INDEX idx_rides_passenger ON rides(passenger_id);
CREATE INDEX idx_rides_driver ON rides(driver_id);
CREATE INDEX idx_rides_status ON rides(status);
CREATE INDEX idx_rides_pickup_loc ON rides USING GIST(pickup_location);
CREATE INDEX idx_rides_created_at ON rides(requested_at DESC);

-- ============================================================================
-- 6. DRIVER WALLET & LEDGER (TRANSACTION LOCK PROTECTION)
-- ============================================================================
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    ride_id UUID REFERENCES rides(id),
    amount NUMERIC(10, 2) NOT NULL, -- Negative for commission deduction, positive for recharge
    balance_after NUMERIC(10, 2) NOT NULL,
    type transaction_type NOT NULL,
    description TEXT NOT NULL,
    reference_id VARCHAR(100), -- UPI UTR / Razorpay / Cashfree Txn ID
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_tx_driver ON wallet_transactions(driver_id);

-- ============================================================================
-- 7. DRIVER KYC & VERIFICATION QUEUE
-- ============================================================================
CREATE TABLE kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'driving_license', 'rc_book', 'aadhaar', 'fc', 'insurance'
    document_number VARCHAR(100),
    file_url TEXT NOT NULL,
    status kyc_status DEFAULT 'pending' NOT NULL,
    rejection_reason TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    expiry_date DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kyc_driver ON kyc_documents(driver_id);
CREATE INDEX idx_kyc_status ON kyc_documents(status);

-- ============================================================================
-- 8. PL/PGSQL HIGH-SPEED SPATIAL QUERY FUNCTIONS
-- ============================================================================

-- Function 1: Find nearest eligible online drivers within radius with 24GB ARM64 tuning
CREATE OR REPLACE FUNCTION get_nearest_available_drivers(
    p_pickup_lat DOUBLE PRECISION,
    p_pickup_lon DOUBLE PRECISION,
    p_category vehicle_category,
    p_radius_meters INT DEFAULT 5000,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    driver_id UUID,
    user_id UUID,
    full_name VARCHAR,
    phone_number VARCHAR,
    current_lat DOUBLE PRECISION,
    current_lon DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    rating_avg NUMERIC,
    vehicle_make VARCHAR,
    license_plate VARCHAR
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id AS driver_id,
        u.id AS user_id,
        u.full_name,
        u.phone_number,
        ST_Y(d.current_location::geometry) AS current_lat,
        ST_X(d.current_location::geometry) AS current_lon,
        ST_Distance(
            d.current_location::geography,
            ST_SetSRID(ST_MakePoint(p_pickup_lon, p_pickup_lat), 4326)::geography
        ) AS distance_meters,
        d.rating_avg,
        v.make_model AS vehicle_make,
        v.license_plate
    FROM drivers d
    JOIN users u ON d.user_id = u.id
    JOIN vehicles v ON v.driver_id = d.id
    WHERE d.status = 'online'
      AND d.is_wallet_locked = FALSE
      AND v.category = p_category
      AND v.is_active = TRUE
      AND ST_DWithin(
          d.current_location::geography,
          ST_SetSRID(ST_MakePoint(p_pickup_lon, p_pickup_lat), 4326)::geography,
          p_radius_meters
      )
      -- Ensure driver is actively pinging within the last 30 seconds
      AND d.last_ping_at >= CURRENT_TIMESTAMP - INTERVAL '30 seconds'
    ORDER BY distance_meters ASC
    LIMIT p_limit;
END;
$$;

-- Function 2: Wallet Lock Trigger (Locks driver at -₹300 balance)
CREATE OR REPLACE FUNCTION check_driver_wallet_lock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.wallet_balance < -300.00 THEN
        NEW.is_wallet_locked := TRUE;
    ELSE
        NEW.is_wallet_locked := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_driver_wallet_balance
BEFORE INSERT OR UPDATE OF wallet_balance ON drivers
FOR EACH ROW
EXECUTE FUNCTION check_driver_wallet_lock();
