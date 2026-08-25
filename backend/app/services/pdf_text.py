from dataclasses import dataclass
from typing import Protocol

import pymupdf

from app.core.config import settings


class PDFTextExtractionError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class PageOCR(Protocol):
    def extract(self, page: pymupdf.Page) -> str: ...


@dataclass(frozen=True)
class ExtractedPDFText:
    text: str
    page_count: int
    ocr_page_count: int


class PyMuPDFTesseractOCR:
    def __init__(self, *, languages: str, dpi: int) -> None:
        self.languages = languages
        self.dpi = dpi

    def extract(self, page: pymupdf.Page) -> str:
        try:
            text_page = page.get_textpage_ocr(
                language=self.languages,
                dpi=self.dpi,
                full=True,
            )
            return normalize_text(page.get_text("text", sort=True, textpage=text_page))
        except (RuntimeError, ValueError) as exc:
            raise PDFTextExtractionError(
                "OCR_UNAVAILABLE",
                "OCR is unavailable for this PDF",
            ) from exc


class HybridPDFTextExtractor:
    def __init__(
        self,
        *,
        max_pages: int,
        ocr: PageOCR | None,
        min_native_chars: int,
        max_ocr_pages: int,
    ) -> None:
        if max_pages < 1 or max_ocr_pages < 1:
            raise ValueError("PDF and OCR page limits must be positive")
        if min_native_chars < 0:
            raise ValueError("Native text threshold cannot be negative")
        self.max_pages = max_pages
        self.ocr = ocr
        self.min_native_chars = min_native_chars
        self.max_ocr_pages = max_ocr_pages

    def extract(self, pdf_bytes: bytes) -> ExtractedPDFText:
        if not pdf_bytes:
            raise PDFTextExtractionError("PDF_EMPTY", "The PDF is empty")
        try:
            with pymupdf.open(stream=pdf_bytes, filetype="pdf") as document:
                if document.needs_pass:
                    raise PDFTextExtractionError(
                        "PDF_PASSWORD_PROTECTED",
                        "Password-protected PDFs cannot be processed",
                    )
                page_count = document.page_count
                if page_count < 1:
                    raise PDFTextExtractionError("PDF_EMPTY", "The PDF is empty")
                if page_count > self.max_pages:
                    raise PDFTextExtractionError(
                        "PDF_PAGE_LIMIT_EXCEEDED",
                        f"PDF must have at most {self.max_pages} pages",
                    )

                texts: list[str] = []
                ocr_page_count = 0
                for index in range(page_count):
                    page = document.load_page(index)
                    native_text = normalize_text(page.get_text("text", sort=True))
                    if len(native_text) >= self.min_native_chars or self.ocr is None:
                        texts.append(native_text)
                        continue

                    ocr_page_count += 1
                    if ocr_page_count > self.max_ocr_pages:
                        raise PDFTextExtractionError(
                            "PDF_OCR_PAGE_LIMIT_EXCEEDED",
                            f"PDF must require OCR on at most {self.max_ocr_pages} pages",
                        )
                    texts.append(self.ocr.extract(page))
        except PDFTextExtractionError:
            raise
        except (pymupdf.FileDataError, RuntimeError, ValueError) as exc:
            raise PDFTextExtractionError(
                "PDF_TEXT_UNAVAILABLE",
                "Text could not be extracted from this PDF",
            ) from exc

        content = "\n\n".join(text for text in texts if text).strip()
        if not content:
            raise PDFTextExtractionError(
                "PDF_TEXT_UNAVAILABLE",
                "This PDF does not contain readable text",
            )
        return ExtractedPDFText(
            text=content,
            page_count=page_count,
            ocr_page_count=ocr_page_count,
        )


def normalize_text(text: str) -> str:
    lines = [" ".join(line.split()) for line in text.replace("\x00", "").splitlines()]
    return "\n".join(line for line in lines if line).strip()


def get_pdf_text_extractor() -> HybridPDFTextExtractor:
    ocr = (
        PyMuPDFTesseractOCR(languages=settings.ocr_languages, dpi=settings.ocr_dpi)
        if settings.ocr_enabled
        else None
    )
    return HybridPDFTextExtractor(
        max_pages=settings.pdf_max_pages,
        ocr=ocr,
        min_native_chars=settings.ocr_min_native_chars,
        max_ocr_pages=settings.ocr_max_pages,
    )
