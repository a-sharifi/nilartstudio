from io import BytesIO

import pytest
from PIL import Image
from pypdf import PdfWriter

from nilart.contexts.customer.attachment_formats import media_type, validate_attachment


def jpeg():
    stream = BytesIO()
    Image.new("RGB", (2, 2), "red").save(stream, format="JPEG")
    return stream.getvalue()


def pdf():
    stream = BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=100, height=100)
    writer.write(stream)
    return stream.getvalue()


def test_real_jpeg_and_pdf_content_matches_filename():
    validate_attachment("تصویر.JPEG", jpeg())
    validate_attachment("evidence.pdf", pdf())
    assert media_type("IMAGE.JPG") == "image/jpeg"
    assert media_type("evidence.pdf") == "application/pdf"


@pytest.mark.parametrize("name,content", [("bad.pdf", b"%PDF-1.7\nfake\n%%EOF"), ("bad.jpg", b"\xff\xd8\xffbad\xff\xd9"), ("wrong.jpg", pdf()), ("wrong.pdf", jpeg()), ("truncated.jpg", jpeg()[:-10]), ("bad.svg", b"<svg/>"), ("large.pdf", b"0" * (5242880 + 1))])
def test_spoofed_truncated_unsupported_and_oversized_files_fail(name, content):
    with pytest.raises(ValueError):
        validate_attachment(name, content)


def test_encrypted_and_empty_pdfs_are_not_accepted():
    for encrypted in (False, True):
        writer = PdfWriter()
        if encrypted:
            writer.add_blank_page(width=100, height=100)
            writer.encrypt("private")
        stream = BytesIO()
        writer.write(stream)
        with pytest.raises(ValueError):
            validate_attachment("protected.pdf", stream.getvalue())


def test_palette_png_is_accepted_without_relaxing_commission_preview_rules():
    stream = BytesIO()
    Image.new("P", (2, 2)).save(stream, format="PNG")
    validate_attachment("palette.png", stream.getvalue())


def test_pdf_page_limit_is_enforced():
    writer = PdfWriter()
    for _ in range(201):
        writer.add_blank_page(width=100, height=100)
    stream = BytesIO()
    writer.write(stream)
    with pytest.raises(ValueError):
        validate_attachment("too-many-pages.pdf", stream.getvalue())
