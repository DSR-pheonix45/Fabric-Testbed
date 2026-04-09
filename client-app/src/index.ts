import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { Gateway, Wallets, X509Identity } from 'fabric-network';
import * as Minio from 'minio';
import * as crypto from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../../config/master.env') });

const minioClient = new Minio.Client({
    endPoint: process.env.MINIO_HOST || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: false,
    accessKey: process.env.MINIO_USER || 'minioadmin',
    secretKey: process.env.MINIO_PASS || 'minioadmin'
});

async function main() {
    console.log('--- Fabric Document Storage Orchestrator ---');
    
    // 1. Setup Wallet and Identity
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    
    const mspID = process.env.FABRIC_MSP_ID || 'Org1MSP';
    const orgNAME = 'org1.example.com';
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
        console.log(`Connecting to gateway for channel ${process.env.FABRIC_CHANNEL || 'mychannel'}...`);
        await gateway.connect(ccp, {
            wallet,
            identity: 'admin',
            discovery: { 
                enabled: true, 
                asLocalhost: process.env.FABRIC_GW_AS_LOCALHOST === 'true' 
            }
        });
        console.log('Gateway connected.');

        const network = await gateway.getNetwork(process.env.FABRIC_CHANNEL || 'mychannel');
        const contract = network.getContract(process.env.FABRIC_CHAINCODE || 'documentCC');

        // 3. Prepare Sample Data
        const filename = 'efficiency_report.txt';
        const fileContent = 'Data: Efficiency is high. System is decentralized.';
        const cid = crypto.createHash('sha256').update(fileContent).digest('hex');
        const workerId = process.env.FABRIC_WORKER_ID || 'fabric-worker-1';

        // 4. Upload to Minio
        console.log(`Uploading ${filename} to Minio at ${process.env.MINIO_HOST || 'localhost'}...`);
        const bucketName = process.env.MINIO_BUCKET || 'fabric-docs';
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
