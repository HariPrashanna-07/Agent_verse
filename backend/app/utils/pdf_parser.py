import fitz  # PyMuPDF

def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> str:
    """Extracts raw text content from PDF file bytes in memory."""
    # Use filetype="pdf" instead of doc_type="pdf"
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text_content = []
    for page in doc:
        text_content.append(page.get_text())
    return "\n".join(text_content).strip()