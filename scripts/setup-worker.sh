#!/bin/bash

# setup-worker.sh
# Modular worker deployment script for Fabric distributed network

if [ -z "$1" ]; then
    echo "Usage: ./scripts/setup-worker.sh <WORKER_ID> [TAILSCALE_AUTHKEY]"
    echo "Example: ./scripts/setup-worker.sh fabric-worker-1 tskey-auth-..."
    exit 1
fi

WORKER_ID=$1
AUTHKEY=$2
REPO_ROOT=$(pwd)

echo "--- Initializing ${WORKER_ID} Setup ---"

# Step 1: Check Dependencies
if ! command -v docker &> /dev/null; then
    echo "Error: docker is not installed."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose is not installed."
    exit 1
fi

# Step 2: Ensure Network exists
docker network inspect fabric-mesh >/dev/null 2>&1 || \
    docker network create fabric-mesh

# Step 3: Navigate to worker directory
WORKER_DIR="${REPO_ROOT}/workers/${WORKER_ID}"
if [ ! -d "$WORKER_DIR" ]; then
    echo "Error: Worker directory ${WORKER_DIR} not found."
    exit 1
fi

cd "$WORKER_DIR"

# Step 4: Setup directories
mkdir -p tailscale/state storage/data storage/peer

# Step 5: Handle Environment
ENV_FILE="./config/worker.env"
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating default ${ENV_FILE}..."
    mkdir -p config
    cat <<EOF > "$ENV_FILE"
WORKER_ID=${WORKER_ID}
MINIO_USER=minioadmin
MINIO_PASS=minioadmin
MINIO_BUCKET=fabric-docs
FABRIC_MSP_ID=Org1MSP
FABRIC_PEER_ID=${WORKER_ID}
ORDERER_ADDRESS=fabric-master:7050
CORE_PEER_ADDRESS=${WORKER_ID}:7051
CORE_PEER_GOSSIP_EXTERNALENDPOINT=${WORKER_ID}:7051
CORE_PEER_GOSSIP_BOOTSTRAP=${WORKER_ID}:7051
MINIO_PROMETHEUS_AUTH_TYPE=public
EOF
fi

# Inject AuthKey if provided
if [ ! -z "$AUTHKEY" ]; then
    if grep -q "TAILSCALE_AUTHKEY" "$ENV_FILE"; then
        sed -i "s/TAILSCALE_AUTHKEY=.*/TAILSCALE_AUTHKEY=${AUTHKEY}/" "$ENV_FILE"
    else
        echo "TAILSCALE_AUTHKEY=${AUTHKEY}" >> "$ENV_FILE"
    fi
fi

# Step 6: Start Container
echo "Starting Docker Compose for ${WORKER_ID}..."
docker-compose up -d

echo "--- Setup Complete for ${WORKER_ID} ---"
echo "Check Tailscale logs: docker logs tailscale-sidecar"
echo "Login to Tailscale if needed (if no authkey provided)."
