from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session as DBSession
from collections import defaultdict
from datetime import date, timedelta
from uuid import UUID

from deps import get_db, verify_user
from models import Session
from schemas import VolumeOut, MuscleVolumeOut

router = APIRouter()


@router.get("/{user_id}", response_model=VolumeOut)
def muscle_volume(
    user_id: UUID,
    period: str = Query("week", pattern="^(week|all)$"),
    db: DBSession = Depends(get_db),
    _user=Depends(verify_user),
):
    """Working sets per muscle, counted only where that muscle is the exercise's
    PRIMARY target. A unilateral set logged as left+right counts once.

    period=week → last 7 days; period=all → all time.
    """
    q = db.query(Session).filter(Session.user_id == user_id)
    if period == "week":
        q = q.filter(Session.date >= date.today() - timedelta(days=7))
    sessions = q.all()

    counts = defaultdict(int)
    total = 0
    for session in sessions:
        for se in session.session_exercises:
            # distinct working set numbers (unilateral L+R share a set_number)
            n = len({s.set_number for s in se.sets if not s.is_warmup})
            if n == 0:
                continue
            for em in se.exercise.muscle_targets:
                if em.is_primary:
                    counts[em.muscle_group.name] += n
                    total += n

    muscles = [MuscleVolumeOut(muscle=m, sets=c) for m, c in counts.items()]
    muscles.sort(key=lambda x: x.sets, reverse=True)
    return VolumeOut(period=period, total_sets=total, muscles=muscles)
