"""Locally served region catalogue; no address information sent to third parties."""
import json
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/geography", tags=["geography"])


class City(BaseModel):
    id: str
    name_fa: str
    name_en: str


class Province(City):
    cities: list[City]


@lru_cache
def regions() -> list[Province]:
    return [Province.model_validate(row) for row in json.loads((Path(__file__).parent / "data/iran.json").read_text())]


@router.get("/iran", response_model=list[Province])
def iran_regions():
    return regions()
