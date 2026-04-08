#!/bin/bash

# Configuration
CA_CONTAINER="fabric-ca"
CA_ADMIN="admin"
CA_PASS="adminpw"
ORDERER_NAME="fabric-orderer"
ORDERER_MSP_DIR="./crypto/orderer/msp"
ORDERER_TLS_DIR="./crypto/orderer/tls"
GENESIS_BLOCK="./config/genesis.block"

echo "### 1. Starting Fabric CA..."
docker-compose up -d fabric-ca tailscale

echo "### Waiting for CA to be ready..."
sleep 5

echo "### 2. Enrolling Admin..."
docker exec $CA_CONTAINER fabric-ca-client enroll -u http://$CA_ADMIN:$CA_PASS@localhost:7054 --caname ca-master --mspdir /etc/hyperledger/fabric-ca-server/admin/msp

echo "### 3. Registering and Enrolling Orderer (Identity)..."
docker exec $CA_CONTAINER fabric-ca-client register --caname ca-master --id.name $ORDERER_NAME --id.secret ordererpw --id.type orderer -u http://localhost:7054
docker exec $CA_CONTAINER fabric-ca-client enroll -u http://$ORDERER_NAME:ordererpw@localhost:7054 --caname ca-master --mspdir /etc/hyperledger/fabric-ca-server/orderer/msp

echo "### 4. Enrolling Orderer (TLS)..."
docker exec $CA_CONTAINER fabric-ca-client enroll -u http://$ORDERER_NAME:ordererpw@localhost:7054 --caname ca-master --mspdir /etc/hyperledger/fabric-ca-server/orderer/tls --enrollment.profile tls

echo "### 5. Structuring Crypto Material..."
mkdir -p $ORDERER_MSP_DIR $ORDERER_TLS_DIR

# Copy MSP from container
docker cp $CA_CONTAINER:/etc/hyperledger/fabric-ca-server/orderer/msp/. $ORDERER_MSP_DIR/

# Copy TLS from container and rename for consistency
docker cp $CA_CONTAINER:/etc/hyperledger/fabric-ca-server/orderer/tls/signcerts/. $ORDERER_TLS_DIR/
mv $ORDERER_TLS_DIR/*.pem $ORDERER_TLS_DIR/server.crt
# For the key, we need to find the specific filename in keystore
KEY_FILE=$(docker exec $CA_CONTAINER ls /etc/hyperledger/fabric-ca-server/orderer/tls/keystore | head -n 1)
docker cp $CA_CONTAINER:/etc/hyperledger/fabric-ca-server/orderer/tls/keystore/$KEY_FILE $ORDERER_TLS_DIR/server.key

echo "### Setup complete. Next: Generate genesis block."
