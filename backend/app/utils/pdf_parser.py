import logging
import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """
    Extract raw text content from PDF file bytes in memory.
    Returns an empty string with a warning if the PDF is corrupt or encrypted.
    """
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        if doc.is_encrypted:
            logger.warning("PDF is encrypted — text extraction skipped.")
            return ""

        text_content = []
        for page in doc:
            text_content.append(page.get_text())

        full_text = "\n".join(text_content).strip()
        logger.info(
            "PDF parsed: %d page(s), %d character(s) extracted.",
            doc.page_count,
            len(full_text),
        )
        return full_text

    except fitz.FileDataError as exc:
        logger.error("PDF parsing failed (corrupt file): %s", exc)
        return ""
    except Exception as exc:
        logger.error("Unexpected PDF parsing error: %s", exc)
        return ""