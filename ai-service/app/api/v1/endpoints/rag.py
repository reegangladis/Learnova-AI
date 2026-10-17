from app.embeddings.factory import EmbeddingFactory
from app.llm.factory import LLMFactory
from app.rag.chunking import DocumentChunk, RecursiveCharacterChunker
from app.rag.pipeline import RAGPipeline
from app.rag.retriever import InMemoryVectorRetriever
from app.schemas.rag import (
    ChunkItemResponse,
    ChunkTextRequest,
    ChunkTextResponse,
    DirectRAGQueryRequest,
    DirectRAGQueryResponse,
    EmbedRequest,
    EmbedResponse,
)
from fastapi import APIRouter

router = APIRouter(prefix="/rag", tags=["RAG & Embeddings Pipeline"])


@router.post("/chunk", response_model=ChunkTextResponse, summary="Chunk document text")
async def chunk_document_text(req: ChunkTextRequest) -> ChunkTextResponse:
    chunker = RecursiveCharacterChunker()
    chunks = chunker.chunk_text(
        document_id=req.document_id,
        text=req.text,
        chunk_size=req.chunk_size,
        chunk_overlap=req.chunk_overlap,
        metadata=req.metadata,
    )
    items = [
        ChunkItemResponse(
            chunk_id=c.chunk_id,
            document_id=c.document_id,
            chunk_index=c.chunk_index,
            content=c.content,
            metadata=c.metadata,
        )
        for c in chunks
    ]
    return ChunkTextResponse(
        document_id=req.document_id,
        total_chunks=len(items),
        chunks=items,
    )


@router.post("/embed", response_model=EmbedResponse, summary="Generate embedding vectors")
async def generate_embeddings(req: EmbedRequest) -> EmbedResponse:
    provider = EmbeddingFactory.get_provider()
    embeddings = await provider.embed_documents(req.texts)
    dim = len(embeddings[0]) if embeddings else 0
    return EmbedResponse(
        dimension=dim,
        count=len(embeddings),
        embeddings=embeddings,
    )


@router.post("/query", response_model=DirectRAGQueryResponse, summary="Query RAG pipeline")
async def query_rag(req: DirectRAGQueryRequest) -> DirectRAGQueryResponse:
    emb_provider = EmbeddingFactory.get_provider()
    llm_provider = LLMFactory.get_provider()
    retriever = InMemoryVectorRetriever(embedding_provider=emb_provider)

    if req.chunks:
        doc_chunks = [
            DocumentChunk(
                chunk_id=c.chunk_id,
                document_id=c.document_id,
                content=c.content,
                chunk_index=c.chunk_index,
                metadata=c.metadata,
            )
            for c in req.chunks
        ]
        embeddings = await emb_provider.embed_documents([c.content for c in doc_chunks])
        retriever.add_chunks(doc_chunks, embeddings)

    pipeline = RAGPipeline(retriever=retriever, llm_provider=llm_provider)
    res = await pipeline.query(question=req.question, course_id=req.course_id, filters=req.filters)

    sources = [
        {
            "chunk_id": s.chunk.chunk_id,
            "document_id": s.chunk.document_id,
            "lesson_title": s.chunk.metadata.get("lesson_title", "Lesson"),
            "similarity_score": s.score,
            "snippet": s.chunk.content[:200],
        }
        for s in res.sources
    ]

    return DirectRAGQueryResponse(
        answer=res.answer,
        is_grounded=res.is_grounded,
        sources=sources,
        follow_up_questions=res.follow_up_questions,
    )
