# Implementation Details - Distributed Worker Nodes

The Worker nodes provide the decentralized storage and ledger foundation for the system.

## 1. Containerized Stack
Each worker runs a 3-service stack:
- **Tailscale Sidecar**: Establishes the secure mesh connection and provides a stable 100.x.x.x IP.
- **Fabric Peer**: Stores the ledger copy and validates storage transactions.
- **Minio Instance**: Handles high-performance object storage for the actual document files.

## 2. Networking & Ports
To host 3 workers on a single host, a secondary port mapping strategy was used:

| Service | Worker 1 | Worker 2 | Worker 3 |
|---------|----------|----------|----------|
| Peer gRPC | 7051 | 8051 | 9051 |
| Minio API | 12000 | 12001 | 12002 |
| Minio Console | **9000** | **9001** | **9002** |

## 3. Data Replication (Mirroring)
The "Distributed Mesh" experience is achieved via **Real-time Mirroring**:
- **Tool**: `mc` (Minio Client) pre-installed in the worker containers.
- **Configuration**: Background `mc mirror --watch` processes run on the primary node. 
- **Effect**: Any document uploaded to Site 1 is instantly propagated to Site 2 and Site 3, ensuring full data redundancy.

## 4. Ledger Synchronization
All three peers (`fabric-worker-1`, `fabric-worker-2`, `fabric-worker-3`) are joined to the application channel. 
- **Consensus**: All nodes reach agreement on document existence before UI confirmation.
- **Identity**: Secured using x509 certificates issued by the Master CA.
