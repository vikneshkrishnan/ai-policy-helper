from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List
import logging
from .models import IngestResponse, AskRequest, AskResponse, MetricsResponse, Citation, Chunk
from .settings import settings
from .ingest import load_documents
from .rag import RAGEngine, build_chunks_from_docs

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Policy & Product Helper")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = RAGEngine()

@app.get("/api/health")
def health():
    """Health check endpoint."""
    logger.info("Health check requested")
    return {"status": "ok"}

@app.get("/api/metrics", response_model=MetricsResponse)
def metrics():
    """Get system metrics including document counts and performance stats."""
    logger.info("Metrics requested")
    s = engine.stats()
    logger.info(f"Current metrics: {s['total_docs']} docs, {s['total_chunks']} chunks")
    return MetricsResponse(**s)

@app.post("/api/ingest", response_model=IngestResponse)
def ingest():
    """Ingest documents from data directory into vector store."""
    logger.info(f"Starting document ingestion from {settings.data_dir}")
    try:
        docs = load_documents(settings.data_dir)
        logger.info(f"Loaded {len(docs)} document sections")

        chunks = build_chunks_from_docs(docs, settings.chunk_size, settings.chunk_overlap)
        logger.info(f"Created {len(chunks)} chunks with size={settings.chunk_size}, overlap={settings.chunk_overlap}")

        new_docs, new_chunks = engine.ingest_chunks(chunks)
        logger.info(f"Ingestion complete: {new_docs} new docs, {new_chunks} new chunks indexed")

        return IngestResponse(indexed_docs=new_docs, indexed_chunks=new_chunks)
    except Exception as e:
        logger.error(f"Ingestion failed: {str(e)}", exc_info=True)
        raise

@app.post("/api/ask", response_model=AskResponse)
def ask(req: AskRequest):
    """Answer a question using RAG with citations."""
    logger.info(f"Question received: '{req.query}' (k={req.k or 4})")
    try:
        # Retrieve relevant contexts
        ctx = engine.retrieve(req.query, k=req.k or 4)
        logger.info(f"Retrieved {len(ctx)} relevant chunks")

        # Generate answer
        answer = engine.generate(req.query, ctx)
        logger.info(f"Generated answer ({len(answer)} chars)")

        # Build response
        citations = [Citation(title=c.get("title"), section=c.get("section")) for c in ctx]
        chunks = [Chunk(title=c.get("title"), section=c.get("section"), text=c.get("text")) for c in ctx]
        stats = engine.stats()

        cited_docs = {c.get("title") for c in ctx}
        logger.info(f"Citations from: {cited_docs}")

        return AskResponse(
            query=req.query,
            answer=answer,
            citations=citations,
            chunks=chunks,
            metrics={
                "retrieval_ms": stats["avg_retrieval_latency_ms"],
                "generation_ms": stats["avg_generation_latency_ms"],
            }
        )
    except Exception as e:
        logger.error(f"Question answering failed: {str(e)}", exc_info=True)
        raise
