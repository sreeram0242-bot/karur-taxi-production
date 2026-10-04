import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db/postgres';
import { redis } from '../db/redis';

export async function registerAdminRoutes(fastify: FastifyInstance) {
  // 1. God's Eye Map - Real-time fleet overview
  fastify.get('/api/admin/gods-eye', async (request, reply) => {
    const result = await query(
      `SELECT 
         d.id AS driver_id,
         u.full_name,
         u.phone_number,
         d.status,
         d.wallet_balance,
         d.rating_avg,
         ST_Y(d.current_location::geometry) AS lat,
         ST_X(d.current_location::geometry) AS lon,
         d.heading,
         d.last_ping_at,
         v.category,
         v.license_plate,
         v.make_model
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       JOIN vehicles v ON v.driver_id = d.id
       WHERE d.status IN ('online', 'busy')`
    );

    return {
      success: true,
      activeVehicles: result.rows,
    };
  });

  // 2. Manual Dispatch Desk - Operator Phone Booking Entry
  fastify.post('/api/admin/manual-dispatch', async (request, reply) => {
    const schema = z.object({
      customerPhone: z.string().regex(/^\d{10}$/),
      customerName: z.string(),
      category: z.enum(['auto', 'mini', 'sedan', 'suv']),
      pickupLat: z.number(),
      pickupLon: z.number(),
      pickupAddress: z.string(),
      dropLat: z.number(),
      dropLon: z.number(),
      dropAddress: z.string(),
      estimatedDistanceMeters: z.number(),
      estimatedDurationSeconds: z.number(),
      estimatedFare: z.number(),
      forcedDriverId: z.string().uuid().optional(),
    });

    const data = schema.parse(request.body);

    // Ensure customer user exists or create
    let userRes = await query(`SELECT id FROM users WHERE phone_number = $1`, [data.customerPhone]);
    let passengerId: string;
    if (userRes.rows.length === 0) {
      const newUser = await query(
        `INSERT INTO users (phone_number, full_name, preferred_language, role) VALUES ($1, $2, 'ta', 'passenger') RETURNING id`,
        [data.customerPhone, data.customerName]
      );
      passengerId = newUser.rows[0].id;
    } else {
      passengerId = userRes.rows[0].id;
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    const rideCode = `OP-${Math.floor(1000 + Math.random() * 9000)}`;

    const rideRes = await query(
      `INSERT INTO rides (
         ride_code, passenger_id, category, pickup_location, pickup_address,
         drop_location, drop_address, estimated_distance_meters, estimated_duration_seconds,
         otp_code, base_fare, distance_fare, total_fare, commission_amount, status,
         driver_id, assigned_at
       ) VALUES (
         $1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6,
         ST_SetSRID(ST_MakePoint($7, $8), 4326), $9, $10, $11,
         $12, $13, $14, $15, $16,
         CASE WHEN $17::uuid IS NOT NULL THEN 'driver_assigned'::ride_status ELSE 'searching'::ride_status END,
         $17,
         CASE WHEN $17::uuid IS NOT NULL THEN CURRENT_TIMESTAMP ELSE NULL END
       ) RETURNING *`,
      [
        rideCode,
        passengerId,
        data.category,
        data.pickupLon,
        data.pickupLat,
        data.pickupAddress,
        data.dropLon,
        data.dropLat,
        data.dropAddress,
        data.estimatedDistanceMeters,
        data.estimatedDurationSeconds,
        otpCode,
        50.0,
        data.estimatedFare - 50.0,
        data.estimatedFare,
        data.estimatedFare * 0.1,
        data.forcedDriverId || null,
      ]
    );

    const ride = rideRes.rows[0];

    // If forced driver assigned, mark driver busy
    if (data.forcedDriverId) {
      await query(`UPDATE drivers SET status = 'busy' WHERE id = $1`, [data.forcedDriverId]);
      await redis.publish(
        `driver:channel:${data.forcedDriverId}`,
        JSON.stringify({
          event: 'MANUAL_DISPATCH_ASSIGNED',
          rideId: ride.id,
          pickupAddress: data.pickupAddress,
          customerPhone: data.customerPhone,
        })
      );
    }

    return {
      success: true,
      message: 'Booking created and dispatched successfully',
      ride,
    };
  });

  // 3. KYC Approval / Rejection Queue
  fastify.get('/api/admin/kyc/pending', async (request, reply) => {
    const result = await query(
      `SELECT 
         k.id AS doc_id,
         d.id AS driver_id,
         u.full_name,
         u.phone_number,
         k.document_type,
         k.document_number,
         k.file_url,
         k.created_at
       FROM kyc_documents k
       JOIN drivers d ON k.driver_id = d.id
       JOIN users u ON d.user_id = u.id
       WHERE k.status = 'pending'
       ORDER BY k.created_at ASC`
    );

    return { success: true, pendingDocs: result.rows };
  });

  fastify.post('/api/admin/kyc/:docId/verify', async (request, reply) => {
    const { docId } = request.params as { docId: string };
    const schema = z.object({
      action: z.enum(['approve', 'reject']),
      rejectionReason: z.string().optional(),
    });

    const { action, rejectionReason } = schema.parse(request.body);

    const docRes = await query(`SELECT driver_id, document_type FROM kyc_documents WHERE id = $1`, [docId]);
    if (docRes.rows.length === 0) return reply.status(404).send({ error: 'Document not found' });

    const { driver_id, document_type } = docRes.rows[0];

    if (action === 'approve') {
      await query(
        `UPDATE kyc_documents 
         SET status = 'approved', verified_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [docId]
      );

      // Check if all essential documents are approved
      const pendingCount = await query(
        `SELECT COUNT(*) FROM kyc_documents WHERE driver_id = $1 AND status != 'approved'`,
        [driver_id]
      );

      if (parseInt(pendingCount.rows[0].count, 10) === 0) {
        await query(`UPDATE drivers SET status = 'online' WHERE id = $1`, [driver_id]);
      }

      return { success: true, message: `${document_type} approved` };
    } else {
      await query(
        `UPDATE kyc_documents 
         SET status = 'rejected', rejection_reason = $1, verified_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [rejectionReason || 'Document illegible or invalid', docId]
      );

      return { success: true, message: `${document_type} rejected. Reason recorded.` };
    }
  });

  // 4. Geofence & Tariff Polygon Engine
  fastify.post('/api/admin/geofences', async (request, reply) => {
    const schema = z.object({
      zoneName: z.string(),
      city: z.string(),
      polygonGeoJson: z.any(), // GeoJSON Polygon
      surgeMultiplier: z.number().default(1.0),
    });

    const data = schema.parse(request.body);

    const insertRes = await query(
      `INSERT INTO geofences (zone_name, city, boundary, surge_multiplier)
       VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4)
       RETURNING id, zone_name, city, surge_multiplier`,
      [data.zoneName, data.city, JSON.stringify(data.polygonGeoJson), data.surgeMultiplier]
    );

    return { success: true, geofence: insertRes.rows[0] };
  });
}
