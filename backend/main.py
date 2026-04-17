from database import engine, Base
from models.models import (  # import ALL models so they register with Base
    User, BodyweightLog, MuscleGroup, UserMuscleVolume,
    Exercise, ExerciseMuscle, Mesocycle, Session, SessionExercise, SetLog
)

Base.metadata.create_all(bind=engine)