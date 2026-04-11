# F1 Insight Hub

F1 Insight Hub is a cross-platform Formula 1 application with a React Native mobile app, a FastAPI backend, and an ML feature/prediction pipeline.

## Architecture Overview

- `mobile/`: Expo + React Native + TypeScript client.
- `backend/`: FastAPI + SQLAlchemy service, DB-first serving.
- `ml/`: model artifacts and data science pipeline assets.

Main runtime flow:

1. Mobile app calls backend REST API.
2. Backend reads serving data from SQLite/PostgreSQL.
3. Prediction calculator uses stored model outputs + lightweight scenario adjustments.
4. Auth uses DB-backed users, sessions, and notifications tables.

## Repository Layout

```text
F1_Insight_Hub/
  backend/
  docs/
  ml/
  mobile/
  README.md
```

## Database Integration (Python + TypeScript)

The project already uses a shared backend DB serving layer consumed by TypeScript mobile services.

### Core serving tables

- `seasons`
- `races`
- `drivers`
- `constructors`
- `race_context`
- `race_participants`
- `model_versions`
- `race_predictions`
- `racer_race_context`
- `app_users`
- `app_user_sessions`
- `app_notifications`

### Auth tables

`app_users` stores:

- `id`
- `email` (unique)
- `display_name`
- `password_hash` (Argon2)
- `role`
- `is_active`
- `created_at`
- `updated_at`

`app_user_sessions` stores:

- `id`
- `user_id`
- `token_hash`
- `created_at`
- `last_used_at`
- `expires_at`
- `revoked_at`

`app_notifications` stores:

- `id`
- `user_id`
- `type`
- `title`
- `message`
- `created_at`
- `read_at`

## API Endpoints

### Health and domain

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

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /auth/notifications`
- `POST /auth/notifications/read-all`
- `POST /auth/password/reset`

## Mobile Login UX (Implemented)

- Full-screen auth overlay appears before app interaction.
- Modes: `Log In` and `Create Account`.
- On success, overlay disappears and app unlocks.
- Session is persisted with `expo-secure-store` (fallback handling included).
- Backend mode: accounts, sessions, and notifications are stored in DB.
- Header account menu shows:
  - account name
  - notifications
  - password reset
  - switch account
  - log out
- Test mode: auth gate is bypassed unless `EXPO_PUBLIC_TEST_AUTH_GATE=enabled`.

## Dependencies

## Local project dependencies (required)

These should stay local to each project folder (`backend/`, `mobile/`, `ml/`).

### Mobile (`mobile/package.json`)

Key runtime dependencies:

- `expo ~54.0.33`
- `react 19.1.0`
- `react-native 0.81.5`
- `@react-navigation/*`
- `expo-font ~14.0.11`
- `expo-secure-store ~15.0.8`
- `expo-status-bar ~3.0.9`

Testing/dev dependencies include:

- `jest`
- `jest-expo ~54.0.17`
- `@testing-library/react-native`
- `typescript`

### Backend (`backend/requirements.txt`)

- `fastapi`
- `uvicorn[standard]`
- `sqlalchemy`
- `alembic`
- `psycopg[binary]`
- `argon2-cffi`
- `pandas`
- `joblib`
- `scikit-learn`
- `xgboost`

### ML (`ml/top10_xgboost/requirements.txt`)

Install as needed for model/pipeline workflows.

## Global tooling (optional)

Industry-standard practice is:

- Keep app/runtime dependencies local.
- Keep only CLI/tooling global if desired.

Global Expo CLI is optional. Current machine has:

- `expo@54.x` or `npx expo` from the local project install.

## Setup and Run

### 1. Prerequisites

- Node.js 20+
- npm
- Python 3.12+
- PostgreSQL (optional but recommended for DB-first production-like runs)

### 2. Install dependencies

From repo root:

```bash
# Mobile
cd mobile
npm install

# Backend
cd ../backend
python -m pip install -r requirements.txt

# ML (optional for serving-only mobile/backend work)
cd ../ml/top10_xgboost
python -m pip install -r requirements.txt
```

### 3. Initialize/migrate backend DB

```bash
cd backend
python init_db.py
```

### 4. Load data and publish predictions (if needed)

```bash
python ingest_archive.py
python publish_predictions.py
```

### 5. Run backend

```bash
cd backend

# Example PostgreSQL config
export DATABASE_URL="postgresql+psycopg://f1_user:<password>@localhost:5432/f1_insight_hub"
export DB_ECHO=false
export F1_SERVING_MODE=db
export F1_ENABLE_LEGACY_FALLBACK=false

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 6. Run mobile app

```bash
cd mobile

# Web
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 npx expo start --web --clear

# Android emulator
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000 npx expo start --android --clear

# Physical device (same Wi-Fi)
EXPO_PUBLIC_API_BASE_URL=http://<your-laptop-lan-ip>:8000 npx expo start --clear
```

## First Login Flow

1. Launch app.
2. In auth overlay, choose `Create Account` for first-time user.
3. Submit display name, email, password.
4. Overlay closes on success.
5. Session is persisted locally, so the overlay stays hidden until you use the header `Log out` button (top-right).
6. Password changes happen from the header account menu and require current password + confirm new password.

## Testing

### Mobile

```bash
cd mobile
npx tsc --noEmit
npm test -- --runInBand
```

### Backend

```bash
cd backend
python -m unittest discover -s tests -p "test_*.py" -v
```

## Troubleshooting

### `Failed to fetch` in app

Usually backend is not reachable from the selected platform host.

- Web/iOS simulator: use `127.0.0.1`.
- Android emulator: use `10.0.2.2`.
- Physical device: use machine LAN IP and `--host 0.0.0.0` on backend.

### App shows empty seasons/races after login

If backend auth works but race feeds are empty/unseeded, the mobile app now auto-falls back to local fixtures for race browsing/prediction UI.

- This keeps the app usable while backend data ingestion is still pending.
- To force strict API-only behavior (disable fallback), set:

```bash
EXPO_PUBLIC_DISABLE_MOCK_FALLBACK=true
```

### Login form does not appear

The login overlay only shows while signed out.

- If you already authenticated once, use the top-right header `Log out` button to reopen it.

### Password reset fails

The current password reset flow is authenticated only.

- open the account menu
- enter current password
- enter new password
- confirm the new password
- submit

If the current password is wrong, the backend returns a `400` error with a clear message.
- On web, you can also clear local storage key `f1_insight_hub_auth_session`.

### Backend returns empty lists

Current local DB can be initialized but still empty for race feeds until data is ingested.

```bash
cd backend
python init_db.py
python ingest_archive.py
python publish_predictions.py
```

If you intentionally run strict API mode and backend is empty, mobile will now show an explicit endpoint error.

### Expo compatibility warning

Run:

```bash
cd mobile
npx expo install --check
```

If mismatches are reported, run `npx expo install <package>` for the listed packages.

## Notes for Backend Developer

- Mobile auth integration expects:
  - `POST /auth/register` returning `{ token, user }`
  - `POST /auth/login` returning `{ token, user }`
- Passwords are expected to be securely hashed server-side (currently Argon2).
- `token` is currently a lightweight session token placeholder for frontend gating and can be replaced with JWT + refresh strategy later.
- Existing race/prediction endpoints remain unchanged.
