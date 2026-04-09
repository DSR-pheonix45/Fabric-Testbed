# Worker Node Deployment Instructions

This guide is designed for setting up a Hyperledger Fabric worker node on this machine. If you are using an AI assistant (like VS Code Copilot), you can paste these instructions to help it automate the setup.

## Prerequisites
- **Docker** and **Docker Compose** must be installed.
- **Tailscale** should be installed or run via the included sidecar container.

## Setup Steps

1.  **Clone the Repository**:
    ```bash
    git clone <YOUR_REPO_URL>
    cd fabric-master
    ```

2.  **Run the Setup Script**:
    Replace `fabric-worker-N` with your assigned worker ID (e.g., `fabric-worker-1`).
    ```bash
    ./scripts/setup-worker.sh fabric-worker-1
    ```

3.  **Authenticate Tailscale**:
    -   If the script is running, check the logs for the Tailscale login URL:
        ```bash
        docker logs tailscale-sidecar
        ```
    -   Visit the URL in a browser and authenticate.
    -   Once authenticated, the node will get a `100.x.x.x` IP.

4.  **Confirm to Master**:
    -   Run `tailscale ip -4` on this machine (or check the Tailscale dashboard).
    -   Provide this IP back to the master laptop to complete the network synchronization.

## Expected Services
Once running, the following services will be available on the worker's Tailscale IP:
- **Minio API**: Port `12000`
- **Minio Console**: Port `9000`
- **Fabric Peer**: Port `7051`

---
*Note: This worker node is part of a distributed document storage system. Files uploaded via the master laptop will be replicated to the Minio instance on this machine.*
