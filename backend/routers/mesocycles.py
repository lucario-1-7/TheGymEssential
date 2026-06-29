from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from deps import get_db, verify_user, get_current_user
from models import Mesocycle, Session as WorkoutSession, SessionExercise, SetLog, ExerciseMuscle, UserMuscleVolume, User
from schemas import MesocycleCreate, MesocycleOut, ProgramSummaryOut, MuscleSummary
from uuid import UUID
from collections import defaultdict

router = APIRouter()


@router.post("/{user_id}", response_model=MesocycleOut)
def create_mesocycle(user_id: UUID, body: MesocycleCreate, db: Session = Depends(get_db), _user=Depends(verify_user)):
    meso = Mesocycle(
        user_id=user_id,
        goal=body.goal,
        total_weeks=body.total_weeks,
        start_date=body.start_date,
        is_deload=body.is_deload,
    )
    db.add(meso)
    db.commit()
    db.refresh(meso)
    return meso


@router.get("/{user_id}", response_model=list[MesocycleOut])
def list_mesocycles(user_id: UUID, db: Session = Depends(get_db), _user=Depends(verify_user)):
    return db.query(Mesocycle).filter(
        Mesocycle.user_id == user_id
    ).order_by(Mesocycle.start_date.desc()).all()


@router.get("/detail/{mesocycle_id}", response_model=MesocycleOut)
def get_mesocycle(mesocycle_id: UUID, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    meso = db.query(Mesocycle).filter(Mesocycle.id == mesocycle_id, Mesocycle.user_id == current.id).first()
    if not meso:
        raise HTTPException(status_code=404, detail="Mesocycle not found")
    return meso


# ─── Program Summary ──────────────────────────────────────────────────────────

@router.get("/detail/{mesocycle_id}/summary", response_model=ProgramSummaryOut)
def get_program_summary(mesocycle_id: UUID, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    meso = db.query(Mesocycle).filter(Mesocycle.id == mesocycle_id, Mesocycle.user_id == current.id).first()
    if not meso:
        raise HTTPException(status_code=404, detail="Mesocycle not found")

    sessions = db.query(WorkoutSession).filter(
        WorkoutSession.mesocycle_id == mesocycle_id
    ).all()

    if not sessions:
        return ProgramSummaryOut(
            mesocycle_id=mesocycle_id,
            total_sessions=0,
            weeks=meso.total_weeks,
            muscle_summary=[],
        )

    # sets per muscle per session date
    # { muscle_name: { date: set_count } }
    muscle_sets_by_date = defaultdict(lambda: defaultdict(int))

    for session in sessions:
        for se in session.session_exercises:
            set_count = len(se.sets)
            if set_count == 0:
                continue
            for em in se.exercise.muscle_targets:
                if em.is_primary:
                    muscle_name = em.muscle_group.name
                    muscle_sets_by_date[muscle_name][str(session.date)] += set_count

    # fetch user volume landmarks
    volume_map = {}
    user_volumes = db.query(UserMuscleVolume).filter(
        UserMuscleVolume.user_id == meso.user_id
    ).all()
    for uv in user_volumes:
        volume_map[uv.muscle_group.name] = uv

    weeks = meso.total_weeks if meso.total_weeks > 0 else 1

    muscle_summary = []
    for muscle_name, date_sets in muscle_sets_by_date.items():
        total_sets = sum(date_sets.values())
        frequency = len(date_sets)            # unique session dates hit
        sets_per_week = round(total_sets / weeks, 1)
        freq_per_week = round(frequency / weeks, 1)

        uv = volume_map.get(muscle_name)
        mev = uv.mev_sets if uv else 0
        mav = uv.mav_sets if uv else 0
        mrv = uv.mrv_sets if uv else 0

        if sets_per_week < mev:
            status = "below_mev"
        elif sets_per_week > mrv:
            status = "above_mrv"
        else:
            status = "in_mav"

        muscle_summary.append(MuscleSummary(
            muscle=muscle_name,
            sets_per_week=sets_per_week,
            frequency_per_week=freq_per_week,
            mev_sets=mev,
            mav_sets=mav,
            mrv_sets=mrv,
            status=status,
        ))

    muscle_summary.sort(key=lambda x: x.muscle)

    return ProgramSummaryOut(
        mesocycle_id=mesocycle_id,
        total_sessions=len(sessions),
        weeks=weeks,
        muscle_summary=muscle_summary,
    )
