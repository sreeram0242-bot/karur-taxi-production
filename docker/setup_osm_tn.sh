#!/bin/bash
# ==============================================================================
# TAMIL NADU OSM EXTRACT & ROUTING PRE-PROCESSOR (ARM64 COMPATIBLE)
# Downloads Tamil Nadu extract (~120MB) and prepares OSRM & Photon data
# ==============================================================================

set -e

DATA_DIR="./osrm-data"
PHOTON_DIR="./photon-data"
mkdir -p "$DATA_DIR" "$PHOTON_DIR"

TN_OSM_URL="https://download.geofabrik.de/asia/india/southern-zone-latest.osm.pbf"
TN_PBF="$DATA_DIR/southern-zone-latest.osm.pbf"

echo "=== 1. Downloading Southern India (Tamil Nadu) OSM Extract ==="
if [ ! -f "$TN_PBF" ]; then
    wget -c "$TN_OSM_URL" -O "$TN_PBF"
else
    echo "OSM PBF file already exists. Skipping download."
fi

echo "=== 2. Building Multi-Level Dijkstra (MLD) Graph for Car Routing ==="
# Uses ARM64 compatible OSRM docker image
docker run -t -v "$(pwd)/$DATA_DIR:/data" ghcr.io/project-osrm/osrm-backend:latest \
    osrm-extract -p /opt/car.lua /data/southern-zone-latest.osm.pbf

docker run -t -v "$(pwd)/$DATA_DIR:/data" ghcr.io/project-osrm/osrm-backend:latest \
    osrm-partition /data/southern-zone-latest.osrm

docker run -t -v "$(pwd)/$DATA_DIR:/data" ghcr.io/project-osrm/osrm-backend:latest \
    osrm-customize /data/southern-zone-latest.osrm

echo "=== 3. Ready! Run: docker compose up -d ==="
