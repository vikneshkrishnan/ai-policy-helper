'use client';
import React from 'react';
import { apiAsk } from '../lib/api';

type Message = {
  role: 'user' | 'assistant',
  content: string,
  citations?: {title:string, section?:string}[],
  chunks?: {title:string, section?:string, text:string}[],
  error?: boolean,
  feedback?: 'up' | 'down' | null
};

export default function Chat() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [q, setQ] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const send = async () => {
    if (!q.trim()) return;
    const my = { role: 'user' as const, content: q };
    setMessages(m => [...m, my]);
    const queryText = q;
    setQ('');
    setLoading(true);

    try {
      const res = await apiAsk(queryText);
      const ai: Message = {
        role: 'assistant',
        content: res.answer,
        citations: res.citations,
        chunks: res.chunks,
        feedback: null
      };
      setMessages(m => [...m, ai]);
    } catch (e:any) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: `❌ Error: ${e.message}. Please make sure documents are ingested and the backend is running.`,
        error: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = (index: number, type: 'up' | 'down') => {
    setMessages(msgs => msgs.map((msg, idx) => {
      if (idx === index && msg.role === 'assistant') {
        // Toggle feedback: if clicking same button, clear it; otherwise set new feedback
        const newFeedback = msg.feedback === type ? null : type;
        console.log(`Feedback for message ${index}: ${newFeedback}`);
        // TODO: Send to backend API for logging
        return { ...msg, feedback: newFeedback };
      }
      return msg;
    }));
  };

  const exportChat = () => {
    if (messages.length === 0) {
      alert('No messages to export');
      return;
    }

    const exportData = {
      exported_at: new Date().toISOString(),
      message_count: messages.length,
      messages: messages.map((msg, idx) => ({
        index: idx + 1,
        role: msg.role,
        content: msg.content,
        citations: msg.citations,
        feedback: msg.feedback,
        error: msg.error
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'white'
    }}>
      {/* Chat Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #e2e8f0',
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 600,
            margin: 0,
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💬 Chat Assistant
          </h2>
          <p style={{
            fontSize: '13px',
            color: '#64748b',
            margin: '4px 0 0 0'
          }}>
            Ask questions about company policies
          </p>
        </div>

        {messages.length > 0 && (
          <button
            onClick={exportChat}
            style={{
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.color = '#3b82f6';
              e.currentTarget.style.background = '#f8fafc';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#475569';
              e.currentTarget.style.background = 'white';
            }}
          >
            📥 Export Chat
          </button>
        )}
      </div>

      {/* Messages Container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        background: '#f8fafc'
      }}>
        {messages.length === 0 && (
          <div style={{
            padding: '40px 20px',
            color: '#94a3b8'
          }}>
            <div style={{textAlign: 'center', marginBottom: '24px'}}>
              <div style={{fontSize: '48px', marginBottom: '16px'}}>💬</div>
              <p style={{fontSize: '16px', fontWeight: 500, marginBottom: '8px', color: '#64748b'}}>
                Start a conversation
              </p>
              <p style={{fontSize: '13px', lineHeight: '1.6', color: '#94a3b8'}}>
                Ask me anything about company policies
              </p>
            </div>

            {/* Suggested Questions */}
            <div style={{maxWidth: '420px', margin: '0 auto'}}>
              <div style={{fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '12px', textAlign: 'left'}}>
                💡 SUGGESTED QUESTIONS
              </div>
              {[
                "Can a customer return a damaged blender after 20 days?",
                "What's the shipping SLA to East Malaysia for bulky items?",
                "What products are covered under warranty?",
                "How long do refunds take to process?"
              ].map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => { setQ(question); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    marginBottom: '8px',
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    lineHeight: '1.5'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: m.role === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '85%',
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: m.role === 'user' ? '#3b82f6' : 'white',
              color: m.role === 'user' ? 'white' : '#1e293b',
              border: m.error ? '1px solid #ef4444' : m.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
              boxShadow: m.role === 'assistant' ? '0 1px 2px 0 rgb(0 0 0 / 0.05)' : 'none'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                marginBottom: '6px',
                opacity: 0.8,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {m.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div style={{
                lineHeight: 1.6,
                fontSize: '14px',
                whiteSpace: 'pre-wrap'
              }}>
                {m.content}
              </div>

              {m.citations && m.citations.length > 0 && (
                <div style={{marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0'}}>
                  <div style={{fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: 500}}>
                    📚 SOURCES
                  </div>
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                    {m.citations.map((c, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          padding: '4px 10px',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: '6px',
                          fontWeight: 500
                        }}
                      >
                        {c.title.replace('.md', '')} {c.section && `→ ${c.section}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {m.chunks && m.chunks.length > 0 && (
                <details style={{marginTop: '12px', cursor: 'pointer'}}>
                  <summary style={{
                    fontSize: '12px',
                    color: '#3b82f6',
                    fontWeight: 500,
                    padding: '8px 0',
                    listStyle: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>📄</span>
                    View {m.chunks.length} supporting chunk{m.chunks.length !== 1 ? 's' : ''}
                  </summary>
                  {m.chunks.map((c, idx) => (
                    <div key={idx} style={{
                      marginTop: '8px',
                      padding: '12px',
                      backgroundColor: '#f8fafc',
                      borderLeft: '3px solid #3b82f6',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}>
                      <div style={{fontWeight: 600, color: '#0f172a', marginBottom: '6px', fontSize: '11px'}}>
                        {c.title.replace('.md', '')} {c.section && `— ${c.section}`}
                      </div>
                      <div style={{whiteSpace: 'pre-wrap', color: '#475569', lineHeight: 1.5}}>
                        {c.text.substring(0, 300)}{c.text.length > 300 && '...'}
                      </div>
                    </div>
                  ))}
                </details>
              )}

              {/* Feedback buttons for assistant messages */}
              {m.role === 'assistant' && !m.error && (
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: m.role === 'assistant' ? '1px solid #e2e8f0' : 'none',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  <span style={{fontSize: '11px', color: '#64748b', fontWeight: 500}}>Was this helpful?</span>
                  <button
                    onClick={() => handleFeedback(i, 'up')}
                    style={{
                      padding: '4px 10px',
                      border: m.feedback === 'up' ? '1px solid #10b981' : '1px solid #e2e8f0',
                      borderRadius: '6px',
                      background: m.feedback === 'up' ? '#f0fdf4' : 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    title="Helpful"
                  >
                    👍
                  </button>
                  <button
                    onClick={() => handleFeedback(i, 'down')}
                    style={{
                      padding: '4px 10px',
                      border: m.feedback === 'down' ? '1px solid #ef4444' : '1px solid #e2e8f0',
                      borderRadius: '6px',
                      background: m.feedback === 'down' ? '#fef2f2' : 'white',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                    title="Not helpful"
                  >
                    👎
                  </button>
                  {m.feedback && (
                    <span style={{fontSize: '11px', color: '#64748b', marginLeft: '4px'}}>
                      Thanks for your feedback!
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#64748b',
            fontSize: '14px',
            padding: '12px 16px'
          }}>
            <div className="typing-indicator" style={{
              display: 'flex',
              gap: '4px'
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#94a3b8',
                animation: 'pulse 1.4s ease-in-out infinite'
              }}></span>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#94a3b8',
                animation: 'pulse 1.4s ease-in-out 0.2s infinite'
              }}></span>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#94a3b8',
                animation: 'pulse 1.4s ease-in-out 0.4s infinite'
              }}></span>
            </div>
            <span>Assistant is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{
        padding: '20px 24px',
        borderTop: '1px solid #e2e8f0',
        background: 'white'
      }}>
        <div style={{display: 'flex', gap: '8px'}}>
          <input
            placeholder="Ask about policies, shipping, returns..."
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            onKeyDown={(e) => { if (e.key === 'Enter' && !loading) send(); }}
            disabled={loading}
            aria-label="Question input"
          />
          <button
            onClick={send}
            disabled={loading || !q.trim()}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: loading || !q.trim() ? '#cbd5e1' : '#3b82f6',
              color: 'white',
              fontWeight: 600,
              cursor: loading || !q.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              fontSize: '14px'
            }}
            aria-label="Send question"
          >
            {loading ? '⏳' : '📤'}
          </button>
        </div>
      </div>
    </div>
  );
}
