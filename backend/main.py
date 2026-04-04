import json
import os
from contextlib import asynccontextmanager
from typing import Optional

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from inference_demo import predict_race_probabilities

# ---------------------------------------------------------------------------
# Circuit lookup  – auto-fills geo fields when only circuitId is given
# (source: Ergast / FastF1 circuits data)
# ---------------------------------------------------------------------------
CIRCUIT_GEO: dict[str, dict] = {
    "albert_park":   {"circuit_country": "Australia",    "circuit_alt": 10,   "circuit_lat": -37.8497,  "circuit_lng": 144.968},
    "americas":      {"circuit_country": "USA",          "circuit_alt": 161,  "circuit_lat": 30.1328,   "circuit_lng": -97.6411},
    "bahrain":       {"circuit_country": "Bahrain",      "circuit_alt": 7,    "circuit_lat": 26.0325,   "circuit_lng": 50.5106},
    "baku":          {"circuit_country": "Azerbaijan",   "circuit_alt": -17,  "circuit_lat": 40.3725,   "circuit_lng": 49.8533},
    "catalunya":     {"circuit_country": "Spain",        "circuit_alt": 109,  "circuit_lat": 41.57,     "circuit_lng": 2.26111},
    "hungaroring":   {"circuit_country": "Hungary",      "circuit_alt": 264,  "circuit_lat": 47.5789,   "circuit_lng": 19.2486},
    "imola":         {"circuit_country": "Italy",        "circuit_alt": 37,   "circuit_lat": 44.3439,   "circuit_lng": 11.7167},
    "interlagos":    {"circuit_country": "Brazil",       "circuit_alt": 792,  "circuit_lat": -23.7036,  "circuit_lng": -46.6997},
    "jeddah":        {"circuit_country": "Saudi Arabia", "circuit_alt": 15,   "circuit_lat": 21.6319,   "circuit_lng": 39.1044},
    "losail":        {"circuit_country": "Qatar",        "circuit_alt": 14,   "circuit_lat": 25.49,     "circuit_lng": 51.4542},
    "marina_bay":    {"circuit_country": "Singapore",    "circuit_alt": 18,   "circuit_lat": 1.2914,    "circuit_lng": 103.864},
    "miami":         {"circuit_country": "USA",          "circuit_alt": 0,    "circuit_lat": 25.9581,   "circuit_lng": -80.2389},
    "monaco":        {"circuit_country": "Monaco",       "circuit_alt": 7,    "circuit_lat": 43.7347,   "circuit_lng": 7.4205},
    "monza":         {"circuit_country": "Italy",        "circuit_alt": 162,  "circuit_lat": 45.6156,   "circuit_lng": 9.2811},
    "portimao":      {"circuit_country": "Portugal",     "circuit_alt": 108,  "circuit_lat": 37.227,    "circuit_lng": -8.6267},
    "red_bull_ring": {"circuit_country": "Austria",      "circuit_alt": 678,  "circuit_lat": 47.2197,   "circuit_lng": 14.7647},
    "ricard":        {"circuit_country": "France",       "circuit_alt": 153,  "circuit_lat": 43.2506,   "circuit_lng": 5.79167},
    "rodriguez":     {"circuit_country": "Mexico",       "circuit_alt": 2227, "circuit_lat": 19.4042,   "circuit_lng": -99.0907},
    "shanghai":      {"circuit_country": "China",        "circuit_alt": 5,    "circuit_lat": 31.3389,   "circuit_lng": 121.22},
    "silverstone":   {"circuit_country": "UK",           "circuit_alt": 153,  "circuit_lat": 52.0786,   "circuit_lng": -1.01694},
    "spa":           {"circuit_country": "Belgium",      "circuit_alt": 401,  "circuit_lat": 50.4372,   "circuit_lng": 5.97139},
    "suzuka":        {"circuit_country": "Japan",        "circuit_alt": 45,   "circuit_lat": 34.8431,   "circuit_lng": 136.541},
    "vegas":         {"circuit_country": "USA",          "circuit_alt": 642,  "circuit_lat": 36.1147,   "circuit_lng": -115.173},
    "villeneuve":    {"circuit_country": "Canada",       "circuit_alt": 13,   "circuit_lat": 45.5,      "circuit_lng": -73.5228},
    "yas_marina":    {"circuit_country": "UAE",          "circuit_alt": 3,    "circuit_lat": 24.4672,   "circuit_lng": 54.6031},
    "zandvoort":     {"circuit_country": "Netherlands",  "circuit_alt": -1,   "circuit_lat": 52.3888,   "circuit_lng": 4.54092},
}

# ---------------------------------------------------------------------------
# Paths  (artifacts sit next to main.py)
# ---------------------------------------------------------------------------
BASE_DIR        = os.path.dirname(__file__)
PIPELINE_PATH   = os.path.join(BASE_DIR, "top10_pipeline.joblib")
METADATA_PATH   = os.path.join(BASE_DIR, "top10_metadata.json")
FEATURE_DF_PATH = os.path.join(BASE_DIR, "feature_df.parquet")

# ---------------------------------------------------------------------------
# Globals populated at startup
# ---------------------------------------------------------------------------
pipeline        = None
feature_columns: list[str] = []
feature_df: pd.DataFrame | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load ML artifacts once when the server starts."""
    global pipeline, feature_columns, feature_df

    for path, label in [(PIPELINE_PATH, "pipeline"), (METADATA_PATH, "metadata")]:
        if not os.path.exists(path):
            raise RuntimeError(f"Artifact not found: {path}  ({label})")

    pipeline = joblib.load(PIPELINE_PATH)

    with open(METADATA_PATH, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    feature_columns = metadata.get("features_used", [])
    print(f"[startup] Loaded top10 pipeline | features: {feature_columns}")

    if os.path.exists(FEATURE_DF_PATH):
        feature_df = pd.read_parquet(FEATURE_DF_PATH)
        print(f"[startup] Loaded feature_df  ({len(feature_df):,} rows)")
    else:
        print("[startup] feature_df.parquet not found – /predict/race unavailable")

    yield


app = FastAPI(
    title="F1 Insider Hub",
    description="FastAPI wrapper around the trained F1 top-10 finish classifier (XGBoost)",
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/")
def read_root():
    return {
        "status": "ok",
        "model": "top10",
        "features": feature_columns,
    }


# ---------------------------------------------------------------------------
# Prediction endpoint
# GET /predict/top10?year=2023&round=5&grid=3&...
#
# Feature names match exactly what is stored in top10_metadata.json
# ---------------------------------------------------------------------------
@app.get("/predict/top10")
def predict_top10(
    # --- Race identifiers ---
    year:                          Optional[int]   = Query(default=None, description="Season year"),
    race_round:                    Optional[int]   = Query(default=None, alias="round", description="Round number in the season"),
    # --- Circuit ---
    circuitId:                     Optional[str]   = Query(default=None, description="Circuit identifier (e.g. 'monza')"),
    circuit_country:               Optional[str]   = Query(default=None, description="Country of the circuit"),
    circuit_alt:                   Optional[float] = Query(default=None, description="Circuit altitude (m)"),
    circuit_lat:                   Optional[float] = Query(default=None, description="Circuit latitude"),
    circuit_lng:                   Optional[float] = Query(default=None, description="Circuit longitude"),
    # --- Driver / Constructor ---
    driverId:                      Optional[str]   = Query(default=None, description="Driver identifier (e.g. 'hamilton')"),
    constructorId:                 Optional[str]   = Query(default=None, description="Constructor identifier (e.g. 'mercedes')"),
    # --- Grid / Qualifying ---
    grid:                          Optional[float] = Query(default=None, description="Start grid position"),
    grid_missing:                  Optional[int]   = Query(default=None, description="1 if grid position was missing"),
    grid_zero:                     Optional[int]   = Query(default=None, description="1 if grid position was 0 (pit-lane start)"),
    quali_position:                Optional[float] = Query(default=None, description="Qualifying classification position"),
    q1_seconds:                    Optional[float] = Query(default=None, description="Q1 lap time in seconds"),
    q2_seconds:                    Optional[float] = Query(default=None, description="Q2 lap time in seconds"),
    q3_seconds:                    Optional[float] = Query(default=None, description="Q3 lap time in seconds"),
    has_qualifying_data:           Optional[int]   = Query(default=None, description="1 if qualifying data exists"),
    qualifying_missing:            Optional[int]   = Query(default=None, description="1 if qualifying data is missing"),
    # --- Driver rolling stats ---
    driver_points_mean_last5:      Optional[float] = Query(default=None, description="Driver avg points over last 5 races"),
    driver_finishpos_mean_last5:   Optional[float] = Query(default=None, description="Driver avg finish position over last 5 races"),
    driver_top10_rate_last10:      Optional[float] = Query(default=None, description="Driver top-10 finish rate over last 10 races"),
    driver_dnf_rate_last20:        Optional[float] = Query(default=None, description="Driver DNF rate over last 20 races"),
    # --- Team rolling stats ---
    team_points_mean_last5:        Optional[float] = Query(default=None, description="Team avg points over last 5 races"),
    team_top10_rate_last10:        Optional[float] = Query(default=None, description="Team top-10 finish rate over last 10 races"),
    team_dnf_rate_last20:          Optional[float] = Query(default=None, description="Team DNF rate over last 20 races"),
    # --- Circuit-specific history ---
    driver_avg_finish_at_circuit:  Optional[float] = Query(default=None, description="Driver avg finish position at this circuit"),
    driver_top10_rate_at_circuit:  Optional[float] = Query(default=None, description="Driver top-10 rate at this circuit"),
):
    """
    Predicts whether a driver will finish in the **top 10**.

    All 27 feature values are passed as query parameters.  
    Example:  
    `/predict/top10?year=2023&round=5&circuitId=monza&driverId=hamilton&constructorId=mercedes&grid=1&...`
    """
    raw = {
        "year":                         year,
        "round":                        race_round,
        "circuitId":                    circuitId,
        "circuit_country":              circuit_country,
        "circuit_alt":                  circuit_alt,
        "circuit_lat":                  circuit_lat,
        "circuit_lng":                  circuit_lng,
        "driverId":                     driverId,
        "constructorId":                constructorId,
        "grid":                         grid,
        "grid_missing":                 grid_missing,
        "grid_zero":                    grid_zero,
        "quali_position":               quali_position,
        "q1_seconds":                   q1_seconds,
        "q2_seconds":                   q2_seconds,
        "q3_seconds":                   q3_seconds,
        "has_qualifying_data":          has_qualifying_data,
        "qualifying_missing":           qualifying_missing,
        "driver_points_mean_last5":     driver_points_mean_last5,
        "driver_finishpos_mean_last5":  driver_finishpos_mean_last5,
        "driver_top10_rate_last10":     driver_top10_rate_last10,
        "driver_dnf_rate_last20":       driver_dnf_rate_last20,
        "team_points_mean_last5":       team_points_mean_last5,
        "team_top10_rate_last10":       team_top10_rate_last10,
        "team_dnf_rate_last20":         team_dnf_rate_last20,
        "driver_avg_finish_at_circuit": driver_avg_finish_at_circuit,
        "driver_top10_rate_at_circuit": driver_top10_rate_at_circuit,
    }

    # Auto-fill circuit geo fields from lookup table when circuitId is known
    if circuitId and circuitId in CIRCUIT_GEO:
        geo = CIRCUIT_GEO[circuitId]
        for field in ("circuit_country", "circuit_alt", "circuit_lat", "circuit_lng"):
            if raw[field] is None:
                raw[field] = geo[field]

    # Keep only the columns the pipeline was trained on (preserves order)
    input_data = {col: raw[col] for col in feature_columns}

    missing = [col for col in feature_columns if input_data[col] is None]
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required feature(s): {missing}",
        )

    df = pd.DataFrame([input_data])

    try:
        # pipeline already includes preprocessing + XGBoost model
        proba      = pipeline.predict_proba(df)[0].tolist()
        prediction = int(proba[1] >= 0.5)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "top10": bool(prediction),
        "probability": {
            "not_top10": round(proba[0], 4),
            "top10":     round(proba[1], 4),
        },
        "input": input_data,
    }


# ---------------------------------------------------------------------------
# Race top-10 ranking endpoint
# GET /predict/race?year=2023&round=14
# GET /predict/race?race_id=1096&top_n=10
#
# Returns drivers ranked by predicted top-10 probability for a whole race.
# Requires feature_df.parquet – run notebook section 11 to generate it.
# ---------------------------------------------------------------------------
@app.get("/predict/race")
def predict_race(
    race_id:    Optional[int] = Query(default=None, description="Ergast raceId"),
    year:       Optional[int] = Query(default=None, description="Season year"),
    race_round: Optional[int] = Query(default=None, alias="round", description="Round number in the season"),
    top_n:      int           = Query(default=20, description="How many drivers to return"),
):
    """
    Returns drivers ranked by predicted top-10 finish probability for an entire race.

    Identify the race with **either**:
    - `race_id` — Ergast numeric ID
    - `year` + `round` — e.g. `year=2023&round=14` (Monza 2023)

    Example: `/predict/race?year=2023&round=14&top_n=20`
    """
    if feature_df is None:
        raise HTTPException(
            status_code=503,
            detail="feature_df.parquet not loaded. Copy it from the training machine and restart the server.",
        )

    if race_id is None and (year is None or race_round is None):
        raise HTTPException(
            status_code=422,
            detail="Provide either 'race_id' or both 'year' and 'round'.",
        )

    try:
        ranked = predict_race_probabilities(
            pipeline=pipeline,
            feature_df=feature_df,
            feature_columns=feature_columns,
            race_id=race_id,
            year=year,
            round_number=race_round,
            top_n=top_n,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return ranked.to_dict(orient="records")
