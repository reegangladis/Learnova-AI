from app.embeddings.factory import EmbeddingFactory
from app.llm.base import LLMMessage
from app.llm.factory import LLMFactory
from app.rag.chunking import DocumentChunk
from app.rag.pipeline import RAGPipeline
from app.rag.retriever import InMemoryVectorRetriever
from app.schemas.rag import ChunkItemResponse
from app.services.tutor_service import (
    AITutorService,
    TutorResponse,
    TutorSessionContext,
)
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/tutor", tags=["Pedagogical AI Tutor"])


class TutorChatRequest(BaseModel):
    message: str = Field(..., description="Student inquiry message")
    session_id: str = Field(default="default-session")
    student_id: str = Field(default="student-1")
    course_id: str | None = None
    lesson_id: str | None = None
    history: list[dict[str, str]] = Field(default_factory=list)
    chunks: list[ChunkItemResponse] = Field(default_factory=list)


@router.post("/chat", response_model=TutorResponse, summary="AI Tutor chat interaction")
async def tutor_chat(req: TutorChatRequest) -> TutorResponse:
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
    tutor_service = AITutorService(rag_pipeline=pipeline)

    history_messages = [
        LLMMessage(role=m.get("role", "user"), content=m.get("content", ""))
        for m in req.history
    ]

    context = TutorSessionContext(
        session_id=req.session_id,
        student_id=req.student_id,
        course_id=req.course_id,
        lesson_id=req.lesson_id,
        history=history_messages,
    )

    return await tutor_service.chat(student_input=req.message, context=context)
