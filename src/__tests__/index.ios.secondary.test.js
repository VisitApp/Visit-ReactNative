import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

global.IS_REACT_ACT_ENVIRONMENT = true;

const mockLinkingOpenURL = jest.fn(() => Promise.resolve());
const mockLinkingOpenSettings = jest.fn(() => Promise.resolve());
const mockEmitEvent = jest.fn();
const mockUpdateApiUrl = jest.fn();
const mockGetCurrentLocation = jest.fn();
const mockAlert = jest.fn();
const mockPanResponderCreate = jest.fn((config) => ({
  panHandlers: {
    onStartShouldSetResponder: config.onStartShouldSetPanResponder,
    onMoveShouldSetResponder: config.onMoveShouldSetPanResponder,
    onResponderRelease: config.onPanResponderRelease,
    onResponderTerminate: config.onPanResponderTerminate,
    onResponderTerminationRequest: config.onPanResponderTerminationRequest,
  },
}));

jest.mock('react-native', () => ({
  SafeAreaView: 'SafeAreaView',
  Modal: 'Modal',
  Pressable: 'Pressable',
  Text: 'Text',
  View: 'View',
  NativeModules: {
    VisitRnSdkViewManager: {
      updateApiUrl: mockUpdateApiUrl,
      connectToAppleHealth: jest.fn(),
      renderGraph: jest.fn(),
    },
    VisitLocationModule: {
      getCurrentLocation: mockGetCurrentLocation,
    },
  },
  NativeEventEmitter: class NativeEventEmitter {
    addListener() {
      return { remove: jest.fn() };
    }
  },
  Linking: {
    openURL: mockLinkingOpenURL,
    openSettings: mockLinkingOpenSettings,
  },
  Alert: { alert: mockAlert },
  PanResponder: {
    create: mockPanResponderCreate,
  },
  Platform: {
    select: jest.fn((options) => options.ios),
  },
  ActivityIndicator: 'ActivityIndicator',
  Dimensions: {
    get: jest.fn(() => ({ height: 844, width: 390 })),
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
  'react-native-device-info',
  () => ({
    __esModule: true,
    default: {
      getSystemVersion: jest.fn(),
      getVersion: jest.fn(),
      getUniqueId: jest.fn(),
      getModel: jest.fn(),
    },
  }),
  { virtual: true }
);

jest.mock(
  'react-native-webview',
  () => ({
    WebView: 'WebView',
  }),
  { virtual: true }
);

const SecondaryWebView = require('../SecondaryWebView.ios').default;
const {
  createIosGpsPermissionCallbackScript,
  NATIVE_LOCATION_OPTIONS,
} = require('../iosLocation');
const VisitRnSdkView = require('../index.ios').default;

const primaryLink = 'https://sdk.getvisitapp.net/home';
const secondaryLink = 'https://partner.example.com/flow';

const messageEvent = (method, properties = {}) => ({
  nativeEvent: {
    data: JSON.stringify({ method, ...properties }),
  },
});

const flushPromises = async () => {
  for (let index = 0; index < 10; index += 1) {
    await Promise.resolve();
  }
};

const preciseLocation = {
  latitude: 12.9716,
  longitude: 77.5946,
  accuracy: 8,
  timestamp: 1788940000000,
  precision: 'precise',
  source: 'ios-core-location',
};

const render = (component) => {
  let renderer;
  act(() => {
    renderer = TestRenderer.create(component, {
      createNodeMock: () => ({}),
    });
  });
  return renderer;
};

const wrapInstance = (instance) => ({
  type: instance.type,
  props: Object.fromEntries(
    Object.entries(instance.props).map(([name, value]) => [
      name,
      typeof value === 'function'
        ? (...args) => {
            let result;
            act(() => {
              result = value(...args);
            });
            return result;
          }
        : value,
    ])
  ),
  ref: instance._fiber.ref,
});

const renderPrimary = (properties = {}) =>
  render(
    <VisitRnSdkView
      magicLink={primaryLink}
      isLoggingEnabled={false}
      {...properties}
    />
  );

const getPrimaryChildren = (renderer) => {
  const primaryContainer = renderer.root.findAllByType('SafeAreaView')[0];
  return primaryContainer.children.filter(Boolean).map(wrapInstance);
};

const renderSecondary = (properties = {}) => {
  return render(
    <SecondaryWebView
      link={secondaryLink}
      isLoggingEnabled={false}
      onClose={jest.fn()}
      {...properties}
    />
  );
};

const getSecondaryContent = (renderer) => {
  const modal = renderer.root.findByType('Modal');
  const safeAreaView = modal.findByType('SafeAreaView');
  const [webView, backSwipeEdge] = safeAreaView.children;
  return {
    modal: wrapInstance(modal),
    webView: wrapInstance(webView),
    backSwipeEdge: wrapInstance(backSwipeEdge),
  };
};

describe('iOS secondary WebView isolation', () => {
  let consoleLogSpy;

  beforeAll(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentLocation.mockResolvedValue(preciseLocation);
  });

  test.each([true, false])(
    'sets primary and secondary WebView inspectability to %p',
    (isLoggingEnabled) => {
      const primaryRenderer = renderPrimary({ isLoggingEnabled });
      const primaryWebView = getPrimaryChildren(primaryRenderer)[0];
      const secondaryRenderer = renderSecondary({ isLoggingEnabled });
      const { webView: secondaryWebView } =
        getSecondaryContent(secondaryRenderer);

      expect(primaryWebView.props.webviewDebuggingEnabled).toBe(
        isLoggingEnabled
      );
      expect(secondaryWebView.props.webviewDebuggingEnabled).toBe(
        isLoggingEnabled
      );
    }
  );

  test('disables WebView inspectability when logging is omitted', () => {
    const primaryRenderer = renderPrimary({ isLoggingEnabled: undefined });
    const primaryWebView = getPrimaryChildren(primaryRenderer)[0];
    const secondaryRenderer = renderSecondary({
      isLoggingEnabled: undefined,
    });
    const { webView: secondaryWebView } =
      getSecondaryContent(secondaryRenderer);

    expect(primaryWebView.props.webviewDebuggingEnabled).toBe(false);
    expect(secondaryWebView.props.webviewDebuggingEnabled).toBe(false);
  });

  test('opens one secondary component while preserving the primary WebView', async () => {
    const renderer = renderPrimary();
    const primaryBefore = getPrimaryChildren(renderer)[0];

    await primaryBefore.props.onMessage(
      messageEvent('OPEN_SECONDARY_WEB_VIEW', {
        link: `  ${secondaryLink}  `,
      })
    );

    let children = getPrimaryChildren(renderer);
    expect(children).toHaveLength(2);
    expect(children[0].props.source.uri).toBe(primaryLink);
    expect(children[0].ref).toBe(primaryBefore.ref);
    expect(children[1].type).toBe(SecondaryWebView);
    expect(children[1].props.link).toBe(secondaryLink);

    await children[0].props.onMessage(
      messageEvent('OPEN_SECONDARY_WEB_VIEW', {
        link: 'https://another.example.com',
      })
    );

    children = getPrimaryChildren(renderer);
    expect(children).toHaveLength(2);
    expect(children[1].props.link).toBe(secondaryLink);
  });

  test('releases the secondary slot after close so another link can open', async () => {
    const renderer = renderPrimary();
    let children = getPrimaryChildren(renderer);

    await children[0].props.onMessage(
      messageEvent('OPEN_SECONDARY_WEB_VIEW', { link: secondaryLink })
    );

    children = getPrimaryChildren(renderer);
    children[1].props.onClose();
    children = getPrimaryChildren(renderer);
    expect(children).toHaveLength(1);

    const nextLink = 'https://another.example.com';
    await children[0].props.onMessage(
      messageEvent('OPEN_SECONDARY_WEB_VIEW', { link: nextLink })
    );

    children = getPrimaryChildren(renderer);
    expect(children).toHaveLength(2);
    expect(children[1].props.link).toBe(nextLink);
  });

  test.each([[undefined], [''], ['   ']])(
    'ignores missing or empty secondary link %p',
    async (link) => {
      const renderer = renderPrimary();

      await getPrimaryChildren(renderer)[0].props.onMessage(
        messageEvent('OPEN_SECONDARY_WEB_VIEW', { link })
      );

      expect(getPrimaryChildren(renderer)).toHaveLength(1);
    }
  );

  test.each([
    ['/relative'],
    ['custom://campaign/123'],
    ['https://'],
    ['https://example.com/has whitespace'],
  ])('opens secondary link %p without URL format validation', async (link) => {
    const renderer = renderPrimary();

    await getPrimaryChildren(renderer)[0].props.onMessage(
      messageEvent('OPEN_SECONDARY_WEB_VIEW', { link })
    );

    const children = getPrimaryChildren(renderer);
    expect(children).toHaveLength(2);
    expect(children[1].props.link).toBe(link);
  });

  test('keeps HTTP(S) navigation inside and sends other schemes to iOS', () => {
    const renderer = renderSecondary();
    const { webView } = getSecondaryContent(renderer);
    const shouldLoad = webView.props.onShouldStartLoadWithRequest;

    expect(
      shouldLoad({ url: 'http://other.example.com', isTopFrame: true })
    ).toBe(true);
    expect(
      shouldLoad({ url: 'https://redirect.example.org', isTopFrame: true })
    ).toBe(true);
    expect(
      shouldLoad({ url: 'blob:https://example.com/id', isTopFrame: true })
    ).toBe(true);
    expect(shouldLoad({ url: 'tel:+911234567890', isTopFrame: true })).toBe(
      false
    );
    expect(mockLinkingOpenURL).toHaveBeenCalledWith('tel:+911234567890');
  });

  test('handles location, PDF, and face scan while ignoring other callbacks', () => {
    const onClose = jest.fn();
    const renderer = renderSecondary({ onClose });
    const { webView } = getSecondaryContent(renderer);
    const secondaryInstance = { injectJavaScript: jest.fn() };
    webView.ref.current = secondaryInstance;

    webView.props.onMessage(messageEvent('GET_LOCATION_PERMISSIONS'));
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

    expect(secondaryInstance.injectJavaScript).toHaveBeenCalledWith(
      createIosGpsPermissionCallbackScript(true)
    );
    expect(mockLinkingOpenURL).toHaveBeenCalledWith(
      'https://example.com/a.pdf'
    );
    expect(mockEmitEvent).toHaveBeenCalledWith('visit-event', {
      message: 'OPEN_FACE_SCAN_FLOW',
    });
    expect(mockUpdateApiUrl).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('returns Core Location coordinates only to the v2 modal WebView requester', async () => {
    const renderer = renderSecondary();
    const { webView } = getSecondaryContent(renderer);
    const secondaryInstance = { injectJavaScript: jest.fn() };
    webView.ref.current = secondaryInstance;

    webView.props.onMessage(
      messageEvent('GET_LOCATION_PERMISSIONS', {
        locationResponseVersion: 2,
      })
    );
    await flushPromises();

    expect(mockGetCurrentLocation).toHaveBeenCalledWith(
      NATIVE_LOCATION_OPTIONS
    );
    expect(secondaryInstance.injectJavaScript).toHaveBeenCalledTimes(1);
    expect(secondaryInstance.injectJavaScript).toHaveBeenCalledWith(
      createIosGpsPermissionCallbackScript(true, preciseLocation)
    );
  });

  test('coalesces repeated location requests from the same modal WebView', async () => {
    let resolveLocation;
    mockGetCurrentLocation.mockReturnValue(
      new Promise((resolve) => {
        resolveLocation = resolve;
      })
    );
    const renderer = renderSecondary();
    const { webView } = getSecondaryContent(renderer);
    const secondaryInstance = { injectJavaScript: jest.fn() };
    webView.ref.current = secondaryInstance;
    const request = messageEvent('GET_LOCATION_PERMISSIONS', {
      locationResponseVersion: 2,
    });

    webView.props.onMessage(request);
    webView.props.onMessage(request);
    await flushPromises();

    expect(mockGetCurrentLocation).toHaveBeenCalledTimes(1);

    resolveLocation(preciseLocation);
    await flushPromises();
    expect(secondaryInstance.injectJavaScript).toHaveBeenCalledTimes(1);
  });

  test('does not inject a late location result after the modal WebView closes', async () => {
    let resolveLocation;
    mockGetCurrentLocation.mockReturnValue(
      new Promise((resolve) => {
        resolveLocation = resolve;
      })
    );
    const renderer = renderSecondary();
    const { webView } = getSecondaryContent(renderer);
    const secondaryInstance = { injectJavaScript: jest.fn() };
    webView.ref.current = secondaryInstance;

    webView.props.onMessage(
      messageEvent('GET_LOCATION_PERMISSIONS', {
        locationResponseVersion: 2,
      })
    );
    webView.ref.current = null;
    resolveLocation(preciseLocation);
    await flushPromises();

    expect(secondaryInstance.injectJavaScript).not.toHaveBeenCalled();
  });

  test('injects a v2 location result only into the primary WebView requester', async () => {
    const renderer = renderPrimary();
    const primaryWebView = getPrimaryChildren(renderer)[0];
    const primaryInstance = { injectJavaScript: jest.fn() };
    primaryWebView.ref.current = primaryInstance;

    primaryWebView.props.onMessage(
      messageEvent('GET_LOCATION_PERMISSIONS', {
        locationResponseVersion: 2,
      })
    );
    await flushPromises();

    expect(primaryInstance.injectJavaScript).toHaveBeenCalledTimes(1);
    expect(primaryInstance.injectJavaScript).toHaveBeenCalledWith(
      createIosGpsPermissionCallbackScript(true, preciseLocation)
    );
  });

  test('closes immediately on CLOSE_VIEW without navigating WebView history', () => {
    const onClose = jest.fn();
    const renderer = renderSecondary({ onClose });
    let { webView } = getSecondaryContent(renderer);
    const secondaryInstance = { goBack: jest.fn() };
    webView.ref.current = secondaryInstance;

    webView.props.onNavigationStateChange({ canGoBack: true });
    webView = getSecondaryContent(renderer).webView;
    webView.props.onMessage(messageEvent('CLOSE_VIEW'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(secondaryInstance.goBack).not.toHaveBeenCalled();
  });

  test('uses secondary history before a modal close request closes it', () => {
    const onClose = jest.fn();
    const renderer = renderSecondary({ onClose });
    let { webView } = getSecondaryContent(renderer);
    const secondaryInstance = { goBack: jest.fn() };
    webView.ref.current = secondaryInstance;

    webView.props.onNavigationStateChange({ canGoBack: true });
    getSecondaryContent(renderer).modal.props.onRequestClose();

    expect(secondaryInstance.goBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    webView = getSecondaryContent(renderer).webView;
    webView.props.onNavigationStateChange({ canGoBack: false });
    getSecondaryContent(renderer).modal.props.onRequestClose();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('uses secondary history for a completed left-edge swipe', () => {
    const onClose = jest.fn();
    const renderer = renderSecondary({ onClose });
    const { webView } = getSecondaryContent(renderer);
    const secondaryInstance = { goBack: jest.fn() };
    webView.ref.current = secondaryInstance;

    webView.props.onNavigationStateChange({ canGoBack: true });
    getSecondaryContent(renderer).backSwipeEdge.props.onResponderRelease(null, {
      dx: 70,
      dy: 5,
      vx: 0.2,
    });

    expect(secondaryInstance.goBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('closes the secondary WebView for a completed root swipe', () => {
    const onClose = jest.fn();
    const renderer = renderSecondary({ onClose });
    const { backSwipeEdge } = getSecondaryContent(renderer);

    backSwipeEdge.props.onResponderRelease(null, {
      dx: 70,
      dy: 5,
      vx: 0.2,
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('accepts a fast rightward flick from the left edge', () => {
    const onClose = jest.fn();
    const renderer = renderSecondary({ onClose });
    const { backSwipeEdge } = getSecondaryContent(renderer);

    backSwipeEdge.props.onResponderRelease(null, {
      dx: 25,
      dy: 2,
      vx: 0.6,
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['short drag', { dx: 20, dy: 1, vx: 0.2 }],
    ['leftward drag', { dx: -70, dy: 1, vx: -1 }],
    ['vertical drag', { dx: 70, dy: 80, vx: 1 }],
    ['slow partial drag', { dx: 24, dy: 1, vx: 0.49 }],
  ])('ignores a %s', (_name, gestureState) => {
    const onClose = jest.fn();
    const renderer = renderSecondary({ onClose });
    const { backSwipeEdge } = getSecondaryContent(renderer);

    backSwipeEdge.props.onResponderRelease(null, gestureState);
    backSwipeEdge.props.onResponderTerminate();

    expect(onClose).not.toHaveBeenCalled();
  });

  test('limits the custom responder to the invisible 24-point edge', () => {
    const renderer = renderSecondary();
    const { backSwipeEdge } = getSecondaryContent(renderer);

    expect(backSwipeEdge.props.testID).toBe(
      'secondary-webview-back-swipe-edge'
    );
    expect(backSwipeEdge.props.style.width).toBe(24);
    expect(backSwipeEdge.props.onStartShouldSetResponder()).toBe(true);
    expect(backSwipeEdge.props.onResponderTerminationRequest()).toBe(false);
  });

  test('injects iOS platform state and disables native history gestures', () => {
    const renderer = renderSecondary();
    const { webView } = getSecondaryContent(renderer);

    expect(webView.props.injectedJavaScriptBeforeContentLoaded).toContain(
      'window.platform = "IOS"'
    );
    expect(webView.props.allowsBackForwardNavigationGestures).toBe(false);
  });

  test('emits a WebView error and closes without navigating history', () => {
    const onClose = jest.fn();
    const renderer = renderSecondary({ onClose });
    let { webView } = getSecondaryContent(renderer);
    const secondaryInstance = { goBack: jest.fn() };
    webView.ref.current = secondaryInstance;

    webView.props.onNavigationStateChange({ canGoBack: true });
    webView = getSecondaryContent(renderer).webView;
    const errorMessage = { nativeEvent: { description: 'load failed' } };

    webView.props.onError(errorMessage);

    expect(mockEmitEvent).toHaveBeenCalledWith('visit-event', {
      message: 'web-view-error',
      errorMessage,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(secondaryInstance.goBack).not.toHaveBeenCalled();
    expect(mockEmitEvent.mock.invocationCallOrder[0]).toBeLessThan(
      onClose.mock.invocationCallOrder[0]
    );
  });

  test('does not render the modal for an invalid direct link', () => {
    const renderer = renderSecondary({ link: 'ftp://example.com' });
    expect(renderer.toJSON()).toBeNull();
  });
});
