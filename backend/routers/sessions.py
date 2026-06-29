from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session as DBSession
from deps import get_db
from models import Session, SessionExercise, SetLog, Exercise
from schemas import (
    SessionCreate, SessionOut, SessionDetailOut,
    SessionExerciseCreate, SessionExerciseOut,
    SetCreate, SetOut, SuggestionOut, LastPerformanceOut
)
from analytics import best_e1rm
from uuid import UUID
from datetime import date as date_cls

router = APIRouter()


@router.post("/{user_id}", response_model=SessionOut)
def create_session(user_id: UUID, body: SessionCreate, db: DBSession = Depends(get_db)):
    session = Session(
        user_id=user_id,
        date=body.date,
        mesocycle_id=body.mesocycle_id,
        session_rpe=body.session_rpe,
        notes=body.notes,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/{user_id}", response_model=list[SessionOut])
def list_sessions(user_id: UUID, db: DBSession = Depends(get_db)):
    return db.query(Session).filter(
        Session.user_id == user_id
    ).order_by(Session.date.desc()).all()


@router.get("/{user_id}/by-date", response_model=list[SessionDetailOut])
def sessions_by_date(
    user_id: UUID,
    date: date_cls = Query(..., description="Calendar date, e.g. 2026-04-18"),
    db: DBSession = Depends(get_db),
):
    """Full session detail for a given day. Empty list = no session logged that day.

    Returns a list because nothing stops a user logging more than one session in a day.
    """
    return db.query(Session).filter(
        Session.user_id == user_id,
        Session.date == date,
    ).all()


@router.get("/{user_id}/last-performance/{exercise_id}", response_model=LastPerformanceOut)
def last_performance(user_id: UUID, exercise_id: UUID, db: DBSession = Depends(get_db)):
    """Most recent logged sets for an exercise — the 'beat the logbook' reference."""
    last_se = (
        db.query(SessionExercise)
        .join(Session)
        .filter(Session.user_id == user_id, SessionExercise.exercise_id == exercise_id)
        .order_by(Session.date.desc())
        .first()
    )
    if not last_se:
        return LastPerformanceOut(exercise_id=exercise_id, date=None, sets=[], best_e1rm=None)
    return LastPerformanceOut(
        exercise_id=exercise_id,
        date=last_se.session.date,
        sets=last_se.sets,
        best_e1rm=best_e1rm(last_se.sets),
    )


@router.get("/detail/{session_id}", response_model=SessionDetailOut)
def get_session(session_id: UUID, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.patch("/detail/{session_id}")
def update_session(session_id: UUID, body: SessionCreate, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.session_rpe = body.session_rpe
    session.notes = body.notes
    db.commit()
    db.refresh(session)
    return session


# ─── Session Exercises ────────────────────────────────────────────────────────

@router.post("/detail/{session_id}/exercises", response_model=SessionExerciseOut)
def add_exercise_to_session(
    session_id: UUID,
    body: SessionExerciseCreate,
    db: DBSession = Depends(get_db)
):
    se = SessionExercise(
        session_id=session_id,
        exercise_id=body.exercise_id,
        order_index=body.order_index,
        notes=body.notes,
    )
    db.add(se)
    db.commit()
    db.refresh(se)
    return se


# ─── Sets ─────────────────────────────────────────────────────────────────────

@router.post("/exercises/{session_exercise_id}/sets", response_model=SetOut)
def log_set(
    session_exercise_id: UUID,
    body: SetCreate,
    db: DBSession = Depends(get_db)
):
    se = db.query(SessionExercise).filter(SessionExercise.id == session_exercise_id).first()
    if not se:
        raise HTTPException(status_code=404, detail="Session exercise not found")

    set_log = SetLog(
        session_exercise_id=session_exercise_id,
        set_number=body.set_number,
        weight_kg=body.weight_kg,
        side=body.side,
        reps=body.reps,
        rir=body.rir,
        is_warmup=body.is_warmup,
        notes=body.notes,
    )
    db.add(set_log)
    db.commit()
    db.refresh(set_log)
    return set_log


@router.delete("/sets/{set_id}")
def delete_set(set_id: UUID, db: DBSession = Depends(get_db)):
    s = db.query(SetLog).filter(SetLog.id == set_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Set not found")
    db.delete(s)
    db.commit()
    return {"detail": "Deleted"}


# ─── Weight Suggestion ────────────────────────────────────────────────────────

def compute_suggestion(exercise: Exercise, last_sets: list[SetLog]) -> dict:
    increments = {
        "push":   2.5 if not exercise.is_unilateral else 1.25,
        "pull":   2.5 if not exercise.is_unilateral else 1.25,
        "squat":  5.0,
        "hinge":  5.0,
        "carry":  2.5,
    }
    step = increments.get(exercise.movement_pattern, 2.5)

    # Warm-ups don't reflect working effort, so they're excluded from the RIR read.
    working_sets = [s for s in last_sets if s.rir is not None and not s.is_warmup]
    if not working_sets:
        return {"reason": "No sets logged yet", "weight": None, "weight_left": None, "weight_right": None}

    avg_rir = sum(s.rir for s in working_sets) / len(working_sets)

    # Three clear bands on average reps-in-reserve. RIR can't signal a *missed*
    # lift (it bottoms out at 0 = failure), so there's no "drop weight" band here:
    # a low average means you're already training close to failure — hold and let
    # reps accumulate before adding load.
    if avg_rir >= 3:
        action, weight_change = "Add weight — too easy", step
    elif avg_rir >= 1:
        action, weight_change = "Same weight, aim for more reps", 0
    else:
        action, weight_change = "Consolidate before progressing", 0

    def last_side_weight(side: str):
        side_sets = [s for s in working_sets if s.side == side]
        if not side_sets:
            return None
        return round((side_sets[-1].weight_kg or 0) + weight_change, 2)

    if exercise.is_unilateral:
        return {
            "reason": action,
            "weight": None,
            "weight_left": last_side_weight("left"),
            "weight_right": last_side_weight("right"),
        }
    else:
        last_weight = working_sets[-1].weight_kg or 0
        return {
            "reason": action,
            "weight": round(last_weight + weight_change, 2),
            "weight_left": None,
            "weight_right": None,
        }


@router.get("/{user_id}/suggestions/{exercise_id}", response_model=SuggestionOut)
def get_suggestion(user_id: UUID, exercise_id: UUID, db: DBSession = Depends(get_db)):
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    # get last session where this exercise was logged
    last_se = (
        db.query(SessionExercise)
        .join(Session)
        .filter(Session.user_id == user_id, SessionExercise.exercise_id == exercise_id)
        .order_by(Session.date.desc())
        .first()
    )

    if not last_se:
        return SuggestionOut(
            exercise_id=exercise_id,
            exercise_name=exercise.name,
            suggested_weight=None,
            suggested_weight_left=None,
            suggested_weight_right=None,
            reason="No history found for this exercise",
            pr=None,
            last_session=None,
        )

    last_session_data = {
        "date": last_se.session.date,
        "sets": last_se.sets
    }

    # Find PR
    all_sets = (
        db.query(SetLog, Session.date)
        .join(SessionExercise, SetLog.session_exercise_id == SessionExercise.id)
        .join(Session, SessionExercise.session_id == Session.id)
        .filter(Session.user_id == user_id, SessionExercise.exercise_id == exercise_id)
        .all()
    )

    pr_data = None
    if all_sets:
        best_weight = -1.0
        best_reps = -1
        best_set = None
        for s_log, s_date in all_sets:
            if s_log.is_warmup:
                continue
            w = s_log.weight_kg or 0.0

            if w > best_weight or (w == best_weight and s_log.reps > best_reps):
                best_weight = w
                best_reps = s_log.reps
                best_set = (s_log, s_date)

        if best_set:
            pr_data = {
                "weight_kg": best_weight,
                "reps": best_set[0].reps,
                "date": best_set[1]
            }

    result = compute_suggestion(exercise, last_se.sets)
    return SuggestionOut(
        exercise_id=exercise_id,
        exercise_name=exercise.name,
        suggested_weight=result["weight"],
        suggested_weight_left=result["weight_left"],
        suggested_weight_right=result["weight_right"],
        reason=result["reason"],
        pr=pr_data,
        last_session=last_session_data,
    )
