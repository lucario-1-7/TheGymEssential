from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "postgresql://postgres:Lucario%4017@localhost:5432/TheGymEssential"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

Base = declarative_base()


def init_db():
    Base.metadata.create_all(bind=engine)
    print("Tables created.")


def seed_db():
    from models import MuscleGroup, Exercise, ExerciseMuscle
    db = SessionLocal()

    muscle_data = [
        {"name": "chest",       "mev": 8,  "mav": 16, "mrv": 22},
        {"name": "lats",        "mev": 10, "mav": 18, "mrv": 25},
        {"name": "traps",       "mev": 8,  "mav": 16, "mrv": 22},
        {"name": "quads",       "mev": 8,  "mav": 15, "mrv": 20},
        {"name": "hamstrings",  "mev": 6,  "mav": 13, "mrv": 18},
        {"name": "front delt",  "mev": 6,  "mav": 12, "mrv": 18},
        {"name": "side delt",   "mev": 8,  "mav": 16, "mrv": 26},
        {"name": "rear delt",   "mev": 6,  "mav": 14, "mrv": 20},
        {"name": "biceps",      "mev": 8,  "mav": 16, "mrv": 26},
        {"name": "triceps",     "mev": 6,  "mav": 14, "mrv": 22},
        {"name": "glutes",      "mev": 4,  "mav": 12, "mrv": 16},
        {"name": "calves",      "mev": 8,  "mav": 16, "mrv": 20},
        {"name": "abs",         "mev": 4,  "mav": 16, "mrv": 20},
        {"name": "adductor",    "mev": 4,  "mav": 12, "mrv": 16},
        {"name": "abductor",    "mev": 4,  "mav": 12, "mrv": 16},
    ]

    muscle_objs = {}
    for m in muscle_data:
        mg = MuscleGroup(name=m["name"])
        db.add(mg)
        db.flush()
        muscle_objs[m["name"]] = {"obj": mg, "mev": m["mev"], "mav": m["mav"], "mrv": m["mrv"]}

    # --- Exercises ---
    exercise_data = [
        {
            "name": "Barbell bench press",
            "movement_pattern": "push",
            "equipment": "barbell",
            "is_unilateral": False,
            "primary": ["chest"],
            "secondary": ["triceps", "front delt"],
        },
        {
            "name": "Incline dumbbell press",
            "movement_pattern": "push",
            "equipment": "dumbbell",
            "is_unilateral": False,
            "primary": ["chest"],
            "secondary": ["triceps", "front delt"],
        },
        {
            "name": "Cable fly",
            "movement_pattern": "push",
            "equipment": "cable",
            "is_unilateral": False,
            "primary": ["chest"],
            "secondary": [],
        },
        {
            "name": "Barbell back squat",
            "movement_pattern": "squat",
            "equipment": "barbell",
            "is_unilateral": False,
            "primary": ["quads"],
            "secondary": ["glutes", "hamstrings"],
        },
        {
            "name": "Romanian deadlift",
            "movement_pattern": "hinge",
            "equipment": "barbell",
            "is_unilateral": False,
            "primary": ["hamstrings"],
            "secondary": ["glutes", "lats", "traps"],
        },
        {
            "name": "Pull up",
            "movement_pattern": "pull",
            "equipment": "bodyweight",
            "is_unilateral": False,
            "primary": ["lats"],
            "secondary": ["biceps", "rear delt"],
        },
        {
            "name": "Barbell row",
            "movement_pattern": "pull",
            "equipment": "barbell",
            "is_unilateral": False,
            "primary": ["lats", "traps"],
            "secondary": ["biceps", "rear delt"],
        },
        {
            "name": "Overhead press",
            "movement_pattern": "push",
            "equipment": "barbell",
            "is_unilateral": False,
            "primary": ["front delt"],
            "secondary": ["triceps", "side delt"],
        },
        {
            "name": "Dumbbell lateral raise",
            "movement_pattern": "push",
            "equipment": "dumbbell",
            "is_unilateral": False,
            "primary": ["side delt"],
            "secondary": [],
        },
        {
            "name": "Barbell curl",
            "movement_pattern": "pull",
            "equipment": "barbell",
            "is_unilateral": False,
            "primary": ["biceps"],
            "secondary": [],
        },
        {
            "name": "Dumbbell curl",
            "movement_pattern": "pull",
            "equipment": "dumbbell",
            "is_unilateral": True,
            "primary": ["biceps"],
            "secondary": [],
        },
        {
            "name": "Tricep pushdown",
            "movement_pattern": "push",
            "equipment": "cable",
            "is_unilateral": False,
            "primary": ["triceps"],
            "secondary": [],
        },
        {
            "name": "Bulgarian split squat",
            "movement_pattern": "squat",
            "equipment": "dumbbell",
            "is_unilateral": True,
            "primary": ["quads"],
            "secondary": ["glutes"],
        },
        {
            "name": "Hip thrust",
            "movement_pattern": "hinge",
            "equipment": "barbell",
            "is_unilateral": False,
            "primary": ["glutes"],
            "secondary": ["hamstrings"],
        },
        {
            "name": "Leg curl",
            "movement_pattern": "hinge",
            "equipment": "machine",
            "is_unilateral": False,
            "primary": ["hamstrings"],
            "secondary": [],
        },
        {
            "name": "Calf raise",
            "movement_pattern": "carry",
            "equipment": "machine",
            "is_unilateral": False,
            "primary": ["calves"],
            "secondary": [],
        },
    ]

    for e in exercise_data:
        ex = Exercise(
            name=e["name"],
            movement_pattern=e["movement_pattern"],
            equipment=e["equipment"],
            is_unilateral=e["is_unilateral"],
        )
        db.add(ex)
        db.flush()

        for muscle_name in e["primary"]:
            db.add(ExerciseMuscle(
                exercise_id=ex.id,
                muscle_group_id=muscle_objs[muscle_name]["obj"].id,
                is_primary=True,
            ))
        for muscle_name in e["secondary"]:
            db.add(ExerciseMuscle(
                exercise_id=ex.id,
                muscle_group_id=muscle_objs[muscle_name]["obj"].id,
                is_primary=False,
            ))

    db.commit()
    db.close()
    print("Seed data inserted.")


if __name__ == "__main__":
    # Must import all models BEFORE init_db so they register with Base
    from models import (
        User, BodyweightLog, MuscleGroup, UserMuscleVolume,
        Exercise, ExerciseMuscle, Mesocycle, Session, SessionExercise, SetLog
    )
    init_db()
    seed_db()
