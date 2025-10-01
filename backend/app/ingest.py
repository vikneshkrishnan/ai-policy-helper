import os, re, hashlib
from typing import List, Dict, Tuple
from .settings import settings

def _read_text_file(path: str) -> str:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read()

def _md_sections(text: str) -> List[Tuple[str, str]]:
    """
    Split markdown text by headings, preserving section structure.
    Returns list of (section_title, section_content) tuples.
    """
    parts = re.split(r"\n(?=#+\s)", text)
    out = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        lines = p.splitlines()
        # Extract section title from markdown heading
        if lines and lines[0].startswith("#"):
            title = lines[0].lstrip("# ").strip()
        else:
            title = "Introduction"
        out.append((title, p))
    return out or [("Introduction", text)]

def chunk_text(text: str, chunk_size: int, overlap: int) -> List[str]:
    """
    Chunk text with sliding window, preserving word boundaries.
    Args:
        text: Input text to chunk
        chunk_size: Target chunk size in tokens
        overlap: Number of overlapping tokens between chunks
    Returns:
        List of text chunks
    """
    tokens = text.split()
    if len(tokens) <= chunk_size:
        return [text]

    chunks = []
    i = 0
    while i < len(tokens):
        chunk = tokens[i:i+chunk_size]
        chunks.append(" ".join(chunk))
        if i + chunk_size >= len(tokens):
            break
        i += chunk_size - overlap
    return chunks

def load_documents(data_dir: str) -> List[Dict]:
    docs = []
    for fname in sorted(os.listdir(data_dir)):
        if not fname.lower().endswith((".md", ".txt")):
            continue
        path = os.path.join(data_dir, fname)
        text = _read_text_file(path)
        for section, body in _md_sections(text):
            docs.append({
                "title": fname,
                "section": section,
                "text": body
            })
    return docs

def doc_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
