---
name: call-taxi-deployment
description: Master production deployment guide, ARM64 tuning, OCI firewall bypass rules, zero-cost cloud setup, and mobile release checklists for Tamil Nadu Call Taxi. Use whenever deploying to OCI, setting up Docker microservices, or generating release APKs.
---

# 🚀 Karur Taxi (கரூர் டாக்ஸி): Production Deployment & Cloud Ops Skill

> **Target Environment:** Oracle Cloud Infrastructure (OCI) Always Free Tier (Ampere A1 ARM64)  
> **Host Capacity:** 4 OCPU, 24GB RAM, 200GB NVMe Block Storage, 10TB Free Egress  
> **Production Stack:** PostgreSQL 16 + PostGIS 3.4, Redis 7, Fastify Node.js/TypeScript, OSRM (ARM64), Photon Geocoder, Caddy 2 (Auto SSL).

---

## 1. Top 8 Critical Deployment Gotchas (Never Forget)

### ⚠️ Gotcha 1: The OCI OS-Level Firewall Trap (Port 80/443 Blocked)
- **The Problem:** Opening ports 80, 443, and 8080 in the OCI Web Console VCN Security List is **not enough**. Default OCI images (both Ubuntu and Oracle Linux) ship with strict internal `iptables` / `firewalld` rules that drop all incoming traffic on ports 80/443.
- **The Fix:** Run these commands immediately on instance boot:
  ```bash
  # For Ubuntu Instances:
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8080 -j ACCEPT
  sudo netfilter-persistent save

  # For Oracle Linux (RHEL) Instances:
  sudo firewall-cmd --permanent --zone=public --add-service=http
  sudo firewall-cmd --permanent --zone=public --add-service=https
  sudo firewall-cmd --permanent --zone=public --add-port=8080/tcp
  sudo firewall-cmd --reload
  ```

---

### ⚠️ Gotcha 2: ARM64 Native Docker Architectures
- **The Problem:** Compiling x86_64 binaries or pulling x86-only Docker images on an Ampere A1 instance causes `exec format error` or severe emulation slowdown.
- **The Fix:** 
  - Always verify multi-arch images (`arm64` / `aarch64`).
  - OSRM Backend must use: `ghcr.io/project-osrm/osrm-backend:latest` (native ARM64).
  - PostGIS must use: `postgis/postgis:16-3.4` (arm64v8 official).
  - Node.js Dockerfiles must use `FROM node:20-alpine` (multi-arch native).

---

### ⚠️ Gotcha 3: OSRM Memory Allocation & Pre-Processing
- **The Problem:** Running `osrm-extract` and `osrm-partition` on the entire India PBF (~1.5GB) can crash or take hours.
- **The Fix:**
  - Strictly use the **Southern Zone extract** or **Tamil Nadu extract** from Geofabrik (~120MB).
  - Pre-processing takes under 4 minutes on 4 Ampere OCPUs and uses ~3.5GB RAM.
  - Run the automated script: `bash docker/setup_osm_tn.sh`.

---

### ⚠️ Gotcha 4: Cloudflare Proxy (Orange Cloud) vs WebSocket Timeouts
- **The Problem:** If routing through Cloudflare CDN with proxy enabled (Orange Cloud), Cloudflare drops idle WebSockets after 100 seconds without warning.
- **The Fix:**
  - Our driver location ping runs every 4 seconds.
  - Keep OkHttp ping interval set to 15 seconds (`.pingInterval(15, TimeUnit.SECONDS)`).
  - For lowest latency, use Cloudflare as **DNS Only (Grey Cloud)** for `api.karurtaxi.com`.

---

### ⚠️ Gotcha 5: PostGIS 24GB Memory Optimization on OCI
- **The Problem:** Default PostgreSQL installs only allocate 128MB shared buffers, making spatial `ST_DWithin` queries crawl under load.
- **The Fix:**
  - Configure PostgreSQL inside `docker-compose.yml`:
    ```
    -c shared_buffers=4GB
    -c effective_cache_size=12GB
    -c work_mem=64MB
    -c maintenance_work_mem=512MB
    -c random_page_cost=1.1
    ```

---

### ⚠️ Gotcha 6: Telecom Voice Bridge IP Whitelisting (Edesy / Twilio)
- **The Problem:** Voice API gateways (Edesy `voice-api.edesy.in`) block API requests if your production server IP is dynamic or unverified.
- **The Fix:**
  - Assign a **Reserved Public IP** (Free on OCI) to your instance so the IP never changes across reboots.
  - In the Edesy dashboard, whitelist your OCI Reserved IP under API Security.

---

### ⚠️ Gotcha 7: Driver App Proguard Stripping & APK Size (< 15MB)
- **The Problem:** R8/Proguard code shrinking can strip reflection-based JSON adapters in OkHttp or Osmdroid native libraries, causing silent crashes on physical phones.
- **The Fix:**
  - Add to `proguard-rules.pro`:
    ```proguard
    -keep class okhttp3.** { *; }
    -keep interface okhttp3.** { *; }
    -dontwarn okhttp3.**
    -keep class org.osmdroid.** { *; }
    -keep class com.karurtaxi.driver.service.** { *; }
    ```

---

### ⚠️ Gotcha 8: Flutter App APK Optimization for 2GB Budget Devices
- **The Problem:** A universal Flutter APK is ~35MB+, which fills budget phone storage and causes low-memory installs to fail.
- **The Fix:**
  - Always build with ABI splits:
    ```bash
    flutter build apk --release --split-per-abi --obfuscate --split-debug-info=./build/symbols
    ```
  - This outputs an `app-arm64-v8a-release.apk` of only ~11MB to 14MB!

---

## 2. Step-by-Step Production Deployment Playbook

### Step 1: Provision OCI Ampere A1 (Always Free)
1. Go to **Oracle Cloud Console** $\rightarrow$ **Compute Instances** $\rightarrow$ **Create Instance**.
2. **Image:** Ubuntu 22.04 LTS or 24.04 LTS (Minimal).
3. **Shape:** Ampere VM.Standard.A1.Flex:
   - OCPU: `4`
   - Memory: `24 GB`
4. **Networking:** 
   - Assign a Public IP.
   - Convert to **Reserved Public IP** under Networking $\rightarrow$ IP Management.
5. **Boot Volume:** 200 GB (Always Free limit).

---

### Step 2: Open OCI Security List & OS Ports
In OCI Virtual Cloud Network (VCN) $\rightarrow$ Default Security List $\rightarrow$ Ingress Rules:
- Port `80` (HTTP) $\rightarrow$ `0.0.0.0/0`
- Port `443` (HTTPS) $\rightarrow$ `0.0.0.0/0`
- Port `8080` (Fastify API/WS) $\rightarrow$ `0.0.0.0/0`

Then run on the server:
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8080 -j ACCEPT
sudo netfilter-persistent save
```

---

### Step 3: Install Docker & Compose (ARM64)
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

---

### Step 4: Clone Repo & Build OSM Routing Graph
```bash
git clone <your-repo-url> /opt/calltaxi
cd /opt/calltaxi

# 1. Download Southern Zone OSM & build OSRM graph
chmod +x docker/setup_osm_tn.sh
./docker/setup_osm_tn.sh
```

---

### Step 5: Configure Production `.env`
Create `/opt/calltaxi/backend/.env`:
```env
PORT=8080
HOST=0.0.0.0
DATABASE_URL=postgresql://postgres:postgres_secure_pwd@postgres:5432/calltaxi_db
REDIS_URL=redis://redis:6379
OSRM_URL=http://osrm:5000
PHOTON_URL=http://photon:2322
NODE_ENV=production
EDEST_API_KEY=vp_your_actual_edesy_token
FCM_SERVER_KEY=your_fcm_production_key
```

Update `/opt/calltaxi/docker/Caddyfile` with your actual live domain:
```caddy
api.yourdomain.com {
    reverse_proxy backend:8080
    encode zstd gzip
}
```

---

### Step 6: Launch Entire Microservices Stack
```bash
docker compose up -d --build
```

Verify all containers are healthy:
```bash
docker compose ps
curl http://localhost:8080/health
```
Expected output:
```json
{"status":"UP","uptime":12.4,"region":"Tamil Nadu (OCI ARM64)"}
```

---

## 3. Mobile Production Build Commands

### Passenger App (Flutter)
```bash
cd passenger_app
flutter clean
flutter pub get
flutter build apk --release --split-per-abi
```
Release outputs located in: `build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`.

### Driver App (Native Kotlin Android)
```bash
cd driver_app
./gradlew bundleRelease  # For Google Play AAB
./gradlew assembleRelease # For Direct APK Download
```
Release output located in: `app/build/outputs/apk/release/app-release.apk`.

---

## 4. Post-Deployment Verification Checklist

- [ ] `curl -I https://api.yourdomain.com/health` returns `HTTP 200 OK` with valid Let's Encrypt SSL.
- [ ] Connect WebSocket `wss://api.yourdomain.com/ws/driver/location` using Postman / wscat and send test ping `{"dId":"c0000001-...","lat":11.0168,"lng":76.9558,"hd":45,"sp":0,"ts":1728000000}`.
- [ ] Test OSRM routing: `curl "http://localhost:5000/route/v1/driving/76.9558,11.0168;76.9640,11.0225"` returns valid JSON geometry and duration.
- [ ] Log in to Admin Dashboard $\rightarrow$ God's Eye Map displays active vehicles in Coimbatore.
- [ ] Run a test dispatch from the Manual Dispatch Desk; verify nearest driver gets assigned.
