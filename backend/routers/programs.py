from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from deps import get_db, verify_user, get_current_user
from models import Program, ProgramDay, ProgramExercise, User
from schemas import ProgramCreate, ProgramOut, ProgramDayOut
from uuid import UUID
from datetime import datetime

router = APIRouter()

@router.post("/{user_id}", response_model=ProgramOut)
def create_program(user_id: UUID, body: ProgramCreate, db: Session = Depends(get_db), _user=Depends(verify_user)):
    # If this is the user's first program, make it active
    existing_programs = db.query(Program).filter(Program.user_id == user_id).count()
    is_active = existing_programs == 0

    program = Program(
        user_id=user_id,
        name=body.name,
        is_active=is_active
    )
    db.add(program)
    db.flush()

    for day_in in body.days:
        day = ProgramDay(
            program_id=program.id,
            day_of_week=day_in.day_of_week,
            is_rest=day_in.is_rest,
            label=day_in.label
        )
        db.add(day)
        db.flush()

        for ex_in in day_in.exercises:
            pe = ProgramExercise(
                program_day_id=day.id,
                exercise_id=ex_in.exercise_id,
                order_index=ex_in.order_index,
                target_sets=ex_in.target_sets,
                target_reps_min=ex_in.target_reps_min,
                target_reps_max=ex_in.target_reps_max
            )
            db.add(pe)

    db.commit()
    db.refresh(program)
    return program

@router.put("/{user_id}/{program_id}", response_model=ProgramOut)
def update_program(user_id: UUID, program_id: UUID, body: ProgramCreate, db: Session = Depends(get_db), _user=Depends(verify_user)):
    program = db.query(Program).filter(Program.id == program_id, Program.user_id == user_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    program.name = body.name

    # Clear existing days to trigger ORM cascade on ProgramExercise
    for day in program.days:
        db.delete(day)
    db.flush()

    for day_in in body.days:
        day = ProgramDay(
            program_id=program.id,
            day_of_week=day_in.day_of_week,
            is_rest=day_in.is_rest,
            label=day_in.label
        )
        db.add(day)
        db.flush()

        for ex_in in day_in.exercises:
            pe = ProgramExercise(
                program_day_id=day.id,
                exercise_id=ex_in.exercise_id,
                order_index=ex_in.order_index,
                target_sets=ex_in.target_sets,
                target_reps_min=ex_in.target_reps_min,
                target_reps_max=ex_in.target_reps_max
            )
            db.add(pe)

    db.commit()
    db.refresh(program)
    return program

@router.get("/{user_id}", response_model=list[ProgramOut])
def list_programs(user_id: UUID, db: Session = Depends(get_db), _user=Depends(verify_user)):
    return db.query(Program).filter(Program.user_id == user_id).order_by(Program.name).all()

@router.delete("/{program_id}")
def delete_program(program_id: UUID, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    program = db.query(Program).filter(Program.id == program_id, Program.user_id == current.id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    db.delete(program)
    db.commit()
    return {"detail": "Deleted"}

@router.patch("/{user_id}/activate/{program_id}")
def activate_program(user_id: UUID, program_id: UUID, db: Session = Depends(get_db), _user=Depends(verify_user)):
    db.query(Program).filter(Program.user_id == user_id).update({"is_active": False})
    
    program = db.query(Program).filter(Program.id == program_id, Program.user_id == user_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")
    
    program.is_active = True
    db.commit()
    return {"detail": "Activated"}

@router.get("/{user_id}/today", response_model=ProgramDayOut)
def get_todays_plan(user_id: UUID, db: Session = Depends(get_db), _user=Depends(verify_user)):
    # Python weekday(): Monday is 0 and Sunday is 6.
    today_day_of_week = datetime.now().weekday()
    
    active_program = db.query(Program).filter(
        Program.user_id == user_id, 
        Program.is_active == True
    ).first()

    if not active_program:
        raise HTTPException(status_code=404, detail="No active program found")

    today_plan = db.query(ProgramDay).filter(
        ProgramDay.program_id == active_program.id,
        ProgramDay.day_of_week == today_day_of_week
    ).first()

    if not today_plan:
        raise HTTPException(status_code=404, detail="No plan found for today")

    return today_plan
