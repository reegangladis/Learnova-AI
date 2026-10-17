import pytest
from app.embeddings.deterministic_provider import DeterministicEmbeddingProvider
from app.llm.mock_provider import MockLLMProvider
from app.rag.chunking import RecursiveCharacterChunker
from app.rag.pipeline import RAGPipeline
from app.rag.retriever import InMemoryVectorRetriever
from app.services.tutor_service import AITutorService, TutorSessionContext
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_tutor_service_chat_and_topics():
    provider = DeterministicEmbeddingProvider(dimension=1536)
    llm = MockLLMProvider()
    retriever = InMemoryVectorRetriever(embedding_provider=provider)
    chunker = RecursiveCharacterChunker()

    chunks = chunker.chunk_text(
        document_id="doc-algo",
        text="Dijkstra's algorithm finds the shortest path between nodes in a graph with non-negative weights.",
        chunk_size=150,
        metadata={"course_id": "c-graph", "lesson_title": "Graph Algorithms"},
    )
    embeddings = await provider.embed_documents([c.content for c in chunks])
    retriever.add_chunks(chunks, embeddings)

    pipeline = RAGPipeline(retriever=retriever, llm_provider=llm, min_similarity_threshold=0.1)
    service = AITutorService(rag_pipeline=pipeline)

    ctx = TutorSessionContext(
        session_id="session-1",
        student_id="student-1",
        course_id="c-graph",
    )
    response = await service.chat("How does Dijkstra's algorithm work?", ctx)
    assert response.is_grounded is True
    assert len(response.sources) > 0
    assert "Graph Algorithms" in response.message
    assert len(response.follow_up_questions) > 0
    assert "Core Curriculum" in response.recommended_topics


@pytest.mark.asyncio
async def test_ai_service_api_endpoints(ai_client: AsyncClient):
    # Test POST /api/v1/rag/chunk
    chunk_res = await ai_client.post(
        "/api/v1/rag/chunk",
        json={
            "document_id": "doc-test",
            "text": "First sentence. Second sentence. Third sentence. Fourth sentence.",
            "chunk_size": 35,
            "chunk_overlap": 10,
        },
    )
    assert chunk_res.status_code == 200
    chunk_data = chunk_res.json()
    assert chunk_data["total_chunks"] >= 2

    # Test POST /api/v1/rag/embed
    embed_res = await ai_client.post(
        "/api/v1/rag/embed",
        json={"texts": ["Hello world", "Learning AI"]},
    )
    assert embed_res.status_code == 200
    embed_data = embed_res.json()
    assert embed_data["count"] == 2
    assert len(embed_data["embeddings"][0]) > 0

    # Test POST /api/v1/tutor/chat
    tutor_res = await ai_client.post(
        "/api/v1/tutor/chat",
        json={
            "message": "Explain recursive functions",
            "session_id": "s-1",
            "chunks": [
                {
                    "chunk_id": "ch-1",
                    "document_id": "doc-1",
                    "chunk_index": 0,
                    "content": "A recursive function is a function that calls itself with a base case to terminate.",
                    "metadata": {"lesson_title": "Recursion Basics", "course_id": "c-1"},
                }
            ],
            "course_id": "c-1",
        },
    )
    assert tutor_res.status_code == 200
    tutor_data = tutor_res.json()
    assert tutor_data["is_grounded"] is True
    assert len(tutor_data["sources"]) > 0
    assert "Recursion Basics" in tutor_data["message"]


@pytest.mark.asyncio
async def test_ai_service_internal_auth_enforcement():
    from app.main import create_ai_application
    from httpx import ASGITransport

    app = create_ai_application()
    transport = ASGITransport(app=app)

    # 1. Unauthenticated request (no X-Internal-Service-Key header)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.post(
            "/api/v1/tutor/chat",
            json={"message": "ping", "session_id": "test"},
        )
        assert res.status_code == 401
        assert "Invalid or missing internal service authorization key" in res.json()["detail"]

    # 2. Invalid key
    async with AsyncClient(
        transport=transport,
        base_url="http://testserver",
        headers={"X-Internal-Service-Key": "wrong-key"},
    ) as client:
        res = await client.post(
            "/api/v1/tutor/chat",
            json={"message": "ping", "session_id": "test"},
        )
        assert res.status_code == 401
