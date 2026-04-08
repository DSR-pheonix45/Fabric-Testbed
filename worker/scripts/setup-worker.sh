#!/bin/bash

# Configuration
MASTER_CA_URL="http://fabric-master:7054"
WORKER_ID="fabric-worker-1"
WORKER_PASS="workerpw"
MSP_DIR="/home/medhansh_k/fabric-worker/config/msp"
TLS_DIR="/home/medhansh_k/fabric-worker/config/tls"

echo "### 1. Clearing and creating directory structure..."
rm -rf $MSP_DIR $TLS_DIR
mkdir -p $MSP_DIR $TLS_DIR

echo "### 2. Enrolling Worker Peer (Identity)..."
docker exec fabric-ca fabric-ca-client enroll -u http://$WORKER_ID:$WORKER_PASS@localhost:7054     --caname ca-master --mspdir /etc/hyperledger/fabric-ca-server/worker-msp
sudo docker cp fabric-ca:/etc/hyperledger/fabric-ca-server/worker-msp/. $MSP_DIR/
sudo chown -R $(id -u):$(id -g) $MSP_DIR
mkdir -p $MSP_DIR/admincerts
cp $MSP_DIR/signcerts/*.pem $MSP_DIR/admincerts/

echo "### 3. Enrolling Worker Peer (TLS)..."
docker exec fabric-ca fabric-ca-client enroll -u http://$WORKER_ID:$WORKER_PASS@localhost:7054     --caname ca-master --mspdir /etc/hyperledger/fabric-ca-server/worker-tls --enrollment.profile tls
sudo docker cp fabric-ca:/etc/hyperledger/fabric-ca-server/worker-tls/. $TLS_DIR/
sudo chown -R $(id -u):$(id -g) $TLS_DIR

echo "### 4. Structuring TLS material..."
mv $TLS_DIR/signcerts/*.pem $TLS_DIR/server.crt
KEY_FILE=$(ls $TLS_DIR/keystore | head -n 1)
mv $TLS_DIR/keystore/$KEY_FILE $TLS_DIR/server.key
cp $TLS_DIR/tlscacerts/*.pem $TLS_DIR/ca.crt

echo "### 5. Fetching CA Root cert (for all TLS verification)..."
cp /home/medhansh_k/fabric-master/crypto/ca/ca-cert.pem /home/medhansh_k/fabric-worker/config/fabric-ca.crt

echo "### Worker setup complete."
