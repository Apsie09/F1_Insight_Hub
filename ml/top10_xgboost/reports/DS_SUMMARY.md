# F1 Stats App - Data Science / ML Summary

## Dataset discovery (`data/archive/`)

Discovered CSV files:
- `circuits.csv`
- `constructor_results.csv`
- `constructors.csv`
- `constructor_standings.csv`
- `drivers.csv`
- `driver_standings.csv`
- `lap_times.csv`
- `pit_stops.csv`
- `qualifying.csv`
- `races.csv`
- `results.csv`
- `seasons.csv`
- `sprint_results.csv`
- `status.csv`

Race-events tables (safety car / red flag) present:
- Not found in `data/archive/` for this run.

Year coverage:
- Available race years in `races.csv`: `1950` to `2025` (continuous)
- Total races in `races.csv`: `1149`

## Key tables and columns

Primary modeling tables used:
- `results.csv`: `resultId, raceId, driverId, constructorId, grid, positionOrder, points, statusId, ...`
- `races.csv`: `raceId, year, round, circuitId, date, ...`
- `circuits.csv`: `circuitId, country, lat, lng, alt, ...`
- `qualifying.csv`: `raceId, driverId, constructorId, position, q1, q2, q3`
- `status.csv`: `statusId, status`
- `drivers.csv`: `driverId, forename, surname, ...` (for display fields)
- `constructors.csv`: `constructorId, name, ...` (for display fields)

Join keys:
- Base row grain: `driverId x raceId` from `results.csv`
- `results.raceId -> races.raceId`
- `races.circuitId -> circuits.circuitId`
- `results.statusId -> status.statusId`
- `results.(raceId, driverId) -> qualifying.(raceId, driverId)`
- `results.driverId -> drivers.driverId`
- `results.constructorId -> constructors.constructorId`

## Prediction tasks implemented

1. Top-10 finish classification:
- Target: `y_top10 = 1 if positionOrder <= 10 else 0`
- Notebook: `notebooks/01_top10_xgboost.ipynb`

2. DNF classification:
- Finished definition: `status == "Finished"` OR `status` starts with `"+"`
- Target: `y_dnf = 1 if NOT finished else 0`
- Notebook: `notebooks/02_dnf_xgboost.ipynb`

## Leakage prevention strategy

Pre-race-only inputs are used:
- Grid position
- Qualifying position and parsed `q1/q2/q3` times
- Static circuit metadata (`country`, `alt`, `lat`, `lng`)
- Historical rolling stats with explicit `shift(1)` so each row only sees prior races

Leakage controls:
- Same-race outcomes (`points`, finish position, race time, fastest lap) are not direct model features
- Same-race event tables are not used as features
- Rolling/expanding stats are shifted to prevent current race target contamination
- Time split is by season (no random shuffle across years)

## Feature set used

Base pre-race features:
- `year, round, circuitId, circuit_country, circuit_alt, circuit_lat, circuit_lng`
- `driverId, constructorId`
- `grid, grid_missing, grid_zero`
- `quali_position, q1_seconds, q2_seconds, q3_seconds`
- Qualifying deltas: `quali_position_gap_to_best, quali_position_gap_to_median`
- Session pace gaps: `q1_seconds_gap_to_best, q1_seconds_gap_to_median, q2_seconds_gap_to_best, q2_seconds_gap_to_median, q3_seconds_gap_to_best, q3_seconds_gap_to_median`
- Session progression: `q2_minus_q1_seconds, q3_minus_q2_seconds`
- Teammate-relative pre-race pace: `grid_delta_vs_teammate, quali_delta_vs_teammate`
- `has_qualifying_data, qualifying_missing`

Rolling historical features (shifted):
- Driver: `driver_points_mean_last5, driver_finishpos_mean_last5, driver_top10_rate_last10, driver_dnf_rate_last20`
- Constructor: `team_points_mean_last5, team_top10_rate_last10, team_dnf_rate_last20`
- Circuit history (driver-circuit): `driver_avg_finish_at_circuit, driver_top10_rate_at_circuit`

Missing-data handling decisions:
- Missing qualifying rows/times are kept as `NaN` and represented by explicit flags (`has_qualifying_data`, `qualifying_missing`)
- Missing grid values are kept as `NaN` and represented by `grid_missing`
- `grid == 0` is captured as an explicit `grid_zero` indicator to preserve pit-lane/no-grid semantics
- Numeric missing values are imputed with median in the pipeline
- Categorical missing values are imputed with most-frequent in the pipeline

## Split strategy

Season-based time split (`src/split.py`):
- Train: `min_train_year <= year <= train_end_year` (notebook default: `2006 <= year <= 2021`)
- Validation: `year == 2022`
- Test: `year >= 2023`
- No random shuffling

DNF notebook default retry configuration:
- `MIN_TRAIN_YEAR = 2014`
- `USE_SCALE_POS_WEIGHT = False`
- Simpler DNF feature slice drops `driverId` and the added qualifying-gap / teammate-delta columns
- Stronger regularization via notebook `DNF_MODEL_PARAMS`

Data sufficiency snapshot for notebook defaults (`2006-2021` train):
- Train rows: `6555` (`Top10 positive: 46.83%`, `DNF positive: 20.59%`)
- Validation rows: `440` (`Top10 positive: 50.00%`, `DNF positive: 16.82%`)
- Test rows: `1398` (`Top10 positive: 50.07%`, `DNF positive: 12.88%`)
- Qualifying missingness by split: Train `1.31%` (for `2006-2021`), Val `0.91%`, Test `1.07%`

## Modeling setup

Pipeline:
- `ColumnTransformer`
  - Categorical: `SimpleImputer(most_frequent) -> OneHotEncoder(handle_unknown="ignore")`
  - Numeric: `SimpleImputer(median)`
- Model: `XGBClassifier` (`objective="binary:logistic"`)

Default params:
- `n_estimators=2000`
- `learning_rate=0.05`
- `max_depth=5`
- `subsample=0.8`
- `colsample_bytree=0.8`
- `reg_lambda=1.0`
- `reg_alpha=0.0`
- `early_stopping_rounds=50` (validation set)

Class imbalance:
- DNF model computes `scale_pos_weight = negative/positive` from train split

## Evaluation outputs

Implemented metrics (`src/eval.py`):
- ROC-AUC
- PR-AUC (Average Precision)
- LogLoss
- Brier score
- Confusion matrix, Precision/Recall/F1 at configurable threshold
- Calibration curve plotting via `matplotlib`
- Threshold sweep and validation-based threshold selection (`find_best_threshold`)

Current status:
- Manual training requested by user, so metrics are not executed/populated in this pass.

Top10 metrics (fill after run):
- Train: `ROC-AUC = TBD, PR-AUC = TBD, LogLoss = TBD, Brier = TBD`
- Val: `ROC-AUC = TBD, PR-AUC = TBD, LogLoss = TBD, Brier = TBD`
- Test: `ROC-AUC = TBD, PR-AUC = TBD, LogLoss = TBD, Brier = TBD`

DNF metrics (fill after run):
- Train: `ROC-AUC = TBD, PR-AUC = TBD, LogLoss = TBD, Brier = TBD`
- Val: `ROC-AUC = TBD, PR-AUC = TBD, LogLoss = TBD, Brier = TBD`
- Test: `ROC-AUC = TBD, PR-AUC = TBD, LogLoss = TBD, Brier = TBD`

## Artifacts and outputs

Training notebooks save:
- `artifacts/top10_model.joblib`
- `artifacts/top10_pipeline.joblib`
- `artifacts/top10_metadata.json`
- `artifacts/dnf_model.joblib`
- `artifacts/dnf_pipeline.joblib`
- `artifacts/dnf_metadata.json`

Metadata fields include:
- Training year boundaries
- Feature list
- Dataset files used
- Timestamp
- Effective XGBoost params

## How to run

1. Install dependencies:
- `pip install -r requirements.txt`

2. Run notebooks in order:
- `notebooks/01_top10_xgboost.ipynb`
- `notebooks/02_dnf_xgboost.ipynb`

3. Execute all cells end-to-end in each notebook to:
- Build leakage-safe modeling table
- Train model
- Evaluate train/val/test
- Save artifacts and metadata
- Run inference demo for a sample race

## Next upgrades

If race-events tables become available:
- Add historical circuit-level chaos indicators (e.g., prior safety-car rate, prior red-flag rate by circuit)
- Keep these aggregated over prior races only (no same-race event leakage)
