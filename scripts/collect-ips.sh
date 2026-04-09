#!/bin/bash

# collect-ips.sh
# Master discovery script to gather Tailscale IPs of all workers

echo "--- Discovery: Tailscale IPs of Workers ---"

# Check if tailscale is installed
if ! command -v tailscale &> /dev/null; then
    echo "Error: tailscale CLI not found on this machine."
    exit 1
fi

# Get status in JSON and parse with jq if available, else use grep
if command -v jq &> /dev/null; then
    tailscale status --json | jq -r '.Peer[] | select(.HostName | startswith("fabric-worker-")) | "\(.HostName): \(.TailscaleIPs[0])"'
else
    # Fallback to grep/awk if jq is not present
    tailscale status | grep "fabric-worker-" | awk '{print $2 " " $1}' | sed 's/ /: /'
fi

echo "----------------------------------------"
echo "Copy these IPs into your master.env for final sync."
