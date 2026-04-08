#!/bin/bash
CID=$1
FILENAME=$2
WORKER_ID=$3
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ -z "$CID" ] || [ -z "$FILENAME" ] || [ -z "$WORKER_ID" ]; then
    echo "Usage: $0 <CID> <FILENAME> <WORKER_ID>"
    exit 1
fi

docker exec -e CORE_PEER_LOCALMSPID=Org1MSP \
    -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/admin-msp \
    -e CORE_PEER_TLS_SERVERHOSTOVERRIDE=fabric-worker-1 \
    fabric-peer peer chaincode invoke \
    -o fabric-master:7050 --tls --cafile /etc/hyperledger/fabric/tls/orderer-ca.crt \
    -C mychannel -n documentCC \
    -c '{"function":"CreateDocument","Args":["'"$CID"'","'"$FILENAME"'","'"$WORKER_ID"'","'"$TIMESTAMP"'"]}'
