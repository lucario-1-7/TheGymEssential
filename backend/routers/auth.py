from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from deps import get_db, get_current_user
from models import User, MuscleGroup, UserMuscleVolume
from schemas import RegisterRequest, AuthLoginRequest, TokenOut, UserOut, ChangePasswordRequest
from security import hash_password, verify_password, create_access_token
from routers.users import DEFAULT_VOLUMES

router = APIRouter()


def _seed_volume_landmarks(user: User, db: Session):
    for mg in db.query(MuscleGroup).all():
        d = DEFAULT_VOLUMES.get(mg.name, {"mev": 8, "mav": 16, "mrv": 20})
        db.add(UserMuscleVolume(
            user_id=user.id, muscle_group_id=mg.id,
            mev_sets=d["mev"], mav_sets=d["mav"], mrv_sets=d["mrv"],
        ))


@router.post("/register", response_model=TokenOut)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    username = body.username.strip()
    existing = db.query(User).filter(func.lower(User.username) == username.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Username already taken")

    user = User(name=username, username=username.lower(), password_hash=hash_password(body.password))
    db.add(user)
    db.flush()
    _seed_volume_landmarks(user, db)
    db.commit()
    db.refresh(user)

    return TokenOut(access_token=create_access_token(user.id, user.token_version), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(body: AuthLoginRequest, db: Session = Depends(get_db)):
    username = body.username.strip().lower()
    user = db.query(User).filter(func.lower(User.username) == username).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    return TokenOut(access_token=create_access_token(user.id, user.token_version), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)):
    return current


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    current: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current.password_hash or not verify_password(body.current_password, current.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current.password_hash = hash_password(body.new_password)
    # Invalidate tokens on other devices, then hand this device a fresh one so the
    # user who just changed their password isn't logged out here.
    current.token_version += 1
    db.commit()
    db.refresh(current)
    return {"access_token": create_access_token(current.id, current.token_version)}


@router.post("/logout-all")
def logout_all(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Invalidate every outstanding token for this user, including the caller's."""
    current.token_version += 1
    db.commit()
    return {"detail": "Logged out everywhere"}
