import { query } from '../db/postgres';

export interface FareCalculationInput {
  category: 'auto' | 'mini' | 'sedan' | 'suv';
  distanceMeters: number;
  durationSeconds: number;
  pickupLat: number;
  pickupLon: number;
  requestTimestamp?: Date;
}

export interface FareBreakdown {
  category: string;
  baseFare: number;
  distanceFare: number;
  nightSurcharge: number;
  surgeMultiplier: number;
  totalFare: number;
  isRoundTripApplied: boolean;
  billedDistanceKm: number;
  platformCommission: number;
}

/**
 * High-Precision Tamil Nadu Tariff Engine
 * Implements: Base km, excess per-km, night surcharge (10PM-6AM), 
 * auto round-trip doubling if distance > 10km (TN Outstation/Call-Taxi standard rule).
 */
export async function calculateFare(input: FareCalculationInput): Promise<FareBreakdown> {
  const now = input.requestTimestamp || new Date();
  const distanceKm = input.distanceMeters / 1000;

  // 1. Check if pickup falls within a custom Geofence with surge
  const geofenceResult = await query(
    `SELECT id, surge_multiplier 
     FROM geofences 
     WHERE ST_Contains(boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
       AND is_active = TRUE
     LIMIT 1;`,
    [input.pickupLon, input.pickupLat]
  );

  let geofenceId = null;
  let surgeMultiplier = 1.0;
  if (geofenceResult.rows.length > 0) {
    geofenceId = geofenceResult.rows[0].id;
    surgeMultiplier = parseFloat(geofenceResult.rows[0].surge_multiplier) || 1.0;
  }

  // 2. Fetch active tariff for this vehicle category and geozone
  const tariffResult = await query(
    `SELECT * FROM tariff_plans 
     WHERE category = $1 
       AND (geofence_id = $2 OR geofence_id IS NULL)
       AND is_active = TRUE
     ORDER BY geofence_id NULLS LAST 
     LIMIT 1;`,
    [input.category, geofenceId]
  );

  if (tariffResult.rows.length === 0) {
    throw new Error(`No active tariff configured for category ${input.category}`);
  }

  const tariff = tariffResult.rows[0];
  const baseFare = parseFloat(tariff.base_fare);
  const baseKm = parseFloat(tariff.base_km);
  const perKmRate = parseFloat(tariff.per_km_rate);
  const nightMultiplier = parseFloat(tariff.night_surcharge_multiplier);
  const roundTripThreshold = parseFloat(tariff.round_trip_threshold_km);
  const commissionPct = parseFloat(tariff.platform_commission_pct);

  // 3. Round-Trip Logic: For distances exceeding threshold (10km in TN), double the billable distance
  let isRoundTripApplied = false;
  let billedDistanceKm = distanceKm;
  if (distanceKm > roundTripThreshold) {
    isRoundTripApplied = true;
    billedDistanceKm = distanceKm * 2; // Return trip charge
  }

  // 4. Calculate Distance Fare
  let distanceFare = 0;
  if (billedDistanceKm > baseKm) {
    distanceFare = (billedDistanceKm - baseKm) * perKmRate;
  }

  // 5. Calculate Night Surcharge (10 PM to 6 AM Indian Standard Time)
  // UTC + 5:30 check
  const istHour = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;
  const isNight = istHour >= 22 || istHour < 6;
  let nightSurcharge = 0;

  let subtotal = baseFare + distanceFare;

  if (isNight) {
    nightSurcharge = subtotal * (nightMultiplier - 1.0);
    subtotal += nightSurcharge;
  }

  // 6. Apply Surge Multiplier
  const totalFare = Math.round(subtotal * surgeMultiplier);
  const platformCommission = Math.round(totalFare * (commissionPct / 100));

  return {
    category: input.category,
    baseFare: Math.round(baseFare),
    distanceFare: Math.round(distanceFare),
    nightSurcharge: Math.round(nightSurcharge),
    surgeMultiplier,
    totalFare,
    isRoundTripApplied,
    billedDistanceKm: parseFloat(billedDistanceKm.toFixed(1)),
    platformCommission,
  };
}
