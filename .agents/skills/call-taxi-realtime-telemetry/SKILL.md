---
name: call-taxi-realtime-telemetry
description: Ultra-low bandwidth WebSocket telemetry, GPS jitter Kalman filtering, dead reckoning, Redis Geo write-behind batching, and reconnect resiliency for 2G/3G Indian networks.
---

# 📡 Real-Time Telemetry, GPS Smoothing & Redis Ingestion Skill

> **Target Network:** Indian Cellular 2G/3G/4G/5G (Jio, Airtel, Vi) with intermittent cell tower handovers and high packet loss.  
> **Server Pipeline:** Fastify WebSocket $\rightarrow$ Redis 7 Geospatial Index $\rightarrow$ Throttled PostgreSQL Write-Behind.  
> **Client Filtering:** Dead Reckoning & Kalman trajectory interpolation on budget GPS chipsets.

---

## 1. Ultra-Compact Location Packet Specification (< 120 Bytes)

Standard verbose JSON with long property names (`{"driverId": "...", "latitude": 11.0168...}`) wastes 70% of network packets on repeated keys. Over 10,000 drivers pinging every 4 seconds, this burns 2.5 GB of bandwidth per hour!

### Optimized Micro-Packet Format
```json
{
  "dId": "c0000001",
  "lat": 11.01684,
  "lng": 76.95582,
  "hd": 45,
  "sp": 32,
  "rId": "TN-4920",
  "ts": 1728000450
}
```
- Coordinates rounded to 5 decimal places (~1.1 meter accuracy, eliminating useless 8-digit GPS jitter noise).
- Heading (`hd`) sent as integer (0 - 359).
- Speed (`sp`) sent as integer km/h.
- Total payload size: **~94 bytes**.

---

## 2. Fast Ingestion Pipeline (Redis Geo + PostgreSQL Write-Behind)

Directly writing every 4-second ping from 5,000 drivers into PostgreSQL will exhaust disk IOPS on OCI Always Free within 10 minutes:

```
[ Driver Phone ] (4s Ping, 94 bytes)
       │
       ▼
[ Fastify WebSocket Gateway ]
       │
       ├──> 1. Redis GEOADD drivers:geo:online <lng> <lat> <driverId>  (< 1ms)
       ├──> 2. Redis PUBLISH ride:tracking:<rideId> (Passenger HUD)     (< 1ms)
       │
       └──> 3. Memory Write-Behind Buffer (Map<driverId, coords>)
                   │
                   ▼ (Batched Flush Every 15 Seconds)
             [ PostgreSQL PostGIS ] (Low IOPS, batch update)
```

### Server-Side Batch Update Implementation
```typescript
// Buffer holds latest coordinate per driver
const pendingDbUpdates = new Map<string, { lat: number; lng: number; heading: number }>();

setInterval(async () => {
  if (pendingDbUpdates.size === 0) return;
  const entries = Array.from(pendingDbUpdates.entries());
  pendingDbUpdates.clear();

  // Single bulk unnest query instead of thousands of individual UPDATEs
  await query(`
    UPDATE drivers AS d
    SET current_location = ST_SetSRID(ST_MakePoint(u.lng, u.lat), 4326),
        heading = u.heading,
        last_ping_at = CURRENT_TIMESTAMP
    FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::float8[]) AS lng, unnest($3::float8[]) AS lat, unnest($4::int[]) AS heading) AS u
    WHERE d.id = u.id;
  `, [
    entries.map(e => e[0]),
    entries.map(e => e[1].lng),
    entries.map(e => e[1].lat),
    entries.map(e => e[1].heading)
  ]);
}, 15000);
```

---

## 3. Client-Side GPS Smoothing & Dead Reckoning

Budget phones (Redmi 9A, Vivo Y02) use inexpensive GPS sensors with high multipath reflection errors near tall buildings or under flyovers, causing the car icon to "jump" across parallel streets.

### The Linear Interpolation (Lerp) Rule
Never snap the vehicle icon directly to the newly received GPS point. Interpolate position smoothly across the 4-second interval:

```dart
// Flutter MapLibre animation controller
void updateVehiclePosition(LatLng newPos, double newBearing) {
  final startPos = currentMarkerPosition;
  final startBearing = currentMarkerBearing;

  _animationController.reset();
  _latAnimation = Tween<double>(begin: startPos.latitude, end: newPos.latitude).animate(_animationController);
  _lngAnimation = Tween<double>(begin: startPos.longitude, end: newPos.longitude).animate(_animationController);
  _bearingAnimation = Tween<double>(begin: startBearing, end: newBearing).animate(_animationController);

  _animationController.forward();
}
```

---

## 4. Network Drop & Offline Queue Drain (Store & Forward)

When driving through rural corridors (e.g., between Dindigul and Karur), 4G connection drops frequently:

1. **Local SQLite / Room Queue:** 
   - If WebSocket is disconnected, write location pings to local SQLite table `cached_telemetry(lat, lng, heading, speed, timestamp)`.
   - Cap local queue at 300 points (20 minutes of tracking).
2. **Batch Drain on Reconnect:**
   - Once WebSocket reconnects (`onOpen`), flush the queue in a single compact array message:
     `{"action":"DRAIN_QUEUE","batch":[[lat,lng,ts],...]}`.
   - Server marks historical trajectory for fare audit without recalculating real-time dispatch state.
