from io import BytesIO

import pymupdf
import pytest

from app.api.v1 import documents as documents_api
from app.models.entities import DocumentVersion
from app.services.pdf_text import HybridPDFTextExtractor, PDFTextExtractionError
from app.storage.local import LocalFileStorage


class FakeOCR:
    def __init__(self, text: str = "Texto reconhecido no documento digitalizado.") -> None:
        self.text = text
        self.calls = 0

    def extract(self, page: pymupdf.Page) -> str:
        del page
        self.calls += 1
        return self.text


def pdf_bytes(*page_contents: str) -> bytes:
    document = pymupdf.open()
    for content in page_contents:
        page = document.new_page()
        if content:
            page.insert_text((72, 72), content)
    data = document.tobytes()
    document.close()
    return data


def test_hybrid_extractor_uses_ocr_only_when_native_text_is_insufficient():
    ocr = FakeOCR()
    extractor = HybridPDFTextExtractor(
        max_pages=10,
        ocr=ocr,
        min_native_chars=10,
        max_ocr_pages=2,
    )

    result = extractor.extract(pdf_bytes("Conteúdo nativo suficiente.", ""))

    assert ocr.calls == 1
    assert result.page_count == 2
    assert result.ocr_page_count == 1
    assert "Conteúdo nativo suficiente." in result.text
    assert "Texto reconhecido" in result.text


def test_hybrid_extractor_limits_ocr_pages():
    extractor = HybridPDFTextExtractor(
        max_pages=10,
        ocr=FakeOCR(),
        min_native_chars=10,
        max_ocr_pages=1,
    )

    with pytest.raises(PDFTextExtractionError) as error:
        extractor.extract(pdf_bytes("", ""))

    assert error.value.code == "PDF_OCR_PAGE_LIMIT_EXCEEDED"


def test_ai_content_uses_hybrid_pdf_extraction(monkeypatch, tmp_path):
    storage = LocalFileStorage(str(tmp_path))
    path = storage.save(BytesIO(pdf_bytes("")), "scan.pdf")
    version = DocumentVersion(
        document_id="document-id",
        version_number=1,
        file_path=path,
        original_filename="scan.pdf",
        mime_type="application/pdf",
        file_size=100,
        created_by="user-id",
        change_summary="Documento digitalizado",
    )
    extractor = HybridPDFTextExtractor(
        max_pages=10,
        ocr=FakeOCR("Política reconhecida via OCR."),
        min_native_chars=10,
        max_ocr_pages=2,
    )
    monkeypatch.setattr(documents_api, "get_pdf_text_extractor", lambda: extractor)

    assert documents_api.content_for_ai(version, storage) == "Política reconhecida via OCR."
