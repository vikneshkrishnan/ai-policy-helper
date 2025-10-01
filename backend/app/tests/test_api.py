def test_health(client):
    """Test the health endpoint returns OK status."""
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"

def test_metrics_endpoint(client):
    """Test metrics endpoint returns proper structure."""
    r = client.get("/api/metrics")
    assert r.status_code == 200
    data = r.json()
    assert "total_docs" in data
    assert "total_chunks" in data
    assert "embedding_model" in data
    assert "llm_model" in data

def test_ingest(client):
    """Test document ingestion."""
    r = client.post("/api/ingest")
    assert r.status_code == 200
    data = r.json()
    assert "indexed_docs" in data
    assert "indexed_chunks" in data
    assert data["indexed_docs"] > 0
    assert data["indexed_chunks"] > 0

def test_ask_basic(client):
    """Test basic Q&A functionality."""
    # Ingest first
    client.post("/api/ingest")

    # Ask a deterministic question
    r = client.post("/api/ask", json={"query":"What is the refund window for small appliances?"})
    assert r.status_code == 200
    data = r.json()
    assert "citations" in data and len(data["citations"]) > 0
    assert "chunks" in data and len(data["chunks"]) > 0
    assert "answer" in data and isinstance(data["answer"], str)
    assert "metrics" in data

def test_acceptance_question_1(client):
    """
    Acceptance Test 1: Can a customer return a damaged blender after 20 days?
    Expected: Should cite Returns_and_Refunds.md and Warranty_Policy.md
    """
    client.post("/api/ingest")

    r = client.post("/api/ask", json={
        "query": "Can a customer return a damaged blender after 20 days?",
        "k": 4
    })
    assert r.status_code == 200
    data = r.json()

    # Check we got citations
    assert len(data["citations"]) > 0, "Should have citations"

    # Check that Returns_and_Refunds.md and Warranty_Policy.md are cited
    cited_files = {c["title"] for c in data["citations"]}
    assert "Returns_and_Refunds.md" in cited_files or "Warranty_Policy.md" in cited_files, \
        f"Should cite Returns_and_Refunds.md or Warranty_Policy.md, got: {cited_files}"

    # Check answer is reasonable
    assert len(data["answer"]) > 20, "Answer should be substantial"

def test_acceptance_question_2(client):
    """
    Acceptance Test 2: What's the shipping SLA to East Malaysia for bulky items?
    Expected: Should cite Delivery_and_Shipping.md and mention bulky item surcharge
    """
    client.post("/api/ingest")

    r = client.post("/api/ask", json={
        "query": "What's the shipping SLA to East Malaysia for bulky items?",
        "k": 4
    })
    assert r.status_code == 200
    data = r.json()

    # Check we got citations
    assert len(data["citations"]) > 0, "Should have citations"

    # Check that Delivery_and_Shipping.md is cited
    cited_files = {c["title"] for c in data["citations"]}
    assert "Delivery_and_Shipping.md" in cited_files, \
        f"Should cite Delivery_and_Shipping.md, got: {cited_files}"

    # Check answer contains relevant information
    answer_lower = data["answer"].lower()
    assert "east malaysia" in answer_lower or "bulky" in answer_lower, \
        "Answer should mention East Malaysia or bulky items"

def test_ask_with_custom_k(client):
    """Test that k parameter works correctly."""
    client.post("/api/ingest")

    r = client.post("/api/ask", json={"query": "What are the policies?", "k": 2})
    assert r.status_code == 200
    data = r.json()
    # Should return up to 2 citations
    assert len(data["citations"]) <= 2
    assert len(data["chunks"]) <= 2

def test_citations_have_required_fields(client):
    """Test that citations contain title and section."""
    client.post("/api/ingest")

    r = client.post("/api/ask", json={"query": "What is the refund policy?"})
    assert r.status_code == 200
    data = r.json()

    for citation in data["citations"]:
        assert "title" in citation
        assert citation["title"] is not None

    for chunk in data["chunks"]:
        assert "title" in chunk
        assert "text" in chunk
        assert len(chunk["text"]) > 0
