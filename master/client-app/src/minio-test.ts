import * as Minio from 'minio';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../config/master.env') });

const minioClient = new Minio.Client({
    endPoint: '100.125.209.59',
    port: 9000,
    useSSL: false,
    accessKey: process.env.MINIO_USER || 'minioadmin',
    secretKey: process.env.MINIO_PASS || 'minioadmin'
});

async function test() {
    console.log('Testing Minio connection...');
    try {
        const exists = await minioClient.bucketExists('fabric-docs');
        console.log('Bucket exists:', exists);
    } catch (err) {
        console.error('Minio Error:', err);
    }
}

test();
