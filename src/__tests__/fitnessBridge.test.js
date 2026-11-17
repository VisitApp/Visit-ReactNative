import React from 'react';
import { AppState, NativeModules, Platform } from 'react-native';
import { act, create } from 'react-test-renderer';
import { WebView } from 'react-native-webview';

const mockInject = jest.fn();

jest.mock('react-native-webview', () => {
  const react = require('react');
  const MockWebView = react.forwardRef((props, ref) => {
    react.useImperativeHandle(ref, () => ({ injectJavaScript: mockInject }));
    return react.createElement('MockWebView', props);
  });
  return { __esModule: true, default: MockWebView, WebView: MockWebView };
});

jest.mock(
  'react-native-location-enabler',
  () => ({
    PRIORITIES: { HIGH_ACCURACY: 1 },
    useLocationSettings: () => [true, jest.fn()],
    addListener: () => ({ remove: jest.fn() }),
  }),
  { virtual: true }
);
jest.mock('react-native-event-listeners', () => ({ EventRegister: {} }), {
  virtual: true,
});

const sleepGraph = 'DetailedGraph.updateDailySleep(1000,2000)';
const calorieGraph = "DetailedGraph.updateData([1],[123],'calories','day','0')";
const day = 1770000000000;

let app;
let foregroundListener;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
    foregroundListener = callback;
    return { remove: jest.fn() };
  });
  NativeModules.VisitFitnessModule = {
    initiateSDK: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    askForFitnessPermission: jest.fn().mockResolvedValue('GRANTED'),
    getHealthConnectStatus: jest.fn().mockResolvedValue('CONNECTED'),
    requestDailyFitnessData: jest
      .fn()
      .mockResolvedValue('window.updateFitnessPermissions(true,900,450)'),
    requestActivityDataFromHealthConnect: jest.fn((metric) =>
      Promise.resolve(metric === 'calories' ? calorieGraph : sleepGraph)
    ),
  };
  NativeModules.VisitRnSdkViewManager = {
    connectToAppleHealth: jest.fn((callback) =>
      callback({ authStatus: 'GRANTED', numberOfSteps: 900, sleepTime: 450 })
    ),
    getHealthKitConnectStatus: jest.fn().mockResolvedValue('CONNECTED'),
    getTodayStepCount: jest.fn().mockResolvedValue(1000),
    getTodaySleepMinutes: jest.fn().mockResolvedValue(460),
    renderGraph: jest.fn((_, callback) => callback(null, [calorieGraph])),
  };
});

afterEach(() => {
  act(() => app?.unmount());
  jest.restoreAllMocks();
});

function mount(View, props = { ssoURL: 'https://example.test/sso' }) {
  act(() => {
    app = create(<View {...props} />);
  });
}

function send(message) {
  return app.root.findByType(WebView).props.onMessage({
    nativeEvent: { data: JSON.stringify(message) },
  });
}

it.each(['android', 'ios'])(
  'loads and updates the supplied SSO URL on %s',
  (platform) => {
    const View = require(`../index.${platform}`).default;
    const firstUrl = 'https://example.test/sso?session=first&clientId=example';
    const nextUrl = 'https://example.test/sso?session=next';

    mount(View, {});
    expect(app.root.findAllByType(WebView)).toHaveLength(0);

    act(() => app.update(<View ssoURL={firstUrl} />));
    expect(app.root.findByType(WebView).props.source.uri).toBe(firstUrl);

    act(() => app.update(<View ssoURL={nextUrl} />));
    expect(app.root.findByType(WebView).props.source.uri).toBe(nextUrl);

    act(() => app.update(<View ssoURL="   " />));
    expect(app.root.findAllByType(WebView)).toHaveLength(0);
  }
);

it('starts Android permissions directly, accepts the old message, and delivers independent graph callbacks', async () => {
  mount(require('../index.android').default);
  await act(async () => {
    await send({ method: 'CONNECT_TO_GOOGLE_FIT', disclaimerAccepted: true });
    await send({ method: 'CONNECT_TO_GOOGLE_FIT' });
    await send({
      method: 'GET_DATA_TO_GENERATE_GRAPH',
      type: 'calories',
      frequency: 'day',
      timestamp: day,
    });
    await send({
      method: 'GET_DATA_TO_GENERATE_GRAPH',
      type: 'sleep',
      frequency: 'day',
      timestamp: day,
    });
  });

  expect(
    NativeModules.VisitFitnessModule.askForFitnessPermission
  ).toHaveBeenCalledTimes(2);
  expect(mockInject).toHaveBeenCalledWith(
    'window.updateFitnessPermissions(true,900,450)'
  );
  expect(mockInject).toHaveBeenCalledWith('window.' + calorieGraph);
  expect(mockInject).toHaveBeenCalledWith('window.' + sleepGraph);
  expect(mockInject.mock.calls.flat().join('\n')).not.toContain(
    'showHealthConnectDisclaimer'
  );
});

it('reports iPad as unsupported when connecting to Apple Health', async () => {
  jest.spyOn(Platform, 'isPad', 'get').mockReturnValue(true);
  mount(require('../index.ios').default);

  await act(async () => {
    await send({ method: 'CONNECT_TO_GOOGLE_FIT' });
  });

  expect(
    NativeModules.VisitRnSdkViewManager.connectToAppleHealth
  ).not.toHaveBeenCalled();
  expect(mockInject).toHaveBeenCalledWith(
    'window.unsupportedHealthKitDevice(true)'
  );
});

it('delivers iOS sleep minutes on connection and foreground, and forwards non-step graph requests', async () => {
  mount(require('../index.ios').default);
  await act(async () => {
    await send({ method: 'CONNECT_TO_GOOGLE_FIT' });
    await foregroundListener('active');
    await send({
      method: 'GET_DATA_TO_GENERATE_GRAPH',
      type: 'calories',
      frequency: 'day',
      timestamp: day,
    });
  });

  expect(mockInject).toHaveBeenCalledWith(
    'window.updateFitnessPermissions(true,900,450)'
  );
  expect(mockInject).toHaveBeenCalledWith(
    'window.updateFitnessPermissions(true,1000,460)'
  );
  expect(NativeModules.VisitRnSdkViewManager.renderGraph).toHaveBeenCalledWith(
    { type: 'calories', frequency: 'day', timestamp: day },
    expect.any(Function)
  );
  expect(mockInject).toHaveBeenCalledWith('window.' + calorieGraph);
});
