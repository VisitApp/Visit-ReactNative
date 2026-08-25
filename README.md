# react-native-visit-rn-sdk

a package to inject data into visit health pwa

## Installation

```sh
npm install react-native-visit-rn-sdk @twilio/video-react-native-sdk@3.5.0 react-native-permissions@4.1.5 --legacy-peer-deps
```

Or with Yarn:

```sh
yarn add react-native-visit-rn-sdk @twilio/video-react-native-sdk@3.5.0 react-native-permissions@4.1.5
```

The minimum supported iOS deployment target is `12.4`.

## Usage

```js
import VisitRnSdkView from 'react-native-visit-rn-sdk';

// ...

<VisitRnSdkView ssoLink="pre-generated-sso-link" />;
```

## Location permissions

Android host apps must declare both foreground location permissions:

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

When the web application sends `GET_LOCATION_PERMISSIONS`, the SDK checks for
fine-location access. It requests fine location through the normal Android
runtime permission dialog when possible. If permission is blocked, the SDK
offers to open the app's settings page.

After permission is granted, the SDK checks the phone's Location Services
setting. It never displays an in-app GPS enable prompt; instead, it offers to
open the phone's Location settings. When the user returns, the SDK rechecks
both states and calls the existing web callback:

```js
window.checkTheGpsPermission(true); // Fine location and Location Services enabled
window.checkTheGpsPermission(false); // Either requirement is unavailable
```

Approximate/coarse-only location access is not sufficient. The iOS behavior is
unchanged and continues to report `true` for `GET_LOCATION_PERMISSIONS`.

## Dependency and event migration

`react-native-event-listeners` and
`@visit-health/react-native-location-enabler` are no longer used by the SDK.
Remove them from the host app if nothing else requires them, and install the
`react-native-permissions` peer dependency shown above.

The SDK no longer emits the global `visit-event`. In particular,
`OPEN_FACE_SCAN_FLOW` and WebView errors are no longer forwarded through a
global event emitter, and the example app's unused
`unauthorized-wellness-access` listener has been removed. WebView errors are
logged only when `isLoggingEnabled={true}`.

## Migrating to 6.0.1

Pass the pre-generated SSO URL through `ssoLink`. This is the only URL prop in
`6.0.1`; `isLoggingEnabled` remains optional and defaults to `false`.

## Migrating to 6.0.0

Apple Health and Health Connect functionality has been removed in `6.0.0`.
Host apps no longer need to add HealthKit entitlements, HealthKit usage
descriptions, Health Connect permissions, or Health Connect rationale screens
for this package.

`VisitRnSdkView` accepts only a pre-generated `ssoLink` plus the optional
`isLoggingEnabled` flag. The SDK no longer accepts `cpsid`, `baseUrl`,
`errorBaseUrl`, `token`, `moduleName`, or `environment`, and it no longer
generates magic links internally.

### Video Calling

`react-native-visit-rn-sdk` declares [`@twilio/video-react-native-sdk`](https://www.npmjs.com/package/@twilio/video-react-native-sdk) as a **peer dependency**. Install the matching version in your app:

```sh
npm install @twilio/video-react-native-sdk@3.5.0 --legacy-peer-deps
```

Or with Yarn:

```sh
yarn add @twilio/video-react-native-sdk@3.5.0
```

Required native permissions in the host app:

- Android (`AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

- iOS (`Info.plist`)

```xml
<key>NSCameraUsageDescription</key>
<string>Visit needs camera access for video consultations.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Visit needs microphone access for video consultations.</string>
```

Proguard Rules (Android)

```pro
# Twilio Video SDK
-keep class com.twilio.** { *; }

# Twilio-packaged WebRTC classes
-keep class tvi.webrtc.** { *; }

# Optional: reduce warning noise
-dontwarn tvi.webrtc.**
-dontwarn com.twilio.**
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
