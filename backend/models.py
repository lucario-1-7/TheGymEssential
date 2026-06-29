from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Date,
    DateTime, ForeignKey, Enum, Text, UniqueConstraint
)
from database import Base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import expression
from datetime import datetime
import uuid
import enum


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    mesocycles = relationship("Mesocycle", back_populates="user")
    sessions = relationship("Session", back_populates="user")
    bodyweight_logs = relationship("BodyweightLog", back_populates="user")
    muscle_volumes = relationship("UserMuscleVolume", back_populates="user")
    programs = relationship("Program", back_populates="user")


class BodyweightLog(Base):
    __tablename__ = "bodyweight_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    weight_kg = Column(Float, nullable=False)
    date = Column(Date, nullable=False)

    user = relationship("User", back_populates="bodyweight_logs")


class MuscleGroup(Base):
    __tablename__ = "muscle_groups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True)

    user_volumes = relationship("UserMuscleVolume", back_populates="muscle_group")
    exercise_targets = relationship("ExerciseMuscle", back_populates="muscle_group")


class UserMuscleVolume(Base):
    __tablename__ = "user_muscle_volumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    muscle_group_id = Column(UUID(as_uuid=True), ForeignKey("muscle_groups.id"), nullable=False)
    mev_sets = Column(Integer, nullable=False)
    mav_sets = Column(Integer, nullable=False)
    mrv_sets = Column(Integer, nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "muscle_group_id"),)

    user = relationship("User", back_populates="muscle_volumes")
    muscle_group = relationship("MuscleGroup", back_populates="user_volumes", lazy="selectin")


class Program(Base):
    __tablename__ = "programs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=False)

    user = relationship("User", back_populates="programs")
    days = relationship(
        "ProgramDay",
        cascade="all, delete-orphan",
        back_populates="program",
        order_by="ProgramDay.day_of_week",
        lazy="selectin",
    )


class ProgramDay(Base):
    __tablename__ = "program_days"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_id = Column(UUID(as_uuid=True), ForeignKey("programs.id"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    is_rest = Column(Boolean, default=False)
    label = Column(String, nullable=True)

    program = relationship("Program", back_populates="days")
    exercises = relationship(
        "ProgramExercise",
        cascade="all, delete-orphan",
        back_populates="program_day",
        order_by="ProgramExercise.order_index",
        lazy="selectin",
    )


class ProgramExercise(Base):
    __tablename__ = "program_exercises"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    program_day_id = Column(UUID(as_uuid=True), ForeignKey("program_days.id"), nullable=False, index=True)
    exercise_id = Column(UUID(as_uuid=True), ForeignKey("exercises.id"), nullable=False, index=True)
    order_index = Column(Integer, nullable=False)
    target_sets = Column(Integer, nullable=True)
    target_reps_min = Column(Integer, nullable=True)
    target_reps_max = Column(Integer, nullable=True)

    program_day = relationship("ProgramDay", back_populates="exercises")
    exercise = relationship("Exercise", lazy="selectin")


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, unique=True)
    movement_pattern = Column(String, nullable=False)  # push, pull, hinge, squat, carry
    equipment = Column(String, nullable=False)          # barbell, dumbbell, cable, machine, bodyweight
    is_unilateral = Column(Boolean, default=False)

    muscle_targets = relationship(
        "ExerciseMuscle",
        cascade="all, delete-orphan",
        back_populates="exercise",
        lazy="selectin",
    )
    session_exercises = relationship("SessionExercise", back_populates="exercise")


class ExerciseMuscle(Base):
    __tablename__ = "exercise_muscles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exercise_id = Column(UUID(as_uuid=True), ForeignKey("exercises.id"), nullable=False, index=True)
    muscle_group_id = Column(UUID(as_uuid=True), ForeignKey("muscle_groups.id"), nullable=False, index=True)
    is_primary = Column(Boolean, default=True)

    exercise = relationship("Exercise", back_populates="muscle_targets")
    muscle_group = relationship("MuscleGroup", back_populates="exercise_targets", lazy="selectin")


class Mesocycle(Base):
    __tablename__ = "mesocycles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    goal = Column(String, nullable=False)   # hypertrophy, strength, recomp
    total_weeks = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    is_deload = Column(Boolean, default=False)

    user = relationship("User", back_populates="mesocycles")
    sessions = relationship("Session", back_populates="mesocycle")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    mesocycle_id = Column(UUID(as_uuid=True), ForeignKey("mesocycles.id"), nullable=True)
    date = Column(Date, nullable=False)
    session_rpe = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="sessions")
    mesocycle = relationship("Mesocycle", back_populates="sessions")
    session_exercises = relationship(
        "SessionExercise",
        back_populates="session",
        order_by="SessionExercise.order_index",
        lazy="selectin",
    )


class SessionExercise(Base):
    __tablename__ = "session_exercises"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False, index=True)
    exercise_id = Column(UUID(as_uuid=True), ForeignKey("exercises.id"), nullable=False, index=True)
    order_index = Column(Integer, nullable=False)
    notes = Column(Text, nullable=True)

    session = relationship("Session", back_populates="session_exercises")
    exercise = relationship("Exercise", back_populates="session_exercises", lazy="selectin")
    sets = relationship(
        "SetLog",
        back_populates="session_exercise",
        order_by="SetLog.set_number",
        lazy="selectin",
    )


class SetLog(Base):
    __tablename__ = "set_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_exercise_id = Column(UUID(as_uuid=True), ForeignKey("session_exercises.id"), nullable=False, index=True)
    set_number = Column(Integer, nullable=False)

    # One row carries one load + which side it was performed on. Bilateral lifts use
    # side="both"; unilateral lifts log a "left" row and a "right" row, which makes
    # left/right asymmetry tracking a simple GROUP BY side.
    weight_kg = Column(Float, nullable=True)
    side = Column(String, nullable=False, server_default="both", default="both")

    reps = Column(Integer, nullable=False)
    rir = Column(Integer, nullable=False)
    is_warmup = Column(Boolean, nullable=False, server_default=expression.false(), default=False)
    notes = Column(Text, nullable=True)

    session_exercise = relationship("SessionExercise", back_populates="sets")
