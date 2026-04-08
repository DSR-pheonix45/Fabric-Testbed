#!/bin/bash
set -e

# Start Tailscale
tailscaled & 
sleep 5
tailscale up --authkey "$TAILSCALE_AUTHKEY" --hostname "control-plane-$HOSTNAME"

# Start Fabric CA + Orderer (example scripts)
# ./fabric/start-orderer.sh
# ./fabric/start-ca.sh

# Start Node.js backend for file uploads
cd /opt/backend && npm install && node index.js