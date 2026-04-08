#!/bin/bash

# Configuration
UNIFIED_ROOT="/home/medhansh_k/Fabric-Testbed-Unified"
MASTER_SRC="/home/medhansh_k/fabric-master"
WORKER_SRC="/home/medhansh_k/fabric-worker"

echo "### Syncing Master..."
rsync -av --exclude='.git' --exclude='node_modules' --exclude='storage' --exclude='tailscale/state' "$MASTER_SRC/" "$UNIFIED_ROOT/master/"

echo "### Syncing Worker..."
rsync -av --exclude='.git' --exclude='node_modules' --exclude='storage' --exclude='tailscale/state' "$WORKER_SRC/" "$UNIFIED_ROOT/worker/"

echo "### Pushing to GitHub..."
cd "$UNIFIED_ROOT"
git add .
git commit -m "Sync: Latest changes from local development folders"
git push origin main

echo "### Sync Complete!"
