"""
Rule-based brew analysis engine.

All logic is deterministic and isolated from FastAPI so it is easy to test.
"""

from __future__ import annotations


def analyze_brew(
    points: list[dict],
    phases: list[dict],
    *,
    dose_weight: float,
    target_yield: float,
    taste_tags: list[str],
) -> dict:
    """
    Analyse a parsed brew and return stats, issues, suggestions,
    grinder guidance, and a numeric score.

    Parameters
    ----------
    points : list of point dicts (from parser)
    phases : list of phase dicts (from parser)
    dose_weight : grams of coffee used
    target_yield : desired water weight in grams
    taste_tags : list of taste descriptor strings

    Returns
    -------
    dict with keys: stats, issues, suggestions, grinder_suggestion, score
    """
    stats = _compute_stats(points, phases, dose_weight)
    issues: list[str] = []
    suggestions: list[str] = []

    _check_bloom(points, phases, issues, suggestions)
    _check_rest_between_pours(phases, issues, suggestions)
    _check_final_pour_flow(points, phases, issues, suggestions)
    _check_yield(stats, target_yield, issues, suggestions)
    grinder_suggestion = _grinder_suggestion(taste_tags)
    _check_taste(taste_tags, issues, suggestions)
    score = _compute_score(issues, stats, target_yield)

    return {
        "stats": stats,
        "issues": issues,
        "suggestions": suggestions,
        "grinder_suggestion": grinder_suggestion,
        "score": score,
    }


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

def _compute_stats(
    points: list[dict],
    phases: list[dict],
    dose_weight: float,
) -> dict:
    total_yield = points[-1]["weight"] if points else 0.0
    total_time_s = points[-1]["t"] if points else 0.0

    bloom_weight = 0.0
    if phases:
        bloom_end = phases[0]["end_s"]
        # Find the weight at bloom end
        for p in points:
            if p["t"] >= bloom_end:
                bloom_weight = p["weight"]
                break

    number_of_pours = len(phases)

    avg_flow_per_pour = []
    for phase in phases:
        phase_points = [
            p for p in points
            if phase["start_s"] <= p["t"] <= phase["end_s"]
        ]
        if len(phase_points) >= 2:
            duration = phase_points[-1]["t"] - phase_points[0]["t"]
            weight_added = phase_points[-1]["weight"] - phase_points[0]["weight"]
            avg_flow = weight_added / duration if duration > 0 else 0
            avg_flow_per_pour.append(round(avg_flow, 1))
        else:
            avg_flow_per_pour.append(0.0)

    return {
        "total_yield": round(total_yield, 1),
        "total_time_s": round(total_time_s, 1),
        "bloom_weight": round(bloom_weight, 1),
        "number_of_pours": number_of_pours,
        "avg_flow_rate_per_pour": avg_flow_per_pour,
        "dose_weight": dose_weight,
        "brew_ratio": round(total_yield / dose_weight, 1) if dose_weight > 0 else 0,
    }


# ---------------------------------------------------------------------------
# Issue checks
# ---------------------------------------------------------------------------

def _avg_flow_in_phase(points: list[dict], phase: dict) -> float:
    """Average flow_in during a phase."""
    pp = [p for p in points if phase["start_s"] <= p["t"] <= phase["end_s"]]
    if not pp:
        return 0.0
    return sum(p["flow_in"] for p in pp) / len(pp)


def _peak_flow_in_phase(points: list[dict], phase: dict) -> float:
    """Peak flow_in during a phase."""
    pp = [p for p in points if phase["start_s"] <= p["t"] <= phase["end_s"]]
    if not pp:
        return 0.0
    return max(p["flow_in"] for p in pp)


def _check_bloom(
    points: list[dict],
    phases: list[dict],
    issues: list[str],
    suggestions: list[str],
):
    if not phases:
        return
    bloom = phases[0]
    avg = _avg_flow_in_phase(points, bloom)
    if avg > 3.0:
        issues.append("Bloom pour too aggressive")
        suggestions.append(
            f"Slow bloom pour to below 3 ml/s (was {avg:.1f} ml/s)"
        )


def _check_rest_between_pours(
    phases: list[dict],
    issues: list[str],
    suggestions: list[str],
):
    for i in range(len(phases) - 1):
        rest = phases[i + 1]["start_s"] - phases[i]["end_s"]
        if rest < 25:
            issues.append(
                f"Insufficient rest before {phases[i + 1]['name']} "
                f"({rest:.0f}s)"
            )
            suggestions.append(
                f"Wait at least 25s between pours (rest before "
                f"{phases[i + 1]['name']} was only {rest:.0f}s)"
            )


def _check_final_pour_flow(
    points: list[dict],
    phases: list[dict],
    issues: list[str],
    suggestions: list[str],
):
    if len(phases) < 2:
        return  # need at least two pours to compare
    main_pour = phases[1] if len(phases) >= 2 else phases[0]
    final_pour = phases[-1]
    if main_pour is final_pour:
        return

    main_peak = _peak_flow_in_phase(points, main_pour)
    final_peak = _peak_flow_in_phase(points, final_pour)
    if final_peak > main_peak and main_peak > 0:
        issues.append("Final pour too fast")
        suggestions.append(
            f"Reduce final pour flow below main pour peak "
            f"({main_peak:.1f} ml/s); was {final_peak:.1f} ml/s"
        )


def _check_yield(
    stats: dict,
    target_yield: float,
    issues: list[str],
    suggestions: list[str],
):
    if target_yield <= 0:
        return
    actual = stats["total_yield"]
    deviation_pct = abs(actual - target_yield) / target_yield * 100
    if deviation_pct > 10:
        direction = "over" if actual > target_yield else "under"
        issues.append(
            f"Yield off target ({actual:.0f}g vs {target_yield:.0f}g, "
            f"{deviation_pct:.0f}% {direction})"
        )
        suggestions.append(
            f"Adjust pour to hit target yield of {target_yield:.0f}g"
        )


def _check_taste(
    taste_tags: list[str],
    issues: list[str],
    suggestions: list[str],
):
    tags_lower = [t.lower() for t in taste_tags]
    if "flat" in tags_lower:
        issues.append("Taste: flat")
        suggestions.append("Try increasing dose by 1-2g for more body")
    if "weak" in tags_lower:
        issues.append("Taste: weak")
        suggestions.append("Increase dose or decrease target yield for more strength")
    if "strong" in tags_lower:
        issues.append("Taste: overly strong")
        suggestions.append("Decrease dose or increase target yield")
    if "astringent" in tags_lower:
        issues.append("Taste: astringent")
        suggestions.append("Lower water temperature or pour more gently to reduce astringency")


# ---------------------------------------------------------------------------
# Grinder suggestion
# ---------------------------------------------------------------------------

def _grinder_suggestion(taste_tags: list[str]) -> str:
    tags_lower = [t.lower() for t in taste_tags]

    bitter = "bitter" in tags_lower
    sour = "sour" in tags_lower
    flat = "flat" in tags_lower
    weak = "weak" in tags_lower
    strong = "strong" in tags_lower

    parts: list[str] = []
    if bitter and sour:
        parts.append(
            "Both bitter and sour notes detected \u2014 this may indicate "
            "channelling rather than a simple grind issue. Try improving "
            "pour technique or distribution before changing grind."
        )
    elif bitter:
        parts.append("Taste feedback suggests grinding coarser (1-2 clicks).")
    elif sour:
        parts.append("Taste feedback suggests grinding finer (1-2 clicks).")

    if flat or weak:
        parts.append("Consider a higher dose for more extraction and body.")
    if strong:
        parts.append("Consider a lower dose or coarser grind to reduce intensity.")

    if not parts:
        if "balanced" in tags_lower or "sweet" in tags_lower:
            return "Taste feedback is positive \u2014 keep current grind setting."
        return "No strong taste signal for grind adjustment."

    return " ".join(parts)


# ---------------------------------------------------------------------------
# Score
# ---------------------------------------------------------------------------

def _compute_score(
    issues: list[str],
    stats: dict,
    target_yield: float,
) -> int:
    score = 100

    # Deduct for each issue
    heavy_keywords = {"aggressive", "too fast", "off target"}
    for issue in issues:
        lowered = issue.lower()
        if any(kw in lowered for kw in heavy_keywords):
            score -= 12
        else:
            score -= 7

    # Extra deduction for large yield deviation
    if target_yield > 0 and stats["total_yield"] > 0:
        dev = abs(stats["total_yield"] - target_yield) / target_yield
        if dev > 0.15:
            score -= 5

    return max(0, min(100, score))
