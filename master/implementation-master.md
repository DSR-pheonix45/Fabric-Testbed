# Implementation Details - Master Control Plane

The Master node acts as the orchestration hub for the Fabric network and the primary gateway for the document storage portal.

## 1. Fabric Infrastructure
### Certificate Authority (CA)
- **Image**: `hyperledger/fabric-ca:1.5`
- **Role**: Manages identities for the entire organization (Org1).
- **Enrolled Identities**: `admin`, `fabric-orderer`, `fabric-worker-1`, `fabric-worker-2`, `fabric-worker-3`.

### Orderer
- **Type**: Raft (Solo-conensus on single-node master).
- **Communication**: TLS-secured on port 7050.
- **Genesis Block**: Generated via `configtxgen` using the `SampleAppOrdererGenesis` profile.

## 2. Management Application
### Backend Bridge (`client-app/src/server.ts`)
- **CLI-Direct Integration**: Uses `docker exec` to communicate with the ledger, bypassing unstable SDK layers.
- **Multi-Node Monitoring**: Polls status and metrics from all 3 workers simultaneously.
- **Object Orchestration**: Connects to the primary Minio node (Port 12000 API) to trigger the replication flow.

### Frontend Dashboard (`client-app/frontend/src/App.jsx`)
- **Real-time Analytics**: Displays deduplication efficiency and aggregated storage metrics.
- **Worker Status**: Live monitoring of peer health and Tailscale IP visibility.
- **Ledger Explorer**: Tabular view of document CIDs, upload IDs, and verified storage URLs.

## 3. Operations
- **Channel Management**: Created `mychannel` and managed the enrollment of 3 distributed peers.
- **Chaincode Lifecycle**: Deployed `documentCC` (Go) for document metadata registry.
