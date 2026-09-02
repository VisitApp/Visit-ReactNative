import React from 'react';
import ShallowRenderer from 'react-shallow-renderer';

const mockLinkingOpenURL = jest.fn(() => Promise.resolve());
const mockEmitEvent = jest.fn();
const mockUpdateApiUrl = jest.fn();

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
  },
  NativeEventEmitter: class NativeEventEmitter {
    addListener() {
      return { remove: jest.fn() };
    }
  },
  Linking: {
    openURL: mockLinkingOpenURL,
  },
  Platform: {
    select: jest.fn((options) => options.ios),
  },
  ActivityIndicator: 'ActivityIndicator',
  Dimensions: {
    get: jest.fn(() => ({ height: 844, width: 390 })),
  },
  StyleSheet: {
    hairlineWidth: 1,
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
const VisitRnSdkView = require('../index.ios').default;

const primaryLink = 'https://sdk.getvisitapp.net/home';
const secondaryLink = 'https://partner.example.com/flow';

const messageEvent = (method, properties = {}) => ({
  nativeEvent: {
    data: JSON.stringify({ method, ...properties }),
  },
});

const renderPrimary = () => {
  const renderer = new ShallowRenderer();
  renderer.render(
    <VisitRnSdkView magicLink={primaryLink} isLoggingEnabled={false} />
  );

  // ShallowRenderer skips effects. Mirror the existing magicLink effect by
  // setting source and loading through their existing state hooks.
  renderer._firstWorkInProgressHook.queue.dispatch(primaryLink);
  renderer._firstWorkInProgressHook.next.queue.dispatch(false);
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

const getSecondaryContent = (renderer) => {
  const modal = renderer.getRenderOutput();
  const safeAreaView = modal.props.children;
  const [header, webView] = safeAreaView.props.children;
  return {
    modal,
    backButton: header.props.children,
    webView,
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

  test.each([
    [undefined],
    [''],
    ['/relative'],
    ['java' + 'script:alert(1)'],
    ['https://'],
    ['https://example.com/has whitespace'],
  ])('ignores invalid secondary link %p', async (link) => {
    const renderer = renderPrimary();

    await getPrimaryChildren(renderer)[0].props.onMessage(
      messageEvent('OPEN_SECONDARY_WEB_VIEW', { link })
    );

    expect(getPrimaryChildren(renderer)).toHaveLength(1);
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
    webView.props.onMessage(messageEvent('CLOSE_VIEW'));
    webView.props.onMessage(
      messageEvent('OPEN_SECONDARY_WEB_VIEW', {
        link: 'https://another.example.com',
      })
    );

    expect(secondaryInstance.injectJavaScript).toHaveBeenCalledWith(
      'window.checkTheGpsPermission(true)'
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

  test('uses secondary history before the native Back button closes the modal', () => {
    const onClose = jest.fn();
    const renderer = renderSecondary({ onClose });
    let { webView } = getSecondaryContent(renderer);
    const secondaryInstance = { goBack: jest.fn() };
    webView.ref.current = secondaryInstance;

    webView.props.onLoadProgress({ nativeEvent: { canGoBack: true } });
    getSecondaryContent(renderer).backButton.props.onPress();

    expect(secondaryInstance.goBack).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();

    webView = getSecondaryContent(renderer).webView;
    webView.props.onLoadProgress({ nativeEvent: { canGoBack: false } });
    getSecondaryContent(renderer).backButton.props.onPress();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('injects iOS platform state before content loads', () => {
    const renderer = renderSecondary();
    const { webView } = getSecondaryContent(renderer);

    expect(webView.props.injectedJavaScriptBeforeContentLoaded).toContain(
      'window.platform = "IOS"'
    );
    expect(webView.props.allowsBackForwardNavigationGestures).toBe(true);
  });

  test('emits the existing WebView error event', () => {
    const renderer = renderSecondary();
    const { webView } = getSecondaryContent(renderer);
    const errorMessage = { nativeEvent: { description: 'load failed' } };

    webView.props.onError(errorMessage);

    expect(mockEmitEvent).toHaveBeenCalledWith('visit-event', {
      message: 'web-view-error',
      errorMessage,
    });
  });

  test('does not render the modal for an invalid direct link', () => {
    const renderer = renderSecondary({ link: 'ftp://example.com' });
    expect(renderer.getRenderOutput()).toBeNull();
  });
});
