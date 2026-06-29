"""Shared training-analytics helpers.

Pure functions with no DB or framework dependencies so they're trivial to unit-test
and reusable across the suggestion engine, progress charts, PR detection, and the
plateau detector.
"""
from __future__ import annotations

from datetime import date
from typing import Optional, Sequence, Tuple


def e1rm(weight: Optional[float], reps: Optional[int]) -> Optional[float]:
    """Estimated 1-rep max via the Epley formula: weight * (1 + reps / 30).

    Returns None if inputs are missing. A 1-rep set returns the weight itself.
    e1RM normalizes strength across rep ranges so sessions with different
    weight x rep schemes can be compared on a single axis.
    """
    if weight is None or reps is None or weight <= 0 or reps <= 0:
        return None
    return round(weight * (1 + reps / 30), 2)


def best_e1rm(sets) -> Optional[float]:
    """Highest e1RM across a collection of SetLog-like objects.

    Each set exposes `weight_kg` and `reps` (one load per row, regardless of side).
    Warm-ups are skipped when the flag is present; lighter sets wouldn't win anyway,
    but excluding them keeps the semantics honest.
    """
    best = None
    for s in sets:
        if getattr(s, "is_warmup", False):
            continue
        est = e1rm(getattr(s, "weight_kg", None), getattr(s, "reps", None))
        if est is not None and (best is None or est > best):
            best = est
    return best


def double_progression_cue(sets, target_reps_max: Optional[int]) -> Optional[dict]:
    """Double-progression signal from last session's working sets.

    Needs a rep-range ceiling (target_reps_max) to judge against. Returns:
      - level "add": you hit the top of the range on at least one set → add weight.
      - level "try": you didn't hit it, but reps + RIR says you had it in you
        (e.g. 7 reps @ 1 RIR or 6 reps @ 2 RIR against a max of 8) → try adding weight.
      - None: no rep ceiling, no working sets, or still mid-range.
    """
    if not target_reps_max:
        return None
    working = [s for s in sets if not getattr(s, "is_warmup", False) and s.rir is not None]
    if not working:
        return None

    if any(s.reps >= target_reps_max for s in working):
        return {
            "level": "add",
            "message": f"Add weight — you hit the top of your rep range ({target_reps_max}) last time.",
        }
    if any((s.reps + s.rir) >= target_reps_max for s in working):
        return {
            "level": "try",
            "message": f"Try adding weight — you had reps in reserve at the top of your range ({target_reps_max}) last time.",
        }
    return None


def linreg_slope(xs: Sequence[float], ys: Sequence[float]) -> Optional[float]:
    """Slope of the least-squares best-fit line through (xs, ys).

    Returns the change in y per unit x, or None if it can't be computed (fewer
    than 2 points, or all x identical). This is the plain closed-form formula:
    slope = Σ(x-x̄)(y-ȳ) / Σ(x-x̄)².
    """
    n = len(xs)
    if n < 2:
        return None
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    den = sum((x - mean_x) ** 2 for x in xs)
    if den == 0:
        return None
    return num / den


def detect_plateau(
    series: Sequence[Tuple[date, Optional[float]]],
    min_sessions: int = 4,
    window_weeks: int = 4,
    min_gain_per_week: float = 0.5,
) -> dict:
    """Decide whether an exercise's e1RM trend has stalled.

    `series` is (date, e1rm) sorted ascending. We fit a line through the recent
    window and read its slope in kg/week: clearly rising → progressing, flat or
    falling → plateaued. Thresholds are parameters, not truths — tune to taste.
    """
    pts = [(d, v) for d, v in series if v is not None]
    insufficient = {
        "is_plateaued": False,
        "status": "insufficient_data",
        "message": "Not enough history yet to judge a trend.",
        "slope_per_week": None,
        "weeks_analyzed": 0.0,
    }
    if len(pts) < min_sessions:
        return insufficient

    # Prefer points inside the recent window; fall back to the last min_sessions.
    last_date = pts[-1][0]
    window = [(d, v) for d, v in pts if (last_date - d).days <= window_weeks * 7]
    if len(window) < min_sessions:
        window = pts[-min_sessions:]

    span_weeks = (window[-1][0] - window[0][0]).days / 7
    if span_weeks < 2:
        return insufficient

    days = [(d - window[0][0]).days for d, _ in window]
    vals = [v for _, v in window]
    slope_day = linreg_slope(days, vals)
    if slope_day is None:
        return insufficient

    slope_per_week = round(slope_day * 7, 2)
    is_plateaued = slope_per_week < min_gain_per_week
    if is_plateaued:
        message = (
            f"e1RM has moved {slope_per_week:+.1f} kg/week over the last "
            f"{round(span_weeks, 1)} weeks — progress has stalled."
        )
    else:
        message = f"Progressing at {slope_per_week:+.1f} kg/week."

    return {
        "is_plateaued": is_plateaued,
        "status": "ok",
        "message": message,
        "slope_per_week": slope_per_week,
        "weeks_analyzed": round(span_weeks, 1),
    }
