const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface AskResponse {
  answer: string;
  citations: {title: string, section?: string}[];
  chunks: {title: string, section?: string, text: string}[];
}

interface MetricsResponse {
  total_docs: number;
  total_chunks: number;
  avg_retrieval_latency_ms: number;
  avg_generation_latency_ms: number;
  embedding_model: string;
  llm_model: string;
}

interface IngestResponse {
  indexed_docs: number;
  indexed_chunks: number;
}

export async function apiAsk(question: string): Promise<AskResponse> {
  const response = await fetch(`${API_BASE}/api/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: question }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to get response');
  }

  return response.json();
}

export async function apiMetrics(): Promise<MetricsResponse> {
  const response = await fetch(`${API_BASE}/metrics`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to get metrics');
  }

  return response.json();
}

export async function apiIngest(): Promise<IngestResponse> {
  const response = await fetch(`${API_BASE}/api/ingest`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to ingest documents');
  }

  return response.json();
}