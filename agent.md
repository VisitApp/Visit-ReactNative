# Agent Notes

## Project Overview

This repository is a React Native SDK package named `react-native-visit-rn-sdk`.
It wraps the Visit Star Health PWA in a `react-native-webview` WebView and
bridges selected web messages to native health/fitness integrations.

The package has two main parts:

- Root package: SDK source, native iOS/Android package shells, Bob build config.
- `example/`: React Native demo app with platform integration samples.

Important files:

- `package.json`: package metadata, scripts, dependency declarations, Bob build targets.
- `src/index.android.js`: Android WebView wrapper and Health Connect bridge calls.
- `src/index.ios.js`: iOS WebView wrapper and HealthKit bridge calls.
- `src/Services.js`: Axios helper for magic-link generation.
- `src/constants.js`: stage/prod Star Health PWA URL constants.
- `ios/VisitRnSdkViewManager.m`: native iOS HealthKit implementation.
- `android/src/main/java/com/visitrnsdk/VisitRnSdkPackage.kt`: Android SDK package registration.
- `example/App.js`: demo app and integration sample.
- `example/android/app/src/main/java/com/example/modules/VisitFitnessModule.kt`: example-only Android Health Connect native module.

## Behavior Summary

`VisitRnSdkView` accepts props such as `baseUrl`, `errorBaseUrl`, `token`,
`cpsid`, `moduleName`, `environment`, `magicLink`, and `isLoggingEnabled`.

If `magicLink` is provided, the WebView loads it directly. Otherwise the SDK
generates a magic code through:

`/partners/v3/generate-magic-link-star-health`

The WebView can post JSON messages to trigger native behavior, including:

- `UPDATE_PLATFORM`
- `CONNECT_TO_GOOGLE_FIT`
- `GET_HEALTH_CONNECT_STATUS`
- `GET_DATA_TO_GENERATE_GRAPH`
- `UPDATE_API_BASE_URL`
- `GET_LOCATION_PERMISSIONS`
- `OPEN_PDF`
- `OPEN_FACE_SCAN_FLOW`
- `CLOSE_VIEW`

Events are emitted through `react-native-event-listeners` using `visit-event`.

## Setup Notes

The repo declares Yarn 1 in `package.json` and `.yarnrc`, but currently has
`package-lock.json` files rather than `yarn.lock` files. Be careful when
installing dependencies or updating locks; avoid mixing package managers unless
the user explicitly wants that cleanup.

Root dependencies may not be installed in local worktrees. The example app may
have `example/node_modules` installed independently.

Useful commands:

```sh
npm --prefix example test -- --runInBand
npm --prefix example run lint
npm --prefix example exec tsc -- --noEmit
```

Root scripts from `package.json`:

```sh
yarn test
yarn typecheck
yarn lint
yarn prepack
yarn build:android
yarn build:ios
```

## Known Issues And Risks

The Android SDK package does not currently provide the `VisitFitnessModule`
used by `src/index.android.js`. The root Android package returns no native
modules, while the real Health Connect implementation lives in the example app
under the `com.example` namespace and is registered through `MyAppPackage`.
Consumers installing the SDK may not receive the Android health bridge unless
this is moved into the library package or documented as required host-app code.

The example Android Health Connect flow depends on a checked-in local AAR:

`example/android/app/google_fit-debug.aar`

The generated `lib` folder may not match the package entry fields. The package
declares `main`, `module`, and `types` paths ending in `index`, but local `lib`
output contains platform files such as `index.android.js` and `index.ios.js`,
and the TypeScript output currently appears incomplete.

The example app contains hard-coded credentials/sample tokens in `example/App.js`.
Treat them as sensitive-looking data. Do not copy them into docs, tests, commits,
or logs.

The README is minimal and does not document the full native integration contract.
Future changes should update it when touching public behavior.

## Current Verification Baseline

Recent local checks from the example app showed:

- `npm --prefix example test -- --runInBand` fails because Jest does not transform
  `react-native-event-listeners`.
- `npm --prefix example run lint` fails on React hook dependency errors in
  `example/App.js`.
- `npm --prefix example exec tsc -- --noEmit` fails on missing Jest globals and
  JS declaration gaps.

If these failures are unrelated to the requested task, mention them as existing
baseline failures rather than treating them as regressions.

## Editing Guidance

- Prefer small, scoped changes.
- Do not edit generated `lib/` output unless the task is specifically about
  packaging or build artifacts.
- Do not remove or overwrite local dirty files unless the user asks.
- Keep Android and iOS behavior in sync where WebView message contracts overlap.
- Be careful with logs: avoid printing bearer tokens, auth headers, magic links,
  or health data.
- If changing native health integrations, verify both the JS message contract and
  native module registration path.
