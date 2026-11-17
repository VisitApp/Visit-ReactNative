import React from 'react';
import {
  Alert,
  AppState,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { act, create } from 'react-test-renderer';
import { WebView } from 'react-native-webview';

const mockInject = jest.fn();
const mockEnsureLocationSettings = jest.fn();

jest.mock('react-native-webview', () => {
  const react = require('react');
  const MockWebView = react.forwardRef((props, ref) => {
    react.useImperativeHandle(ref, () => ({ injectJavaScript: mockInject }));
    return react.createElement('MockWebView', props);
  });
  return { __esModule: true, default: MockWebView, WebView: MockWebView };
});

jest.mock(
  '@visit-health/react-native-location-enabler',
  () => ({
    PRIORITIES: { HIGH_ACCURACY: 1 },
    ensureLocationSettings: mockEnsureLocationSettings,
  }),
  { virtual: true }
);
jest.mock('react-native-event-listeners', () => ({ EventRegister: {} }), {
  virtual: true,
});

const sleepGraph = 'DetailedGraph.updateDailySleep(1000,2000)';
const calorieGraph = "DetailedGraph.updateData([1],[123],'calories','day','0')";
const day = 1770000000000;
const { ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION } =
  PermissionsAndroid.PERMISSIONS;
const { GRANTED, DENIED, NEVER_ASK_AGAIN } = PermissionsAndroid.RESULTS;
const locationRequest = { method: 'GET_LOCATION_PERMISSIONS' };

let app;
let foregroundListener;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
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

it.each([
  [true, true],
  [true, false],
  [false, true],
  [false, false],
])(
  'completes location in one request with initial app permission %s and device location %s',
  async (appPermissionGranted, deviceLocationEnabled) => {
    const check = jest
      .spyOn(PermissionsAndroid, 'check')
      .mockResolvedValue(appPermissionGranted);
    let grantPermission;
    const requestPermissions = jest
      .spyOn(PermissionsAndroid, 'requestMultiple')
      .mockReturnValue(
        new Promise((resolve) => {
          grantPermission = () =>
            resolve({
              [ACCESS_COARSE_LOCATION]: GRANTED,
              [ACCESS_FINE_LOCATION]: GRANTED,
            });
        })
      );
    let enableLocation;
    mockEnsureLocationSettings.mockImplementationOnce(() =>
      deviceLocationEnabled
        ? Promise.resolve(true)
        : new Promise((resolve) => {
            enableLocation = () => resolve(true);
          })
    );

    mount(require('../index.android').default);
    mockInject.mockImplementationOnce(() => {
      expect(app.root.findByType(WebView).props.geolocationEnabled).toBe(true);
    });
    let request;
    await act(async () => {
      request = send(locationRequest);
    });
    expect(check).toHaveBeenCalledWith(ACCESS_FINE_LOCATION);

    if (appPermissionGranted) {
      expect(requestPermissions).not.toHaveBeenCalled();
    } else {
      expect(requestPermissions).toHaveBeenCalledWith([
        ACCESS_COARSE_LOCATION,
        ACCESS_FINE_LOCATION,
      ]);
      expect(mockEnsureLocationSettings).not.toHaveBeenCalled();
      expect(mockInject).not.toHaveBeenCalled();
      expect(app.root.findByType(WebView).props.geolocationEnabled).toBe(false);
      await act(async () => grantPermission());
    }

    expect(mockEnsureLocationSettings).toHaveBeenCalledTimes(1);
    if (!deviceLocationEnabled) {
      expect(mockInject).not.toHaveBeenCalled();
      await act(async () => enableLocation());
    }
    await request;
    expect(mockInject.mock.calls).toEqual([
      ['window.checkTheGpsPermission(true)'],
    ]);
  }
);

it.each([
  ['approximate access only', GRANTED, DENIED],
  ['denial', DENIED, DENIED],
  ['permanently blocked permission', DENIED, NEVER_ASK_AGAIN],
])(
  'returns false without opening device settings after %s',
  async (_, coarse, fine) => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
      [ACCESS_COARSE_LOCATION]: coarse,
      [ACCESS_FINE_LOCATION]: fine,
    });
    let cancelAlert;
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation((_title, _message, buttons) => {
        cancelAlert = buttons[0].onPress;
      });
    mount(require('../index.android').default);

    let request;
    await act(async () => {
      request = send(locationRequest);
    });
    if (fine === NEVER_ASK_AGAIN) {
      expect(mockInject).not.toHaveBeenCalled();
      await act(async () => send(locationRequest));
      expect(alert).toHaveBeenCalledTimes(1);
      await act(async () => cancelAlert());
    }
    await request;

    expect(mockEnsureLocationSettings).not.toHaveBeenCalled();
    expect(app.root.findByType(WebView).props.geolocationEnabled).toBe(false);
    expect(mockInject.mock.calls).toEqual([
      ['window.checkTheGpsPermission(false)'],
    ]);
    expect(alert).toHaveBeenCalledTimes(fine === NEVER_ASK_AGAIN ? 1 : 0);
  }
);

it('coalesces repeated taps through both prompts and allows a retry after GPS cancellation', async () => {
  let permissionGranted = false;
  const check = jest
    .spyOn(PermissionsAndroid, 'check')
    .mockImplementation(async () => permissionGranted);
  let grantPermission;
  const requestPermissions = jest
    .spyOn(PermissionsAndroid, 'requestMultiple')
    .mockReturnValueOnce(
      new Promise((resolve) => {
        grantPermission = () => {
          permissionGranted = true;
          resolve({ [ACCESS_FINE_LOCATION]: GRANTED });
        };
      })
    );
  let cancelGps;
  mockEnsureLocationSettings
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          cancelGps = () => resolve(false);
        })
    )
    .mockResolvedValueOnce(true);
  mount(require('../index.android').default);

  let firstRequest;
  await act(async () => {
    firstRequest = send(locationRequest);
    await send(locationRequest);
  });
  expect(requestPermissions).toHaveBeenCalledTimes(1);
  expect(mockEnsureLocationSettings).not.toHaveBeenCalled();

  await act(async () => {
    grantPermission();
    await send(locationRequest);
  });
  expect(check).toHaveBeenCalledTimes(2);
  expect(mockEnsureLocationSettings).toHaveBeenCalledTimes(1);
  expect(mockInject).not.toHaveBeenCalled();

  await act(async () => {
    cancelGps();
    await firstRequest;
  });
  await act(async () => send(locationRequest));
  expect(requestPermissions).toHaveBeenCalledTimes(1);
  expect(mockInject.mock.calls).toEqual([
    ['window.checkTheGpsPermission(false)'],
    ['window.checkTheGpsPermission(true)'],
  ]);
});

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
