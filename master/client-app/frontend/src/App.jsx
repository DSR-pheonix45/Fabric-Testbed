import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, CheckCircle, Smartphone, Database, 
  Activity, BarChart3, Cloud, Trash2, ShieldCheck,
  RefreshCw, Layers, Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [status, setStatus] = useState('System Ready');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    // Fetch docs
    try {
      const res = await axios.get(`${API_BASE}/documents`);
      setDocuments(res.data);
    } catch (err) { console.error('Docs error:', err); }

    // Fetch workers
    try {
      const res = await axios.get(`${API_BASE}/workers`);
      setWorkers(res.data);
    } catch (err) { console.error('Workers error:', err); }

    // Fetch analytics
    try {
      const res = await axios.get(`${API_BASE}/analytics`);
      setAnalytics(res.data);
    } catch (err) { console.error('Analytics error:', err); }
  };

  const handleUpload = async (file) => {
    setUploading(true);
    setStatus(`Uploading ${file.name}...`);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API_BASE}/upload`, formData);
      setStatus('Upload Successful!');
      fetchData();
      setTimeout(() => setStatus('System Ready'), 3000);
    } catch (err) {
      setStatus(`Upload Failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const data = documents.map(doc => ({
    name: doc.Filename.substring(0, 10),
    time: new Date(doc.AddedAt).toLocaleTimeString(),
    value: 1
  }));

  const COLORS = ['#6366f1', '#10b981', '#3b82f6', '#8b5cf6'];

  return (
    <div className="dashboard">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Fabric Storage</h1>
          <p style={{ color: 'var(--text-muted)' }}>Decentralized Document Management & Analytics</p>
        </div>
        <div className="glass-card" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center' }}>
          <div className={`status-indicator status-online`}></div>
          <span style={{ fontWeight: 600 }}>{status}</span>
        </div>
      </header>

      <section className="grid-layout">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <Upload size={24} color="#6366f1" style={{ marginRight: '1rem' }} />
            <h3>Secure Upload</h3>
          </div>
          <div 
            className={`upload-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            {uploading ? (
              <RefreshCw className="animate-spin" size={48} style={{ margin: '0 auto 1.5rem' }} />
            ) : (
              <Cloud size={48} style={{ margin: '0 auto 1.5rem', color: 'var(--text-muted)' }} />
            )}
            <p style={{ fontWeight: 500 }}>{uploading ? 'Processing Transaction...' : 'Drag & Drop documents here'}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Supports documents, reports, and binary files</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card"
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <Activity size={24} color="#10b981" style={{ marginRight: '1rem' }} />
            <h3>Storage Efficiency</h3>
          </div>
          {analytics && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Documents</p>
                <div className="metric-value">{analytics.totalDocuments}</div>
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Bucket Size</p>
                <div className="metric-value" style={{ color: 'var(--accent-blue)' }}>{analytics.totalBucketSize}</div>
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Deduplication</p>
                <div className="metric-value" style={{ color: 'var(--accent-green)', fontSize: '1.5rem' }}>{analytics.deduplicationSavings}</div>
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ratio</p>
                <div className="metric-value" style={{ fontSize: '1.5rem' }}>{analytics.efficiencyRatio}</div>
              </div>
            </div>
          )}
        </motion.div>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ overflowX: 'auto' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
             <div style={{ display: 'flex', alignItems: 'center' }}>
                <ShieldCheck size={24} color="#3b82f6" style={{ marginRight: '1rem' }} />
                <h3>Ledger Activity & Storage Registry</h3>
             </div>
             <button className="btn-primary" onClick={fetchData}><RefreshCw size={16} /></button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '1rem' }}>UPLOAD ID</th>
                <th style={{ padding: '1rem' }}>FILENAME</th>
                <th style={{ padding: '1rem' }}>FILE HASH (CID)</th>
                <th style={{ padding: '1rem' }}>RESOURCE URL</th>
                <th style={{ padding: '1rem' }}>BLOCKCHAIN</th>
              </tr>
            </thead>
            <tbody>
              {documents.slice().reverse().map((doc, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary)' }}>{doc.uploadId}</td>
                  <td style={{ padding: '1rem' }}>{doc.Filename}</td>
                  <td style={{ padding: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {doc.fileHash.substring(0, 32)}...
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <a href={doc.minioUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                      <Layers size={14} style={{ marginRight: '0.4rem' }} /> View
                    </a>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center' }}>
                      <CheckCircle size={14} style={{ marginRight: '0.4rem' }} /> COMMITTED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </section>

      <section className="grid-layout" style={{ marginTop: '2rem' }}>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-card"
        >
           <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
            <Smartphone size={24} color="#f59e0b" style={{ marginRight: '1rem' }} />
            <h3>Worker Status</h3>
          </div>
          {workers.map(worker => (
            <div key={worker.id} style={{ padding: '1.2rem 0', borderBottom: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{worker.name}</div>
                  <div style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.2rem' }}>{worker.ip}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: worker.status === 'Online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '2rem' }}>
                  <div className={`status-indicator ${worker.status === 'Online' ? 'status-online' : 'status-offline'}`} style={{ margin: 0, marginRight: '0.5rem' }}></div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: worker.status === 'Online' ? 'var(--accent-green)' : '#ef4444' }}>{worker.status.toUpperCase()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center' }}><Database size={12} style={{ marginRight: '0.3rem' }} /> {worker.storageUsed}</span>
                <span style={{ display: 'flex', alignItems: 'center' }}><Activity size={12} style={{ marginRight: '0.3rem' }} /> {worker.cpu}</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '1rem', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
            <p style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
              <Zap size={14} style={{ marginRight: '0.5rem' }} />
              Storage utilization at 45% across mesh.
            </p>
          </div>
        </motion.div>
      </section>

      <footer style={{ marginTop: '4rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        <p>&copy; 2026 Hyperledger Fabric Document Storage System. Fully Decentralized.</p>
      </footer>
    </div>
  );
}

export default App;
