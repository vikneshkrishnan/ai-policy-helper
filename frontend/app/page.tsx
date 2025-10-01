import Chat from '../components/Chat';
import AdminPanel from '../components/AdminPanel';

export default function Page() {
  return (
    <div className="app-container">
      <div className="main-content">
        <div className="app-header" style={{padding: '0 0 24px 0', background: 'transparent', border: 'none'}}>
          <h1 className="app-title">
            <span style={{fontSize: '32px'}}>🤖</span>
            AI Policy & Product Helper
          </h1>
          <p className="app-subtitle">
            Local-first RAG system. Ingest documents, ask questions, and get answers with citations.
          </p>
        </div>

        <AdminPanel />

        <div className="card">
          <h2>📚 How to Test</h2>
          <ol style={{paddingLeft: '20px', lineHeight: '1.8'}}>
            <li style={{marginBottom: '8px'}}>
              Click <b>📥 Ingest Sample Docs</b> to index the policy documents
            </li>
            <li style={{marginBottom: '8px'}}>
              Try: <i>"Can a customer return a damaged blender after 20 days?"</i>
            </li>
            <li style={{marginBottom: '8px'}}>
              Try: <i>"What's the shipping SLA to East Malaysia for bulky items?"</i>
            </li>
          </ol>
        </div>

        <div className="card">
          <h3>💡 Features</h3>
          <ul style={{paddingLeft: '20px', lineHeight: '1.8', color: '#64748b'}}>
            <li>Real-time document ingestion</li>
            <li>AI-powered question answering</li>
            <li>Automatic source citations</li>
            <li>Performance metrics tracking</li>
          </ul>
        </div>
      </div>

      <div className="sidebar">
        <Chat />
      </div>
    </div>
  );
}
