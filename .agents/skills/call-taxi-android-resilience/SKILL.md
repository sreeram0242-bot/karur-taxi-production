---
name: call-taxi-android-resilience
description: Deep technical rules, Low Memory Killer (LMK) survival strategies, foreground service architecture, audio alarm ringtone overrides, and memory leak prevention for 2GB RAM budget Android devices in Indian logistics.
---

# 📱 Android Low-End Device Resilience & Background GPS Skill

> **Target Devices:** Ultra-budget Android phones (Xiaomi Redmi 9A/10A, Vivo Y02/Y16, Realme C-series, Samsung Galaxy M04)  
> **Hardware Constraints:** 2GB RAM, MediaTek Helio G25/G35, Aggressive OEM Battery Killers, Low Storage.  
> **Core Objective:** Zero background service kills, 100% dispatch delivery, zero memory freezes.

---

## 1. The 6 Deadly Traps on Budget Indian Android Devices

### ❌ Trap 1: Assuming `startForegroundService()` Survives Screen-Off
- **What Happens:** On stock Android, a foreground service with a persistent notification survives. On Xiaomi (MIUI/HyperOS) and Vivo (FuntouchOS), the OS puts CPU cores into deep sleep within 3 to 5 minutes of turning off the screen, stopping all GPS pings and WebSocket loops.
- **The Permanent Fix:**
  1. Hold a `PowerManager.PARTIAL_WAKE_LOCK` with `setReferenceCounted(false)`.
  2. Request `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` during initial driver onboarding.
  3. Fire explicit manufacturer intents to the ROM's "Autostart" and "Background Power Consumption" manager.

---

### ❌ Trap 2: Memory Churn Inside 4-Second Location Callbacks
- **What Happens:** Allocating new JSON objects, string formatters, or HTTP request builders inside `onLocationResult` creates hundreds of temporary objects every minute. On a 2GB RAM device, this triggers frequent Garbage Collection (GC) pauses (Stop-The-World), freezing the driver's UI during navigation.
- **The Permanent Fix:**
  - Reuse static `JSONObject` instances or format raw strings directly:
    ```kotlin
    val packet = "{\"dId\":\"$driverId\",\"lat\":$lat,\"lng\":$lng,\"hd\":$heading,\"sp\":$speed,\"ts\":$now}"
    webSocket?.send(packet)
    ```
  - Never instantiate new `SimpleDateFormat` or date formatters in the ping loop.

---

### ❌ Trap 3: Vector Tile Memory Blowups on Osmdroid / MapView
- **What Happens:** Vector map tiles require real-time client-side tessellation and GPU vertex shaders. On budget PowerVR or Mali-G52 GPUs with shared 2GB RAM, vector maps leak OpenGL memory and crash with `OutOfMemoryError (OOM)`.
- **The Permanent Fix:**
  - **Always serve lightweight 256x256 Raster PNG tiles** to budget driver apps.
  - Set Osmdroid tile cache limits:
    ```kotlin
    Configuration.getInstance().cacheMapTileCount = 12.toShort()
    Configuration.getInstance().tileFileSystemCacheMaxBytes = 50L * 1024 * 1024 // 50MB max
    ```

---

### ❌ Trap 4: Silent Mode Blocking the 15-Second Dispatch Flash
- **What Happens:** If a driver keeps their phone on "Vibrate" or "Silent", standard notification ringtones make no sound, causing the driver to miss the 15-second dispatch window.
- **The Permanent Fix:**
  - Play the dispatch alert using `AudioAttributes.USAGE_ALARM` or `USAGE_NOTIFICATION_RINGTONE`. In Android, the Alarm audio stream overrides silent mode.
  - Turn the phone screen ON even when locked:
    ```kotlin
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        setShowWhenLocked(true)
        setTurnScreenOn(true)
    } else {
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )
    }
    ```

---

### ❌ Trap 5: Service Destroyed by User Swiping App from Recents
- **What Happens:** When a driver clears recent apps, Android invokes `onTaskRemoved()`. Default services are killed.
- **The Permanent Fix:**
  - Override `onTaskRemoved()` in `DriverLocationService`:
    ```kotlin
    override fun onTaskRemoved(rootIntent: Intent?) {
        val restartServiceIntent = Intent(applicationContext, DriverLocationService::class.java).also {
            it.setPackage(packageName)
            it.action = ACTION_START
        }
        val restartPendingIntent = PendingIntent.getService(
            this, 1, restartServiceIntent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )
        val alarmService = getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmService.set(
            AlarmManager.ELAPSED_REALTIME,
            SystemClock.elapsedRealtime() + 1000,
            restartPendingIntent
        )
        super.onTaskRemoved(rootIntent)
    }
    ```

---

### ❌ Trap 6: Proguard / R8 Stripping Network Models
- **What Happens:** Enabling `minifyEnabled true` without keep-rules strips WebSocket listeners or reflection-based JSON serializers, causing release APKs to fail silently while debug APKs work.
- **The Permanent Fix:**
  - Preserve OkHttp and Osmdroid classes in `proguard-rules.pro`.

---

## 2. Low-Literacy Driver UI Guidelines

1. **Pure OLED Black (#000000):** Maximizes sunlight readability and saves battery on OLED/LCD displays.
2. **One Primary Action Per Screen:** Never confuse the driver with multiple small buttons:
   - When offline: Giant green **"GO ONLINE"** button (96dp height).
   - When booking arrives: Split 30% Red **"DECLINE"** / 70% Green **"ACCEPT RIDE"**.
   - At pickup: Prominent **"ARRIVED"** button.
   - Starting ride: Numeric 4-digit keypad for passenger PIN.
   - Ending ride: Physical **"Swipe-to-Complete"** slider to prevent accidental taps while steering.
3. **No Hidden Menus:** All essential metrics (Today's Earnings, Wallet Balance, Trip Count) must be visible on the home screen in **24px+ Bold**.
