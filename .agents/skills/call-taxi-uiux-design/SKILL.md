---
name: call-taxi-uiux-design
description: UI/UX design specifications, high-sunlight contrast tokens, zero-literacy intuition, bilingual Tamil typography, 5-layer floating HUD, and ergonomic driver touch targets.
---

# 🎨 Call Taxi UI/UX Design System & Ergonomic Standards

> **Target Market:** Tamil Nadu Urban & Rural Passengers (All literacy levels) & Professional Drivers  
> **Environmental Challenge:** Direct Indian Tropical Sunlight (35°C - 42°C ambient, harsh screen glare)  
> **Device Context:** Low-end LCD & AMOLED screens with limited peak nits brightness  

---

## 1. High-Sunlight Tropical Color Palette

Under harsh midday sun on an Indian highway or city street, low-contrast pastels and subtle grays wash out completely. The UI must maintain an extreme contrast ratio (> 7:1 WCAG AAA):

| Token Name | Hex Code | High-Sunlight Purpose | Forbidden Usage |
| :--- | :--- | :--- | :--- |
| **Canvas Light** | `#FFFFFF` | Pure white background for consumer passenger app | Never use off-white/beige for light mode |
| **Canvas Dark / OLED** | `#000000` | Pure OLED black for driver duty screen (saves battery) | Never use dark gray `#1F2937` for driver duty |
| **Text Primary** | `#000000` / `#FFFFFF` | Maximum readable text contrast | Never use light gray text for prices or OTPs |
| **Action & Money Yellow** | `#FFC107` | Fares, cash amount, star ratings, START OTP highlight | Never use yellow for background text |
| **Danger & SOS Red** | `#EF4444` | SOS trigger, trip cancellation, decline buttons | Never use red for neutral information |
| **Navigation Blue** | `#2563EB` | Active route polylines, live moving vehicle icon | Never use faint light blue on maps |
| **Success & Online Green**| `#16A34A` | Pickup pin, "GO ONLINE" toggle, trip accept | Never use neon lime green that bleeds in sun |

---

## 2. Zero-Literacy Visual Affordances

Many passengers and elderly users in Tier-2/Tier-3 Tamil Nadu have limited formal literacy. The interface must communicate meaning through **shape, color, and iconic metaphors**:

1. **Vehicle Categorization via 3D Silhouettes:**
   - **Auto:** Prominent iconic 3-wheeler auto rickshaw silhouette + capacity badge (`3`).
   - **Mini:** Hatchback silhouette + capacity badge (`4`).
   - **Sedan:** Boot sedan silhouette + AC badge + capacity badge (`4`).
   - **SUV:** Large SUV silhouette + luggage icon + capacity badge (`6-7`).
2. **Voice-First Search Pill:**
   - All destination inputs must feature a prominent, pulsating black microphone icon (`#000000` background with `#FFC107` mic glyph).
   - Tapping mic triggers localized speech-to-text in Tamil (`ta-IN`) and English (`en-IN`).
3. **Mandatory 28px+ Bold Sizing:**
   - All critical numbers—Fare totals (`₹145`), START OTP digits (`4 8 2 1`), and Vehicle License Plates (`TN 38 BK 4920`)—must be **minimum 28px Extra-Bold**.
4. **START OTP Visual Blocks:**
   - Instead of a plain number string (`4821`), render 4 distinct rounded cards with thick 1.5px black borders so the passenger can hold their phone up to the driver from 2 meters away.

---

## 3. The 5-Layer Floating HUD Architecture (Passenger Screen)

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: Base Map (MapLibre Minimalist Raster PNG Tiles)    │
│          - Curved route polyline (#2563EB)                  │
│          - Vehicle marker with smooth heading rotation      │
│          - Origin (Green Halo) & Destination (Red Pin)      │
├─────────────────────────────────────────────────────────────┤
│ LAYER 2: Top Floating Capsule (Vehicle Details)             │
│          - Height: 52dp, Radius: 26dp                       │
│          - Left: Car icon / high-res silhouette             │
│          - Center: Make/Model & Category                    │
│          - Right: High-contrast license badge (TN 38 BK 4920│
├─────────────────────────────────────────────────────────────┤
│ LAYER 3: Floating Status Pill (Real-Time ETA Countdown)     │
│          - Height: 44dp, Radius: 22dp                       │
│          - Pulsing green dot + "Arriving in 3 Mins"         │
│          - Bilingual subtitle: "3 நிமிடங்களில் வந்துவிடுவார்"    │
├─────────────────────────────────────────────────────────────┤
│ LAYER 4: Driver Bottom Card (Identity & Masked Contact)     │
│          - Inset verified photo avatar (60x60dp)            │
│          - Driver Name & Languages ("தமிழ் / English")      │
│          - Total Rides count & Star rating (★ 4.94)         │
│          - Pulsating circular Call button (Masked Bridge)   │
│          - 4-Digit START OTP Blocks                         │
├─────────────────────────────────────────────────────────────┤
│ LAYER 5: Sticky Action Footer (Two Equal Buttons)           │
│          - Left: "Schedule Ride" (Neutral Grey #F3F4F6)     │
│          - Right: "Cancel Ride" (High-Visibility Red #EF4444│
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Driver App Ergonomic & Safety Standards

When driving at 50 km/h on Indian roads, a driver cannot look closely at tiny buttons:

1. **Giant Tactile "GO ONLINE" Toggle:**
   - Must be **96dp tall**, spanning the full width of the screen.
   - Offline State: Bright Green `#16A34A` ("GO ONLINE / ஆன்லைன் செல்").
   - Online State: Bright Red `#EF4444` ("GO OFFLINE / ஆஃப்லைன் செல்").
2. **15-Second Dispatch Flash Split Footer:**
   - **30% Left:** Red Decline (`#EF4444`).
   - **70% Right:** Green Accept (`#16A34A`).
   - The accept button is made 2.3x larger to match right-thumb ergonomic reach while the phone is mounted on the windshield/dashboard car mount.
3. **Physical Swipe-to-Complete Slider:**
   - Ending a ride must NEVER be a simple tap button (which triggers accidentally when hitting potholes or touching the steering wheel).
   - It must be a continuous **Swipe-to-Complete** thumb drag slider requiring deliberate motion.
