from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from uuid import UUID


# ─── User ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str

class UserOut(BaseModel):
    id: UUID
    name: str
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Bodyweight ───────────────────────────────────────────────────────────────

class BodyweightCreate(BaseModel):
    weight_kg: float
    date: date

class BodyweightOut(BaseModel):
    id: UUID
    weight_kg: float
    date: date

    class Config:
        from_attributes = True


# ─── Muscle Group ─────────────────────────────────────────────────────────────

class MuscleGroupOut(BaseModel):
    id: UUID
    name: str

    class Config:
        from_attributes = True


# ─── User Muscle Volume ───────────────────────────────────────────────────────

class UserMuscleVolumeUpdate(BaseModel):
    mev_sets: int
    mav_sets: int
    mrv_sets: int

class UserMuscleVolumeOut(BaseModel):
    muscle_group: MuscleGroupOut
    mev_sets: int
    mav_sets: int
    mrv_sets: int

    class Config:
        from_attributes = True


# ─── Exercise ─────────────────────────────────────────────────────────────────

class ExerciseMuscleIn(BaseModel):
    muscle_group_id: UUID
    is_primary: bool

class ExerciseCreate(BaseModel):
    name: str
    movement_pattern: str
    equipment: str
    is_unilateral: bool
    muscles: list[ExerciseMuscleIn]

class ExerciseMuscleOut(BaseModel):
    muscle_group: MuscleGroupOut
    is_primary: bool

    class Config:
        from_attributes = True

class ExerciseOut(BaseModel):
    id: UUID
    name: str
    movement_pattern: str
    equipment: str
    is_unilateral: bool
    muscle_targets: list[ExerciseMuscleOut]

    class Config:
        from_attributes = True


# ─── Mesocycle ────────────────────────────────────────────────────────────────

class MesocycleCreate(BaseModel):
    goal: str
    total_weeks: int
    start_date: date
    is_deload: bool = False

class MesocycleOut(BaseModel):
    id: UUID
    goal: str
    total_weeks: int
    start_date: date
    end_date: Optional[date]
    is_deload: bool

    class Config:
        from_attributes = True


# ─── Session ──────────────────────────────────────────────────────────────────

class SessionCreate(BaseModel):
    date: date
    mesocycle_id: Optional[UUID] = None
    session_rpe: Optional[int] = None
    notes: Optional[str] = None

class SessionOut(BaseModel):
    id: UUID
    date: date
    mesocycle_id: Optional[UUID]
    session_rpe: Optional[int]
    notes: Optional[str]

    class Config:
        from_attributes = True


# ─── Set ──────────────────────────────────────────────────────────────────────

class SetCreate(BaseModel):
    set_number: int
    weight_kg: Optional[float] = None
    weight_kg_left: Optional[float] = None
    weight_kg_right: Optional[float] = None
    reps: int
    rir: int
    notes: Optional[str] = None

class SetOut(BaseModel):
    id: UUID
    set_number: int
    weight_kg: Optional[float]
    weight_kg_left: Optional[float]
    weight_kg_right: Optional[float]
    reps: int
    rir: int
    notes: Optional[str]

    class Config:
        from_attributes = True


# ─── Session Exercise ─────────────────────────────────────────────────────────

class SessionExerciseCreate(BaseModel):
    exercise_id: UUID
    order_index: int
    notes: Optional[str] = None

class SessionExerciseOut(BaseModel):
    id: UUID
    exercise: ExerciseOut
    order_index: int
    notes: Optional[str]
    sets: list[SetOut]

    class Config:
        from_attributes = True


# ─── Full Session Detail ──────────────────────────────────────────────────────

class SessionDetailOut(BaseModel):
    id: UUID
    date: date
    mesocycle_id: Optional[UUID]
    session_rpe: Optional[int]
    notes: Optional[str]
    session_exercises: list[SessionExerciseOut]

    class Config:
        from_attributes = True


# ─── Suggestion ───────────────────────────────────────────────────────────────

class PRData(BaseModel):
    weight_kg: float
    reps: int
    date: date

class LastSessionData(BaseModel):
    date: date
    sets: list[SetOut]

class SuggestionOut(BaseModel):
    exercise_id: UUID
    exercise_name: str
    suggested_weight: Optional[float]
    suggested_weight_left: Optional[float]
    suggested_weight_right: Optional[float]
    reason: str
    pr: Optional[PRData] = None
    last_session: Optional[LastSessionData] = None


# ─── Program Summary ──────────────────────────────────────────────────────────

class MuscleSummary(BaseModel):
    muscle: str
    sets_per_week: float
    frequency_per_week: float
    mev_sets: int
    mav_sets: int
    mrv_sets: int
    status: str

class ProgramSummaryOut(BaseModel):
    mesocycle_id: UUID
    total_sessions: int
    weeks: int
    muscle_summary: list[MuscleSummary]


# ─── Program ──────────────────────────────────────────────────────────────────

class ProgramExerciseIn(BaseModel):
    exercise_id: UUID
    order_index: int
    target_sets: Optional[int]
    target_reps_min: Optional[int]
    target_reps_max: Optional[int]

class ProgramDayIn(BaseModel):
    day_of_week: int
    is_rest: bool = False
    label: Optional[str] = None
    exercises: list[ProgramExerciseIn] = []

class ProgramCreate(BaseModel):
    name: str
    days: list[ProgramDayIn]

class ProgramExerciseOut(BaseModel):
    id: UUID
    exercise: ExerciseOut
    order_index: int
    target_sets: Optional[int]
    target_reps_min: Optional[int]
    target_reps_max: Optional[int]

    class Config:
        from_attributes = True

class ProgramDayOut(BaseModel):
    id: UUID
    day_of_week: int
    is_rest: bool
    label: Optional[str]
    exercises: list[ProgramExerciseOut]

    class Config:
        from_attributes = True

class ProgramOut(BaseModel):
    id: UUID
    name: str
    is_active: bool
    days: list[ProgramDayOut]

    class Config:
        from_attributes = True
