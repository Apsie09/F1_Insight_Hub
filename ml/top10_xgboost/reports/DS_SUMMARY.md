# F1 Insight Hub - Top-10 XGBoost Model

This document summarizes the Data Science and Machine Learning part of F1 Insight Hub. The production ML functionality in the application is the Top-10 finish probability model. The model estimates whether a driver is likely to finish in the points-paying Top-10 positions after qualifying and before the race.

The workflow is built around a leakage-safe tabular machine learning pipeline. Historical Formula 1 race data is transformed into one row per driver per race, pre-race features are generated, the data is split chronologically by season, and an XGBoost classifier produces probabilities that are later published to the backend database.

![XGBoost model structure](assets/xgboost_diagram.jpg)

## Project Scope

The ML component focuses on the prediction task used by the mobile app:

- Task: Top-10 finish classification
- Target: `y_top10 = 1` when `positionOrder <= 10`
- Model family: gradient boosted decision trees
- Implementation: `XGBClassifier` inside a scikit-learn pipeline
- Runtime usage: predictions are precomputed and published to the backend database
- Main notebook: `notebooks/01_top10_xgboost.ipynb`

An experimental DNF notebook existed during development, but the integrated app uses only the Top-10 model. Keeping the production documentation centered on the Top-10 model avoids presenting unused experimental work as active application functionality.

## Dataset

The dataset is based on the Kaggle Formula 1 race archive `jtrotman/formula-1-race-data`, which follows an Ergast-style relational structure. The local CSV files are read from `data/archive/`.

Discovered core files:

- `circuits.csv`
- `constructors.csv`
- `drivers.csv`
- `qualifying.csv`
- `races.csv`
- `results.csv`
- `seasons.csv`
- `status.csv`

Additional historical tables are also available in the archive, including constructor standings, driver standings, lap times, pit stops and sprint results. These tables are not direct features for the production Top-10 model unless they can be used without same-race leakage.

The available race coverage in `races.csv` spans 1950 to 2025. The production training setup uses the modern period from 2006 onward because qualifying information is more complete and more comparable after the introduction of the current qualifying format.

## Modeling Table

The modeling table uses the following grain:

```text
one row = one driver in one race
```

The base table is `results.csv`, joined with race, circuit, qualifying, status, driver and constructor information.

Main join keys:

- `results.raceId -> races.raceId`
- `races.circuitId -> circuits.circuitId`
- `results.statusId -> status.statusId`
- `results.(raceId, driverId) -> qualifying.(raceId, driverId)`
- `results.driverId -> drivers.driverId`
- `results.constructorId -> constructors.constructorId`

This structure combines race context, driver identity, constructor identity, starting position, qualifying performance and historical form.

## Leakage Prevention

The model is designed for the moment after qualifying and before race start. Therefore, the feature set contains only information available before the race.

Allowed feature categories:

- grid position
- qualifying position and Q1/Q2/Q3 times
- static circuit metadata
- driver and constructor identifiers
- historical rolling statistics computed only from prior races

Excluded same-race outcome data:

- points from the current race
- finishing position as a feature
- race duration and final race time
- fastest lap data
- same-race status outcome
- same-race safety car or red flag information

Historical rolling features are explicitly shifted with `shift(1)`. This means the current row can only use races that happened before the current race.

## Feature Engineering

Feature generation is implemented in `src/features.py`.

Base pre-race features:

- `year`
- `round`
- `circuitId`
- `circuit_country`
- `circuit_alt`
- `circuit_lat`
- `circuit_lng`
- `driverId`
- `constructorId`
- `grid`
- `grid_missing`
- `grid_zero`
- `quali_position`
- `q1_seconds`
- `q2_seconds`
- `q3_seconds`
- `has_qualifying_data`
- `qualifying_missing`

Historical driver features:

- `driver_points_mean_last5`
- `driver_finishpos_mean_last5`
- `driver_top10_rate_last10`
- `driver_dnf_rate_last20`

Historical constructor features:

- `team_points_mean_last5`
- `team_top10_rate_last10`
- `team_dnf_rate_last20`

Circuit-specific driver history:

- `driver_avg_finish_at_circuit`
- `driver_top10_rate_at_circuit`

Missing qualifying and grid values are preserved as missing values and represented with explicit indicator columns. Numeric missing values are handled by median imputation in the pipeline, while categorical values are handled with most-frequent imputation and one-hot encoding.

## Train, Validation and Test Split

The split is chronological and season-based. Random shuffling across years is avoided because the goal is to simulate prediction on future seasons.

Default split:

- Train: 2006-2021
- Validation: 2022
- Test: 2023+

The split logic is implemented in `src/split.py` and supports `min_train_year`, `train_end_year`, `val_year` and `test_start_year`.

## Model

The model uses a scikit-learn `Pipeline` with a `ColumnTransformer`.

Preprocessing:

- Categorical columns: imputation plus `OneHotEncoder(handle_unknown="ignore")`
- Numeric columns: median imputation

Classifier:

- `XGBClassifier`
- `objective="binary:logistic"`
- `n_estimators=2000`
- `learning_rate=0.05`
- `max_depth=5`
- `subsample=0.8`
- `colsample_bytree=0.8`
- `reg_lambda=1.0`
- `reg_alpha=0.0`
- `early_stopping_rounds=50`
- `random_state=42`

XGBoost is suitable for this task because the data is structured and tabular. The model can capture nonlinear interactions between grid position, qualifying performance, constructor strength, circuit context and recent historical form without requiring the much larger datasets normally needed for deep learning approaches.

## Evaluation

Evaluation utilities are implemented in `src/eval.py`.

Computed metrics:

- ROC-AUC
- PR-AUC / Average Precision
- LogLoss
- Brier score
- confusion matrix
- precision, recall and F1 at a selected threshold
- calibration curve
- threshold sweep on validation data

Representative Top-10 model results:

| Split | ROC-AUC | PR-AUC | LogLoss | Brier | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Train | 0.8996 | 0.8753 | 0.4064 | 0.1296 | 0.7830 | 0.8358 | 0.8086 |
| Validation 2022 | 0.8381 | 0.7994 | 0.4961 | 0.1597 | 0.7802 | 0.8227 | 0.8009 |
| Test 2023+ | 0.8763 | 0.8649 | 0.4500 | 0.1436 | 0.7806 | 0.8286 | 0.8039 |

The validation and test results indicate that the model generalizes reasonably well across seasons. The task remains probabilistic rather than deterministic because Formula 1 results depend on many unpredictable race events that are intentionally excluded from the pre-race feature set.

## Artifacts

The training notebook saves the production artifacts used by the backend publishing workflow:

- `artifacts/top10_model.joblib`
- `artifacts/top10_pipeline.joblib`
- `artifacts/top10_metadata.json`

The metadata file contains:

- training year boundaries
- feature list
- dataset files used
- timestamp
- effective XGBoost parameters

## Backend Integration

The mobile app does not run the XGBoost model directly. The ML pipeline produces artifacts, and the backend publishing script uses those artifacts to generate prediction rows.

Integration flow:

1. Build leakage-safe feature table from CSV data.
2. Train and evaluate the Top-10 model in the notebook.
3. Save model, pipeline and metadata artifacts.
4. Publish predictions to the backend database.
5. Serve probabilities through FastAPI endpoints.
6. Display Top-10 probabilities in the mobile app.

This approach keeps the mobile application fast and avoids running heavy ML logic during user interaction.

## How to Run

Install dependencies from the ML folder:

```bash
pip install -r requirements.txt
```

Run the notebook:

```text
notebooks/01_top10_xgboost.ipynb
```

The notebook builds the dataset, trains the model, evaluates the split results, saves artifacts and demonstrates inference on a selected race.

## Relevant Files

- `notebooks/01_top10_xgboost.ipynb`: end-to-end training notebook
- `src/data_load.py`: CSV loading utilities
- `src/features.py`: pre-race feature engineering
- `src/split.py`: season-based train/validation/test split
- `src/train.py`: XGBoost pipeline training
- `src/eval.py`: metrics and visual evaluation
- `src/inference_demo.py`: race-level inference helpers
- `reports/DS_SUMMARY.md`: this summary
- `artifacts/`: saved model artifacts and plots

## Future Improvements

Possible extensions:

- add historical circuit-level chaos indicators if race event tables are available
- calibrate probabilities with a dedicated calibration model
- add model monitoring after new seasons are ingested
- compare XGBoost against logistic regression, random forest and LightGBM baselines
- expose richer feature attribution summaries to the backend
