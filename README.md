# AI Policy & Product Helper

> A local-first RAG system for answering policy questions with citations

A production-ready Retrieval-Augmented Generation (RAG) application built for helping customer service agents quickly find accurate information from company policy documents with proper source citations.

## 🎯 Features

- **📚 Intelligent Q&A**: Ask natural language questions, get accurate answers with citations
- **🔍 Source Attribution**: Every answer includes clickable citations showing exact source documents and sections
- **⚡ Fast Retrieval**: Vector similarity search powered by Qdrant
- **📊 Real-time Metrics**: Monitor system performance and document indexing stats
- **🎨 Polished UI**: Clean, responsive interface with expandable source chunks
- **✅ Production-Ready**: Comprehensive tests, structured logging, health checks
- **🔒 Local-First**: Works offline with local embeddings and optional stub LLM

## 🏗️ Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

```
Frontend (Next.js) → Backend API (FastAPI) → RAG Engine
                          ↓            ↓
                      Qdrant       OpenAI GPT-4o-mini
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- **Optional**: OpenAI API key (for better answers)

### Installation

1. **Clone and navigate to the project**:
```bash
cd ai-policy-helper
```

2. **Copy environment file** (optional - works without this):
```bash
cp .env.example .env
```

The `.env` file is pre-configured with:
- `LLM_PROVIDER=stub` (works offline, zero configuration)
- `EMBEDDING_MODEL=local-384` (fast startup)
- `VECTOR_STORE=qdrant`

💡 **For production/demo**: Edit `.env` and set:
- `LLM_PROVIDER=openai`
- `OPENAI_API_KEY=sk-proj-...`
- `EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2`

3. **Start all services**:
```bash
docker compose up --build
```

This starts:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Qdrant Dashboard**: http://localhost:6333/dashboard

## 📖 Usage

### 1. Ingest Documents

Visit http://localhost:3000 and click **"📥 Ingest Sample Docs"** in the Admin Panel.

This indexes 6 policy documents:
- `Returns_and_Refunds.md`
- `Warranty_Policy.md`
- `Delivery_and_Shipping.md`
- `Product_Catalog.md`
- `Internal_SOP_Agent_Guide.md`
- `Compliance_Notes.md`

### 2. Ask Questions

Try these acceptance test questions in the Chat interface:

**Question 1**: *"Can a customer return a damaged blender after 20 days?"*
- **Expected**: Cites `Returns_and_Refunds.md` (30-day defective policy) and `Warranty_Policy.md`

**Question 2**: *"What's the shipping SLA to East Malaysia for bulky items?"*
- **Expected**: Cites `Delivery_and_Shipping.md` (7-10 days with surcharge)

### 3. View Citations

- Click on citation chips to see which sources were used
- Expand "📄 View supporting chunks" to read the exact text from source documents

## 🧪 Testing

Run the comprehensive test suite:

```bash
# Run all tests
docker compose run --rm backend pytest -v

# Run with coverage
docker compose run --rm backend pytest -v --cov=app

# Run specific test
docker compose run --rm backend pytest app/tests/test_api.py::test_acceptance_question_1 -v
```

### Test Coverage

- ✅ Health endpoint validation
- ✅ Metrics endpoint structure
- ✅ Document ingestion workflow
- ✅ Basic Q&A functionality
- ✅ **Acceptance Test 1**: Damaged blender return policy
- ✅ **Acceptance Test 2**: East Malaysia shipping SLA
- ✅ Custom `k` parameter handling
- ✅ Citation field validation
- ✅ Chunk metadata integrity

## 📊 API Reference

### POST `/api/ingest`
Ingest documents from `/data` directory.

**Response**:
```json
{
  "indexed_docs": 6,
  "indexed_chunks": 24
}
```

### POST `/api/ask`
Ask a question with RAG.

**Request**:
```json
{
  "query": "What is the refund window?",
  "k": 4  // optional, default: 4
}
```

**Response**:
```json
{
  "query": "What is the refund window?",
  "answer": "According to Returns_and_Refunds.md - Refund Windows...",
  "citations": [
    {"title": "Returns_and_Refunds.md", "section": "Refund Windows"}
  ],
  "chunks": [
    {
      "title": "Returns_and_Refunds.md",
      "section": "Refund Windows",
      "text": "Small appliances (kitchen, home): 14 days..."
    }
  ],
  "metrics": {
    "retrieval_ms": 15.2,
    "generation_ms": 847.3
  }
}
```

### GET `/api/metrics`
Get system metrics.

**Response**:
```json
{
  "total_docs": 6,
  "total_chunks": 24,
  "avg_retrieval_latency_ms": 12.5,
  "avg_generation_latency_ms": 821.4,
  "embedding_model": "sentence-transformers/all-MiniLM-L6-v2",
  "llm_model": "openai:gpt-4o-mini"
}
```

### GET `/api/health`
Health check endpoint.

## 🎨 UI Components

### Chat Interface
- **Auto-scroll**: Automatically scrolls to latest message
- **Loading states**: Shows "⏳ Thinking..." during processing
- **Error handling**: User-friendly error messages
- **Empty state**: Shows example questions when no messages
- **Citation chips**: Color-coded, hover for section info
- **Expandable chunks**: Click to view source text (truncated to 300 chars)

### Admin Panel
- **Visual metrics cards**: Documents, chunks, latency stats
- **Success/error alerts**: Clear feedback for operations
- **Configuration display**: Shows active embedding and LLM models
- **Grid layout**: Responsive 2-column metric cards

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `stub` | `stub` (offline), `openai`, or `ollama` |
| `OPENAI_API_KEY` | - | Required only for OpenAI provider |
| `VECTOR_STORE` | `qdrant` | `qdrant` or `memory` |
| `COLLECTION_NAME` | `policy_helper` | Qdrant collection name |
| `CHUNK_SIZE` | `700` | Tokens per chunk |
| `CHUNK_OVERLAP` | `80` | Overlapping tokens |
| `EMBEDDING_MODEL` | `local-384` | Embedding model (use `sentence-transformers/all-MiniLM-L6-v2` for better quality) |

### Switching LLM Providers

**Stub** (Default - zero configuration):
```bash
LLM_PROVIDER=stub
```
The stub LLM generates deterministic answers with citations. Works completely offline.

**OpenAI** (Recommended for production/demo):
```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
```
Provides intelligent, natural language answers with better citation integration.

## 🔧 Development

### Running Locally (without Docker)

**Backend**:
```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

**Qdrant**:
```bash
docker run -p 6333:6333 qdrant/qdrant:latest
```

### Project Structure

```
ai-policy-helper-starter-pack/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app & endpoints
│   │   ├── rag.py           # RAG engine core
│   │   ├── ingest.py        # Document loading & chunking
│   │   ├── models.py        # Pydantic schemas
│   │   ├── settings.py      # Configuration
│   │   └── tests/
│   │       ├── conftest.py
│   │       └── test_api.py  # Comprehensive test suite
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/
│   │   ├── page.tsx         # Main page
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Chat.tsx         # Enhanced chat UI
│   │   └── AdminPanel.tsx   # Metrics & ingestion
│   ├── lib/api.ts           # API client
│   ├── package.json
│   └── Dockerfile
├── data/                    # Policy documents
│   ├── Returns_and_Refunds.md
│   ├── Warranty_Policy.md
│   ├── Delivery_and_Shipping.md
│   ├── Product_Catalog.md
│   ├── Internal_SOP_Agent_Guide.md
│   └── Compliance_Notes.md
├── docker-compose.yml
├── .env.example
├── ARCHITECTURE.md          # Detailed system design
└── README.md               # This file
```

## 📈 Performance

### Current Benchmarks (Local M1 Mac)

| Metric | Value |
|--------|-------|
| Document Ingestion | ~2-3s for 6 docs |
| Query Retrieval | ~10-20ms |
| Answer Generation | ~800-1500ms (OpenAI) |
| End-to-End Latency | <2s |
| Memory Usage | ~500MB (backend + Qdrant) |

### Optimization Tips

1. **Chunk Size**: Reduce to 500 for faster retrieval, increase to 1000 for better context
2. **Overlap**: Higher overlap (100+) improves context but increases storage
3. **k Parameter**: Lower k (2-3) for faster queries, higher k (5-8) for better coverage
4. **Caching**: Add Redis for frequent queries
5. **Embeddings**: Switch to `sentence-transformers/all-MiniLM-L6-v2` for better semantic search (default uses hash-based for fast startup)

## 🚨 Trade-offs & Limitations

### Current Implementation

**Pros**:
- ✅ Fast startup (~5-10s) with local hash-based embeddings
- ✅ Works completely offline with stub LLM
- ✅ Easy to switch to semantic embeddings for production
- ✅ Accurate citations from correct source documents

**Cons**:
- ❌ Default embeddings are hash-based (poor semantic quality - switch to sentence-transformers for production)
- ❌ No reranking or MMR for diversity
- ❌ Single-threaded ingestion
- ❌ Limited to ~100 documents

### Production Considerations

**Would Improve**:
1. **Reranking**: MMR or cross-encoder for diverse results
2. **Caching**: Redis for frequent queries (~50% latency reduction)
3. **Async Ingestion**: Background tasks for large document sets
4. **Monitoring**: Prometheus + Grafana for observability
5. **Rate Limiting**: Protect against abuse
6. **Authentication**: JWT tokens for user management
7. **PDPA Compliance**: PII detection and masking for Malaysian context

## 🐛 Troubleshooting

### Qdrant healthcheck failing
```bash
# Ensure port 6333 is free
docker compose down
docker compose up --build
```

### Frontend build errors
```bash
# Clear Next.js cache
cd frontend
rm -rf .next node_modules
npm install
```

### Backend Python errors
```bash
# Rebuild backend image
docker compose build --no-cache backend
```

### CORS issues
CORS is configured to `*` for local development. For production, update `main.py`:
```python
allow_origins=["https://yourdomain.com"]
```

### Embeddings/LLM
With no keys, stub models run by default so the app always works. The default embedding model is `local-384` (hash-based) for instant startup. For better semantic quality, switch to `EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2` in `.env`.

## 📝 Next Steps

### Phase 1 (Immediate)
- [ ] Add feedback mechanism (thumbs up/down on answers)
- [ ] Implement query suggestions
- [ ] Add conversation history
- [ ] Export chat to PDF

### Phase 2 (Short-term)
- [ ] Implement MMR reranking
- [ ] Add streaming responses
- [ ] Redis caching layer
- [ ] Add conversation history persistence

### Phase 3 (Medium-term)
- [ ] User authentication
- [ ] Multi-tenancy support
- [ ] Analytics dashboard
- [ ] A/B testing framework

### Phase 4 (Long-term)
- [ ] Fine-tune embeddings on domain data
- [ ] Hybrid search (keyword + semantic)
- [ ] Auto-update from Google Docs/Confluence
- [ ] Multi-language support (English + Bahasa Malaysia)

## 🙏 Acknowledgments

Built with:
- [FastAPI](https://fastapi.tiangolo.com/)
- [Next.js](https://nextjs.org/)
- [Qdrant](https://qdrant.tech/)
- [OpenAI](https://openai.com/)

## 📄 License

This is a take-home assignment project. Not intended for production use without further hardening.

---

