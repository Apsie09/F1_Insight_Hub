# F1 Insight Hub

F1 Insight Hub is a team course project for the **Mobile Programming** course. It is a cross-platform Formula 1 application that combines a React Native mobile client, a FastAPI backend, a relational database, and a machine learning pipeline for Top-10 finish probability predictions.

The project was developed as a complete mobile system rather than as a UI-only prototype. The mobile app communicates with a real backend service, the backend reads from a structured database, and the machine learning component publishes prediction results that are consumed by the application. This makes the project suitable for demonstrating mobile development, API integration, database design, authentication, and applied data science in one coherent system.

## Application Overview

The application is designed for Formula 1 fans who want to explore historical race data and interact with model-based predictions. A user can create an account, browse seasons and races, inspect race details, view predicted Top-10 probabilities, open driver-level context, and calculate an individual prediction for a selected race and driver.

The mobile experience supports both English and Bulgarian, includes dark and light themes, and uses mobile-specific feedback such as haptic vibration after a prediction result is produced. The interface was tested through Expo Go on a physical iPhone, while web mode is also supported for development and demonstration.

## Visual Overview

The application combines a mobile interface, a backend API, a relational database, and an offline machine learning workflow. The screenshots and diagrams below summarize the main parts of the project.

<p align="center">
  <img src="docs/report/figures/home_screen.png" alt="F1 Insight Hub mobile home screen" width="260" />
</p>

<p align="center"><em>Mobile home screen with the main navigation entry points.</em></p>

### System Architecture

The system is organized around a React Native mobile client, a FastAPI backend, PostgreSQL storage, and an offline XGBoost prediction pipeline.

<p align="center">
  <img src="docs/report/figures/system-architecture.png" alt="F1 Insight Hub system architecture diagram" width="760" />
</p>

### Database Model

The database separates user/session data, Formula 1 domain entities, race participants, model versions, and published prediction rows.

<p align="center">
  <img src="docs/report/figures/database-er.png" alt="F1 Insight Hub database ER diagram" width="760" />
</p>

### XGBoost Prediction Model

The Top-10 prediction component uses an XGBoost ensemble model trained on leakage-safe pre-race features.

<p align="center">
  <img src="docs/report/figures/XGBoost_diagram.jpg" alt="XGBoost ensemble model diagram" width="640" />
</p>

## Architecture

F1 Insight Hub follows a layered client-server architecture. The mobile application is responsible for presentation, navigation, local UI state, language selection, theme handling, and communication with the backend API. The backend is responsible for authentication, business logic, database access, and serving prepared prediction data.

The mobile code is organized in a MVVM-like style. Screens and components render the interface, controllers coordinate state and service calls, and services isolate API communication from the UI. Shared state such as authentication, theme, and language is handled through dedicated providers.

The backend follows an MVC-oriented structure under `backend/app/`. Route handlers live in `controllers/`, database entities and query helpers live in `models/`, request and response schemas live in `views/`, business rules live in `domain/`, and shared configuration/helpers live in `core/`. The root `backend/main.py` remains a thin entry point for running the FastAPI app with Uvicorn.

The machine learning workflow is intentionally offline. The model is trained and evaluated in the ML module, then predictions are published into the database. Runtime API requests read prepared prediction rows instead of training or executing heavy ML logic inside the request cycle.

## Repository Structure

```text
F1_Insight_Hub/
  backend/              FastAPI backend, database models, migrations, ingestion scripts
  mobile/               Expo + React Native mobile application
  ml/top10_xgboost/     XGBoost notebook, feature engineering, training utilities
  docs/report/          Final LaTeX documentation and generated PDF
  README.md             Project overview and run instructions
```

## Main Functionality

The final version includes account registration, login, logout, session persistence, password reset, season browsing, race browsing, race details, driver context, Top-10 prediction ranking, and an interactive prediction calculator. The mobile service layer also contains local mock fixtures used for tests and fallback behavior when the backend is unavailable during development.

The backend stores and serves Formula 1 domain data, user sessions, notifications, race participants, model versions, and prediction rows. The database can run with PostgreSQL for the full project setup or SQLite for local development.

## Machine Learning Component

The production-facing ML task is binary classification: predicting whether a driver will finish in the Top 10. This is a good fit for the application because Formula 1 points finishes are easy to understand for users, can be shown as probabilities, and can be ranked per race.

The model is based on XGBoost, which is well suited for structured tabular data. Formula 1 race data is naturally tabular: every row can represent a driver in a race, with columns for grid position, qualifying results, circuit metadata, driver/team identifiers, and historical rolling statistics. XGBoost handles mixed feature interactions well and usually performs strongly on this kind of engineered dataset.

The model uses only pre-race information available after qualifying and before the race. This avoids leakage from same-race outcomes such as final position, points, fastest lap, pit stops, or race events. Historical driver and constructor statistics are shifted so that the current race never contributes to its own prediction.

The dataset is based on the Kaggle Formula 1 race data archive by `jtrotman/formula-1-race-data`. The final training workflow uses the modern era from 2006 onward because qualifying information is more complete and more comparable after the introduction of the current qualifying format. The season split is chronological: training uses 2006-2021, validation uses 2022, and testing uses 2023+.


## Technologies

Mobile technologies include Expo SDK 54, React Native, TypeScript, React Navigation, Expo Secure Store, Jest, and React Native Testing Library.

Backend technologies include FastAPI, SQLAlchemy, Alembic, PostgreSQL/SQLite, Pydantic, and Argon2 password hashing.

The ML stack includes pandas, scikit-learn, XGBoost, joblib, and Jupyter Notebook. The final documentation is written in LaTeX and includes PlantUML diagrams and screenshots from the mobile application.

## Requirements

Recommended local setup:

- Node.js 20+
- npm
- Python 3.12+
- PostgreSQL 16+ for the full database setup
- Expo Go for physical mobile testing
- PlantUML and LuaLaTeX for rebuilding the documentation

## Backend Setup

Install backend dependencies:

```bash
cd backend
python -m pip install -r requirements.txt
```

Configure the database connection:

```bash
export DATABASE_URL="postgresql+psycopg://f1_user:f1_password@localhost:5432/f1_insight_hub"
export DB_ECHO=false
```

Initialize or migrate the database schema:

```bash
python init_db.py
```

Load Formula 1 archive data and publish prediction rows:

```bash
python ingest_archive.py
python publish_predictions.py
```

Run the backend API:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Mobile Setup

Install mobile dependencies:

```bash
cd mobile
npm install
```

Run the app in web mode:

```bash
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npx expo start --web --clear
```

Run the app on a physical phone with Expo Go:

```bash
EXPO_PUBLIC_API_BASE_URL=http://<your-laptop-lan-ip>:8000 npx expo start --host lan --clear
```

For phone testing, the backend must run on `0.0.0.0`, and the phone must be connected to the same network as the development machine.

Android emulator URL:

```bash
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000 npx expo start --android --clear
```

## ML Workflow

Install ML dependencies:

```bash
cd ml/top10_xgboost
python -m pip install -r requirements.txt
```

Open and run the final notebook:

```text
ml/top10_xgboost/notebooks/01_top10_xgboost.ipynb
```

The notebook builds the modeling table, trains the model, evaluates it, saves artifacts, explains feature importance, and demonstrates inference for a selected race.

## Testing

Backend tests:

```bash
cd backend
python -m unittest discover -s tests -p "test_*.py" -v
```

Mobile type check and tests:

```bash
cd mobile
npx tsc --noEmit
npm test -- --runInBand
```

## Documentation

The final project report is stored under `docs/report/`. It contains the system architecture diagram, user flow diagram, database ER diagram, screenshots, implementation details, ML explanation, testing notes, and individual contribution information.

Build the LaTeX report:

```bash
cd docs/report
make
```

Generated PDF:

```text
docs/report/build/main.pdf
```
