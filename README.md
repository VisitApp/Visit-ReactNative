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

The secondary WebView handles these callbacks:

- `OPEN_SECONDARY_WEB_VIEW` (ignored while the single secondary WebView is open)
- `GET_LOCATION_PERMISSIONS`
- `OPEN_PDF`
- `OPEN_FACE_SCAN_FLOW`
- `CLOSE_VIEW` (immediately closes the secondary WebView)

All other web callbacks from the secondary WebView are ignored.

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
