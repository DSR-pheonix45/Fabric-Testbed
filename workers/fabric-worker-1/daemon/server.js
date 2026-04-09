const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const Minio = require("minio");

// Environment variables are provided by docker-compose env_file
const WORKER_ID = process.env.WORKER_ID || "fabric-worker-1";
const MINIO_BUCKET = process.env.MINIO_BUCKET || "fabric-docs";
const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "127.0.0.1";

const app = express();
app.use(express.json({ limit: "50mb" }));

// MinIO Client setup
const minioClient = new Minio.Client({
    endPoint: MINIO_ENDPOINT.split(":")[0],
    port: parseInt(MINIO_ENDPOINT.split(":")[1]) || 9000,
    useSSL: false,
    accessKey: process.env.MINIO_USER || "minioadmin",
    secretKey: process.env.MINIO_PASS || "minioadmin"
});

// Helper for CID (SHA256)
function getCid(data) {
    return crypto.createHash("sha256").update(data).digest("hex");
}

// Ensure Bucket exists
async function initBucket() {
    try {
        console.log(`[${WORKER_ID}] Connecting to MinIO at ${MINIO_ENDPOINT}...`);
        const exists = await minioClient.bucketExists(MINIO_BUCKET);
        if (!exists) {
            await minioClient.makeBucket(MINIO_BUCKET);
            console.log(`Bucket ${MINIO_BUCKET} created.`);
        } else {
            console.log(`Bucket ${MINIO_BUCKET} already exists.`);
        }
    } catch (err) {
        console.error("Error checking/creating bucket:", err);
    }
}

// Run init after a short delay to allow MinIO to start
setTimeout(initBucket, 5000);

// Mock Blockchain Validation
async function validateOnBlockchain(cid) {
    console.log(`[${WORKER_ID}] Validating CID ${cid} on Hyperledger Fabric...`);
    // PLUG: fabric-network SDK call would go here
    // const contract = network.getContract('documentCC');
    // const result = await contract.evaluateTransaction('queryDocument', cid);
    
    // Simulating validation
    return {
        status: "verified",
        onChain: true,
        timestamp: new Date().toISOString(),
        validationPeer: WORKER_ID
    };
}

// Storage Analytics
let uploadStats = {
    totalDocs: 0,
    totalBytes: 0,
    deduplicatedDocs: 0
};

app.get("/health", (req, res) => {
    res.json({ 
        worker: WORKER_ID, 
        status: "alive", 
        tailscale: "active",
        fabric: "connected"
    });
});

app.get("/analytics", (req, res) => {
    res.json({
        worker: WORKER_ID,
        stats: uploadStats,
        storageEfficiency: uploadStats.totalDocs > 0 
            ? ((uploadStats.deduplicatedDocs / (uploadStats.totalDocs + uploadStats.deduplicatedDocs)) * 100).toFixed(2) + "%" 
            : "0%"
    });
});

app.post("/upload", async (req, res) => {
    const { filename, content } = req.body;

    if (!filename || !content) {
        return res.status(400).json({ error: "missing fields" });
    }

    try {
        // Handle both raw text and base64
        const buffer = content.startsWith("data:") 
            ? Buffer.from(content.split(",")[1], "base64")
            : Buffer.from(content, "utf-8");
            
        const cid = getCid(buffer);

        // 1. Blockchain Validation (Transaction check)
        const blockchainStatus = await validateOnBlockchain(cid);

        // 2. Storage Efficiency Check (Deduplication)
        let isDuplicate = false;
        try {
            await minioClient.statObject(MINIO_BUCKET, cid);
            isDuplicate = true;
            uploadStats.deduplicatedDocs++;
            console.log(`[${WORKER_ID}] Deduplicated document: ${cid}`);
        } catch (e) {
            // Object doesn't exist, proceed to store
        }

        // 3. Store in MinIO (Distributed Cluster)
        if (!isDuplicate) {
            await minioClient.putObject(MINIO_BUCKET, cid, buffer);
            uploadStats.totalDocs++;
            uploadStats.totalBytes += buffer.length;
            console.log(`[${WORKER_ID}] Stored new document: ${cid}`);
        }

        res.json({
            worker: WORKER_ID,
            filename,
            cid,
            blockchain: blockchainStatus,
            storage: {
                status: isDuplicate ? "deduplicated" : "stored",
                bucket: MINIO_BUCKET
            }
        });
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ error: "internal error", details: err.message });
    }
});

app.listen(3000, () => {
    console.log(`[${WORKER_ID}] Worker Daemon running on :3000`);
});