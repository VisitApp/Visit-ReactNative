const mockGetCurrentLocation = jest.fn();
const mockAlert = jest.fn();
const mockOpenSettings = jest.fn();

jest.mock('react-native', () => ({
  Alert: { alert: mockAlert },
  Linking: { openSettings: mockOpenSettings },
  NativeModules: {
    VisitLocationModule: {
      getCurrentLocation: mockGetCurrentLocation,
    },
  },
}));

const { NativeModules } = require('react-native');
const {
  createIosGpsPermissionCallbackScript,
  NATIVE_LOCATION_OPTIONS,
  requestIosLocation,
} = require('../iosLocation');

const preciseLocation = {
  latitude: 12.9716,
  longitude: 77.5946,
  accuracy: 8,
  timestamp: 1788940000000,
  precision: 'precise',
  source: 'ios-core-location',
};

const createWebViewRef = () => ({
  current: { injectJavaScript: jest.fn() },
});

describe('iOS native location handoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentLocation.mockResolvedValue(preciseLocation);
  });

  test('keeps the legacy callback path when the PWA sends no version', async () => {
    const webviewRef = createWebViewRef();

    await requestIosLocation({ webviewRef });

    expect(mockGetCurrentLocation).not.toHaveBeenCalled();
    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledTimes(1);
    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createIosGpsPermissionCallbackScript(true)
    );
  });

  test('passes validated Core Location coordinates to a v2 PWA', async () => {
    const webviewRef = createWebViewRef();

    await requestIosLocation({
      webviewRef,
      locationResponseVersion: 2,
    });

    expect(mockGetCurrentLocation).toHaveBeenCalledWith(
      NATIVE_LOCATION_OPTIONS
    );
    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createIosGpsPermissionCallbackScript(true, preciseLocation)
    );
  });

  test('accepts an approximate Core Location payload', async () => {
    const webviewRef = createWebViewRef();
    const approximateLocation = {
      ...preciseLocation,
      accuracy: 1500,
      precision: 'approximate',
    };
    mockGetCurrentLocation.mockResolvedValue(approximateLocation);

    await requestIosLocation({
      webviewRef,
      locationResponseVersion: 2,
    });

    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createIosGpsPermissionCallbackScript(true, approximateLocation)
    );
  });

  test('falls back to WebView geolocation when the native module is unavailable', async () => {
    const webviewRef = createWebViewRef();
    const locationModule = NativeModules.VisitLocationModule;
    NativeModules.VisitLocationModule = undefined;

    try {
      await requestIosLocation({
        webviewRef,
        locationResponseVersion: 2,
      });
    } finally {
      NativeModules.VisitLocationModule = locationModule;
    }

    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createIosGpsPermissionCallbackScript(true)
    );
  });

  test.each([
    'E_LOCATION_SERVICES_DISABLED',
    'E_LOCATION_PERMISSION_DENIED',
    'E_LOCATION_PERMISSION_RESTRICTED',
    'E_LOCATION_USAGE_DESCRIPTION_MISSING',
  ])('returns false for %s', async (code) => {
    const webviewRef = createWebViewRef();
    mockGetCurrentLocation.mockRejectedValue({ code });

    await requestIosLocation({
      webviewRef,
      locationResponseVersion: 2,
    });

    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledTimes(1);
    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createIosGpsPermissionCallbackScript(false)
    );
    expect(mockAlert).not.toHaveBeenCalled();
  });

  test('offers app settings when permission was previously denied', async () => {
    const webviewRef = createWebViewRef();
    mockGetCurrentLocation.mockRejectedValue({
      code: 'E_LOCATION_PERMISSION_DENIED_PREVIOUSLY',
    });

    await requestIosLocation({
      webviewRef,
      locationResponseVersion: 2,
    });

    expect(mockAlert).toHaveBeenCalledTimes(1);
    const buttons = mockAlert.mock.calls[0][2];
    buttons[1].onPress();
    expect(mockOpenSettings).toHaveBeenCalledTimes(1);
    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createIosGpsPermissionCallbackScript(false)
    );
  });

  test.each([
    'E_LOCATION_TIMEOUT',
    'E_LOCATION_UNAVAILABLE',
    'E_LOCATION_REQUEST_FAILED',
  ])('uses the WebView fallback for %s', async (code) => {
    const webviewRef = createWebViewRef();
    mockGetCurrentLocation.mockRejectedValue({ code });

    await requestIosLocation({
      webviewRef,
      locationResponseVersion: 2,
    });

    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledTimes(1);
    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createIosGpsPermissionCallbackScript(true)
    );
  });

  test('rejects an invalid native payload and uses the WebView fallback', async () => {
    const webviewRef = createWebViewRef();
    mockGetCurrentLocation.mockResolvedValue({
      ...preciseLocation,
      latitude: 123,
    });

    await requestIosLocation({
      webviewRef,
      locationResponseVersion: 2,
    });

    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createIosGpsPermissionCallbackScript(true)
    );
  });

  test('rejects an invalid timestamp and uses the WebView fallback', async () => {
    const webviewRef = createWebViewRef();
    mockGetCurrentLocation.mockResolvedValue({
      ...preciseLocation,
      timestamp: 0,
    });

    await requestIosLocation({
      webviewRef,
      locationResponseVersion: 2,
    });

    expect(webviewRef.current.injectJavaScript).toHaveBeenCalledWith(
      createIosGpsPermissionCallbackScript(true)
    );
  });
});
