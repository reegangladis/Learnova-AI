import io
import logging
import re
import zlib
from typing import Any

from pydantic import BaseModel

logger = logging.getLogger(__name__)

MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".txt", ".md", ".markdown"}


class DocumentPage(BaseModel):
    page_number: int
    text: str


class DocumentExtractResult(BaseModel):
    title: str
    file_type: str
    total_pages: int
    pages: list[DocumentPage]
    raw_text: str


class PDFTextExtractor:
    """PDF, Markdown, and text document extractor for ai-service."""

    @classmethod
    def validate_file_metadata(
        cls,
        filename: str,
        file_bytes: bytes,
        max_bytes: int = MAX_DOCUMENT_BYTES,
    ) -> str:
        if not file_bytes or len(file_bytes) == 0:
            raise ValueError("Document is empty (0 bytes).")

        if len(file_bytes) > max_bytes:
            raise ValueError(
                f"Document exceeds maximum allowed size of {max_bytes // (1024 * 1024)} MB."
            )

        dot_idx = filename.rfind(".")
        if dot_idx == -1:
            raise ValueError(
                "Document missing file extension. Only .pdf, .txt, and .md files are supported."
            )

        ext = filename[dot_idx:].lower()
        if ext not in ALLOWED_DOCUMENT_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type '{ext}'. Supported formats: PDF, TXT, MD."
            )

        if ext == ".pdf":
            header_sample = file_bytes[:1024]
            if b"%PDF" not in header_sample:
                raise ValueError(
                    "Invalid PDF file format: file does not contain %PDF magic header."
                )
            return "pdf"

        return "text"

    @classmethod
    def normalize_text(cls, text: str) -> str:
        if not text:
            return ""
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
        cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        lines = [line.strip() for line in cleaned.split("\n")]
        return "\n".join(lines).strip()

    @classmethod
    def _decode_pdf_string(cls, raw: bytes) -> str:
        text = raw.decode("latin-1", errors="replace")
        text = (
            text.replace(r"\(", "(")
            .replace(r"\)", ")")
            .replace(r"\\", "\\")
            .replace(r"\n", "\n")
            .replace(r"\r", "\r")
            .replace(r"\t", "\t")
        )

        def replace_octal(match: re.Match) -> str:
            try:
                return chr(int(match.group(1), 8))
            except Exception:
                return ""

        return re.sub(r"\\([0-7]{1,3})", replace_octal, text)

    @classmethod
    def _extract_text_from_pdf_stream(cls, decompressed_data: bytes) -> str:
        extracted_lines: list[str] = []
        text_blocks = re.findall(rb"BT\s*(.*?)\s*ET", decompressed_data, re.DOTALL)
        if not text_blocks:
            text_blocks = [decompressed_data]

        for block in text_blocks:
            tokens: list[str] = []
            tj_matches = re.findall(rb"\(((?:\\\(|\\\)|[^\)])*)\)\s*(?:Tj|'|\")", block)
            for m in tj_matches:
                decoded = cls._decode_pdf_string(m)
                if decoded.strip():
                    tokens.append(decoded)

            array_matches = re.findall(rb"\[(.*?)\]\s*TJ", block, re.DOTALL)
            for arr in array_matches:
                items = re.findall(rb"\(((?:\\\(|\\\)|[^\)])*)\)", arr)
                line_parts = [cls._decode_pdf_string(item) for item in items]
                joined = "".join(line_parts).strip()
                if joined:
                    tokens.append(joined)

            hex_matches = re.findall(rb"<([0-9a-fA-F\s]+)>\s*(?:Tj|'|\")", block)
            for h in hex_matches:
                clean_hex = re.sub(rb"\s+", b"", h)
                try:
                    decoded = bytes.fromhex(clean_hex.decode("ascii")).decode(
                        "utf-8", errors="replace"
                    )
                    if decoded.strip():
                        tokens.append(decoded)
                except Exception:
                    pass

            if tokens:
                extracted_lines.append(" ".join(tokens))

        return "\n".join(extracted_lines).strip()

    @classmethod
    def _extract_pdf_pages(cls, file_bytes: bytes) -> list[DocumentPage]:
        try:
            import pypdf

            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            pages: list[DocumentPage] = []
            for idx, p in enumerate(reader.pages, start=1):
                page_text = p.extract_text() or ""
                cleaned = cls.normalize_text(page_text)
                if cleaned:
                    pages.append(DocumentPage(page_number=idx, text=cleaned))

            if pages:
                return pages
        except ImportError:
            pass
        except Exception as exc:
            logger.debug("pypdf extraction failed, using native: %s", exc)

        stream_matches = re.findall(
            rb"stream[\r\n]+(.*?)[\r\n]+endstream", file_bytes, re.DOTALL
        )
        page_chunks: list[str] = []

        for stream in stream_matches:
            decompressed: bytes | None = None
            try:
                decompressed = zlib.decompress(stream)
            except Exception:
                try:
                    decompressed = zlib.decompress(stream, -zlib.MAX_WBITS)
                except Exception:
                    decompressed = stream

            if decompressed:
                stream_text = cls._extract_text_from_pdf_stream(decompressed)
                if stream_text:
                    page_chunks.append(stream_text)

        if not page_chunks:
            return []

        pages: list[DocumentPage] = []
        for idx, text_seg in enumerate(page_chunks, start=1):
            normalized = cls.normalize_text(text_seg)
            if normalized:
                pages.append(DocumentPage(page_number=idx, text=normalized))

        return pages

    @classmethod
    def extract_document(
        cls,
        filename: str,
        file_bytes: bytes,
        title: str | None = None,
    ) -> DocumentExtractResult:
        file_type = cls.validate_file_metadata(filename, file_bytes)
        doc_title = title or filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

        if file_type == "pdf":
            pages = cls._extract_pdf_pages(file_bytes)
            if not pages:
                raise ValueError(
                    "No readable text could be extracted from the PDF document."
                )
            full_text = "\n\n".join(f"[Page {p.page_number}]\n{p.text}" for p in pages)
            return DocumentExtractResult(
                title=doc_title,
                file_type="pdf",
                total_pages=len(pages),
                pages=pages,
                raw_text=full_text,
            )

        try:
            content = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            content = file_bytes.decode("latin-1", errors="replace")

        normalized = cls.normalize_text(content)
        if not normalized:
            raise ValueError("Text document contains no readable content.")

        page = DocumentPage(page_number=1, text=normalized)
        return DocumentExtractResult(
            title=doc_title,
            file_type="text",
            total_pages=1,
            pages=[page],
            raw_text=normalized,
        )
