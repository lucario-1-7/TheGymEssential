from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from deps import get_db, verify_user
from models import User, BodyweightLog, MuscleGroup, UserMuscleVolume
from schemas import UserCreate, UserOut, BodyweightCreate, BodyweightOut, UserMuscleVolumeUpdate, UserMuscleVolumeOut
from uuid import UUID
from pydantic import BaseModel
from sqlalchemy import func
from models import Session, Program

router = APIRouter()

DEFAULT_VOLUMES = {
    "chest":      {"mev": 8,  "mav": 16, "mrv": 22},
    "lats":       {"mev": 10, "mav": 18, "mrv": 25},
    "traps":      {"mev": 8,  "mav": 16, "mrv": 22},
    "quads":      {"mev": 8,  "mav": 15, "mrv": 20},
    "hamstrings": {"mev": 6,  "mav": 13, "mrv": 18},
    "front delt": {"mev": 6,  "mav": 12, "mrv": 18},
    "side delt":  {"mev": 8,  "mav": 16, "mrv": 26},
    "rear delt":  {"mev": 6,  "mav": 14, "mrv": 20},
    "biceps":     {"mev": 8,  "mav": 16, "mrv": 26},
    "triceps":    {"mev": 6,  "mav": 14, "mrv": 22},
    "glutes":     {"mev": 4,  "mav": 12, "mrv": 16},
    "calves":     {"mev": 8,  "mav": 16, "mrv": 20},
    "abs":        {"mev": 4,  "mav": 16, "mrv": 20},
    "adductor":   {"mev": 4,  "mav": 12, "mrv": 16},
    "abductor":   {"mev": 4,  "mav": 12, "mrv": 16},
}

class LoginRequest(BaseModel):
    username: str

@router.post("/login", response_model=UserOut)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.name) == body.username.lower()).first()
    if not user:
        # Auto-create for simplicity in dev
        user = User(name=body.username)
        db.add(user)
        db.flush()
        
        muscle_groups = db.query(MuscleGroup).all()
        for mg in muscle_groups:
            defaults = DEFAULT_VOLUMES.get(mg.name, {"mev": 8, "mav": 16, "mrv": 20})
            db.add(UserMuscleVolume(
                user_id=user.id,
                muscle_group_id=mg.id,
                mev_sets=defaults["mev"],
                mav_sets=defaults["mav"],
                mrv_sets=defaults["mrv"],
            ))
        db.commit()
        db.refresh(user)
    return user

@router.get("/admin/all")
def get_admin_metrics(user_id: UUID, db: Session = Depends(get_db), _user=Depends(verify_user)):
    admin_user = db.query(User).filter(User.id == user_id, User.is_admin == True).first()
    if not admin_user:
        raise HTTPException(status_code=403, detail="Unauthorized: Admin access required")
    
    total_users = db.query(User).count()
    total_sessions = db.query(Session).count()
    total_programs = db.query(Program).count()
    
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(10).all()
    
    return {
        "metrics": {
            "total_users": total_users,
            "total_sessions": total_sessions,
            "total_programs": total_programs,
        },
        "recent_users": [{"id": u.id, "name": u.name, "created_at": u.created_at, "is_admin": u.is_admin} for u in recent_users]
    }


@router.post("/", response_model=UserOut)
def create_user(body: UserCreate, db: Session = Depends(get_db)):
    user = User(name=body.name)
    db.add(user)
    db.flush()

    muscle_groups = db.query(MuscleGroup).all()
    for mg in muscle_groups:
        defaults = DEFAULT_VOLUMES.get(mg.name, {"mev": 8, "mav": 16, "mrv": 20})
        db.add(UserMuscleVolume(
            user_id=user.id,
            muscle_group_id=mg.id,
            mev_sets=defaults["mev"],
            mav_sets=defaults["mav"],
            mrv_sets=defaults["mrv"],
        ))

    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: UUID, db: Session = Depends(get_db), _user=Depends(verify_user)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/{user_id}/bodyweight", response_model=BodyweightOut)
def log_bodyweight(user_id: UUID, body: BodyweightCreate, db: Session = Depends(get_db), _user=Depends(verify_user)):
    log = BodyweightLog(user_id=user_id, weight_kg=body.weight_kg, date=body.date)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/{user_id}/bodyweight", response_model=list[BodyweightOut])
def get_bodyweight_history(user_id: UUID, db: Session = Depends(get_db), _user=Depends(verify_user)):
    return db.query(BodyweightLog).filter(
        BodyweightLog.user_id == user_id
    ).order_by(BodyweightLog.date).all()


@router.get("/{user_id}/volume", response_model=list[UserMuscleVolumeOut])
def get_volume_landmarks(user_id: UUID, db: Session = Depends(get_db), _user=Depends(verify_user)):
    return db.query(UserMuscleVolume).filter(
        UserMuscleVolume.user_id == user_id
    ).all()


@router.patch("/{user_id}/volume/{muscle_group_id}", response_model=UserMuscleVolumeOut)
def update_volume_landmark(
    user_id: UUID,
    muscle_group_id: UUID,
    body: UserMuscleVolumeUpdate,
    db: Session = Depends(get_db),
    _user=Depends(verify_user),
):
    record = db.query(UserMuscleVolume).filter(
        UserMuscleVolume.user_id == user_id,
        UserMuscleVolume.muscle_group_id == muscle_group_id,
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Volume record not found")

    record.mev_sets = body.mev_sets
    record.mav_sets = body.mav_sets
    record.mrv_sets = body.mrv_sets
    db.commit()
    db.refresh(record)
    return record
