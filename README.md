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

```js
import React, { useRef } from 'react';
import { Button, View } from 'react-native';
import { VideoCallComponent } from 'react-native-visit-rn-sdk';

export default function VideoScreen() {
  const videoRef = useRef(null);

  return (
    <View style={{ flex: 1 }}>
      <Button
        title="Start Video Call"
        onPress={() =>
          videoRef.current?.startVideoCall({
            roomName: 'room-name',
            accessToken: 'twilio-access-token',
            doctorName: 'Dr. Smith',
            userName: 'John',
          })
        }
      />
      <VideoCallComponent
        ref={videoRef}
        onCallConnected={(info) => console.log('connected', info)}
        onCallEnded={(info) => console.log('ended', info)}
        onError={(error) => console.log('video error', error)}
      />
    </View>
  );
}
```

Video component API:
- `startVideoCall({ roomName, accessToken, doctorName?, userName? })`
- `endCall()`
- `isConnected()`

-  VIDEO CALL ERROR STATUSES
   - 'MISSING_ROOM_NAME_OR_ACCESS_TOKEN'
   - 'PERMISSIONS_REQUIRED'
   - 'PERMISSION_CHECK_FAILED'
   - 'INVALID_OR_EXPIRED_TOKEN'
   - 'CONNECT_FAILED'

Required native permissions in the host app:
- Android
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.RECORD_AUDIO" />

- iOS (`Info.plist`): `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`

  <key>NSCameraUsageDescription</key>
  <string>Visit needs camera access for video consultations.</string>
  <key>NSMicrophoneUsageDescription</key>
  <string>Visit needs microphone access for video consultations.</string>

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
