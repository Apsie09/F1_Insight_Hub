# F1 Insight Hub - Database Design

## Goal

Use a relational database as the application-serving layer while keeping raw CSV/parquet/model artifacts as the ML and ingestion layer.

This architecture is intended to provide:

- fast mobile API responses
- stable app-facing payloads
- model-versioned prediction storage
- clear separation between ML jobs and serving paths

## Current Implementation Status

The database design is no longer just conceptual. The following parts are implemented:

- SQLAlchemy ORM models
- Alembic migration environment
- schema initialization script
- archive ingestion script
- prediction publishing script
- PostgreSQL-backed API serving in normal mode

Current backend mode:

- primary mode: PostgreSQL-backed serving
- fallback mode: legacy file-backed in-memory state

## Design Principles

1. raw archive and ML artifacts should not be the normal app-serving source
2. app-facing endpoints should read from relational tables
3. race predictions should be stored and versioned
4. model support metadata should be carried into the DB layer
5. ingestion/publish jobs should be separate from online API serving

## Layer Separation

### Raw Data / ML Layer

These remain file-based:

- `data/archive/*.csv`
- `data/feature_df.parquet`
- `artifacts/top10_pipeline.joblib`
- `artifacts/top10_metadata.json`

These are used for:

- training
- feature generation
- archive ingestion
- batch prediction publishing

### Database Serving Layer

This is the source for mobile-serving endpoints.

It stores:

- seasons
- races
- constructors
- drivers
- race context
- race participants
- model versions
- race predictions
- racer race context
- app users
- app user sessions
- app notifications

## Core Serving Schema

### `seasons`

Purpose:

- drive season browsing
- store support-window metadata

Columns:

- `year`
- `label`
- `total_races`
- `champion_hint`
- `prediction_support`
- `support_message`

### `races`

Purpose:

- drive browse, featured races, and race details

Columns:

- `id`
- `season_year`
- `round`
- `name`
- `circuit`
- `country`
- `date`
- `weather_forecast`
- `spotlight`
- `prediction_support`
- `support_message`

Index intent:

- `(season_year, round)`

### `constructors`

Purpose:

- canonical constructor dimension

Columns:

- `id`
- `name`

### `drivers`

Purpose:

- canonical driver dimension

Columns:

- `id`
- `name`
- `team`
- `number`
- `nationality`
- `wins`
- `podiums`
- `championships`
- `career_points`
- `style`

### `race_context`

Purpose:

- drive race details context cards

Columns:

- `race_id`
- `track_length_km`
- `laps`
- `altitude_m`
- `overtake_difficulty`
- `notes_json`

### `model_versions`

Purpose:

- version model-generated predictions

Columns:

- `id`
- `model_name`
- `version_label`
- `artifact_path`
- `metadata_path`
- `feature_count`
- `min_train_year`
- `train_end_year`
- `val_year`
- `test_start_year`
- `trained_at`
- `created_at`
- `notes`

Constraint intent:

- unique `(model_name, version_label)`

### `race_participants`

Purpose:

- represent the race field
- provide driver/race serving context

Columns:

- `id`
- `race_id`
- `driver_id`
- `constructor_id`
- `grid`
- `qualifying_position`
- `recent_form_score`

Constraint intent:

- unique `(race_id, driver_id)`

### `race_predictions`

Purpose:

- store per-race, per-driver model outputs

Columns:

- `id`
- `race_id`
- `driver_id`
- `constructor_id`
- `model_version_id`
- `grid`
- `qualifying_position`
- `recent_form_score`
- `top10_probability`
- `confidence`
- `prediction_support`
- `generated_at`

Constraint intent:

- unique `(race_id, driver_id, model_version_id)`

Index intent:

- `(race_id, top10_probability DESC)`
- `(driver_id)`

### `racer_race_context`

Purpose:

- support the racer details screen with race-specific context

Columns:

- `id`
- `race_id`
- `driver_id`
- `last_finish`
- `avg_finish_at_circuit`
- `constructor_momentum`
- `note`

Constraint intent:

- unique `(race_id, driver_id)`

### `app_users`

Purpose:

- store application login identities

Columns:

- `id`
- `email`
- `display_name`
- `password_hash`
- `role`
- `is_active`
- `created_at`
- `updated_at`

### `app_user_sessions`

Purpose:

- persist authenticated sessions for protected API access

Columns:

- `id`
- `user_id`
- `token_hash`
- `created_at`
- `last_used_at`
- `expires_at`
- `revoked_at`

Constraint intent:

- unique `token_hash`

### `app_notifications`

Purpose:

- store in-app account notifications

Columns:

- `id`
- `user_id`
- `type`
- `title`
- `message`
- `created_at`
- `read_at`

## Implemented Scripts

### `backend/init_db.py`

Responsibility:

- upgrade an empty database to Alembic head
- stamp an already-existing schema to the current Alembic revision when needed

### `backend/ingest_archive.py`

Responsibility:

- load archive-derived seasons, races, constructors, drivers, and race context

### `backend/publish_predictions.py`

Responsibility:

- load model artifacts and feature parquet
- publish participants
- publish model versions
- publish race predictions
- publish racer race context

## API Mapping

The mobile-serving domain endpoints are protected by session auth.

### `POST /auth/register`

Writes to:

- `app_users`
- `app_user_sessions`

### `POST /auth/login`

Reads/Writes:

- `app_users`
- `app_user_sessions`

### `GET /auth/me`

Reads from:

- `app_users`
- `app_user_sessions`

### `POST /auth/logout`

Updates:

- `app_user_sessions`

### `GET /auth/notifications`

Reads from:

- `app_notifications`

### `POST /auth/notifications/read-all`

Updates:

- `app_notifications`

### `POST /auth/password/reset`

Reads/Writes:

- `app_users`
- `app_notifications`

### `GET /seasons`

Reads from:

- `seasons`

### `GET /seasons/{year}/races`

Reads from:

- `races`

### `GET /races`

Reads from:

- `races`

### `GET /races/featured`

Reads from:

- `races`

### `GET /races/{race_id}`

Reads from:

- `races`
- `race_context`

### `GET /races/{race_id}/participants`

Reads from:

- `race_participants`
- `drivers`
- `race_predictions`

### `GET /races/{race_id}/predictions/top10`

Reads from:

- `race_predictions`
- `drivers`
- `model_versions`

### `GET /races/{race_id}/racers/{racer_id}`

Reads from:

- `drivers`
- `racer_race_context`

### `POST /predictions/calculate`

Reads from:

- `race_predictions`
- `races`
- `model_versions`

Then applies:

- grid override
- weather override
- backend-derived recent form

## Recommended Production Direction

Use PostgreSQL as the primary database.

SQLite remains acceptable only for:

- local bootstrap
- quick ORM testing

## Remaining Gaps

- secrets/env handling is still manual
- scheduled ingestion/publish automation is not set up
- legacy fallback serving path still exists and should be minimized over time
- signed-out password recovery is not implemented
