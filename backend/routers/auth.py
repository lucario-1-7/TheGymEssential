from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID

from deps import get_db
from models import User, MuscleGroup, UserMuscleVolume
from schemas import RegisterRequest, AuthLoginRequest, TokenOut, UserOut
from security import hash_password, verify_password, create_access_token, decode_access_token
from routers.users import DEFAULT_VOLUMES

router = APIRouter()
bearer = HTTPBearer(auto_error=False)


def _seed_volume_landmarks(user: User, db: Session):
    for mg in db.query(MuscleGroup).all():
        d = DEFAULT_VOLUMES.get(mg.name, {"mev": 8, "mav": 16, "mrv": 20})
        db.add(UserMuscleVolume(
            user_id=user.id, muscle_group_id=mg.id,
            mev_sets=d["mev"], mav_sets=d["mav"], mrv_sets=d["mrv"],
        ))


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    uid = decode_access_token(creds.credentials)
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    try:
        uid = UUID(uid)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token subject")
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


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

    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenOut)
def login(body: AuthLoginRequest, db: Session = Depends(get_db)):
    username = body.username.strip().lower()
    user = db.query(User).filter(func.lower(User.username) == username).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    return TokenOut(access_token=create_access_token(user.id), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current: User = Depends(get_current_user)):
    return current
