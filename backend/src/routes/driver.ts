import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db/postgres';
import { redis } from '../db/redis';

export async function registerDriverRoutes(fastify: FastifyInstance) {
  // 1. Toggle Duty Status (GO ONLINE / GO OFFLINE)
  fastify.post('/api/drivers/:id/duty', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      status: z.enum(['online', 'offline']),
    });

    const { status } = schema.parse(request.body);

    // If attempting to go online, check if wallet is locked (< -300)
    if (status === 'online') {
      const driverRes = await query(`SELECT wallet_balance, is_wallet_locked FROM drivers WHERE id = $1`, [id]);
      if (driverRes.rows.length === 0) return reply.status(404).send({ error: 'Driver not found' });

      if (driverRes.rows[0].is_wallet_locked || driverRes.rows[0].wallet_balance < -300) {
        return reply.status(403).send({
          error: 'WALLET_LOCKED',
          message: 'Wallet balance is below -₹300. Please recharge to go online.',
          currentBalance: driverRes.rows[0].wallet_balance,
        });
      }
    }

    await query(`UPDATE drivers SET status = $1 WHERE id = $2`, [status, id]);

    if (status === 'offline') {
      await redis.zrem('drivers:geo:online', id);
    }

    return { success: true, status };
  });

  // 2. Set "Go-Home" Destination Filter (Maximum 2x per day)
  fastify.post('/api/drivers/:id/go-home', async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({
      lat: z.number(),
      lon: z.number(),
    });

    const { lat, lon } = schema.parse(request.body);

    const driverRes = await query(
      `SELECT go_home_trips_today, go_home_reset_at FROM drivers WHERE id = $1`,
      [id]
    );

    if (driverRes.rows.length === 0) return reply.status(404).send({ error: 'Driver not found' });

    let tripsToday = driverRes.rows[0].go_home_trips_today;
    const resetDate = new Date(driverRes.rows[0].go_home_reset_at).toDateString();
    const today = new Date().toDateString();

    // Reset daily counter if a new day
    if (resetDate !== today) {
      tripsToday = 0;
    }

    if (tripsToday >= 2) {
      return reply.status(400).send({
        error: 'LIMIT_REACHED',
        message: 'Go-Home feature can only be activated 2 times per day.',
      });
    }

    await query(
      `UPDATE drivers 
       SET go_home_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
           go_home_trips_today = $3 + 1,
           go_home_reset_at = CURRENT_DATE
       WHERE id = $4`,
      [lon, lat, tripsToday, id]
    );

    return {
      success: true,
      message: 'Go-Home filter active. You will only receive rides heading toward your destination.',
      tripsUsedToday: tripsToday + 1,
      tripsRemaining: 2 - (tripsToday + 1),
    };
  });

  // 3. Driver Wallet & Dynamic UPI Intent Generator
  fastify.get('/api/drivers/:id/wallet', async (request, reply) => {
    const { id } = request.params as { id: string };
    const driverRes = await query(
      `SELECT d.wallet_balance, d.is_wallet_locked, u.full_name, u.phone_number
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       WHERE d.id = $1`,
      [id]
    );

    if (driverRes.rows.length === 0) return reply.status(404).send({ error: 'Driver not found' });

    const driver = driverRes.rows[0];
    const rechargeAmount = Math.max(500, Math.abs(driver.wallet_balance) + 200);

    // Dynamic UPI Intent deep link for PhonePe, GPay, Paytm
    const upiPayee = 'karurtaxi@icici';
    const upiName = 'Karur Taxi Operations';
    const upiLink = `upi://pay?pa=${upiPayee}&pn=${encodeURIComponent(upiName)}&am=${rechargeAmount}&cu=INR&tn=${encodeURIComponent(`Recharge ${driver.phone_number}`)}`;

    const transactions = await query(
      `SELECT * FROM wallet_transactions WHERE driver_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [id]
    );

    return {
      success: true,
      walletBalance: parseFloat(driver.wallet_balance),
      isLocked: driver.is_wallet_locked,
      suggestedRechargeAmount: rechargeAmount,
      upiDeepLink: upiLink,
      recentTransactions: transactions.rows,
    };
  });

  // 4. Heatmap Demand Overlay API
  fastify.get('/api/drivers/heatmap', async (request, reply) => {
    // Aggregates ride requests from the last 60 minutes into spatial clusters
    const result = await query(
      `SELECT 
         ST_Y(ST_Centroid(ST_Collect(pickup_location))) AS lat,
         ST_X(ST_Centroid(ST_Collect(pickup_location))) AS lon,
         COUNT(*) AS intensity
       FROM rides
       WHERE requested_at >= CURRENT_TIMESTAMP - INTERVAL '60 minutes'
       GROUP BY ST_SnapToGrid(pickup_location, 0.01)`
    );

    return {
      success: true,
      points: result.rows.map((r) => ({
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        intensity: parseInt(r.intensity, 10),
      })),
    };
  });
}
