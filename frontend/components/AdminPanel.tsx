'use client';
import React from 'react';
import { apiIngest, apiMetrics } from '../lib/api';

export default function AdminPanel() {
  const [metrics, setMetrics] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const refresh = async () => {
    try {
      setError(null);
      const m = await apiMetrics();
      setMetrics(m);
    } catch (e: any) {
      setError(`Failed to fetch metrics: ${e.message}`);
    }
  };

  const ingest = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await apiIngest();
      setSuccess(`✅ Successfully indexed ${result.indexed_docs} documents (${result.indexed_chunks} chunks)`);
      await refresh();
    } catch (e: any) {
      setError(`❌ Ingestion failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  React.useEffect(() => { refresh(); }, []);

  return (
    <div className="card">
      <h2>⚙️ Admin Panel</h2>

      <div style={{display:'flex', gap:8, marginBottom:16}}>
        <button
          onClick={ingest}
          disabled={busy}
          style={{
            padding:'12px 20px',
            borderRadius:8,
            border:'none',
            background: busy ? '#cbd5e1' : '#10b981',
            color:'white',
            fontWeight:600,
            cursor: busy ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            fontSize: '14px',
            boxShadow: busy ? 'none' : '0 1px 2px 0 rgb(0 0 0 / 0.05)'
          }}
          onMouseOver={(e) => !busy && (e.currentTarget.style.background = '#059669')}
          onMouseOut={(e) => !busy && (e.currentTarget.style.background = '#10b981')}
          aria-label="Ingest documents"
        >
          {busy ? '⏳ Indexing...' : '📥 Ingest Sample Docs'}
        </button>
        <button
          onClick={refresh}
          disabled={busy}
          style={{
            padding:'12px 20px',
            borderRadius:8,
            border:'1px solid #e2e8f0',
            background:'white',
            color:'#3b82f6',
            fontWeight:600,
            cursor: busy ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            fontSize: '14px'
          }}
          onMouseOver={(e) => !busy && (e.currentTarget.style.background = '#f8fafc')}
          onMouseOut={(e) => !busy && (e.currentTarget.style.background = 'white')}
          aria-label="Refresh metrics"
        >
          🔄 Refresh Metrics
        </button>
      </div>

      {error && (
        <div style={{
          padding:14,
          marginBottom:16,
          backgroundColor:'#fef2f2',
          border:'1px solid #fecaca',
          borderRadius:8,
          color:'#dc2626',
          fontSize:'14px',
          fontWeight:500
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding:14,
          marginBottom:16,
          backgroundColor:'#f0fdf4',
          border:'1px solid #bbf7d0',
          borderRadius:8,
          color:'#16a34a',
          fontSize:'14px',
          fontWeight:500
        }}>
          {success}
        </div>
      )}

      {metrics && (
        <div>
          <div style={{fontSize:16, fontWeight:600, marginBottom:16, color:'#0f172a', display:'flex', alignItems:'center', gap:'8px'}}>
            📊 System Metrics
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
            <div style={{
              padding:16,
              backgroundColor:'white',
              borderRadius:8,
              border:'1px solid #e2e8f0',
              boxShadow:'0 1px 2px 0 rgb(0 0 0 / 0.05)'
            }}>
              <div style={{fontSize:12, color:'#64748b', marginBottom:8, fontWeight:500}}>Documents</div>
              <div style={{fontSize:32, fontWeight:700, color:'#3b82f6'}}>
                {metrics.total_docs}
              </div>
            </div>
            <div style={{
              padding:16,
              backgroundColor:'white',
              borderRadius:8,
              border:'1px solid #e2e8f0',
              boxShadow:'0 1px 2px 0 rgb(0 0 0 / 0.05)'
            }}>
              <div style={{fontSize:12, color:'#64748b', marginBottom:8, fontWeight:500}}>Chunks</div>
              <div style={{fontSize:32, fontWeight:700, color:'#10b981'}}>
                {metrics.total_chunks}
              </div>
            </div>
            <div style={{
              padding:16,
              backgroundColor:'white',
              borderRadius:8,
              border:'1px solid #e2e8f0',
              boxShadow:'0 1px 2px 0 rgb(0 0 0 / 0.05)'
            }}>
              <div style={{fontSize:12, color:'#64748b', marginBottom:8, fontWeight:500}}>Retrieval Latency</div>
              <div style={{fontSize:24, fontWeight:600, color:'#f59e0b'}}>
                {metrics.avg_retrieval_latency_ms.toFixed(1)}ms
              </div>
            </div>
            <div style={{
              padding:16,
              backgroundColor:'white',
              borderRadius:8,
              border:'1px solid #e2e8f0',
              boxShadow:'0 1px 2px 0 rgb(0 0 0 / 0.05)'
            }}>
              <div style={{fontSize:12, color:'#64748b', marginBottom:8, fontWeight:500}}>Generation Latency</div>
              <div style={{fontSize:24, fontWeight:600, color:'#8b5cf6'}}>
                {metrics.avg_generation_latency_ms.toFixed(1)}ms
              </div>
            </div>
          </div>
          <div style={{marginTop:16, padding:16, backgroundColor:'#f8fafc', borderRadius:8, border:'1px solid #e2e8f0'}}>
            <div style={{fontSize:12, color:'#64748b', marginBottom:8, fontWeight:500}}>⚙️ Configuration</div>
            <div style={{fontSize:13, fontFamily:'monospace', color:'#334155', lineHeight:1.8}}>
              <div><strong style={{color:'#0f172a'}}>Embedding:</strong> {metrics.embedding_model}</div>
              <div><strong style={{color:'#0f172a'}}>LLM:</strong> {metrics.llm_model}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
