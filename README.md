# TheGymEssential

A science-based workout tracker built for serious lifters. Tracks progressive overload using RIR (Reps in Reserve), suggests next session weights automatically, monitors weekly volume per muscle group against MEV/MAV/MRV landmarks, and organises training around structured weekly programs.


## Features

- **Weekly program builder** — create programs with custom exercises per day, set target sets and rep ranges, mark rest days, and set a program as active
- **Auto-populated sessions** — when you start a session, exercises are pulled from your active program for that day automatically
- **Weight suggestion engine** — after each session, the app suggests next week's weight per exercise based on your RIR
- **Volume tracking** — tracks sets per muscle group per week and compares against your personal MEV/MAV/MRV landmarks
- **Unilateral exercise support** — tracks left and right side weights independently
- **Mesocycle planner** — organise training into blocks with a program summary showing muscle frequency and volume status
- **Bodyweight logging** — tracks bodyweight over time
- **Exercise library** — build your own exercise list with muscle group targeting, movement pattern, and equipment

---

## Tech Stack

**Frontend**
- React + Vite
- Tailwind CSS v4
- Shadcn/ui components
- Recharts
- React Router

**Backend**
- Python + FastAPI
- SQLAlchemy ORM
- PostgreSQL
- Alembic (migrations)
- Pydantic v2

---

## Project Structure

```
TheGymEssential/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── models.py            # SQLAlchemy database models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── database.py          # DB engine, session, seed script
│   ├── deps.py              # Dependency injection
│   ├── requirements.txt
│   ├── .env                 # DATABASE_URL
│   └── routers/
│       ├── users.py         # User, bodyweight, volume landmarks
│       ├── exercises.py     # Exercise library
│       ├── sessions.py      # Workout sessions, sets, suggestions
│       ├── mesocycles.py    # Mesocycles, program summary
│       └── programs.py      # Weekly programs
│
└── frontend/
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── api/
        │   └── index.js     # All fetch calls to backend
        ├── components/
        │   ├── Layout.jsx   # Sidebar + page wrapper
        │   └── ui/          # Shadcn components
        └── pages/
            ├── Dashboard.jsx
            ├── Workouts.jsx
            ├── Exercises.jsx
            ├── Session.jsx
            ├── Mesocycles.jsx
            └── Summary.jsx
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/TheGymEssential.git
cd TheGymEssential
```

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Create the database
createdb fitness_tracker

# Set up environment variables
# Edit .env and set your database URL:
# DATABASE_URL=postgresql://localhost/fitness_tracker

# Initialise tables and seed muscle groups
python database.py

# Start the backend
uvicorn main:app --reload
```

API docs available at `http://localhost:8000/docs`

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

### 4. Create your user

Once both servers are running, go to `http://localhost:8000/docs`, find `POST /users/`, and create a user:

```json
{ "name": "your name" }
```

Copy the returned `id` and paste it as `USER_ID` in the following files:

```
src/pages/Dashboard.jsx
src/pages/Session.jsx
src/pages/Workouts.jsx
```

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/users/` | Create user |
| GET | `/users/{id}/volume` | Get MEV/MAV/MRV per muscle |
| PATCH | `/users/{id}/volume/{muscle_id}` | Update volume landmarks |
| POST | `/users/{id}/bodyweight` | Log bodyweight |
| GET | `/exercises/` | List exercises |
| POST | `/exercises/` | Create exercise |
| GET | `/exercises/muscle-groups` | List muscle groups |
| POST | `/sessions/{user_id}` | Start session |
| POST | `/sessions/detail/{id}/exercises` | Add exercise to session |
| POST | `/sessions/exercises/{id}/sets` | Log a set |
| GET | `/sessions/{user_id}/suggestions/{exercise_id}` | Get weight suggestion |
| POST | `/programs/{user_id}` | Create weekly program |
| GET | `/programs/{user_id}/today` | Get today's workout from active program |
| PATCH | `/programs/{user_id}/activate/{program_id}` | Set active program |
| POST | `/mesocycles/{user_id}` | Create mesocycle |
| GET | `/mesocycles/detail/{id}/summary` | Program summary with volume status |

---

## Weight Suggestion Logic

After each session, the app computes a suggested weight for the next session based on average RIR across working sets:

| Average RIR | Action |
|-------------|--------|
| 3+ | Add weight |
| 1–2 | Same weight, aim for more reps |
| 0 | Consolidate before progressing |
| Missed reps | Drop weight slightly |

Weight increments per movement pattern:
- Upper body compounds → +2.5kg
- Lower body compounds → +5.0kg
- Isolation / unilateral → +1.25kg

---

## Volume Landmarks

Each muscle group has personal MEV/MAV/MRV values (sets per week) that default to research-based values and can be overridden per user. The program summary uses these to flag whether a muscle is undertrained, optimally trained, or overtrained.

| Status | Meaning |
|--------|---------|
| `below_mev` | Below minimum effective volume |
| `in_mav` | In the optimal adaptive range |
| `above_mrv` | Exceeding maximum recoverable volume |

---

## Roadmap

- [ ] Authentication
- [ ] Mobile support
- [ ] Progress charts per exercise
- [ ] Plateau detection
- [ ] Mesocycle-aware volume progression
- [ ] Bilateral asymmetry tracker