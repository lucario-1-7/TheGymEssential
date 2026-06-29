from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from deps import get_db, get_current_user
from models import Exercise, ExerciseMuscle, MuscleGroup, User
from schemas import ExerciseCreate, ExerciseOut, MuscleGroupOut
from uuid import UUID

router = APIRouter()


@router.get("/muscle-groups", response_model=list[MuscleGroupOut])
def get_muscle_groups(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    return db.query(MuscleGroup).order_by(MuscleGroup.name).all()


@router.post("/", response_model=ExerciseOut)
def create_exercise(body: ExerciseCreate, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    ex = Exercise(
        name=body.name,
        movement_pattern=body.movement_pattern,
        equipment=body.equipment,
        is_unilateral=body.is_unilateral,
    )
    db.add(ex)
    db.flush()

    for m in body.muscles:
        db.add(ExerciseMuscle(
            exercise_id=ex.id,
            muscle_group_id=m.muscle_group_id,
            is_primary=m.is_primary,
        ))

    db.commit()
    db.refresh(ex)
    return ex


@router.get("/", response_model=list[ExerciseOut])
def list_exercises(db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    return db.query(Exercise).order_by(Exercise.name).all()


@router.get("/{exercise_id}", response_model=ExerciseOut)
def get_exercise(exercise_id: UUID, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return ex


@router.delete("/{exercise_id}")
def delete_exercise(exercise_id: UUID, db: Session = Depends(get_db), _user: User = Depends(get_current_user)):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    try:
        db.delete(ex)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Cannot delete this exercise because it is used in a program or session.")
    return {"detail": "Deleted"}
