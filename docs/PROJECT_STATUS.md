# F1 Insight Hub - Project Status

## Project Overview

F1 Insight Hub is a cross-platform Formula 1 application with three coordinated parts:

- `mobile/`: Expo + React Native client
- `backend/`: FastAPI service
- `ml/`: data science assets and model artifacts

The product goal is:

- browse seasons, races, and drivers
- expose ML-backed Top-10 finish probabilities
- support race-level and driver-level context
- keep the stack ready for a cleaner production-serving architecture

## Current Actual State

The project is no longer a frontend prototype.

Working state today:

- mobile app implemented and wired to a real backend
- FastAPI backend implemented
- Top-10 XGBoost model integrated
- PostgreSQL serving layer implemented
- ingestion and prediction publishing scripts implemented
- backend running in DB-first mode
- auth protection implemented for app data routes

## Mobile Status

Implemented screens and flows:

- home screen
- race browser by season
- race details screen
- racer details screen
- prediction calculator
- loading, empty, and error states

Current mobile behavior:

- uses a real API service through `mobile/src/services/apiService.ts`
- mock service remains available for non-live flows and tests
- prediction calculator loads race-scoped participants
- racer selection is searchable
- unsupported historical seasons show support warnings
- recent form is backend-derived and displayed as read-only context
- full-screen login/register overlay gates the app while signed out
- header account menu shows account name, notifications, password reset, switch account, and logout
- registration and password reset both require confirm-password input

Known practical limitation:

- Expo Go compatibility depends on platform rollout for the Expo SDK version in use
- web testing is currently the most reliable development path

## Backend Status

The backend is no longer a placeholder. It is a working FastAPI service that now uses PostgreSQL as the normal serving source.

Current backend architecture:

- `backend/main.py`: thin FastAPI entrypoint
- `backend/config.py`: runtime paths and serving flags
- `backend/helpers.py`: shared helper functions
- `backend/db_queries.py`: DB query and serialization helpers
- `backend/legacy_state.py`: isolated legacy fallback state
- `backend/models.py`: SQLAlchemy ORM models
- `backend/database.py`: engine and session setup
- `backend/alembic/`: schema migration environment

Current backend capabilities:

- serves seasons, races, race details, participants, racer details, and Top-10 predictions
- serves calculator requests from stored race-driver prediction rows
- exposes support metadata for model-supported vs historical-estimate seasons
- runs in DB-first mode while preserving a legacy fallback path behind config flags
- protects app-serving routes with authenticated sessions
- supports register/login/logout/me
- supports account notifications and authenticated password reset

Serving mode flags:

- `F1_SERVING_MODE=db`
- `F1_ENABLE_LEGACY_FALLBACK=false`

## Database Status

The project now has a working relational serving layer.

Supported database modes:

- SQLite for local bootstrap
- PostgreSQL as the intended main serving database

Implemented schema:

- `seasons`
- `races`
- `constructors`
- `drivers`
- `race_context`
- `model_versions`
- `race_participants`
- `race_predictions`
- `racer_race_context`
- `app_users`
- `app_user_sessions`
- `app_notifications`

Implemented scripts:

- `backend/init_db.py`
- `backend/ingest_archive.py`
- `backend/publish_predictions.py`

Migration support:

- Alembic is configured under `backend/alembic/`
- `backend/init_db.py` upgrades an empty database to head
- `backend/init_db.py` stamps an already-existing schema to the current revision when needed

Current usage pattern:

- raw archive and ML artifacts feed batch jobs
- batch jobs populate PostgreSQL
- mobile-facing backend endpoints read from PostgreSQL

## ML Status

The integrated ML work is the Top-10 finish probability model.

Completed:

- leakage-safe pre-race feature engineering
- rolling historical driver/team features
- XGBoost pipeline training
- artifact export
- precomputed race-driver feature table
- backend integration of model outputs

Model metadata:

- training: `2006-2021`
- validation: `2022`
- test: `2023+`

Practical implication:

- `2006+` seasons are supported
- earlier seasons are still available for exploration but marked as historical estimates

DNF status:

- explored
- not integrated
- not considered production-ready

## Prediction Calculator Logic

The calculator is intentionally a hybrid flow.

Base prediction:

- loaded from stored race-driver Top-10 model output

User-adjustable scenario inputs:

- `gridPosition`
- `weatherCondition`

Backend-derived contextual value:

- `recentFormScore`

This means:

- the base probability is real model output
- the user can still do lightweight what-if interaction
- the form does not ask the user to fabricate ML features manually

## What Has Been Completed

### 1. Model Integration

- Top-10 XGBoost artifacts exported
- metadata exported
- feature parquet exported
- backend consumes model outputs

### 2. Backend Integration

- real FastAPI implementation replaced the mock skeleton
- mobile endpoints are implemented and stable
- prediction and participant flows are DB-backed

### 3. Database Integration

- PostgreSQL schema created
- archive ingestion implemented
- prediction publishing implemented
- DB-first serving verified through API smoke tests

### 4. Documentation

- root `README.md` updated
- project status doc maintained
- database design doc added

### 5. Authentication

- DB-backed accounts implemented
- Argon2 password hashing implemented
- server-side session tokens implemented
- auth protection added for mobile-serving API routes
- header account menu wired to auth state
- in-app notifications implemented for account events
- authenticated password reset implemented
- email verification was explored and intentionally removed from the codebase

## How To Run

### Backend

```bash
cd backend
pip install -r requirements.txt

export DATABASE_URL="postgresql+psycopg://f1_user:<password>@localhost:5432/f1_insight_hub"
export DB_ECHO=false
export F1_SERVING_MODE=db
export F1_ENABLE_LEGACY_FALLBACK=false

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Database bootstrap

```bash
cd backend
python init_db.py
python ingest_archive.py
python publish_predictions.py
```

### Mobile

```bash
cd mobile
npm install
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npx expo start --web --clear
```

## Current Risks / Limitations

- Expo Go compatibility on iPhone may lag behind the SDK version used by the project
- DNF model is not integrated
- calculator adjustments are still heuristic scenario overrides, not a second trained model layer
- password recovery for signed-out users is not implemented
- backend still contains a legacy fallback path that should eventually be reduced further

## Recommended Next Steps

### High Priority

1. add follow-up migrations as the schema evolves
2. formalize backend env loading instead of manual exports
3. tighten the calculator semantics around scenario overrides

### Medium Priority

1. improve model explanation surfaces in the UI
2. add model/version metadata display in the app
3. continue backend modular cleanup if the codebase grows

### Lower Priority

1. resume DNF modeling after serving architecture is stable
2. add scheduled batch refresh jobs
