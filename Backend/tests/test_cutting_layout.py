import pytest
from pydantic import ValidationError

from nilart.contexts.costing.cutting import CuttingInput, calculate_layout


def layout(**changes):
    return calculate_layout(CuttingInput(**dict(dict(sheet_width="100", sheet_height="60",
        piece_width="30", piece_height="20", margin="0", gap="0", orientation="fixed"), **changes)))


def test_fixed_grain_does_not_rotate():
    assert layout(piece_width="60", piece_height="40").yield_count == 1
    rotated = layout(piece_width="60", piece_height="40", orientation="allow_rotation")
    assert (rotated.yield_count, rotated.rotated) == (2, True)


def test_margins_and_gaps_are_per_edge_and_between_pieces():
    result = layout(margin="5", gap="1")
    assert (result.columns, result.rows, result.yield_count) == (2, 2, 4)
    assert result.workshop_confirmation_required


def test_exact_decimal_boundary_and_impossible_layout():
    assert layout(sheet_width="0.3", sheet_height="0.3", piece_width="0.1", piece_height="0.1").yield_count == 9
    assert not layout(margin="50").fits
    assert not layout(piece_width="101").fits


@pytest.mark.parametrize("changes", [{"piece_width":"0"}, {"margin":"-1"}, {"gap":"1e2"}, {"orientation":"any"}])
def test_invalid_inputs(changes):
    with pytest.raises(ValidationError):
        layout(**changes)


def test_unsupported_yield_is_rejected():
    with pytest.raises(ValueError):
        layout(piece_width="0.000001", piece_height="0.000001")
