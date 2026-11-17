# WebView bridge fixture

Use a development build of the example. Serve this directory on a test host
reachable from the device. With an Android debug build, you can serve it from
your Mac and forward the server through USB.

```sh
python3 -m http.server 8765
adb reverse tcp:8765 tcp:8765
```

Enter `http://127.0.0.1:8765/` in the Android example. On iOS, use the test
host's HTTPS address or a `.local` hostname on the same network. Use a test
installation because the sync button sends synthetic credentials.

The page logs callback names and their arguments. Toggle the Flutter name field
to exercise the legacy envelope. Test both successful and denied location and
fitness requests, then compare the dashboard after navigating away and back.
Use a test PDF for sharing and a test dialer number. For document authentication,
use a protected HTTPS test URL and a signed AWS test URL. Verify that each opens
the native share sheet and can be cancelled, and that the receiver can read the
file when sharing is confirmed.
