from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from collections import OrderedDict
from uuid import UUID

from deps import get_db, verify_user
from models import Session, SessionExercise, Exercise
from schemas import ExerciseProgressOut, ProgressPoint, PlateauOut, PRData
from analytics import e1rm, best_e1rm, detect_plateau

router = APIRouter()


@router.get("/{user_id}/exercise/{exercise_id}", response_model=ExerciseProgressOut)
def exercise_progress(user_id: UUID, exercise_id: UUID, db: DBSession = Depends(get_db), _user=Depends(verify_user)):
    """Per-session progression for one exercise: e1RM / top-weight / volume over
    time, the all-time PR, and a plateau verdict on the e1RM trend.

    Warm-up sets are excluded from every metric.
    """
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    rows = (
        db.query(SessionExercise)
        .join(Session)
        .filter(Session.user_id == user_id, SessionExercise.exercise_id == exercise_id)
        .order_by(Session.date)
        .all()
    )

    # Accumulate working sets per calendar date (a date may hold >1 session_exercise).
    sets_by_date = OrderedDict()
    for se in rows:
        working = [s for s in se.sets if not s.is_warmup]
        if not working:
            continue
        sets_by_date.setdefault(se.session.date, []).extend(working)

    series: list[ProgressPoint] = []
    best_overall = None
    pr = None  # heaviest working set (weight, then reps), with its date

    for d, sets in sets_by_date.items():
        day_e1rm = best_e1rm(sets)
        weights = [(s.weight_kg or 0.0) for s in sets]
        top_weight = max(weights) if weights else None
        total_volume = round(sum((s.weight_kg or 0.0) * s.reps for s in sets), 1)

        series.append(ProgressPoint(
            date=d,
            e1rm=day_e1rm,
            top_weight=top_weight,
            total_volume=total_volume,
        ))

        if day_e1rm is not None and (best_overall is None or day_e1rm > best_overall):
            best_overall = day_e1rm

        # Track weight PR (heaviest set; tie broken by reps).
        for s in sets:
            w = s.weight_kg or 0.0
            if pr is None or w > pr["weight_kg"] or (w == pr["weight_kg"] and s.reps > pr["reps"]):
                pr = {"weight_kg": w, "reps": s.reps, "date": d}

    plateau = detect_plateau([(p.date, p.e1rm) for p in series])

    return ExerciseProgressOut(
        exercise_id=exercise_id,
        exercise_name=exercise.name,
        series=series,
        pr=PRData(**pr) if pr else None,
        best_e1rm=best_overall,
        plateau=PlateauOut(**plateau),
    )
