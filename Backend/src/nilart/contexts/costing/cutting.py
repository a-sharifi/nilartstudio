"""Exact uniform-grid cutting estimates; never assume mixed layouts or grain rotation."""
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

DIMENSION = r"^(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,6})?$"


class CuttingInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sheet_width: str = Field(pattern=DIMENSION)
    sheet_height: str = Field(pattern=DIMENSION)
    piece_width: str = Field(pattern=DIMENSION)
    piece_height: str = Field(pattern=DIMENSION)
    margin: str = Field(pattern=DIMENSION)
    gap: str = Field(pattern=DIMENSION)
    orientation: Literal["fixed", "allow_rotation"]

    @model_validator(mode="after")
    def positive_dimensions(self):
        if any(Decimal(getattr(self, key)) <= 0 for key in (
            "sheet_width", "sheet_height", "piece_width", "piece_height"
        )):
            raise ValueError("Dimensions must be positive")
        return self


class CuttingLayout(BaseModel):
    inputs: CuttingInput
    method: Literal["uniform_grid"] = "uniform_grid"
    fits: bool
    columns: int
    rows: int
    yield_count: int
    rotated: bool
    workshop_confirmation_required: bool = True


def calculate_layout(inputs: CuttingInput) -> CuttingLayout:
    width = Decimal(inputs.sheet_width) - 2 * Decimal(inputs.margin)
    height = Decimal(inputs.sheet_height) - 2 * Decimal(inputs.margin)
    gap = Decimal(inputs.gap)
    candidates = [(Decimal(inputs.piece_width), Decimal(inputs.piece_height), False)]
    if inputs.orientation == "allow_rotation":
        candidates.append((Decimal(inputs.piece_height), Decimal(inputs.piece_width), True))
    best = (0, 0, False)
    for piece_width, piece_height, rotated in candidates:
        columns = max(0, int((width + gap) // (piece_width + gap))) if width > 0 else 0
        rows = max(0, int((height + gap) // (piece_height + gap))) if height > 0 else 0
        if columns * rows > best[0] * best[1]:
            best = (columns, rows, rotated)
    columns, rows, rotated = best
    count = columns * rows
    if count > 1000000:
        raise ValueError("Layout exceeds the supported recipe yield")
    return CuttingLayout(inputs=inputs, fits=count > 0, columns=columns, rows=rows,
                         yield_count=count, rotated=rotated)
