import React from 'react';
import ShallowRenderer from 'react-shallow-renderer';

const mockInitiateSDK = jest.fn();
const mockUpdateApiBaseUrl = jest.fn();
const mockPermissionCheck = jest.fn();
const mockPermissionRequest = jest.fn();
const mockRequestResolution = jest.fn();
const mockLinkingOpenURL = jest.fn(() => Promise.resolve());
const mockEmitEvent = jest.fn();

let mockLocationEnabled = true;

jest.mock('axios', () => ({
  create: jest.fn(() => ({ post: jest.fn() })),
}));

jest.mock('react-native', () => ({
  SafeAreaView: 'SafeAreaView',
  Modal: 'Modal',
  NativeModules: {
    VisitFitnessModule: {
      initiateSDK: mockInitiateSDK,
      updateApiBaseUrl: mockUpdateApiBaseUrl,
      getHealthConnectStatus: jest.fn(),
      askForFitnessPermission: jest.fn(),
      requestDailyFitnessData: jest.fn(),
      requestActivityDataFromHealthConnect: jest.fn(),
      openHealthConnectApp: jest.fn(),
    },
  },
  PermissionsAndroid: {
    PERMISSIONS: { ACCESS_FINE_LOCATION: 'ACCESS_FINE_LOCATION' },
    RESULTS: { GRANTED: 'granted' },
    check: mockPermissionCheck,
    request: mockPermissionRequest,
  },
  BackHandler: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  Linking: {
    openURL: mockLinkingOpenURL,
    openSettings: jest.fn(),
  },
  Alert: { alert: jest.fn() },
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  NativeEventEmitter: class NativeEventEmitter {
    addListener() {
      return { remove: jest.fn() };
    }
  },
  StyleSheet: {
    create: (styles) => styles,
  },
}));

jest.mock(
  'react-native-event-listeners',
  () => ({
    EventRegister: {
      emitEvent: mockEmitEvent,
    },
  }),
  { virtual: true }
);

jest.mock(
  'react-native-location-enabler',
  () => ({
    __esModule: true,
    default: {
      PRIORITIES: { HIGH_ACCURACY: 'HIGH_ACCURACY' },
      useLocationSettings: jest.fn(() => [
        mockLocationEnabled,
        mockRequestResolution,
      ]),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    },
  }),
  { virtual: true }
);

jest.mock(
  'react-native-device-info',
  () => ({
    __esModule: true,
    default: {
      getAndroidId: jest.fn(),
      getBuildNumber: jest.fn(),
      getSystemVersion: jest.fn(),
      getVersion: jest.fn(),
    },
  }),
  { virtual: true }
);

jest.mock(
  'react-native-webview',
  () => ({
    __esModule: true,
    default: 'WebView',
  }),
  { virtual: true }
);

const {
  default: SecondaryWebView,
  checkSecondaryLocationPermissionAndSendCallback,
} = require('../SecondaryWebView.android');
const VisitRnSdkView = require('../index.android').default;

const primaryLink = 'https://sdk.getvisitapp.net/home';
const secondaryLink = 'https://partner.example.com/flow';

const messageEvent = (method, properties = {}) => ({
  nativeEvent: {
    data: JSON.stringify({ method, ...properties }),
  },
});

const flushPromises = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const renderPrimary = () => {
  const renderer = new ShallowRenderer();
  renderer.render(
    <VisitRnSdkView magicLink={primaryLink} isLoggingEnabled={false} />
  );

  // ShallowRenderer skips effects. Dispatch the source state hook to mirror
  // the existing magicLink effect without changing production timing.
  renderer._firstWorkInProgressHook.queue.dispatch(primaryLink);
  return renderer;
};

const getPrimaryChildren = (renderer) => {
  const children = renderer.getRenderOutput().props.children;
  return (Array.isArray(children) ? children : [children]).filter(Boolean);
};

const renderSecondary = (properties = {}) => {
  const renderer = new ShallowRenderer();
  renderer.render(
    <SecondaryWebView
      link={secondaryLink}
      isLoggingEnabled={false}
      onClose={jest.fn()}
      {...properties}
    />
  );
  return renderer;
};

const getSecondaryWebView = (renderer) =>
  renderer.getRenderOutput().props.children.props.children;

describe('Android secondary WebView isolation', () => {
  let consoleLogSpy;

  beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocationEnabled = true;
    mockPermissionCheck.mockResolvedValue(false);
    mockPermissionRequest.mockResolvedValue('granted');
  });

  test('opens one secondary component while preserving the primary WebView', () => {
    const renderer = renderPrimary();
    const primaryBefore = getPrimaryChildren(renderer)[0];

    primaryBefore.props.onMessage(
      messageEvent('OPEN_SECONDARY_WEB_VIEW', {
        link: `  ${secondaryLink}  `,
      })
    );

    let children = getPrimaryChildren(renderer);
    expect(children).toHaveLength(2);
    expect(children[0].props.source.uri).toBe(primaryLink);
    expect(children[0].ref).toBe(primaryBefore.ref);
    expect(children[1].props.link).toBe(secondaryLink);

    children[0].props.onMessage(
      messageEvent('OPEN_SECONDARY_WEB_VIEW', {
        link: 'https://another.example.com',
      })
    );

    children = getPrimaryChildren(renderer);
    expect(children).toHaveLength(2);
    expect(children[1].props.link).toBe(secondaryLink);
  });

  test.each([
    [undefined],
    [''],
    ['/relative'],
    ['java' + 'script:alert(1)'],
    ['https://'],
    ['https://example.com/has whitespace'],
  ])('ignores invalid secondary link %p', (link) => {
    const renderer = renderPrimary();

    getPrimaryChildren(renderer)[0].props.onMessage(
      messageEvent('OPEN_SECONDARY_WEB_VIEW', { link })
    );

    expect(getPrimaryChildren(renderer)).toHaveLength(1);
  });

  test('keeps HTTP(S) navigation inside the modal WebView', () => {
    const renderer = renderSecondary();
    const shouldLoad =
      getSecondaryWebView(renderer).props.onShouldStartLoadWithRequest;

    expect(
      shouldLoad({ url: 'http://other.example.com', isTopFrame: true })
    ).toBe(true);
    expect(
      shouldLoad({ url: 'https://redirect.example.org', isTopFrame: true })
    ).toBe(true);
    expect(shouldLoad({ url: 'about:blank', isTopFrame: true })).toBe(true);
    expect(shouldLoad({ url: 'tel:+911234567890', isTopFrame: true })).toBe(
      false
    );
    expect(mockLinkingOpenURL).toHaveBeenCalledWith('tel:+911234567890');
  });

  test('handles PDF and face-scan callbacks and ignores other bridges', () => {
    const renderer = renderSecondary();
    const webView = getSecondaryWebView(renderer);

    webView.props.onMessage(
      messageEvent('OPEN_PDF', { url: 'https://example.com/a.pdf' })
    );
    webView.props.onMessage(messageEvent('OPEN_FACE_SCAN_FLOW'));
    webView.props.onMessage(messageEvent('UPDATE_API_BASE_URL'));
    webView.props.onMessage(
      messageEvent('OPEN_SECONDARY_WEB_VIEW', {
        link: 'https://another.example.com',
      })
    );

    expect(mockLinkingOpenURL).toHaveBeenCalledWith(
      'https://example.com/a.pdf'
    );
    expect(mockEmitEvent).toHaveBeenCalledWith('visit-event', {
      message: 'OPEN_FACE_SCAN_FLOW',
    });
    expect(mockUpdateApiBaseUrl).not.toHaveBeenCalled();
    expect(renderer.getRenderOutput().props.visible).toBe(true);
  });

  test('closes immediately on CLOSE_VIEW without navigating WebView history', () => {
    const onClose = jest.fn();
    const renderer = renderSecondary({ onClose });
    let webView = getSecondaryWebView(renderer);
    const secondaryInstance = { goBack: jest.fn() };
    webView.ref.current = secondaryInstance;

    webView.props.onLoadProgress({ nativeEvent: { canGoBack: true } });
    webView = getSecondaryWebView(renderer);
    webView.props.onMessage(messageEvent('CLOSE_VIEW'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(secondaryInstance.goBack).not.toHaveBeenCalled();
  });

  test('injects an immediate location result only into the modal WebView', async () => {
    const renderer = renderSecondary();
    const webView = getSecondaryWebView(renderer);
    const secondaryInstance = { injectJavaScript: jest.fn() };
    webView.ref.current = secondaryInstance;

    webView.props.onMessage(messageEvent('GET_LOCATION_PERMISSIONS'));
    await flushPromises();

    expect(secondaryInstance.injectJavaScript).toHaveBeenCalledWith(
      'window.checkTheGpsPermission(true)'
    );
  });

  test('keeps the delayed GPS result targeted at the modal WebView', async () => {
    const secondaryRef = {
      current: { injectJavaScript: jest.fn() },
    };
    mockPermissionCheck.mockResolvedValue(true);

    await checkSecondaryLocationPermissionAndSendCallback(secondaryRef, false);

    expect(secondaryRef.current.injectJavaScript).toHaveBeenCalledWith(
      'window.checkTheGpsPermission(true)'
    );
  });

  test('uses modal history before closing on Android Back', () => {
    const onClose = jest.fn();
    const renderer = renderSecondary({ onClose });
    let webView = getSecondaryWebView(renderer);
    const secondaryInstance = { goBack: jest.fn() };
    webView.ref.current = secondaryInstance;

    webView.props.onLoadProgress({ nativeEvent: { canGoBack: true } });
    renderer.getRenderOutput().props.onRequestClose();

    expect(secondaryInstance.goBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    webView = getSecondaryWebView(renderer);
    webView.props.onLoadProgress({ nativeEvent: { canGoBack: false } });
    renderer.getRenderOutput().props.onRequestClose();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('does not render the modal for an invalid direct link', () => {
    const renderer = renderSecondary({ link: 'ftp://example.com' });
    expect(renderer.getRenderOutput()).toBeNull();
  });
});
