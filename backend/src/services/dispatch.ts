import { query } from '../db/postgres';
import { redis } from '../db/redis';

export interface DispatchCandidate {
  driverId: string;
  userId: string;
  fullName: string;
  phoneNumber: string;
  currentLat: number;
  currentLon: number;
  distanceMeters: number;
  ratingAvg: number;
  vehicleMake: string;
  licensePlate: string;
}

export class DispatchEngine {
  /**
   * Dispatches ride request to the optimal nearest online driver.
   * Uses PostGIS function `get_nearest_available_drivers` and atomic Redis locks.
   */
  static async findAndNotifyCandidate(rideId: string, category: string, pickupLat: number, pickupLon: number, dropLat: number, dropLon: number): Promise<DispatchCandidate | null> {
    // 1. Fetch nearest available drivers within 5km radius
    const result = await query<DispatchCandidate>(
      `SELECT * FROM get_nearest_available_drivers($1, $2, $3, 5000, 10)`,
      [pickupLat, pickupLon, category]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // 2. Iterate candidates and attempt atomic 15-second lock in Redis
    for (const candidate of result.rows) {
      // Check Go-Home filter constraint if driver has active Go-Home trip
      const driverCheck = await query(
        `SELECT go_home_location, go_home_trips_today 
         FROM drivers WHERE id = $1`,
        [candidate.driverId]
      );

      if (driverCheck.rows[0]?.go_home_location) {
        // Drop location must be within 4km of their home location
        const distanceToHome = await query(
          `SELECT ST_Distance(
             $1::geography,
             ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography
           ) as dist`,
          [driverCheck.rows[0].go_home_location, dropLon, dropLat]
        );
        if (distanceToHome.rows[0].dist > 4000) {
          continue; // Skip this driver as ride moves away from home
        }
      }

      // Try acquiring 15s dispatch lock
      const lockKey = `driver:lock:${candidate.driverId}`;
      const acquired = await redis.set(lockKey, rideId, 'EX', 15, 'NX');

      if (acquired === 'OK') {
        // Publish dispatch flash event to Redis pub/sub for Driver WebSocket
        await redis.publish(
          `driver:channel:${candidate.driverId}`,
          JSON.stringify({
            event: 'RIDE_DISPATCH_FLASH',
            rideId,
            expiresInSeconds: 15,
            pickupLat,
            pickupLon,
            dropLat,
            dropLon,
          })
        );
        return candidate;
      }
    }

    return null;
  }
}
