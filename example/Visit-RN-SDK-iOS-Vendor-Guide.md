# Visit React Native SDK iOS Vendor Guide

This guide is for iOS integration of the Visit React Native SDK `3.x` line. It
covers the WebView-based Visit flow and the new HealthKit-backed native module
methods that expose today's step count, sleep minutes, calories, and manual
sync. Do not use this document for Android; use the Android vendor guide for
Android integration.

## Version To Install

Install the RN `3.x` SDK from the `rn3` npm tag:

```sh
npm install react-native-visit-rn-sdk@rn3
```

Do not use this command for RN `3.x` integrations:

```sh
npm install react-native-visit-rn-sdk
```

The npm `latest` tag currently points to the `5.x` line, not the RN `3.x` line.

After installing, install pods and rebuild the iOS app. React Native
autolinking wires the native module automatically:

```sh
cd ios
pod install
```

Confirm that `pod install` output lists `react-native-visit-rn-sdk`.

## Required RN App Dependencies

The vendor app must also install these React Native packages directly:

```sh
npm install \
  react-native-device-info@^14.1.1 \
  react-native-event-listeners@^1.0.7 \
  react-native-webview@^13.16.0
```

Keep these dependencies in the app's `package.json`. React Native autolinking
will discover their iOS podspecs during `pod install`. No extra
`react-native.config.js` bridge is required.

## iOS Build Requirements

- iOS Deployment Target: `13.0` or newer (project default `13.0`; the SDK
  podspec declares `11.0` as a floor for legacy vendors)
- Xcode: `15.0` or newer
- CocoaPods: `1.13` or newer
- Swift toolchain: Xcode default (Swift not required by the SDK itself)

The SDK ships the following native module:

- `VisitRnSdkViewManager` (Objective-C, backed by `HKHealthStore`)

## Xcode Capabilities

Enable the HealthKit capability on the app target in Xcode:

1. Select the app target → **Signing & Capabilities**.
2. Click **+ Capability** and add **HealthKit**.
3. Leave **Clinical Health Records** and **Background Delivery** unchecked
   unless the app truly needs them.

Xcode will create an `<AppName>.entitlements` file with the following contents:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.healthkit</key>
    <true/>
</dict>
</plist>
```

Do not add `com.apple.developer.healthkit.access` values (like
`health-records`) unless your app is separately entitled for them by Apple.

## Info.plist Setup

Add these usage description strings in `ios/<AppName>/Info.plist`. HealthKit
will crash the app if any read/write is attempted while the corresponding
string is missing.

```xml
<key>NSHealthShareUsageDescription</key>
<string>Visit requires your permission to read health and fitness data.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>Visit requires your permission to store health and fitness data in HealthKit.</string>
```

If the app also uses the Visit face-scan or camera-driven features from inside
the Visit WebView, add:

```xml
<key>NSCameraUsageDescription</key>
<string>Visit requires your permission to access the camera for face scan and related features.</string>
```

If the app uses the Visit location features, add:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Visit uses your location for wellness features that require it.</string>
```

## JavaScript Usage

Render the Visit SDK WebView the same way as on Android:

```js
import React, {useEffect} from 'react';
import {Alert, SafeAreaView} from 'react-native';
import {EventRegister} from 'react-native-event-listeners';
import VisitRnSdkView from 'react-native-visit-rn-sdk';

const visitEvent = 'visit-event';

export default function VisitScreen() {
  useEffect(() => {
    const listener = EventRegister.addEventListener(visitEvent, data => {
      if (data.message === 'unauthorized-wellness-access') {
        Alert.alert('Error', data.errorMessage);
      } else if (data.message === 'generate-magic-link-failed') {
        console.log('Magic link failed', data);
      } else if (data.message === 'getDeviceInfo-failed') {
        console.log('Device info failed', data);
      } else if (data.message === 'web-view-error') {
        console.log('WebView error', data.errorMessage);
      } else if (data.message === 'external-server-error') {
        Alert.alert('Error', data.errorMessage);
      }
    });

    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, []);

  return (
    <SafeAreaView style={{flex: 1}}>
      <VisitRnSdkView
        baseUrl="https://api.getvisitapp.com/v3"
        errorBaseUrl="https://star-health.getvisitapp.com/"
        token="Bearer <visit-token>"
        cpsid="<customer-policy-or-session-id>"
        moduleName="<module-name>"
        environment="prod"
        isLoggingEnabled={false}
      />
    </SafeAreaView>
  );
}
```

If Visit provides a pre-generated magic link, pass it with `magicLink`:

```jsx
<VisitRnSdkView
  magicLink="<visit-magic-link>"
  isLoggingEnabled={false}
/>
```

## Optional iOS HealthKit APIs

For iOS-only screens that need to show HealthKit status, today's metrics, or
trigger a manual sync outside the Visit WebView, use
`NativeModules.VisitRnSdkViewManager`.

```js
import {NativeModules, Platform} from 'react-native';

async function loadTodayHealthMetrics() {
  if (Platform.OS !== 'ios') {
    return;
  }

  const {VisitRnSdkViewManager} = NativeModules;

  // Shows the HealthKit auth sheet on first call. Resolves to one of
  // 'GRANTED' | 'DENIED' | 'NOT_DETERMINED' once the user picks.
  const authStatus = await VisitRnSdkViewManager.requestHealthKitAuthorization();
  console.log('HealthKit auth status:', authStatus);

  const [steps, sleepMinutes, calories] = await Promise.all([
    VisitRnSdkViewManager.getTodayStepCount(),
    VisitRnSdkViewManager.getTodaySleepMinutes(),
    VisitRnSdkViewManager.getTodayCalorieCount(),
  ]);

  console.log({steps, sleepMinutes, calories});
}
```

Available iOS native module methods on `VisitRnSdkViewManager`:

- `requestHealthKitAuthorization()` — presents the HealthKit auth sheet the
  first time it is called. Resolves to `'GRANTED'`, `'DENIED'`, or
  `'NOT_DETERMINED'` once the user picks. Always resolves — call this before
  fetching metrics so the OS prompt is guaranteed to have run. Rejects with
  `HEALTH_DATA_UNAVAILABLE` if the device does not support HealthKit or with
  `AUTHORIZATION_FAILED` if HealthKit surfaces an error.
- `getHealthKitStatus()` — resolves to a step-summary dictionary when the app
  has HealthKit sharing authorization for step count, else resolves to `false`.
  Note: this only reports **write** authorization; read-only grants show as
  `false`. Prefer `requestHealthKitAuthorization()` for gating the metric
  calls.
- `connectToAppleHealth(callback)` — used by the Visit WebView (in response
  to `CONNECT_TO_GOOGLE_FIT`). Reports the current auth state and does not
  navigate the user anywhere on its own. Behavior:
  - If HealthKit is unavailable, calls back with `{authStatus: 'UNAVAILABLE'}`.
  - If the user has previously denied write access to step count, iOS will
    not re-prompt. The SDK returns `{authStatus: 'DENIED'}` without showing
    the sheet. The JS caller is expected to prompt the user (e.g., an
    `Alert`) and — on confirmation — call `openAppleHealthApp()` to send
    them to the Health app to toggle permissions manually.
  - Otherwise it shows the HealthKit sheet, then calls back with either
    `{authStatus: 'GRANTED', numberOfSteps, sleepTime}` or
    `{authStatus: 'DENIED'}`.
- `openAppleHealthApp()` — attempts to open **Settings → Health** (from
  which the user reaches *Data Access & Devices → [App]* to toggle Health
  permissions). Implementation:
  - First tries the URL scheme `App-Prefs:root=HEALTH`. This is not part of
    Apple's documented public API, but iOS still honors it on physical
    devices. Apple has historically been inconsistent about accepting apps
    that use `App-Prefs:` — if you plan to submit to the App Store, be
    prepared to justify this usage during review or replace the deep-link
    with the safer fallback below.
  - Falls back to `UIApplicationOpenSettingsURLString` (the app's own
    Settings page) if iOS refuses the deep link.
  - Resolves `true` on either success path; rejects `OPEN_HEALTH_FAILED` if
    both fail. Mirrors Android's `openHealthConnectApp()`.
- `getTodayStepCount()` — resolves to today's step count as an `Int`.
- `getTodaySleepMinutes()` — resolves to today's sleep duration in minutes as
  an `Int`, summed across `InBed`, legacy `Asleep`, and iOS 16+
  `AsleepUnspecified/Core/Deep/REM` category samples.
- `getTodayCalorieCount()` — resolves to today's active kilocalories as an
  `Int` (HealthKit `ActiveEnergyBurned` only — matches Apple Health's "Move"
  ring and the SDK's WebView step-sync calorie value).
- `triggerManualSync()` — resolves with a status message string when the
  Visit hourly and daily sync flows both complete. Rejects with one of the
  codes listed below.

### `triggerManualSync` reject codes

| Code | Meaning |
|------|---------|
| `HEALTH_DATA_UNAVAILABLE` | Device does not support HealthKit (e.g., iPad). |
| `SYNC_IN_PROGRESS` | A previous `triggerManualSync` (or the initial WebView-triggered sync) is still running. |
| `MISSING_SYNC_CREDENTIALS` | `apiBaseUrl` or `authToken` has not been stored yet. The Visit WebView writes these to `NSUserDefaults` on first load — mount `VisitRnSdkView` once before calling `triggerManualSync`. |
| `MISSING_SYNC_TIMESTAMPS` | `gfHourlyLastSync` and `googleFitLastSync` are both zero. Same fix as above: mount the WebView first. |
| `PERMISSION_DENIED` | HealthKit permission is not granted (write probe on step count failed). |
| `SYNC_FAILED` | At least one HTTP request to `/users/embellish-sync` or `/users/data-sync` returned a non-2xx or network error. Message contains the first failure. |

`getTodayStepCount`, `getTodaySleepMinutes`, and `getTodayCalorieCount` reject
with `HEALTH_DATA_UNAVAILABLE`, `STEP_QUERY_FAILED`, `SLEEP_QUERY_FAILED`, or
`CALORIE_QUERY_FAILED` respectively when the underlying HealthKit query
fails. When HealthKit read permission is denied by the user, these methods
resolve with `0` because HealthKit does not report read denials to callers.

## Do Not Do This Anymore

The following steps from older iOS PDFs are no longer required and should not
be copied into vendor apps:

- Do not add `VisitHealthKit` (or the older Visit HealthKit sub-pod) manually
  in the app `Podfile`.
- Do not copy `VisitRnSdkViewManager.h` / `.m` into the app project.
- Do not add manual `HKHealthStore` request code in `AppDelegate`; the SDK
  requests HealthKit authorization when needed.
- Do not add `com.apple.developer.healthkit.access = health-records` to the
  entitlements unless Apple has separately approved the app for clinical
  records.
- Do not add background delivery (`com.apple.developer.healthkit.background-delivery`)
  unless the app's product requirement explicitly needs it — Apple review
  scrutinizes this entitlement.

These pieces are now owned by `react-native-visit-rn-sdk@rn3`.

## Verification

Run autolinking verification:

```sh
npx react-native config
```

Confirm these packages are present:

- `react-native-visit-rn-sdk`
- `react-native-device-info`
- `react-native-webview`

Run pod install verification:

```sh
cd ios
pod install
```

The output should include `Installing react-native-visit-rn-sdk (<version>)`.

Run an iOS build:

```sh
cd ios
xcodebuild \
  -workspace <YourApp>.xcworkspace \
  -scheme <YourApp> \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  build
```

Confirm the merged Info.plist contains `NSHealthShareUsageDescription` and
`NSHealthUpdateUsageDescription`, and that the app target's entitlements
contain `com.apple.developer.healthkit = true`.

Manual smoke test:

1. Launch the app on a physical device signed into an Apple ID with sample
   Health data (Simulator supports HealthKit reads but often reports 0).
2. Mount `VisitRnSdkView` once so `updateApiUrl` seeds the sync timestamps.
3. Call `VisitRnSdkViewManager.getTodayStepCount()`,
   `getTodaySleepMinutes()`, and `getTodayCalorieCount()` from JS and verify
   values match the Health app's Today view.
4. Call `VisitRnSdkViewManager.triggerManualSync()` and verify it resolves
   with `"Health Data Sync Completed"`.

## Troubleshooting

If the app crashes on the first HealthKit call with a message about missing
`NSHealthShareUsageDescription` or `NSHealthUpdateUsageDescription`, add both
strings to `Info.plist` and rebuild.

If `getTodayStepCount` / `getTodaySleepMinutes` / `getTodayCalorieCount`
resolve with `0` on a device that shows non-zero data in the Health app,
verify the app has been granted read permission in
**Settings → Health → Data Access & Devices → \<AppName\>**. HealthKit
silently returns empty reads when read permission is denied.

If `triggerManualSync` rejects with `MISSING_SYNC_TIMESTAMPS`, ensure the
Visit WebView (`<VisitRnSdkView />`) has been mounted at least once in the
current install. The WebView writes `gfHourlyLastSync` and `googleFitLastSync`
into `NSUserDefaults` on first load; `triggerManualSync` reads them from
there.

If `triggerManualSync` rejects with `PERMISSION_DENIED`, the HealthKit
write probe on step count failed. Prompt the user via
`connectToAppleHealth` and confirm write access to step count is granted in
**Settings → Health → Data Access & Devices → \<AppName\>**.

If `pod install` fails to find `react-native-visit-rn-sdk`, run
`npx react-native config` and confirm the package resolves. Delete
`ios/Pods` and `ios/Podfile.lock`, then re-run `pod install`.
