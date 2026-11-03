"""Internal artwork producer boundary. No publication consent or final-file delivery."""
import struct
import zlib
from uuid import uuid4

from sqlalchemy import text

from nilart.contexts.customer.notifications import notify
from nilart.contexts.identity.infrastructure.management import SqlAccountManagement
from nilart.shared.outbox import enqueue


def validate_preview(data: bytes):
    """Bounded, non-interlaced 8-bit RGB/RGBA PNG; no active document formats."""
    if not 24 <= len(data) <= 5 * 1024 * 1024 or data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("Invalid PNG preview")
    offset, header, compressed, ended = 8, None, bytearray(), False
    while offset + 12 <= len(data):
        size = struct.unpack(">I", data[offset:offset + 4])[0]
        tag = data[offset + 4:offset + 8]
        end = offset + 12 + size
        if end > len(data):
            raise ValueError("Truncated PNG")
        chunk = data[offset + 8:end - 4]
        crc = struct.unpack(">I", data[end - 4:end])[0]
        if zlib.crc32(tag + chunk) & 0xffffffff != crc:
            raise ValueError("Invalid PNG checksum")
        if header is None:
            if tag != b"IHDR" or size != 13:
                raise ValueError("Missing PNG header")
            width, height, depth, color, compression, filters, interlace = struct.unpack(">IIBBBBB", chunk)
            if not width or not height or width > 4096 or height > 4096 or width * height > 4_000_000 or depth != 8 or color not in {2, 6} or compression or filters or interlace:
                raise ValueError("Unsupported PNG dimensions or encoding")
            header = (width, height, 3 if color == 2 else 4)
        elif tag == b"IDAT":
            compressed.extend(chunk)
        elif tag == b"IEND":
            if size or end != len(data):
                raise ValueError("Invalid PNG end")
            ended = True
            break
        elif tag[:1].isupper():
            raise ValueError("Unsupported critical PNG chunk")
        offset = end
    if not ended or not header or not compressed:
        raise ValueError("Incomplete PNG")
    width, height, channels = header
    expected = height * (1 + width * channels)
    decoder = zlib.decompressobj()
    try:
        pixels = decoder.decompress(compressed, expected + 1)
    except zlib.error as error:
        raise ValueError("Invalid PNG pixels") from error
    if len(pixels) != expected or not decoder.eof or decoder.unused_data or decoder.unconsumed_tail:
        raise ValueError("Invalid PNG pixel length")
    if any(pixels[row * (1 + width * channels)] > 4 for row in range(height)):
        raise ValueError("Invalid PNG filter")


def publish_review(db, commission_id, *, actor, expected_version: int, preview: bytes,
                   note: str, agreement: str, revision_allowance: int, artwork_id=None):
    """Called by a trusted producer after agreed terms exist. Caller owns commit.

    Small previews are stored privately in PostgreSQL, not public catalog media.
    Large final files require the separate fulfillment/private-storage integration.
    """
    validate_preview(preview)
    if not agreement.strip() or len(agreement) > 1000 or len(note) > 2000 or type(revision_allowance) is not int or not 0 <= revision_allowance <= 100:
        raise ValueError("Invalid agreed review terms")
    row = db.execute(text("SELECT * FROM commission_requests WHERE id=:id FOR UPDATE"), {"id": commission_id}).mappings().first()
    if row and (row["brief"].get("notebook") or {}).get("pricing") == "payment_required":
        raise ValueError("Notebook payment is required before production or artwork review")
    if row and artwork_id:
        existing = db.execute(text("SELECT * FROM commission_artwork_versions WHERE id=:id"), {"id": artwork_id}).mappings().first()
        if existing:
            if existing["commission_id"] == commission_id and bytes(existing["preview"]) == preview and existing["note"] == note and row["agreement"] == agreement and row["revision_allowance"] == revision_allowance:
                return existing["id"]
            raise ValueError("Artwork source conflict")
    if not row or row["version"] != expected_version or row["status"] not in {"awaiting_review", "in_progress", "revision_requested"}:
        raise ValueError("Commission version or state conflict")
    if row["agreement"] is not None and (row["agreement"] != agreement or row["revision_allowance"] != revision_allowance):
        raise ValueError("Agreed review terms are immutable")
    number = db.execute(text("SELECT COALESCE(max(number),0)+1 FROM commission_artwork_versions WHERE commission_id=:id"), {"id": commission_id}).scalar_one()
    id = artwork_id or uuid4()
    db.execute(text("INSERT INTO commission_artwork_versions(id,commission_id,number,note,preview) VALUES(:id,:commission,:number,:note,:preview)"), {"id": id, "commission": commission_id, "number": number, "note": note, "preview": preview})
    db.execute(text("UPDATE commission_requests SET version=version+1,status='awaiting_customer',agreement=:agreement,revision_allowance=:allowance,updated_at=now() WHERE id=:id"), {"id": commission_id, "agreement": agreement, "allowance": revision_allowance})
    SqlAccountManagement(db).audit(actor, row["account_id"], "commissions.artwork_ready", {"commission_id": str(commission_id), "artwork_id": str(id)}, "Artwork producer submitted a private review version")
    notify(db, row["account_id"], event=f"artwork_ready:{id}", category="artwork",
           title_fa="نسخه تازه اثر آماده بررسی است", title_en="New artwork version ready for review",
           reference="commission_id", id=commission_id)
    enqueue(db, "commissions.artwork_ready", {"commission_id": str(commission_id), "account_id": str(row["account_id"]), "artwork_id": str(id)})
    return id
