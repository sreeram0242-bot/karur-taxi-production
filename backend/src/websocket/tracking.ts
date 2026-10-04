import { WebSocket } from 'ws';
import { FastifyInstance } from 'fastify';
import { redis, redisSub } from '../db/redis';
import { query } from '../db/postgres';

interface DriverLocationPacket {
  dId: string;    // Driver UUID
  lat: number;    // Latitude
  lng: number;    // Longitude
  hd: number;     // Heading (0 - 360)
  sp: number;     // Speed (km/h)
  rId?: string;   // Active Ride ID if in trip
  ts: number;     // Timestamp (epoch ms)
}

// Memory cache for throttled DB write-behind
const pendingDbUpdates = new Map<string, { lat: number; lng: number; heading: number }>();

// Write to Postgres every 15 seconds in batch
setInterval(async () => {
  if (pendingDbUpdates.size === 0) return;

  const entries = Array.from(pendingDbUpdates.entries());
  pendingDbUpdates.clear();

  for (const [driverId, data] of entries) {
    try {
      await query(
        `UPDATE drivers 
         SET current_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
             heading = $3,
             last_ping_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [data.lng, data.lat, data.heading, driverId]
      );
    } catch (err) {
      console.error(`[DB UPDATE ERROR] Driver ${driverId}`, err);
    }
  }
}, 15000);

export function registerTrackingWebSockets(fastify: FastifyInstance) {
  // 1. Driver Location Feed Endpoint: /ws/driver/location
  fastify.get('/ws/driver/location', { websocket: true }, (socket, req) => {
    socket.on('message', async (rawMessage: any) => {
      try {
        const payload: DriverLocationPacket = JSON.parse(rawMessage.toString());
        const { dId, lat, lng, hd, sp, rId, ts } = payload;

        if (!dId || !lat || !lng) return;

        // 1. Fast update to Redis Geo (instant geospatial lookups in <1ms)
        await redis.geoadd('drivers:geo:online', lng, lat, dId);
        await redis.hset(`driver:state:${dId}`, {
          lat,
          lng,
          heading: hd,
          speed: sp,
          rideId: rId || '',
          lastPing: ts,
        });

        // 2. Buffer for DB batching (preserves disk I/O on OCI ARM64)
        pendingDbUpdates.set(dId, { lat, lng, heading: hd });

        // 3. If in active trip, forward ping to the Passenger Live HUD room
        if (rId) {
          await redis.publish(
            `ride:tracking:${rId}`,
            JSON.stringify({
              lat,
              lng,
              heading: hd,
              speed: sp,
              timestamp: ts,
            })
          );
        }

        // Return minimal 2-byte ACK to budget phone to prevent network stall
        socket.send('OK');
      } catch (err) {
        console.error('[WS DRIVER ERROR]', err);
      }
    });

    socket.on('close', () => {
      // Driver disconnected
    });
  });

  // 2. Passenger Tracking HUD WebSocket Endpoint: /ws/passenger/ride/:rideId
  fastify.get('/ws/passenger/ride/:rideId', { websocket: true }, (socket, req) => {
    const { rideId } = req.params as { rideId: string };

    const channel = `ride:tracking:${rideId}`;
    const sub = redisSub.duplicate();
    sub.subscribe(channel);

    sub.on('message', (chan, message) => {
      if (chan === channel && socket.readyState === WebSocket.OPEN) {
        socket.send(message);
      }
    });

    socket.on('close', () => {
      sub.unsubscribe(channel);
      sub.quit();
    });
  });
}
