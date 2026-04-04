# F1 Insight Hub

F1 Insight Hub is a cross-platform Formula 1 application that combines race exploration, driver context, and ML-backed Top-10 finish probabilities.

## Current Architecture

The project currently has three active parts:

- `mobile/`: Expo + React Native client
- `backend/`: FastAPI service
- `ml/`: model artifacts, notebooks, and feature engineering assets

The serving architecture is now database-first:

- raw archive CSVs, feature parquet, and saved model artifacts remain the ML input layer
- ingestion and publish scripts load app-serving data into PostgreSQL
- the FastAPI backend serves the mobile app from PostgreSQL in normal mode

## What Works Now

- mobile app screens are implemented:
  - home
  - race browser
  - race details
  - racer details
  - prediction calculator
- FastAPI backend is implemented and connected to the mobile app
- Top-10 XGBoost model is integrated into backend-serving flows
- PostgreSQL serving layer is implemented
- race participants, race predictions, and racer context are persisted in the database
- historical seasons outside the validated model window are labeled as `Historical estimate`

## Repository Structure

```text
F1_Insight_Hub/
  backend/
  docs/
  ml/
  mobile/
  README.md
```

## ML Scope

Integrated model:

- task: Top-10 finish probability
- model: XGBoost classifier
- training window: `2006-2021`
- validation year: `2022`
- test years: `2023+`

Practical implication:

- `2006+` seasons are within the validated support window
- older seasons can still be explored, but predictions are surfaced as historical estimates rather than validated outputs

Current status of DNF modeling:

- explored experimentally
- not integrated into production app flows

## Data Flow

### Raw / ML Inputs

The ML pipeline uses assets outside the repo root:

- `../Data_Science_and_ML_part/data/archive/`
- `../Data_Science_and_ML_part/data/feature_df.parquet`
- `../Data_Science_and_ML_part/artifacts/top10_pipeline.joblib`
- `../Data_Science_and_ML_part/artifacts/top10_metadata.json`

These are used for:

- feature generation
- batch prediction publishing
- model metadata loading

### Database Serving Layer

The backend now persists app-serving data in PostgreSQL:

- `seasons`
- `races`
- `drivers`
- `constructors`
- `race_context`
- `race_participants`
- `model_versions`
- `race_predictions`
- `racer_race_context`

## Backend Endpoints

Current API endpoints:

- `GET /`
- `GET /seasons`
- `GET /seasons/{year}/races`
- `GET /races`
- `GET /races/featured`
- `GET /races/{race_id}`
- `GET /races/{race_id}/participants`
- `GET /races/{race_id}/predictions/top10`
- `GET /races/{race_id}/racers/{racer_id}`
- `GET /racers`
- `POST /predictions/calculate`

## Prediction Calculator Behavior

The calculator is model-grounded but still supports light scenario overrides.

Base value:

- backend looks up the selected race-driver prediction row from the database
- base probability comes from the stored Top-10 model output

Scenario overrides:

- user can override `gridPosition`
- user can select `weatherCondition`

Backend-derived context:

- `recentFormScore` is derived from rolling historical model features and served from the backend

## Run Locally

### 1. Backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Database initialization and loading

SQLite works for local bootstrap, but PostgreSQL is the intended main path.

Initialize schema:

```bash
python init_db.py
```

Load archive-backed entities:

```bash
python ingest_archive.py
```

Publish Top-10 participants, predictions, and racer context:

```bash
python publish_predictions.py
```

### 3. Run backend in DB-first mode

```bash
cd backend

export DATABASE_URL="postgresql+psycopg://f1_user:<password>@localhost:5432/f1_insight_hub"
export DB_ECHO=false
export F1_SERVING_MODE=db
export F1_ENABLE_LEGACY_FALLBACK=false

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Run mobile app

Install dependencies:

```bash
cd mobile
npm install
```

Web:

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npx expo start --web --clear
```

Android emulator:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000 npx expo start --android --clear
```

Physical phone on same Wi-Fi:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<your-laptop-lan-ip>:8000 npx expo start --clear
```

Important:

- Expo Go support depends on the SDK compatibility available on the device platform
- backend must listen on `0.0.0.0` for phone testing

## Tech Stack

### Mobile

- Expo SDK 55
- React Native
- React Navigation
- TypeScript

### Backend

- FastAPI
- SQLAlchemy
- PostgreSQL
- pandas
- joblib
- scikit-learn
- xgboost

### ML

- pandas
- scikit-learn
- xgboost
- matplotlib

## Documentation

More detailed project documents:

- `docs/PROJECT_STATUS.md`
- `docs/DATABASE_DESIGN.md`

## Current Gaps

- DNF model is not production-ready
- prediction explanations are still lightweight and not SHAP-backed in the mobile UI
- Alembic migrations are not set up yet
- backend still carries a legacy fallback path for non-DB serving, although normal mode is DB-first
