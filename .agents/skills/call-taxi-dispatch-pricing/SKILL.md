---
name: call-taxi-dispatch-pricing
description: Production specifications for Karur Taxi & Tamil Nadu tariff engines, PostGIS spatial queries, Redis atomic dispatch locking, wallet balance triggers, and outstation round-trip doubling.
---

# ⚡ Karur Taxi (கரூர் டாக்ஸி): Dispatch, Tariff & Geospatial Engine Skill

> **Target Market:** Karur District & Central Tamil Nadu (Coimbatore, Trichy, Erode, Dindigul, Salem)  
> **Core Architecture:** PostgreSQL 16 + PostGIS 3.4, Redis 7 (In-Memory Pub/Sub & Spatial Caching)  
> **Business Logic:** Standard Karur Taxi Tariff, Round-Trip Thresholds, Commission Ledgers.

---

## 1. The 5 Cardinal Rules of Tamil Nadu Call Taxi Logistics

### Rule 1: The Outstation / Suburb Round-Trip Doubling Rule (> 10km)
- **Market Reality:** In Tier-2/Tier-3 Tamil Nadu cities, trips exceeding 10 km (e.g., Coimbatore to Pollachi, Madurai to Melur, Trichy to Thuvakudi) take drivers into rural pockets where return passenger demand is near zero. Drivers strictly refuse one-way fares due to unpaid "deadhead" return fuel costs.
- **The Engine Implementation:**
  - For any ride with `estimated_distance > 10.0 km`, the billable distance is automatically doubled (`distanceKm * 2`).
  - Base distance (e.g., first 1.8km or 2km) is subtracted once; remaining km is billed at the category's per-km rate.
  - The UI must display an explanatory badge: *"Round-trip rate applied for out-of-town distance (&gt;10km)"* / *"10 கி.மீ மேல் இருவழி கட்டணம் பொருந்தும்"*.

---

### Rule 2: Night Surcharge Window (10:00 PM to 06:00 AM IST)
- **Market Reality:** Drivers in Tamil Nadu expect a 25% surcharge for night duty.
- **The Gotcha:** Server clocks on cloud instances run in UTC. Calculating night hours using `new Date().getHours()` on a UTC server checks 10 PM UTC (3:30 AM IST) instead of IST!
- **The Fix:**
  - Always normalize timestamps to Indian Standard Time (UTC + 05:30):
    ```typescript
    const istHour = (utcDate.getUTCHours() + 5 + Math.floor((utcDate.getUTCMinutes() + 30) / 60)) % 24;
    const isNight = istHour >= 22 || istHour < 6;
    if (isNight) {
      subtotal = subtotal * 1.25; // 25% night multiplier
    }
    ```

---

### Rule 3: The PostGIS Coordinate Inversion Trap: `(lon, lat)` vs `(lat, lon)`
- **The Problem:** Mobile GPS and Google Maps represent coordinates as `(Latitude, Longitude)`. However, **PostGIS and OGC standards strictly require `(Longitude, Latitude)`** (X = Lon, Y = Lat):
  - Correct: `ST_MakePoint(longitude, latitude)`
  - Correct: `ST_SetSRID(ST_MakePoint(76.9558, 11.0168), 4326)`
- Inverting these causes queries to search somewhere in Antarctica or the Indian Ocean, returning 0 drivers!
- **The Permanent Fix:** Always name function parameters `p_lon` and `p_lat` explicitly to prevent inversion bugs.

---

### Rule 4: Atomic 15-Second Redis Dispatch Lock & Race Condition Prevention
- **The Problem:** If two passengers book simultaneously near the same driver, the system must not send overlapping dispatch modals to the driver or double-assign them.
- **The Fix:**
  - Use Redis atomic lock with `NX` and a 15-second expiration:
    ```typescript
    const lockKey = `driver:lock:${driverId}`;
    const acquired = await redis.set(lockKey, rideId, 'EX', 15, 'NX');
    if (acquired !== 'OK') {
      // Driver is currently reviewing another dispatch or busy. Skip to next candidate!
    }
    ```
  - When the driver taps "DECLINE", immediately delete `driver:lock:${driverId}` so they can receive other bookings without waiting out the 15 seconds.

---

### Rule 5: Driver Wallet Lock at -₹300.00
- **Market Reality:** On cash rides, drivers collect 100% of the fare directly from the passenger. The platform commission (typically 10%) is deducted from the driver's platform wallet.
- If a driver collects cash continuously without recharging, their wallet balance goes negative.
- **The Hard Limit:**
  - When `wallet_balance < -300.00`, the driver is automatically locked from receiving any new dispatch flashes.
  - A database trigger enforces this constraint:
    ```sql
    IF NEW.wallet_balance < -300.00 THEN
        NEW.is_wallet_locked := TRUE;
    END IF;
    ```
  - The driver app immediately switches the duty button to a yellow banner: *"Recharge via UPI to Go Online"*.

---

## 2. Standard Tamil Nadu Tariff Reference Matrix

| Category | Base Fare | Base Km Included | Per Km Rate | Night Multiplier (10 PM - 6 AM) | Round-Trip Threshold | Platform Fee |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Auto (3-Seater)** | ₹40.00 | 1.8 km | ₹14.00 / km | 1.25x (+25%) | > 10.0 km | 10% |
| **Mini AC (4-Seater)** | ₹60.00 | 2.0 km | ₹16.00 / km | 1.25x (+25%) | > 10.0 km | 10% |
| **Sedan Tour (Dzire/Etios)**| ₹80.00 | 2.0 km | ₹18.00 / km | 1.25x (+25%) | > 10.0 km | 10% |
| **SUV XL (Innova/Ertiga)** | ₹120.00 | 3.0 km | ₹24.00 / km | 1.25x (+25%) | > 12.0 km | 12% |

---

## 3. High-Speed Driver Matching SQL Pattern
Always filter drivers with the 30-second ping freshness threshold:
```sql
SELECT d.id, u.full_name, ST_Distance(d.current_location::geography, ST_SetSRID(ST_MakePoint($lon, $lat), 4326)::geography) AS dist_meters
FROM drivers d
JOIN users u ON d.user_id = u.id
JOIN vehicles v ON v.driver_id = d.id
WHERE d.status = 'online'
  AND d.is_wallet_locked = FALSE
  AND v.category = $category
  AND d.last_ping_at >= CURRENT_TIMESTAMP - INTERVAL '30 seconds'
  AND ST_DWithin(d.current_location::geography, ST_SetSRID(ST_MakePoint($lon, $lat), 4326)::geography, 5000)
ORDER BY dist_meters ASC
LIMIT 10;
```
