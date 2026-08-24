# Project Instructions for AI Agents

## Project overview

This repository contains `react-native-visit-rn-sdk`, a cross-platform React Native library that displays the Visit Health PWA in a WebView and handles native integrations such as location permissions and Twilio video calls. It also contains a standalone React Native example app for manual Android and iOS testing.

The supported public component API is intentionally small:

- `ssoLink`: the pre-generated Visit SSO URL.
- `isLoggingEnabled`: optional diagnostic logging flag; defaults to `false`.

Do not reintroduce removed authentication, environment, Apple Health, or Health Connect props without an explicit product requirement.

## Repository map

- `src/index.android.js`: Android WebView, location-permission, navigation, and video-call orchestration.
- `src/index.ios.js`: iOS WebView, linking, events, and video-call orchestration.
- `src/components/VideoCallComponent.js`: shared Twilio video-call UI and lifecycle logic.
- `src/assets/`: packaged video-call images and animations.
- `src/__tests__/`: library Jest tests.
- `android/`: Android library module and Kotlin bridge code.
- `ios/`: iOS library module and Objective-C bridge code.
- `example/`: React Native application used to exercise the local library.
- `react-native-visit-rn-sdk.podspec`: CocoaPods package definition.
- `package.json`: root scripts, dependency declarations, linting, formatting, Jest, and Bob build configuration.

## Working conventions

- Use Yarn Classic (`yarn@1.22.22`) for repository tasks. Avoid changing lockfiles with a different package manager.
- Keep Android- and iOS-specific behavior aligned when changing shared WebView messages or the public component API. Document intentional platform differences.
- Preserve the WebView message contract used by the Visit PWA, including `startVideoCall`, `UPDATE_PLATFORM`, `OPEN_PDF`, `OPEN_FACE_SCAN_FLOW`, `CLOSE_VIEW`, and `GET_LOCATION_PERMISSIONS`.
- Treat SSO links and Twilio access tokens as secrets. Never add real tokens, signed URLs, patient information, or credentials to source, fixtures, snapshots, logs, or documentation.
- Gate new diagnostic logs behind `isLoggingEnabled`. Never log an entire SSO URL, access token, or sensitive message payload.
- Keep platform permission changes synchronized with the host-app requirements documented in `README.md`.
- Do not edit generated or dependency directories such as `node_modules/`, `lib/`, `android/build/`, `example/android/build/`, `example/ios/build/`, or `example/ios/Pods/`.
- Follow the existing formatting: single quotes, two spaces, no tabs, and ES5 trailing commas. Let ESLint and Prettier resolve style questions.
- Prefer focused changes. Do not perform unrelated refactors or dependency upgrades while fixing a bug.

## Setup and common commands

From the repository root:

```sh
yarn
yarn bootstrap       # Install root/example dependencies and iOS pods
yarn typecheck       # Run TypeScript checks
yarn lint            # Run ESLint and Prettier checks
yarn lint --fix      # Apply supported lint/format fixes
yarn test            # Run the library Jest suite
yarn prepack         # Build CommonJS, ES module, and type outputs with Bob
```

Example app commands:

```sh
yarn example start
yarn example android
yarn example ios
yarn example test
```

Native validation is available through `yarn build:android` and `yarn build:ios`. These commands require the corresponding Android or macOS/Xcode toolchain and may be slower than the JavaScript checks.

## Validation expectations

- Add or update tests for behavior changes when practical. The current root test suite is minimal, so do not treat a passing placeholder test as sufficient validation.
- For JavaScript-only changes, run at least `yarn lint`, `yarn typecheck`, and `yarn test`.
- For changes to package output or exports, also run `yarn prepack` and inspect the generated build result without committing generated output unless the repository workflow explicitly requires it.
- For Android native, permission, or manifest changes, build or run the Android example app.
- For iOS native, permission, podspec, or Info.plist-related changes, install pods if necessary and build or run the iOS example app.
- For WebView bridge or video-call changes, manually exercise the relevant flow in the example app on each affected platform. Verify malformed or missing payload fields fail safely.
- If a required native toolchain is unavailable, report exactly which checks were run and which remain unverified.

## API and dependency changes

- Treat changes to component props, emitted events, PWA message names/payloads, native permissions, peer dependencies, and minimum React Native versions as public API changes.
- Keep `README.md`, the example app, tests, native configuration, podspec, and package metadata consistent with public API changes.
- `@twilio/video-react-native-sdk` is a peer dependency pinned to the compatible version declared in `package.json`; do not move it into regular dependencies casually.
- Avoid manually editing the package version or publishing. Releases use `yarn release` and require explicit maintainer authorization.

## Commits and handoff

- Use Conventional Commits such as `fix:`, `feat:`, `refactor:`, `docs:`, `test:`, and `chore:`.
- Before handing off, summarize the user-visible behavior changed, list validation performed, and call out any unverified Android/iOS behavior or migration impact.
