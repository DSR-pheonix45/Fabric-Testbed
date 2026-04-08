#!/bin/bash
set -e

# Set MinIO credentials
export MINIO_ROOT_USER="admin"
export MINIO_ROOT_PASSWORD="password123"

# Start Tailscale daemon
tailscaled & 
sleep 5

# Connect using environment variable auth key
tailscale up --authkey "$TAILSCALE_AUTHKEY" --hostname "worker-node-$HOSTNAME"

# Start MinIO server
minio server /data/minio --console-address ":9001" &

# Optional Node.js backend
if [ -f /opt/backend/index.js ]; then
    cd /opt/backend && node index.js
fi

# Keep container alive
tail -f /dev/null