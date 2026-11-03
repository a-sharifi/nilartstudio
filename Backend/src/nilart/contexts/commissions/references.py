"""Bounded private reference images; validated on final submission, never public media."""
import base64
import hashlib
import warnings
from io import BytesIO
from pathlib import PurePath
from uuid import UUID

from PIL import Image
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text


class ReferenceImage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: UUID
    file_name: str = Field(min_length=1,max_length=200)
    content_base64: str = Field(min_length=1,max_length=6990508)

def decode_reference(value):
    name=value.file_name
    if name in {".",".."} or any(c in "/\\" or ord(c)<32 or ord(c)==127 for c in name):
        raise ValueError("invalid_reference")
    formats={".jpg":("JPEG","image/jpeg"),".jpeg":("JPEG","image/jpeg"),".png":("PNG","image/png"),".webp":("WEBP","image/webp")}
    kind,mime=formats[PurePath(name).suffix.lower()]
    content=base64.b64decode(value.content_base64,validate=True)
    if not 0<len(content)<=5*1024*1024:
        raise ValueError("invalid_reference")
    with warnings.catch_warnings():
        warnings.simplefilter("error",Image.DecompressionBombWarning)
        with Image.open(BytesIO(content),formats=[kind]) as image:
            if image.width*image.height>16_000_000 or max(image.size)>10_000 or getattr(image,"n_frames",1)!=1:
                raise ValueError("invalid_reference")
            image.verify()
        with Image.open(BytesIO(content),formats=[kind]) as image:
            image.load()
    metadata=dict(id=str(value.id),file_name=name,media_type=mime,size=len(content),sha256=hashlib.sha256(content).hexdigest())
    return metadata,content

def save_references(db,commission,decoded):
    for metadata,content in decoded:
        db.execute(text("INSERT INTO commission_references(commission_id,id,file_name,media_type,sha256,content) VALUES(:commission,:id,:file_name,:media_type,:sha256,:content) ON CONFLICT DO NOTHING"),dict(commission=commission,content=content,**{k:v for k,v in metadata.items() if k!="size"}))
