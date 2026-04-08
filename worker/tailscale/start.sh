#!/bin/sh
# Start Tailscale and authenticate
tailscaled --state=/var/lib/tailscale/tailscaled.state &
sleep 5
tailscale up --authkey=${TAILSCALE_AUTHKEY} --hostname=${WORKER_ID} --accept-routes
tailscale status
touch /tmp/tailscale-ready
wait
