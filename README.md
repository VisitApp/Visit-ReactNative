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

### Video Calling

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
