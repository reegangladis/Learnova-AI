import io
import logging
import re
import zlib
from typing import Any

from pydantic import BaseModel

from backend.app.core.errors import ValidationException

logger = logging.getLogger(__name__)

MAX_DOCUMENT_BYTES = 10 * 1024 * 1024  # 10 MB maximum document size
ALLOWED_DOCUMENT_EXTENSIONS = {".pdf", ".txt", ".md", ".markdown"}


class DocumentPage(BaseModel):
    """Extracted text page with page number and character count."""

    page_number: int
    text: str


class DocumentExtractResult(BaseModel):
    """Complete structured extraction result across all document pages."""

    title: str
    file_type: str
    total_pages: int
    pages: list[DocumentPage]
    raw_text: str


class PDFTextExtractor:
    """Secure, zero-dependency text extraction engine for PDF, Markdown, and text files.

    Features:
    - Enforces file type and 10 MB file size limits.
    - Validates PDF %PDF magic header to prevent disguised binary execution.
    - Gracefully decompresses FlateDecode PDF object streams via stdlib zlib.
    - Extracts text showing operators (Tj, TJ, ', \") with proper escape decoding.
    - Preserves page boundaries and 1-based page indexing for accurate source citations.
    - Sanitizes null bytes, control characters, and collapses redundant whitespace.
    """

    @classmethod
    def validate_file_metadata(
        cls,
        filename: str,
        file_bytes: bytes,
        max_bytes: int = MAX_DOCUMENT_BYTES,
    ) -> str:
        """Validates extension, size, and magic header, returning normalized file type."""
        if not file_bytes or len(file_bytes) == 0:
            raise ValidationException("Document is empty (0 bytes).")

        if len(file_bytes) > max_bytes:
            raise ValidationException(
                f"Document exceeds maximum allowed size of {max_bytes // (1024 * 1024)} MB."
            )

        dot_idx = filename.rfind(".")
        if dot_idx == -1:
            raise ValidationException(
                "Document missing file extension. Only .pdf, .txt, and .md files are supported."
            )

        ext = filename[dot_idx:].lower()
        if ext not in ALLOWED_DOCUMENT_EXTENSIONS:
            raise ValidationException(
                f"Unsupported file type '{ext}'. Supported formats: PDF, TXT, MD."
            )

        # Magic byte verification for PDF
        if ext == ".pdf":
            header_sample = file_bytes[:1024]
            if b"%PDF" not in header_sample:
                raise ValidationException(
                    "Invalid PDF file format: file does not contain %PDF magic header."
                )
            return "pdf"

        return "text"

    @classmethod
    def normalize_text(cls, text: str) -> str:
        """Cleans control characters and normalizes whitespace."""
        if not text:
            return ""
        # Strip non-printable control characters (except newline, tab, cr)
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
        cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        lines = [line.strip() for line in cleaned.split("\n")]
        return "\n".join(lines).strip()

    @classmethod
    def _decode_pdf_string(cls, raw: bytes) -> str:
        """Decodes PDF literal string with octal escapes and standard escapes."""
        # Standard escape replacements
        text = raw.decode("latin-1", errors="replace")
        text = (
            text.replace(r"\(", "(")
            .replace(r"\)", ")")
            .replace(r"\\", "\\")
            .replace(r"\n", "\n")
            .replace(r"\r", "\r")
            .replace(r"\t", "\t")
        )

        # Handle octal escapes like \040
        def replace_octal(match: re.Match) -> str:
            try:
                return chr(int(match.group(1), 8))
            except Exception:
                return ""

        return re.sub(r"\\([0-7]{1,3})", replace_octal, text)

    @classmethod
    def _extract_text_from_pdf_stream(cls, decompressed_data: bytes) -> str:
        """Parses PDF content stream operators (BT ... ET, Tj, TJ) to extract text."""
        extracted_lines: list[str] = []

        # Find all BT ... ET blocks
        text_blocks = re.findall(rb"BT\s*(.*?)\s*ET", decompressed_data, re.DOTALL)
        if not text_blocks:
            # Fallback: search for direct Tj / TJ operators outside explicit blocks
            text_blocks = [decompressed_data]

        for block in text_blocks:
            # Match literal strings: (string) Tj or ' or "
            # Match array strings: [(s1) -20 (s2)] TJ
            # Match hex strings: <48656c6c6f> Tj
            tokens: list[str] = []

            # 1. Match (text) Tj
            tj_matches = re.findall(rb"\(((?:\\\(|\\\)|[^\)])*)\)\s*(?:Tj|'|\")", block)
            for m in tj_matches:
                decoded = cls._decode_pdf_string(m)
                if decoded.strip():
                    tokens.append(decoded)

            # 2. Match array TJ: [(text) 10 (text2)] TJ
            array_matches = re.findall(rb"\[(.*?)\]\s*TJ", block, re.DOTALL)
            for arr in array_matches:
                items = re.findall(rb"\(((?:\\\(|\\\)|[^\)])*)\)", arr)
                line_parts = [cls._decode_pdf_string(item) for item in items]
                joined = "".join(line_parts).strip()
                if joined:
                    tokens.append(joined)

            # 3. Match hex strings: <414243> Tj
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
        """Extracts text pages from PDF bytes using pypdf if present, or zero-dependency fallback."""
        # 1. Try pypdf if installed
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
            logger.debug("pypdf extraction failed, attempting native parser: %s", exc)

        # 2. Native zero-dependency stream decompressor
        # Extract all FlateDecode streams
        stream_matches = re.findall(
            rb"stream[\r\n]+(.*?)[\r\n]+endstream", file_bytes, re.DOTALL
        )
        page_chunks: list[str] = []

        for stream in stream_matches:
            # Try decompressing with zlib
            decompressed: bytes | None = None
            try:
                decompressed = zlib.decompress(stream)
            except Exception:
                try:
                    # Try raw deflate without header
                    decompressed = zlib.decompress(stream, -zlib.MAX_WBITS)
                except Exception:
                    decompressed = stream  # Plain uncompressed stream

            if decompressed:
                stream_text = cls._extract_text_from_pdf_stream(decompressed)
                if stream_text:
                    page_chunks.append(stream_text)

        if not page_chunks:
            return []

        # Map extracted streams into sequential pages
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
        """Validates and extracts pages from a PDF, text, or markdown document."""
        file_type = cls.validate_file_metadata(filename, file_bytes)
        doc_title = title or filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

        if file_type == "pdf":
            pages = cls._extract_pdf_pages(file_bytes)
            if not pages:
                raise ValidationException(
                    "No readable text could be extracted from the PDF document. "
                    "Ensure the document contains selectable text and is not an empty or scanned image."
                )
            full_text = "\n\n".join(f"[Page {p.page_number}]\n{p.text}" for p in pages)
            return DocumentExtractResult(
                title=doc_title,
                file_type="pdf",
                total_pages=len(pages),
                pages=pages,
                raw_text=full_text,
            )

        # Plain text or Markdown
        try:
            content = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                content = file_bytes.decode("latin-1")
            except Exception as exc:
                raise ValidationException(f"Failed to decode text document: {exc}")

        normalized = cls.normalize_text(content)
        if not normalized:
            raise ValidationException("Text document contains no readable content.")

        page = DocumentPage(page_number=1, text=normalized)
        return DocumentExtractResult(
            title=doc_title,
            file_type="text",
            total_pages=1,
            pages=[page],
            raw_text=normalized,
        )
