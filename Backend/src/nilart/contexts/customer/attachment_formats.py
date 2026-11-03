"""Validate bounded support evidence and derive its download media type."""
from io import BytesIO
from pathlib import PurePath

from PIL import Image
from pypdf import PdfReader

TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".pdf": "application/pdf"}


def media_type(name: str) -> str:
    try:
        return TYPES[PurePath(name).suffix.lower()]
    except KeyError as error:
        raise ValueError("Unsupported attachment") from error


def validate_attachment(name: str, content: bytes) -> None:
    if not 0 < len(content) <= 5 * 1024 * 1024:
        raise ValueError("Attachment size")
    kind = media_type(name)
    try:
        if kind in {"image/png", "image/jpeg"}:
            if kind == "image/jpeg" and (not content.startswith(b"\xff\xd8\xff") or not content.endswith(b"\xff\xd9")):
                raise ValueError("Invalid JPEG")
            formats = ["PNG"] if kind == "image/png" else ["JPEG"]
            with Image.open(BytesIO(content), formats=formats) as image:
                if image.width * image.height > 16_000_000 or max(image.size) > 10_000 or getattr(image, "n_frames", 1) != 1:
                    raise ValueError("Image dimensions or animation")
                image.verify()
            with Image.open(BytesIO(content), formats=formats) as image:
                image.load()
        else:
            if not content.startswith(b"%PDF-") or not content.rstrip().endswith(b"%%EOF"):
                raise ValueError("Invalid PDF")
            reader = PdfReader(BytesIO(content), strict=True)
            if reader.is_encrypted or not 1 <= int(reader.trailer["/Root"]["/Pages"]["/Count"]) <= 200 or not 1 <= len(reader.pages) <= 200:
                raise ValueError("PDF must have 1 to 200 readable pages")
    except Exception as error:
        raise ValueError("Invalid attachment") from error
