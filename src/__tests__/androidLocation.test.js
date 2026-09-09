const mockPermissionCheck = jest.fn();
const mockPermissionRequestMultiple = jest.fn();
const mockRequestLocationSettings = jest.fn();
const mockGetCurrentLocation = jest.fn();
const mockAlert = jest.fn();
const mockOpenSettings = jest.fn();

jest.mock('react-native', () => ({
  Alert: { alert: mockAlert },
  Linking: { openSettings: mockOpenSettings },
  NativeModules: {
    VisitLocationModule: {
      requestLocationSettings: mockRequestLocationSettings,
      getCurrentLocation: mockGetCurrentLocation,
    },
  },
  PermissionsAndroid: {
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: 'ACCESS_FINE_LOCATION',
      ACCESS_COARSE_LOCATION: 'ACCESS_COARSE_LOCATION',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
    check: mockPermissionCheck,
    requestMultiple: mockPermissionRequestMultiple,
  },
}));

const { NativeModules } = require('react-native');
const {
  createGpsPermissionCallbackScript,
  NATIVE_LOCATION_OPTIONS,
  requestAndroidLocation,
} = require('../androidLocation');

const preciseLocation = {
  latitude: 12.9716,
  longitude: 77.5946,
  accuracy: 8,
  timestamp: 1788940000000,
  precision: 'precise',
  source: 'android-fused',
};

const createWebViewRef = () => ({
  current: { injectJavaScript: jest.fn() },
});

describe('Android native location handoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermissionCheck.mockResolvedValue(true);
    mockPermissionRequestMultiple.mockResolvedValue({
      ACCESS_FINE_LOCATION: 'granted',
      ACCESS_COARSE_LOCATION: 'granted',
    });
    mockRequestLocationSettings.mockResolvedValue(true);
    mockGetCurrentLocation.mockResolvedValue(preciseLocation);
  });

  test('keeps the legacy callback path when the PWA sends no version', async () => {
    const webviewRef = createWebViewRef();

    await requestAndroidLocation({ webviewRef });

    expect(mockGetCurrentLocation).not.toHaveBeenCalled();
    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledTimes(1);
    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createGpsPermissionCallbackScript(true)
    );
  });

  test('passes validated fused coordinates to a v2 PWA', async () => {
    const webviewRef = createWebViewRef();

    await requestAndroidLocation({
      webviewRef,
      locationResponseVersion: 2,
    });

    expect(mockGetCurrentLocation).toHaveBeenCalledWith(
      NATIVE_LOCATION_OPTIONS
    );
    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createGpsPermissionCallbackScript(true, preciseLocation)
    );
  });

  test('falls back to WebView geolocation when the native module is unavailable', async () => {
    const webviewRef = createWebViewRef();
    const locationModule = NativeModules.VisitLocationModule;
    NativeModules.VisitLocationModule = undefined;

    try {
      await requestAndroidLocation({
        webviewRef,
        locationResponseVersion: 2,
      });
    } finally {
      NativeModules.VisitLocationModule = locationModule;
    }

    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createGpsPermissionCallbackScript(true)
    );
  });

  test('falls back to WebView geolocation when native acquisition times out', async () => {
    const webviewRef = createWebViewRef();
    mockGetCurrentLocation.mockRejectedValue({ code: 'E_LOCATION_TIMEOUT' });

    await requestAndroidLocation({
      webviewRef,
      locationResponseVersion: 2,
    });

    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledTimes(1);
    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createGpsPermissionCallbackScript(true)
    );
  });

  test('accepts approximate permission and returns an approximate payload', async () => {
    const webviewRef = createWebViewRef();
    const approximateLocation = {
      ...preciseLocation,
      accuracy: 1500,
      precision: 'approximate',
    };
    mockPermissionCheck
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    mockGetCurrentLocation.mockResolvedValue(approximateLocation);

    await requestAndroidLocation({
      webviewRef,
      locationResponseVersion: 2,
    });

    expect(mockPermissionRequestMultiple).not.toHaveBeenCalled();
    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createGpsPermissionCallbackScript(true, approximateLocation)
    );
  });

  test('returns false when the user cancels the GPS resolution dialog', async () => {
    const webviewRef = createWebViewRef();
    mockRequestLocationSettings.mockResolvedValue(false);

    await requestAndroidLocation({
      webviewRef,
      locationResponseVersion: 2,
    });

    expect(mockGetCurrentLocation).not.toHaveBeenCalled();
    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createGpsPermissionCallbackScript(false)
    );
  });

  test('requests fine and coarse together and returns false when both are denied', async () => {
    const webviewRef = createWebViewRef();
    mockPermissionCheck.mockResolvedValue(false);
    mockPermissionRequestMultiple.mockResolvedValue({
      ACCESS_FINE_LOCATION: 'denied',
      ACCESS_COARSE_LOCATION: 'denied',
    });

    await requestAndroidLocation({
      webviewRef,
      locationResponseVersion: 2,
    });

    expect(mockPermissionRequestMultiple).toHaveBeenCalledWith([
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
    ]);
    expect(mockRequestLocationSettings).not.toHaveBeenCalled();
    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createGpsPermissionCallbackScript(false)
    );
  });

  test('offers app settings after permanent permission denial', async () => {
    const webviewRef = createWebViewRef();
    mockPermissionCheck.mockResolvedValue(false);
    mockPermissionRequestMultiple.mockResolvedValue({
      ACCESS_FINE_LOCATION: 'never_ask_again',
      ACCESS_COARSE_LOCATION: 'denied',
    });

    await requestAndroidLocation({ webviewRef });

    expect(mockAlert).toHaveBeenCalledTimes(1);
    const buttons = mockAlert.mock.calls[0][2];
    buttons[1].onPress();
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
  });

  test('rejects invalid native coordinates and uses the legacy fallback', async () => {
    const webviewRef = createWebViewRef();
    mockGetCurrentLocation.mockResolvedValue({
      ...preciseLocation,
      latitude: 123,
    });

    await requestAndroidLocation({
      webviewRef,
      locationResponseVersion: 2,
    });

    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createGpsPermissionCallbackScript(true)
    );
  });
});
