"""Tests for _parse_elapsed() edge cases in parser.py.

Ensures that the Excel day-fraction heuristic does not misparse literal
sub-second elapsed values, and that true Excel fractions are still
converted correctly.
"""

import math
from datetime import datetime, timedelta

import pytest

from parser import _parse_elapsed


# --- Literal sub-second values (must NOT be treated as Excel fractions) ---

class TestLiteralSubSecondValues:
    """Values >= 0.01 and < 1 are literal fractional-second intervals."""

    def test_02_seconds(self):
        result = _parse_elapsed(0.2)
        assert result == pytest.approx(0.2), f"0.2 should be 0.2 s, got {result}"

    def test_05_seconds(self):
        result = _parse_elapsed(0.5)
        assert result == pytest.approx(0.5), f"0.5 should be 0.5 s, got {result}"

    def test_01_seconds(self):
        result = _parse_elapsed(0.1)
        assert result == pytest.approx(0.1), f"0.1 should be 0.1 s, got {result}"

    def test_099_seconds(self):
        result = _parse_elapsed(0.99)
        assert result == pytest.approx(0.99), f"0.99 should be 0.99 s, got {result}"

    def test_001_boundary(self):
        """0.01 is at the boundary — treated as literal seconds."""
        result = _parse_elapsed(0.01)
        assert result == pytest.approx(0.01), f"0.01 should be 0.01 s, got {result}"


# --- Excel day-fraction values (must be multiplied by 86400) ---

class TestExcelDayFractions:
    """Values > 0 and < 0.01 are treated as Excel day-fractions."""

    def test_excel_140s(self):
        """0.00162037 day ≈ 140 seconds."""
        val = 0.00162037
        result = _parse_elapsed(val)
        assert result == pytest.approx(val * 86400, rel=1e-4)

    def test_excel_small_fraction(self):
        """0.001 day ≈ 86.4 seconds."""
        result = _parse_elapsed(0.001)
        assert result == pytest.approx(86.4, rel=1e-4)

    def test_excel_very_small(self):
        """0.0001 day ≈ 8.64 seconds."""
        result = _parse_elapsed(0.0001)
        assert result == pytest.approx(8.64, rel=1e-4)


# --- Literal seconds >= 1 ---

class TestLiteralSeconds:
    """Values >= 1 are always treated as literal seconds."""

    def test_1_second(self):
        assert _parse_elapsed(1.0) == pytest.approx(1.0)

    def test_30_seconds(self):
        assert _parse_elapsed(30) == pytest.approx(30.0)

    def test_120_seconds(self):
        assert _parse_elapsed(120.5) == pytest.approx(120.5)


# --- Zero and negative ---

class TestZeroAndNegative:
    def test_zero(self):
        assert _parse_elapsed(0) == pytest.approx(0.0)

    def test_zero_float(self):
        assert _parse_elapsed(0.0) == pytest.approx(0.0)

    def test_negative(self):
        assert _parse_elapsed(-1.0) == pytest.approx(-1.0)


# --- None ---

class TestNone:
    def test_none_returns_none(self):
        assert _parse_elapsed(None) is None


# --- timedelta ---

class TestTimedelta:
    def test_timedelta_140s(self):
        assert _parse_elapsed(timedelta(seconds=140)) == pytest.approx(140.0)

    def test_timedelta_fractional(self):
        assert _parse_elapsed(timedelta(milliseconds=200)) == pytest.approx(0.2)


# --- datetime (midnight-based) ---

class TestDatetime:
    def test_midnight_offset(self):
        dt = datetime(2024, 1, 1, 0, 2, 20)  # 140 seconds after midnight
        assert _parse_elapsed(dt) == pytest.approx(140.0)


# --- String parsing ---

class TestStringParsing:
    def test_mmss(self):
        assert _parse_elapsed("02:20") == pytest.approx(140.0)

    def test_hhmmss(self):
        assert _parse_elapsed("0:02:20") == pytest.approx(140.0)

    def test_plain_numeric_string(self):
        assert _parse_elapsed("0.5") == pytest.approx(0.5)

    def test_invalid_string(self):
        assert _parse_elapsed("not-a-time") is None
