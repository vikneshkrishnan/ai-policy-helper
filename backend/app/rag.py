import time, os, math, json, hashlib
from typing import List, Dict, Tuple
import numpy as np
from .settings import settings
from .ingest import chunk_text, doc_hash
from qdrant_client import QdrantClient, models as qm

# ---- Simple local embedder (deterministic) ----
def _tokenize(s: str) -> List[str]:
    return [t.lower() for t in s.split()]

class LocalEmbedder:
    def __init__(self, dim: int = 384):
        self.dim = dim

    def embed(self, text: str) -> np.ndarray:
        # Hash-based repeatable pseudo-embedding
        h = hashlib.sha1(text.encode("utf-8")).digest()
        rng_seed = int.from_bytes(h[:8], "big") % (2**32-1)
        rng = np.random.default_rng(rng_seed)
        v = rng.standard_normal(self.dim).astype("float32")
        # L2 normalize
        v = v / (np.linalg.norm(v) + 1e-9)
        return v

# ---- Sentence Transformer Embedder ----
class SentenceTransformerEmbedder:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer(model_name)
        self.dim = self.model.get_sentence_embedding_dimension()

    def embed(self, text: str) -> np.ndarray:
        # Generate semantic embedding
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.astype("float32")

# ---- Vector store abstraction ----
class InMemoryStore:
    def __init__(self, dim: int = 384):
        self.dim = dim
        self.vecs: List[np.ndarray] = []
        self.meta: List[Dict] = []
        self._hashes = set()

    def upsert(self, vectors: List[np.ndarray], metadatas: List[Dict]):
        for v, m in zip(vectors, metadatas):
            h = m.get("hash")
            if h and h in self._hashes:
                continue
            self.vecs.append(v.astype("float32"))
            self.meta.append(m)
            if h:
                self._hashes.add(h)

    def search(self, query: np.ndarray, k: int = 4) -> List[Tuple[float, Dict]]:
        if not self.vecs:
            return []
        A = np.vstack(self.vecs)  # [N, d]
        q = query.reshape(1, -1)  # [1, d]
        # cosine similarity
        sims = (A @ q.T).ravel() / (np.linalg.norm(A, axis=1) * (np.linalg.norm(q) + 1e-9) + 1e-9)
        idx = np.argsort(-sims)[:k]
        return [(float(sims[i]), self.meta[i]) for i in idx]

class QdrantStore:
    def __init__(self, collection: str, dim: int = 384, url: str = "http://localhost:6333"):
        self.client = QdrantClient(url=url, timeout=10.0)
        self.collection = collection
        self.dim = dim
        self._ensure_collection()

    @staticmethod
    def _hash_to_id(hash_str: str) -> int:
        """Convert a hash string to a stable numeric ID for Qdrant."""
        # Take first 16 hex chars and convert to int (64-bit)
        return int(hash_str[:16], 16)

    def _ensure_collection(self):
        try:
            self.client.get_collection(self.collection)
        except Exception:
            self.client.recreate_collection(
                collection_name=self.collection,
                vectors_config=qm.VectorParams(size=self.dim, distance=qm.Distance.COSINE)
            )

    def upsert(self, vectors: List[np.ndarray], metadatas: List[Dict]):
        # Ensure collection exists before upserting
        self._ensure_collection()

        points = []
        for v, m in zip(vectors, metadatas):
            h = m.get("hash")
            if not h:
                continue
            # Use hash-based ID to prevent duplicates
            point_id = self._hash_to_id(h)
            # Check if point already exists
            try:
                existing = self.client.retrieve(
                    collection_name=self.collection,
                    ids=[point_id]
                )
                if existing:
                    # Skip duplicate
                    continue
            except Exception:
                # Point doesn't exist, continue with insertion
                pass
            points.append(qm.PointStruct(id=point_id, vector=v.tolist(), payload=m))
        if points:
            self.client.upsert(collection_name=self.collection, points=points)

    def search(self, query: np.ndarray, k: int = 4) -> List[Tuple[float, Dict]]:
        res = self.client.search(
            collection_name=self.collection,
            query_vector=query.tolist(),
            limit=k,
            with_payload=True
        )
        out = []
        for r in res:
            out.append((float(r.score), dict(r.payload)))
        return out

# ---- LLM provider ----
class StubLLM:
    def generate(self, query: str, contexts: List[Dict]) -> str:
        lines = [f"Answer (stub): Based on the following sources:"]
        for c in contexts:
            sec = c.get("section") or "Section"
            lines.append(f"- {c.get('title')} — {sec}")
        lines.append("Summary:")
        # naive summary of top contexts
        joined = " ".join([c.get("text", "") for c in contexts])
        lines.append(joined[:600] + ("..." if len(joined) > 600 else ""))
        return "\n".join(lines)

class OpenAILLM:
    def __init__(self, api_key: str):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key)

    def generate(self, query: str, contexts: List[Dict]) -> str:
        # Build detailed prompt with clear citation instructions
        prompt = """You are a helpful company policy assistant. Your task is to answer questions based ONLY on the provided sources.

CRITICAL CITATION RULES:
1. Always cite sources by their exact title and section when making claims
2. Use format: "According to [Document Title - Section]..." or "As stated in [Document Title - Section]..."
3. If multiple sources are relevant, cite all of them
4. Be specific about which information comes from which source
5. If the sources don't contain enough information to fully answer, say so

"""
        prompt += f"QUESTION: {query}\n\nAVAILABLE SOURCES:\n"
        for i, c in enumerate(contexts, 1):
            title = c.get('title', 'Unknown')
            section = c.get('section', 'Main')
            text = c.get('text', '')[:600]
            prompt += f"\n[Source {i}] {title} - {section}\n{text}\n{'---' * 20}\n"

        prompt += "\nANSWER (remember to cite specific sources by title and section):"

        resp = self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role":"user","content":prompt}],
            temperature=0.1
        )
        return resp.choices[0].message.content

# ---- RAG Orchestrator & Metrics ----
class Metrics:
    def __init__(self):
        self.t_retrieval = []
        self.t_generation = []

    def add_retrieval(self, ms: float):
        self.t_retrieval.append(ms)

    def add_generation(self, ms: float):
        self.t_generation.append(ms)

    def summary(self) -> Dict:
        avg_r = sum(self.t_retrieval)/len(self.t_retrieval) if self.t_retrieval else 0.0
        avg_g = sum(self.t_generation)/len(self.t_generation) if self.t_generation else 0.0
        return {
            "avg_retrieval_latency_ms": round(avg_r, 2),
            "avg_generation_latency_ms": round(avg_g, 2),
        }

class RAGEngine:
    def __init__(self):
        # Embedder selection based on settings
        if settings.embedding_model.startswith("sentence-transformers/"):
            model_name = settings.embedding_model.replace("sentence-transformers/", "")
            self.embedder = SentenceTransformerEmbedder(model_name=model_name)
            embedding_dim = self.embedder.dim
        else:
            # Default to local hash-based embedder
            self.embedder = LocalEmbedder(dim=384)
            embedding_dim = 384

        # Vector store selection
        if settings.vector_store == "qdrant":
            try:
                self.store = QdrantStore(collection=settings.collection_name, dim=embedding_dim, url=settings.qdrant_url)
            except Exception:
                self.store = InMemoryStore(dim=embedding_dim)
        else:
            self.store = InMemoryStore(dim=embedding_dim)

        # LLM selection
        if settings.llm_provider == "openai" and settings.openai_api_key:
            try:
                self.llm = OpenAILLM(api_key=settings.openai_api_key)
                self.llm_name = "openai:gpt-4o-mini"
            except Exception:
                self.llm = StubLLM()
                self.llm_name = "stub"
        else:
            self.llm = StubLLM()
            self.llm_name = "stub"

        self.metrics = Metrics()
        self._doc_titles = set()
        self._chunk_count = 0

    def ingest_chunks(self, chunks: List[Dict]) -> Tuple[int, int]:
        vectors = []
        metas = []
        doc_titles_before = set(self._doc_titles)

        for ch in chunks:
            text = ch["text"]
            h = doc_hash(text)
            meta = {
                "id": h,
                "hash": h,
                "title": ch["title"],
                "section": ch.get("section"),
                "text": text,
            }
            v = self.embedder.embed(text)
            vectors.append(v)
            metas.append(meta)
            self._doc_titles.add(ch["title"])
            self._chunk_count += 1

        self.store.upsert(vectors, metas)
        return (len(self._doc_titles) - len(doc_titles_before), len(metas))

    def retrieve(self, query: str, k: int = 4) -> List[Dict]:
        t0 = time.time()
        qv = self.embedder.embed(query)
        # Request more results to account for potential duplicates
        results = self.store.search(qv, k=k*2)
        self.metrics.add_retrieval((time.time()-t0)*1000.0)

        # Deduplicate results based on hash
        seen_hashes = set()
        unique_results = []
        for score, meta in results:
            h = meta.get("hash")
            if h and h not in seen_hashes:
                seen_hashes.add(h)
                unique_results.append(meta)
            elif not h:
                # Include items without hash (shouldn't happen, but be safe)
                unique_results.append(meta)

            # Stop once we have k unique results
            if len(unique_results) >= k:
                break

        return unique_results[:k]

    def generate(self, query: str, contexts: List[Dict]) -> str:
        t0 = time.time()
        answer = self.llm.generate(query, contexts)
        self.metrics.add_generation((time.time()-t0)*1000.0)
        return answer

    def stats(self) -> Dict:
        m = self.metrics.summary()
        return {
            "total_docs": len(self._doc_titles),
            "total_chunks": self._chunk_count,
            "embedding_model": settings.embedding_model,
            "llm_model": self.llm_name,
            **m
        }

# ---- Helpers ----
def build_chunks_from_docs(docs: List[Dict], chunk_size: int, overlap: int) -> List[Dict]:
    out = []
    for d in docs:
        for ch in chunk_text(d["text"], chunk_size, overlap):
            out.append({"title": d["title"], "section": d["section"], "text": ch})
    return out
