# react-native-visit-rn-sdk

a package to inject data into visit health pwa

## Installation

```sh
npm install react-native-visit-rn-sdk
```

## Usage

```js
import VisitRnSdkView from "react-native-visit-rn-sdk";

// ...

<VisitRnSdkView magicLink="magic-link" />
```

Set `isLoggingEnabled={true}` to enable SDK diagnostic logs. On iOS, the same
flag makes both the primary and secondary WebViews inspectable through Safari's
Develop menu. Leave the flag `false` or omit it to keep WebView inspection
disabled.

## Secondary WebView

The Android and iOS SDKs can open one full-screen secondary WebView modal while
keeping the primary WebView mounted in the back stack. Send this message from
the primary WebView:

```json
{
  "method": "OPEN_SECONDARY_WEB_VIEW",
  "link": "https://example.com"
}
```

`link` must be an absolute HTTP or HTTPS URL. HTTP(S) links and redirects stay
inside the secondary WebView; other schemes such as `tel:` and `mailto:` are
passed to the operating system. No native Back header is added on either
platform. Android's system Back action navigates through the secondary
WebView's page history before closing it and returning to the preserved primary
WebView. On iOS, a rightward swipe beginning at the left screen edge performs
the same history-first Back behavior and closes the secondary WebView when it
is already at its root.

If the secondary WebView has a transport or load failure, the SDK emits the
existing `web-view-error` event and closes the modal, releasing the slot for a
later `OPEN_SECONDARY_WEB_VIEW` request. HTTP error responses and errors
rendered by the loaded application do not use this failure path.

The secondary WebView handles these callbacks:

- `OPEN_SECONDARY_WEB_VIEW` (ignored while the single secondary WebView is open)
- `GET_LOCATION_PERMISSIONS`
- `OPEN_PDF`
- `OPEN_FACE_SCAN_FLOW`
- `CLOSE_VIEW` (immediately closes the secondary WebView)

All other web callbacks from the secondary WebView are ignored.

## Android native location handoff

Android PWA builds that support native fused location should version the
location request:

```js
window.checkTheGpsPermission = (available, location) => {
  if (!available) {
    // Stop loading and show the permission/GPS error state.
    return;
  }

  if (
    location &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
  ) {
    // Decode the native coordinates directly. Do not call navigator.geolocation.
    fetchAddress(location.latitude, location.longitude);
    return;
  }

  // Older Android and iOS SDKs use the existing browser fallback.
  navigator.geolocation.getCurrentPosition(successCallback, failureCallback, {
    timeout: 15000,
  });
};

window.ReactNativeWebView.postMessage(
  JSON.stringify({
    method: 'GET_LOCATION_PERMISSIONS',
    locationResponseVersion: 2,
  })
);
```

Define `window.checkTheGpsPermission` before posting the request. A successful
Android v2 response has this shape:

```js
window.checkTheGpsPermission(true, {
  latitude: 12.9716,
  longitude: 77.5946,
  accuracy: 8,
  timestamp: 1788940000000,
  precision: 'precise', // or 'approximate'
  source: 'android-fused',
});
```

When permission or the device location setting is unavailable, the SDK sends
`window.checkTheGpsPermission(false)`. When native acquisition fails or times
out, it sends `window.checkTheGpsPermission(true)` so v2 web builds can fall
back to `navigator.geolocation`. Requests without `locationResponseVersion: 2`
keep the legacy one-argument behavior and do not start a fused location request.

The Android library declares foreground fine and coarse location permissions.
It accepts approximate-only grants and uses a fused fix up to 60 seconds old,
otherwise waiting up to 10 seconds for a high-accuracy fix. The default Google
Play Services Location dependency is `21.3.0`; host apps can align it with their
dependency set through the root Gradle extra property:

```gradle
ext {
  playServicesLocationVersion = "21.3.0"
}
```

## iOS native location handoff

iOS uses the same versioned PWA request and callback contract shown above. A
successful iOS v2 response has this shape:

```js
window.checkTheGpsPermission(true, {
  latitude: 12.9716,
  longitude: 77.5946,
  accuracy: 8,
  timestamp: 1788940000000,
  precision: 'precise', // or 'approximate'
  source: 'ios-core-location',
});
```

The SDK requests foreground When In Use authorization and obtains a one-shot
location through Core Location. It accepts a cached fix up to 60 seconds old;
otherwise it waits up to 10 seconds for a location. A valid native payload lets
the PWA skip `navigator.geolocation`, avoiding the additional WebKit website
permission prompt.

Every consuming iOS app must provide a meaningful location purpose string in
its application `Info.plist`; an SDK pod cannot supply this text on behalf of
the host app:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Visit uses your location to find healthcare services available near you.</string>
```

When authorization is denied/restricted, Location Services are disabled, or
the purpose string is missing, the SDK sends
`window.checkTheGpsPermission(false)`. A native acquisition failure or timeout
sends the bare `window.checkTheGpsPermission(true)` callback so the PWA can use
its WebView fallback. Requests without `locationResponseVersion: 2` retain the
legacy bare-`true` behavior and do not start Core Location. No background or
Always location authorization is requested.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
