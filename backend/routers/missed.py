from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession
from datetime import date, timedelta
from uuid import UUID

from deps import get_db
from models import Session, Program, ProgramDay, MissedSession
from schemas import MissedSessionOut, MissedAnswerRequest

router = APIRouter()

# How far back to look for missed days, so a long absence doesn't generate endless rows.
MAX_LOOKBACK_DAYS = 30


@router.post("/{user_id}/scan", response_model=list[MissedSessionOut])
def scan(user_id: UUID, db: DBSession = Depends(get_db)):
    """Detect scheduled training days (per the active program) that were skipped
    since the last logged session, and return the ones still awaiting an answer.
    """
    active = db.query(Program).filter(
        Program.user_id == user_id, Program.is_active == True
    ).first()
    if not active:
        return _pending(user_id, db)

    training_weekdays = {d.day_of_week for d in active.days if not d.is_rest}
    if not training_weekdays:
        return _pending(user_id, db)

    last = db.query(Session).filter(Session.user_id == user_id).order_by(Session.date.desc()).first()
    if not last:
        return _pending(user_id, db)  # no baseline yet — nothing to "miss"

    start = last.date + timedelta(days=1)
    end = date.today() - timedelta(days=1)  # today isn't missed yet
    if (end - start).days > MAX_LOOKBACK_DAYS:
        start = end - timedelta(days=MAX_LOOKBACK_DAYS)
    if start > end:
        return _pending(user_id, db)

    logged = {
        s.date for s in db.query(Session).filter(
            Session.user_id == user_id, Session.date >= start, Session.date <= end
        ).all()
    }
    already = {
        m.date for m in db.query(MissedSession).filter(MissedSession.user_id == user_id).all()
    }

    d = start
    while d <= end:
        if d.weekday() in training_weekdays and d not in logged and d not in already:
            db.add(MissedSession(user_id=user_id, date=d))
        d += timedelta(days=1)
    db.commit()

    return _pending(user_id, db)


@router.post("/{user_id}/answer", response_model=list[MissedSessionOut])
def answer(user_id: UUID, body: MissedAnswerRequest, db: DBSession = Depends(get_db)):
    """Record the same reason across every still-unanswered missed session."""
    pending = db.query(MissedSession).filter(
        MissedSession.user_id == user_id, MissedSession.reason.is_(None)
    ).all()
    for m in pending:
        m.reason = body.reason
    db.commit()
    return db.query(MissedSession).filter(MissedSession.user_id == user_id).order_by(MissedSession.date.desc()).all()


@router.get("/{user_id}", response_model=list[MissedSessionOut])
def list_missed(user_id: UUID, db: DBSession = Depends(get_db)):
    """All missed sessions (answered or not) — used by the History page."""
    return db.query(MissedSession).filter(
        MissedSession.user_id == user_id
    ).order_by(MissedSession.date.desc()).all()


def _pending(user_id: UUID, db: DBSession):
    return db.query(MissedSession).filter(
        MissedSession.user_id == user_id, MissedSession.reason.is_(None)
    ).order_by(MissedSession.date).all()
