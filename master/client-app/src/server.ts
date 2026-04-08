import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as Minio from 'minio';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { execSync } from 'child_process';
import * as promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom Metrics
const logicalStorageGauge = new promClient.Gauge({
    name: 'fabric_logical_storage_bytes',
    help: 'Total logical bytes of user data stored in the mesh',
    registers: [register]
});

const docsCountGauge = new promClient.Gauge({
    name: 'fabric_docs_total',
    help: 'Total number of documents recorded on the ledger',
    registers: [register]
});

const txLatencyHistogram = new promClient.Histogram({
    name: 'fabric_transaction_latency_seconds',
    help: 'Latency of Fabric ledger operations (invoke/query)',
    buckets: [0.1, 0.5, 1, 2, 5, 10],
    registers: [register]
});

dotenv.config({ path: path.resolve(__dirname, '../../config/master.env') });

const app = express();
const port = 3001;
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Minio Configuration
const minioClient = new Minio.Client({
    endPoint: '100.125.209.59',
    port: 12000,
    useSSL: false,
    accessKey: process.env.MINIO_USER || 'minioadmin',
    secretKey: process.env.MINIO_PASS || 'minioadmin'
});

const bucketName = 'fabric-docs';

const CA_FILE = '/etc/hyperledger/fabric/tls/orderer-ca.crt';

// Helper to run Fabric CLI Commands
function runFabricCLI(cmd: string) {
    const fullCmd = `docker exec -e CORE_PEER_LOCALMSPID=Org1MSP \
        -e CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/fabric/admin-msp \
        -e CORE_PEER_TLS_SERVERHOSTOVERRIDE=fabric-worker-1 \
        fabric-worker-1 peer chaincode ${cmd} \
        -o fabric-master:7050 --tls --cafile ${CA_FILE} -C mychannel -n documentCC`;
    
    console.log(`Executing CLI: ${fullCmd}`);
    const output = execSync(fullCmd).toString();
    return output;
}

// Routes
app.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
    try {
        if (!req.file) return res.status(400).send('No file uploaded.');
        
        const fileContent = req.file.buffer;
        const filename = req.file.originalname;
        const cid = crypto.createHash('sha256').update(fileContent as any).digest('hex');
        
        console.log(`Processing upload for ${filename} (CID: ${cid})`);

        // 1. Minio Upload
        const exists = await minioClient.bucketExists(bucketName);
        if (!exists) await minioClient.makeBucket(bucketName);
        
        await minioClient.putObject(bucketName, cid, fileContent);
        console.log('Stored in Minio.');

        // 2. Fabric Ledger Recording via CLI
        const timer = txLatencyHistogram.startTimer();
        const timestamp = new Date().toISOString();
        runFabricCLI(`invoke -c '{"function":"CreateDocument","Args":["${cid}","${filename}","fabric-worker-1","${timestamp}"]}'`);
        timer();
        console.log('Recorded in Fabric.');

        // Update Gauges
        logicalStorageGauge.inc(fileContent.length);

        res.json({ success: true, cid, filename });
    } catch (error: any) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/documents', async (req: Request, res: Response) => {
    try {
        const output = runFabricCLI(`query -c '{"function":"GetAllDocuments","Args":[]}'`);
        const docs = JSON.parse(output);
        const enrichedDocs = docs.map((doc: any) => ({
            ...doc,
            uploadId: doc.CID.substring(0, 8),
            fileHash: doc.CID,
            // Use dedicated port for Worker 1, but for Worker 2/3 we just show the primarily mapped ports
            minioUrl: `http://localhost:9000/${bucketName}/${doc.CID}` 
        }));
        res.json(enrichedDocs);
    } catch (error: any) {
        console.error('Fetch Docs Error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/workers', (req: Request, res: Response) => {
    res.json([
        { id: 'fabric-worker-1', name: 'Primary Peer Node', ip: '100.125.209.59', status: 'Online', storageUsed: '1.2GB', cpu: '12%', upTime: '48h', consoleUrl: 'http://localhost:9000' },
        { id: 'fabric-worker-2', name: 'Secondary Backup', ip: '100.99.192.14', status: 'Online', storageUsed: '0.8GB', cpu: '8%', upTime: '12h', consoleUrl: 'http://localhost:9001' },
        { id: 'fabric-worker-3', name: 'Tertiary Redundant', ip: '100.118.254.11', status: 'Online', storageUsed: '0.5GB', cpu: '5%', upTime: '10h', consoleUrl: 'http://localhost:9002' }
    ]);
});

app.get('/api/analytics', async (req: Request, res: Response) => {
    try {
        const output = runFabricCLI(`query -c '{"function":"GetAllDocuments","Args":[]}'`);
        const docs = JSON.parse(output);
        
        let totalBucketBytes = 0;
        const objectsList: any[] = [];
        const stream = minioClient.listObjectsV2(bucketName, '', true);
        
        await new Promise((resolve, reject) => {
            stream.on('data', (obj) => {
                objectsList.push(obj);
                totalBucketBytes += obj.size || 0;
            });
            stream.on('error', (err) => reject(err));
            stream.on('end', () => resolve(objectsList));
        });

        const uniqueCIDs = new Set(docs.map((d: any) => d.CID)).size;
        const totalDocsCount = docs.length;

        res.json({
            totalDocuments: totalDocsCount,
            totalBucketSize: `${(totalBucketBytes / 1024).toFixed(2)} KB`,
            deduplicationSavings: `${((totalDocsCount - uniqueCIDs) * 1024 / 1024).toFixed(2)} MB`, // Mocked savings logic
            efficiencyRatio: totalDocsCount > 0 ? (uniqueCIDs / totalDocsCount).toFixed(2) : "1.00",
            nodesActive: 1
        });
    } catch (error: any) {
        console.error('Analytics Error:', error);
        res.status(500).json({ error: error.message });
    }
});

async function initMetrics() {
    try {
        console.log('Initializing metrics...');
        const output = runFabricCLI(`query -c '{"function":"GetAllDocuments","Args":[]}'`);
        const docs = JSON.parse(output);
        docsCountGauge.set(docs.length);
        
        // Calculate total size from Minio
        let totalBytes = 0;
        const stream = minioClient.listObjectsV2(bucketName, '', true);
        for await (const obj of stream) {
            totalBytes += obj.size;
        }
        logicalStorageGauge.set(totalBytes);
        console.log(`Metrics initialized: ${docs.length} docs, ${totalBytes} bytes.`);
    } catch (err) {
        console.error('Failed to init metrics:', err);
    }
}

app.get('/metrics', async (req: Request, res: Response) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

app.listen(port, async () => {
    await initMetrics();
    console.log(`Server API listening at http://localhost:${port}`);
});
