from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import users, exercises, sessions, programs, progress, volume, auth, missed

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fitness Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(exercises.router, prefix="/exercises", tags=["exercises"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(programs.router, prefix="/programs", tags=["programs"])
app.include_router(progress.router, prefix="/progress", tags=["progress"])
app.include_router(volume.router, prefix="/volume", tags=["volume"])
app.include_router(missed.router, prefix="/missed", tags=["missed"])
