const express = require('express');
const multer = require('multer');
const Minio = require('minio');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

// Local Control Plane MinIO
const minioClient = new Minio.Client({
    endPoint: '127.0.0.1',
    port: 9000,
    useSSL: false,
    accessKey: 'admin',
    secretKey: 'password123'
});

// Example Worker Nodes (Tailscale IPs)
const workers = [
    { name: 'worker-node-1', endPoint: '100.67.122.46', port: 9000 },
    // Add more workers as needed
];

// Ensure bucket exists
minioClient.makeBucket('files', '', (err) => {
    if (err && err.code !== 'BucketAlreadyOwnedByYou') console.log(err);
});

app.use(express.static('../public'));

app.post('/upload', upload.single('file'), async (req, res) => {
    const file = req.file;
    const access = req.body.access;

    if (!file) return res.json({ message: 'No file uploaded' });

    // Upload to Control Plane MinIO
    await minioClient.fPutObject('files', file.originalname, file.path);

    // If public, replicate to worker nodes
    if (access === 'public') {
        for (const worker of workers) {
            const workerClient = new Minio.Client({
                endPoint: worker.endPoint,
                port: worker.port,
                useSSL: false,
                accessKey: 'admin',
                secretKey: 'password123'
            });
            await workerClient.fPutObject('files', file.originalname, file.path);
        }
    }

    // Remove local uploaded file
    fs.unlinkSync(file.path);
    res.json({ message: `File uploaded successfully as ${access}` });
});

app.listen(3000, () => console.log('Backend running on port 3000'));