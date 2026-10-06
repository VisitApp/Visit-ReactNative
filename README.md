# react-native-visit-rn-sdk

React Native SDK for displaying the Visit Health PWA and exchanging events
between the PWA and its host app.

## Installation

```sh
npm install react-native-visit-rn-sdk@6.0.3 @twilio/video-react-native-sdk@3.5.0 react-native-permissions@4.1.5
```

`@twilio/video-react-native-sdk` and `react-native-permissions` are required
peer dependencies; they are not bundled in the SDK. `react-native-webview` is
a regular SDK dependency and does not need to be installed separately.

The Twilio `3.5.0` peer metadata requires React `^19.1.0` and React Native
`^0.81.0`. If an existing project has npm peer-resolution errors, first verify
that its React and React Native versions are compatible. Use
`--legacy-peer-deps` only when the project's dependency policy intentionally
allows npm to skip peer-dependency enforcement; the flag does not make
incompatible native versions compatible.

SDK `6.0.3` requires Node.js `16` or newer, Android API `21` or newer, and an
iOS deployment target of `12.4` or newer. React Native and other native
dependencies may impose higher platform minimums. After installing or changing
iOS native dependencies, run:

```sh
npx pod-install
```

## Usage

```tsx
import { useRef } from 'react';
import VisitRnSdkView, {
  type VisitRnSdkViewHandle,
  type VisitRnSdkViewProps,
} from 'react-native-visit-rn-sdk';

const sdkRef = useRef<VisitRnSdkViewHandle>(null);

const props: VisitRnSdkViewProps = {
  ssoLink: '<pre-generated SSO link>',
  // isLoggingEnabled is optional (boolean); defaults to false
  onEvent: (eventName, properties) => {
    if (eventName === 'INITIATE_PAYMENT') {
      // Open the host payment PWA. Keep VisitRnSdkView mounted.
    }
  },
};

<VisitRnSdkView {...props} ref={sdkRef} />;

// After the host payment PWA finishes:
sdkRef.current?.sendEvent('PAYMENT_STATUS', { status: 'success' });
```

`isLoggingEnabled` is optional. When omitted it defaults to `false`; if you pass it, the value must be a `boolean`.

Provide a non-empty, pre-generated URL in `ssoLink`. Although the prop is
optional at the type level, an omitted or blank value causes the SDK to render
no WebView.

`VisitRnSdkViewProps`, `VisitRnSdkViewHandle`, and `VisitEventProperties` are
exported for host apps that want to type wrappers, refs, callbacks, or event
payloads.

### Host ↔ Visit PWA events (6.0.3)

The event bridge works the same way on Android and iOS. Keep
`VisitRnSdkView` mounted while the React Native client app displays any
external host UI so the SDK ref remains available.

#### Visit PWA / SDK → React Native client app

The Visit PWA sends a JSON message through the React Native WebView. Use
`sendEventToHost` as the method and provide a non-empty `eventName`:

```js
window.ReactNativeWebView.postMessage(
  JSON.stringify({
    method: 'sendEventToHost',
    eventName: 'INITIATE_PAYMENT',
    orderId: '<order-id>',
  })
);
```

The SDK removes `method` and `eventName` from the message and passes every
remaining top-level field to the client app as `properties`. Receive the event
through the optional `onEvent` callback:

```tsx
import { useRef } from 'react';
import VisitRnSdkView, {
  type VisitRnSdkViewHandle,
} from 'react-native-visit-rn-sdk';

const sdkRef = useRef<VisitRnSdkViewHandle>(null);

<VisitRnSdkView
  ref={sdkRef}
  ssoLink="<pre-generated SSO link>"
  onEvent={(eventName, properties) => {
    if (eventName === 'INITIATE_PAYMENT') {
      // Open the client app's payment UI.
      // Read the example order ID from properties?.orderId.
    }
  }}
/>;
```

#### React Native client app → Visit PWA / SDK

Call `sendEvent(eventName, properties)` on the SDK ref to send an event back
into the Visit PWA. For example, after the client app finishes the payment
flow:

```tsx
sdkRef.current?.sendEvent('PAYMENT_STATUS', {
  status: 'success',
});
```

The SDK invokes `window.sendEventToVisit(eventName, properties)` inside the
Visit PWA. The Visit PWA must define that function:

```js
window.sendEventToVisit = function (eventName, properties) {
  if (eventName === 'PAYMENT_STATUS') {
    // Continue the Visit flow using properties.status.
  }
};
```

- `properties` is optional. When omitted, the SDK passes an empty object (`{}`).
- `eventName` must be a non-empty string. `sendEvent` also rejects names that
  contain only whitespace. Messages without a valid event name are ignored.
- Built-in WebView bridge messages are handled internally. Only messages using
  `method: 'sendEventToHost'` are delivered through `onEvent`.
- Keep `VisitRnSdkView` mounted while external client-app UI is open so
  `sdkRef.current` remains available.

## Location permissions

Android host apps that use Visit's location flow must declare both foreground
location permissions:

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

When the web application sends `GET_LOCATION_PERMISSIONS`, the Android SDK
checks for fine-location access. It requests fine location through the normal
runtime permission dialog when possible. If permission is blocked, the SDK
offers to open the app's settings page. Runtime permission handling uses the
required `react-native-permissions` peer dependency.

After permission is granted, the SDK checks the phone's Location Services
setting. It never displays an in-app GPS enable prompt; instead, it offers to
open the phone's Location settings. When the user returns, the SDK rechecks
both states and calls the existing web callback:

```js
window.checkTheGpsPermission(true); // Fine location and Location Services enabled
window.checkTheGpsPermission(false); // Either requirement is unavailable
```

Approximate/coarse-only location access is not sufficient. On iOS,
`GET_LOCATION_PERMISSIONS` currently calls
`window.checkTheGpsPermission(true)` without requesting or checking an iOS
location permission. Do not treat that callback as proof that the host app has
iOS location authorization.

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

## Migrating from versions before 6.0.1

Pass the pre-generated SSO URL through `ssoLink`. This is the only URL prop;
`isLoggingEnabled` remains optional and defaults to `false`.

## Migrating to 6.0.0

Apple Health and Health Connect functionality has been removed in `6.0.0`.
Host apps no longer need to add HealthKit entitlements, HealthKit usage
descriptions, Health Connect permissions, or Health Connect rationale screens
for this package.

The SDK no longer accepts `cpsid`, `baseUrl`, `errorBaseUrl`, `token`,
`moduleName`, or `environment`, and it no longer generates magic links
internally. The current `6.0.3` component props are `ssoLink`,
`isLoggingEnabled`, and `onEvent`; its ref exposes `sendEvent`.

## Video calling

`react-native-visit-rn-sdk@6.0.3` declares
[`@twilio/video-react-native-sdk`](https://www.npmjs.com/package/@twilio/video-react-native-sdk)
`3.5.0` as an exact peer dependency. Install it with the SDK as shown in the
[Installation](#installation) section.

Twilio's Android library declares its camera and audio permissions in its own
manifest, so Android's manifest merger normally adds them to the host app.
Verify that the merged release manifest contains:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

The iOS host app must provide camera and microphone usage descriptions in
`Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Visit needs camera access for video consultations.</string>
<key>NSMicrophoneUsageDescription</key>
<string>Visit needs microphone access for video consultations.</string>
```

Twilio `3.5.0` does not prescribe extra app-level ProGuard/R8 rules in its
published React Native setup. If a minified release reports shrinker errors,
resolve those specific diagnostics for the dependency versions in that app
instead of applying blanket keep and `-dontwarn` rules.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
