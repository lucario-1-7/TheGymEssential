from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import SessionLocal
from models import User
from security import decode_access_token


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Resolve the user from the Bearer token, or 401."""
    if creds is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    sub = decode_access_token(creds.credentials)
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    try:
        uid = UUID(sub)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token subject")
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def verify_user(
    user_id: UUID,
    current: User = Depends(get_current_user),
) -> User:
    """For routes scoped to a {user_id}: ensure the token's user owns that id.

    FastAPI supplies `user_id` from the route's path (or query) param, so any
    endpoint that already declares `user_id` can gate access by adding
    `Depends(verify_user)` — no extra wiring needed.
    """
    if current.id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return current
