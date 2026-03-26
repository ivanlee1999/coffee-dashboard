"""
Excel brew curve parser.

Parses .xlsx exports from coffee scales, normalizes time series data,
detects pour phases, and identifies key brew events.
"""

from io import BytesIO
from datetime import datetime, timedelta

from openpyxl import load_workbook

REQUIRED_COLUMNS = {
    "elapsed",
    "pressure",
    "current_total_shot_weight",
    "flow_in",
    "flow_out",
    "water_temperature_boiler",
    "water_temperature_in",
    "water_temperature_basket",
}

# --- Thresholds for phase detection ---
FLOW_IN_THRESHOLD = 0.3       # ml/s – flow_in above this means water is being poured
MIN_POUR_DURATION_S = 2.0     # seconds – ignore pours shorter than this
MERGE_GAP_S = 3.0             # seconds – merge pours separated by less than this
MIN_SAMPLES_ABOVE = 2         # consecutive samples above threshold to start a pour


def parse_brew_xlsx(file_obj) -> dict:
    """
    Parse an xlsx brew curve file.

    Returns
    -------
    dict with keys:
        points  – list of dicts, each with keys: t, pressure, weight, flow_in,
                  flow_out, temp_boiler, temp_in, temp_basket
        phases  – list of dicts: {name, start_s, end_s}
        events  – list of dicts: {type, time_s}
        series  – pre-built chart series {flow_out: [{t, v}], weight: [{t, v}],
                  flow_in: [{t, v}], pressure: [{t, v}],
                  temp_basket: [{t, v}]}
    """
    rows = _load_rows(file_obj)
    if not rows:
        raise ValueError("Workbook contains no data rows.")
    points = _normalize_rows(rows)
    points = _deduplicate_and_sort(points)
    phases = _detect_pours(points)
    events = _detect_events(points, phases)
    series = _build_series(points)
    return {
        "points": points,
        "phases": phases,
        "events": events,
        "series": series,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _load_rows(file_obj) -> list[dict]:
    """Read the first worksheet and return a list of row dicts."""
    if isinstance(file_obj, bytes):
        file_obj = BytesIO(file_obj)
    elif hasattr(file_obj, "read"):
        content = file_obj.read()
        file_obj = BytesIO(content)

    wb = load_workbook(file_obj, read_only=True, data_only=True)
    ws = wb.active

    # Read header row
    header_row = next(ws.iter_rows(min_row=1, max_row=1, values_only=True))
    headers = [str(h).strip().lower() if h else "" for h in header_row]

    # Validate
    found = set(headers)
    missing = REQUIRED_COLUMNS - found
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")

    col_map = {name: idx for idx, name in enumerate(headers)}
    rows = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if row is None or all(c is None for c in row):
            continue
        entry = {}
        for col_name in REQUIRED_COLUMNS:
            entry[col_name] = row[col_map[col_name]]
        rows.append(entry)

    wb.close()
    return rows


def _parse_elapsed(value) -> float | None:
    """
    Convert an elapsed value to seconds (float).

    Handles:
      - numeric seconds (int/float)
      - Excel time fraction (e.g. 0.00162037 for ~140 s)
      - HH:MM:SS or MM:SS strings
      - datetime/timedelta objects
    """
    if value is None:
        return None

    # Already numeric
    if isinstance(value, (int, float)):
        v = float(value)
        # Heuristic: Excel time fractions are < 1 for durations under ~24 h.
        # If the value is between 0 and 1 exclusive and seems too small to be
        # raw seconds for a brew (brews rarely last < 1 s), treat as fraction
        # of a day.
        if 0 < v < 1:
            return v * 86400.0
        return v

    if isinstance(value, timedelta):
        return value.total_seconds()

    if isinstance(value, datetime):
        # Midnight-based encoding
        midnight = value.replace(hour=0, minute=0, second=0, microsecond=0)
        return (value - midnight).total_seconds()

    # String parsing
    s = str(value).strip()
    parts = s.split(":")
    try:
        if len(parts) == 3:
            h, m, sec = parts
            return int(h) * 3600 + int(m) * 60 + float(sec)
        if len(parts) == 2:
            m, sec = parts
            return int(m) * 60 + float(sec)
        return float(s)
    except (ValueError, TypeError):
        return None


def _safe_float(v, default=0.0) -> float:
    if v is None:
        return default
    try:
        return float(v)
    except (ValueError, TypeError):
        return default


def _normalize_rows(rows: list[dict]) -> list[dict]:
    """Convert raw row dicts to typed point dicts with time in seconds."""
    points = []
    for row in rows:
        t = _parse_elapsed(row["elapsed"])
        if t is None:
            continue
        points.append({
            "t": round(t, 3),
            "pressure": _safe_float(row["pressure"]),
            "weight": _safe_float(row["current_total_shot_weight"]),
            "flow_in": _safe_float(row["flow_in"]),
            "flow_out": _safe_float(row["flow_out"]),
            "temp_boiler": _safe_float(row["water_temperature_boiler"]),
            "temp_in": _safe_float(row["water_temperature_in"]),
            "temp_basket": _safe_float(row["water_temperature_basket"]),
        })
    return points


def _deduplicate_and_sort(points: list[dict]) -> list[dict]:
    """Sort by time and remove duplicate timestamps (keep last)."""
    points.sort(key=lambda p: p["t"])
    seen: dict[float, int] = {}
    for i, p in enumerate(points):
        seen[p["t"]] = i
    indices = sorted(seen.values())
    return [points[i] for i in indices]


def _smooth(values: list[float], window: int = 5) -> list[float]:
    """Simple moving-average smoothing."""
    if len(values) <= window:
        return values
    out = []
    half = window // 2
    for i in range(len(values)):
        lo = max(0, i - half)
        hi = min(len(values), i + half + 1)
        out.append(sum(values[lo:hi]) / (hi - lo))
    return out


def _detect_pours(points: list[dict]) -> list[dict]:
    """
    Detect pour phases from flow_in signal.

    A pour starts when flow_in exceeds FLOW_IN_THRESHOLD for at least
    MIN_SAMPLES_ABOVE consecutive samples, and ends when it drops below for
    the same number of samples.
    """
    if not points:
        return []

    # Identify raw above-threshold regions
    above = [p["flow_in"] > FLOW_IN_THRESHOLD for p in points]
    regions: list[tuple[int, int]] = []  # (start_idx, end_idx) inclusive
    in_region = False
    start = 0
    consecutive = 0

    for i, is_above in enumerate(above):
        if is_above:
            if not in_region:
                consecutive += 1
                if consecutive >= MIN_SAMPLES_ABOVE:
                    in_region = True
                    start = i - consecutive + 1
            # else: already in region, continue
        else:
            if in_region:
                regions.append((start, i - 1))
                in_region = False
            consecutive = 0

    if in_region:
        regions.append((start, len(points) - 1))

    # Convert to time-based
    raw_phases = [
        (points[s]["t"], points[e]["t"])
        for s, e in regions
    ]

    # Filter short pours
    raw_phases = [(s, e) for s, e in raw_phases if (e - s) >= MIN_POUR_DURATION_S]

    # Merge close pours
    merged: list[tuple[float, float]] = []
    for s, e in raw_phases:
        if merged and (s - merged[-1][1]) < MERGE_GAP_S:
            merged[-1] = (merged[-1][0], e)
        else:
            merged.append((s, e))

    # Name phases
    phases = []
    for i, (s, e) in enumerate(merged):
        if i == 0:
            name = "Bloom"
        else:
            name = f"Pour {i + 1}"
        phases.append({
            "name": name,
            "start_s": round(s, 1),
            "end_s": round(e, 1),
        })

    return phases


def _detect_events(points: list[dict], phases: list[dict]) -> list[dict]:
    """Detect key brew events: bloom end, drawdown points."""
    events = []

    if not phases:
        return events

    # Bloom end = end of the first phase
    events.append({"type": "bloom_end", "time_s": phases[0]["end_s"]})

    # Drawdown = after each pour (except possibly the last), when flow_in is
    # near zero and weight stabilises or flow_out dominates.  For MVP, mark
    # the midpoint of each inter-pour gap.
    for i in range(len(phases) - 1):
        gap_start = phases[i]["end_s"]
        gap_end = phases[i + 1]["start_s"]
        if gap_end - gap_start > 2:
            events.append({
                "type": "drawdown",
                "time_s": round((gap_start + gap_end) / 2, 1),
            })

    # Pour start/end events
    for phase in phases:
        events.append({"type": "pour_start", "time_s": phase["start_s"]})
        events.append({"type": "pour_end", "time_s": phase["end_s"]})

    return events


def _build_series(points: list[dict]) -> dict:
    """Build chart-ready series from parsed points."""
    ts = [p["t"] for p in points]
    flow_out_raw = [p["flow_out"] for p in points]
    flow_out_smooth = _smooth(flow_out_raw)
    flow_in_raw = [p["flow_in"] for p in points]
    flow_in_smooth = _smooth(flow_in_raw)

    return {
        "flow_out": [{"t": t, "v": round(v, 2)} for t, v in zip(ts, flow_out_smooth)],
        "flow_in": [{"t": t, "v": round(v, 2)} for t, v in zip(ts, flow_in_smooth)],
        "weight": [{"t": p["t"], "v": round(p["weight"], 1)} for p in points],
        "pressure": [{"t": p["t"], "v": round(p["pressure"], 2)} for p in points],
        "temp_basket": [{"t": p["t"], "v": round(p["temp_basket"], 1)} for p in points],
    }
