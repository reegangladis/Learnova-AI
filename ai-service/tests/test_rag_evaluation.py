import time

import pytest
from app.embeddings.deterministic_provider import DeterministicEmbeddingProvider
from app.llm.mock_provider import MockLLMProvider
from app.rag.chunking import RecursiveCharacterChunker
from app.rag.pipeline import RAGPipeline
from app.rag.retriever import InMemoryVectorRetriever


@pytest.mark.asyncio
async def test_deterministic_rag_evaluation_benchmarks():
    """Deterministic RAG Evaluation Suite measuring accuracy, grounding, tenant isolation, and citations."""
    provider = DeterministicEmbeddingProvider(dimension=1536)
    llm = MockLLMProvider()
    retriever = InMemoryVectorRetriever(embedding_provider=provider)
    chunker = RecursiveCharacterChunker()

    # Benchmark corpus
    sample_documents = [
        {
            "id": "doc-cap",
            "course_id": "course-distributed-systems",
            "org_id": "org-alpha",
            "lesson_title": "CAP Theorem Fundamentals",
            "module_title": "Distributed Architectures",
            "content": (
                "The CAP theorem establishes that in a distributed computer system, it is impossible "
                "to simultaneously provide all three guarantees: Consistency, Availability, and "
                "Partition tolerance. When network partitions occur, distributed architectures "
                "must prioritize either consistent states or high availability."
            ),
        },
        {
            "id": "doc-raft",
            "course_id": "course-distributed-systems",
            "org_id": "org-alpha",
            "lesson_title": "Raft Consensus Protocol",
            "module_title": "Distributed Architectures",
            "content": (
                "Raft achieves consensus via leader election, log replication, and safety invariants. "
                "The leader accepts log entries from clients, replicates them across a majority quorum "
                "of follower nodes, and commits them once acknowledged."
            ),
        },
        {
            "id": "doc-tenant-beta",
            "course_id": "course-cloud-private",
            "org_id": "org-beta",
            "lesson_title": "Proprietary Organization Secrets",
            "module_title": "Internal Infrastructure",
            "content": "Confidential internal token signing keys and deployment topologies for tenant Beta.",
        },
    ]

    all_chunks = []
    for doc in sample_documents:
        chunks = chunker.chunk_text(
            document_id=doc["id"],
            text=doc["content"],
            chunk_size=300,
            metadata={
                "course_id": doc["course_id"],
                "organization_id": doc["org_id"],
                "lesson_title": doc["lesson_title"],
                "module_title": doc["module_title"],
            },
        )
        all_chunks.extend(chunks)

    embeddings = await provider.embed_documents([c.content for c in all_chunks])
    retriever.add_chunks(all_chunks, embeddings)
    pipeline = RAGPipeline(retriever=retriever, llm_provider=llm, min_similarity_threshold=0.20)

    # Metric 1: Retrieval Relevance and Citation Integrity
    t0 = time.perf_counter()
    res_cap = await pipeline.query(
        question="What tradeoffs does the CAP theorem describe under network partition?",
        course_id="course-distributed-systems",
        filters={"course_id": "course-distributed-systems", "organization_id": "org-alpha"},
    )
    elapsed_ms = (time.perf_counter() - t0) * 1000

    assert res_cap.is_grounded is True
    assert len(res_cap.sources) > 0
    # Citations must refer to actual retrieved sources
    retrieved_titles = [s.chunk.metadata["lesson_title"] for s in res_cap.sources]
    assert "CAP Theorem Fundamentals" in retrieved_titles
    assert "CAP Theorem Fundamentals" in res_cap.answer
    assert elapsed_ms < 500  # Latency under 500ms

    # Metric 2: Tenant & Course Filter Isolation
    # Student in org-alpha / course-distributed-systems querying for org-beta content
    res_cross_tenant = await pipeline.query(
        question="What are the proprietary secrets for tenant Beta?",
        course_id="course-distributed-systems",
        filters={"course_id": "course-distributed-systems", "organization_id": "org-alpha"},
    )
    assert res_cross_tenant.is_grounded is False
    assert len(res_cross_tenant.sources) == 0
    assert "Proprietary Organization Secrets" not in [
        s.chunk.metadata.get("lesson_title") for s in res_cross_tenant.sources
    ]

    # Metric 3: Unsupported Question Uncertainty
    res_unsupported = await pipeline.query(
        question="How do you calibrate an internal combustion carburetor?",
        course_id="course-distributed-systems",
        filters={"course_id": "course-distributed-systems"},
    )
    assert res_unsupported.is_grounded is False
    assert len(res_unsupported.sources) == 0
    assert "couldn't find specific course content" in res_unsupported.answer.lower()
