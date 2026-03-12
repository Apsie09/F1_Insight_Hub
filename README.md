# F1 Insight Hub

F1 Insight Hub is a cross-platform mobile experience for Formula 1 race exploration and Top-10 race prediction viewing.

Current repository status:
- `mobile/`: implemented React Native frontend (UI-only, mock data, no backend calls).
- `ml/`: separate ML experimentation/training assets.
- `backend/`: not implemented yet (currently placeholder).

## Frontend Implementation Status (Done)

The mobile UI is implemented with Expo + TypeScript and includes:
- Home screen with branding and quick actions.
- Season/year race browser with year chips and race cards.
- Race details with race metadata and predicted Top-10 list.
- Racer details with profile, stats, and selected-race context.
- Prediction calculator screen (UI-only) with mocked response.
- Loading / Empty / Error / Success states.
- Reusable component structure and typed service contracts.

Important scope note: backend, database, and ML inference are intentionally not implemented in the mobile app. All data currently comes from a local mock service.

## Mobile Tech Stack

- Expo SDK 55
- React Native 0.83
- React 19
- TypeScript
- React Navigation (bottom tabs + native stack)
- Jest + React Native Testing Library

## Mobile Project Structure

```text
mobile/
  src/
    components/
    constants/
    data/
    hooks/
    navigation/
    screens/
    services/
    types/
    utils/
    __tests__/
```

## Mobile Dependencies

From `mobile/package.json`:

### Runtime dependencies
- `@expo-google-fonts/barlow-condensed` `^0.4.1`
- `@expo-google-fonts/source-sans-3` `^0.4.1`
- `@expo/vector-icons` `^15.1.1`
- `@react-navigation/bottom-tabs` `^7.15.5`
- `@react-navigation/native` `^7.1.33`
- `@react-navigation/native-stack` `^7.14.4`
- `expo` `~55.0.6`
- `expo-font` `~55.0.4`
- `expo-status-bar` `~55.0.4`
- `react` `19.2.0`
- `react-native` `0.83.2`
- `react-native-gesture-handler` `~2.30.0`
- `react-native-safe-area-context` `~5.6.2`
- `react-native-screens` `~4.23.0`

### Dev dependencies
- `@testing-library/jest-native` `^5.4.3`
- `@testing-library/react-native` `^13.3.3`
- `@types/jest` `^30.0.0`
- `@types/react` `~19.2.2`
- `jest` `^29.7.0`
- `jest-expo` `^55.0.9`
- `react-test-renderer` `^19.2.0`
- `typescript` `~5.9.2`

## Run Frontend Locally

```bash
cd mobile
npm install
npm run start
```

Useful scripts:
- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run test`
- `npm run test:watch`

Type-check:

```bash
cd mobile
npx tsc --noEmit
```

## Backend Developer Handoff

The frontend currently calls a mock service in `mobile/src/services/mockApi.ts`.
Backend should replace this mock with real HTTP calls while keeping equivalent method contracts.

### Frontend service methods to back with API

1. `getSeasons()`
2. `getRacesBySeason(season)`
3. `getAllRaces()`
4. `getFeaturedRaces()`
5. `getRaceDetails(raceId)`
6. `getTop10Prediction(raceId)`
7. `getRacerDetails(racerId, raceId)`
8. `getRacers()`
9. `calculatePrediction(input)`

### Suggested REST mapping

1. `GET /seasons`
2. `GET /seasons/{year}/races`
3. `GET /races`
4. `GET /races/featured`
5. `GET /races/{raceId}`
6. `GET /races/{raceId}/predictions/top10`
7. `GET /races/{raceId}/racers/{racerId}`
8. `GET /racers`
9. `POST /predictions/calculate`

### Required response payloads (TypeScript contracts)

Defined in:
- `mobile/src/types/domain.ts`
- `mobile/src/types/services.ts`

Core entities expected by UI:
- `Season`
- `Race`
- `RaceContext`
- `Top10PredictionEntry`
- `RacerProfile`
- `RacerRaceContext`
- `CalculatorInput`
- `CalculatorResult`

### Behavior expectations for backend responses

- Return data sorted in a stable way where relevant:
  - Seasons descending by year.
  - Races by round within season.
  - Top-10 predictions by rank ascending.
- Preserve IDs as stable strings (`raceId`, `racerId`) because they drive navigation.
- Return explicit non-200 error bodies for failed requests so UI can surface meaningful error messages.
- `calculatePrediction` should return a confidence + reasoning payload even if inference is provisional.

### Notes for backend and ML integration

- Frontend is already structured for async loading, empty, and error states.
- Backend can be integrated by swapping mock service implementations only, without screen rewrites.
- ML model output should be adapted to `Top10PredictionEntry` and `CalculatorResult` shapes.
- The placeholder explanation panels in racer/prediction screens are ready for richer model interpretation content later.

## Mocking and State Simulation

For UI testing/demo, mock endpoint scenarios are supported:
- `success`
- `empty`
- `error`

Controls are exposed in `mobile/src/services/mockApi.ts`:
- `setEndpointScenario(endpoint, scenario)`
- `resetMockScenarios()`
- `setMockLatency(ms)`

## What Is Not Implemented (By Design)

- Backend/API server
- Database logic
- ML training/inference runtime in the mobile app
- Auth
- Native phone integrations (camera, notifications, sensors, geolocation, etc.)

## ML Context

ML research/training assets are available under:
- `ml/top10_xgboost/`

This remains separate from the mobile implementation. The frontend only expects prediction-ready payloads from backend endpoints.
