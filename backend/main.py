from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import users, exercises, sessions, mesocycles, programs

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Fitness Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite default port
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(exercises.router, prefix="/exercises", tags=["exercises"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(mesocycles.router, prefix="/mesocycles", tags=["mesocycles"])
app.include_router(programs.router, prefix="/programs", tags=["programs"])
