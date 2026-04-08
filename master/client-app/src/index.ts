import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Gateway, Wallets, X509Identity } from 'fabric-network';
import * as Minio from 'minio';
import * as crypto from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../../config/master.env') });

const minioClient = new Minio.Client({
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: process.env.MINIO_USER || 'minioadmin',
    secretKey: process.env.MINIO_PASS || 'minioadmin'
});

async function main() {
    console.log('--- Fabric Document Storage Orchestrator ---');
    
    // 1. Setup Wallet and Identity
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    const orgNAME = 'org1.example.com';
    const mspID = 'Org1MSP';
    const certPath = `/home/medhansh_k/fabric-master/crypto-config/peerOrganizations/${orgNAME}/users/Admin@${orgNAME}/msp/signcerts/Admin@${orgNAME}-cert.pem`;
    const keyPath = `/home/medhansh_k/fabric-master/crypto-config/peerOrganizations/${orgNAME}/users/Admin@${orgNAME}/msp/keystore/priv_sk`;
    
    const certificate = fs.readFileSync(certPath).toString();
    const privateKey = fs.readFileSync(keyPath).toString();
    
    const identity: X509Identity = {
        credentials: { certificate, privateKey },
        mspId: mspID,
        type: 'X.509',
    };
    
    await wallet.put('admin', identity);
    console.log('Admin identity loaded into wallet.');

    // 2. Connect to Fabric Gateway
    const ccpPath = path.resolve(__dirname, '../connection-profile.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    
    const gateway = new Gateway();
    try {
        console.log('Connecting to gateway...');
        await gateway.connect(ccp, {
            wallet,
            identity: 'admin',
            discovery: { enabled: false, asLocalhost: true }
        });
        console.log('Gateway connected.');

        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('documentCC');

        // 3. Prepare Sample Data
        const filename = 'efficiency_report.txt';
        const fileContent = 'Data: Efficiency is high. System is decentralized.';
        const cid = crypto.createHash('sha256').update(fileContent).digest('hex');
        const workerId = 'fabric-worker-1';

        // 4. Upload to Minio
        console.log(`Uploading ${filename} to Minio...`);
        const bucketName = 'fabric-docs';
        try {
            const exists = await minioClient.bucketExists(bucketName);
            if (!exists) {
                await minioClient.makeBucket(bucketName);
            }
            await minioClient.putObject(bucketName, cid, fileContent);
            console.log(`File stored in Minio with CID: ${cid}`);
        } catch (minioErr) {
            console.error('Minio Upload Failed:', minioErr);
            throw minioErr;
        }

        // 5. Record on Fabric Ledger
        console.log('Testing connection with evaluateTransaction (DocumentExists)...');
        try {
            const resultTest = await contract.evaluateTransaction('DocumentExists', 'test-cid');
            console.log(`Evaluate Success! Document Exists: ${resultTest.toString()}`);
        } catch (e: any) {
            console.error('Evaluate failed with full error:', e);
            if (e.responses) console.error('Peer Responses:', JSON.stringify(e.responses, null, 2));
        }

        console.log('Recording metadata on Fabric Ledger...');
        try {
            await contract.submitTransaction('CreateDocument', cid, filename, workerId, new Date().toISOString());
            console.log('Success! Document metadata recorded on blockchain.');
        } catch (submitErr) {
            console.error('Submit Transaction Failed:', submitErr);
            throw submitErr;
        }

    } catch (globalErr) {
        console.error('Global Error in main:', globalErr);
    } finally {
        gateway.disconnect();
    }
}

main().catch(err => {
    console.error('Critical Failure:', err);
});
