import React from 'react';
import { readFileSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { runInNewContext } from 'vm';
import {
  Alert,
  AppState,
  Linking,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { act, create } from 'react-test-renderer';
import { WebView } from 'react-native-webview';

const mockInject = jest.fn();
const mockEnsureLocationSettings = jest.fn();
const mockEmit = jest.fn();

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
jest.mock(
  'react-native-event-listeners',
  () => ({ EventRegister: { emitEvent: mockEmit } }),
  { virtual: true }
);

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
    updateApiBaseUrl: jest
      .fn()
      .mockResolvedValue('Sync configuration accepted'),
    getTodayCaloriesForWeb: jest.fn().mockResolvedValue(234),
    downloadAndShare: jest.fn().mockResolvedValue(null),
  };
  NativeModules.VisitRnSdkViewManager = {
    connectToAppleHealth: jest.fn((callback) =>
      callback({ authStatus: 'GRANTED', numberOfSteps: 900, sleepTime: 450 })
    ),
    getHealthKitConnectStatus: jest.fn().mockResolvedValue('CONNECTED'),
    getTodayStepCount: jest.fn().mockResolvedValue(1000),
    getTodaySleepMinutes: jest.fn().mockResolvedValue(460),
    renderGraph: jest.fn((_, callback) => callback(null, [calorieGraph])),
    updateApiUrl: jest.fn(),
    getTodayCaloriesForWeb: jest.fn().mockResolvedValue(234),
    requestWebLocationPermission: jest.fn().mockResolvedValue('GRANTED'),
    downloadAndShare: jest.fn().mockResolvedValue(null),
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
    expect.stringContaining('window.unsupportedHealthKitDevice(true)')
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

function openFixture() {
  const nodes = {};
  const node = (id) => (nodes[id] ??= { textContent: '' });
  const buttons = [];
  node('actions').appendChild = (button) => buttons.push(button);
  node('legacy').checked = true;
  node('metric').value = 'calories';
  node('range').value = 'day';
  node('document').value = 'https://example.test/report.pdf';
  node('token').value = 'test-token';
  const messages = [];
  const window = {
    ReactNativeWebView: {
      postMessage: (data) => messages.push(JSON.parse(data)),
    },
  };
  const html = readFileSync(
    resolvePath(__dirname, '../../example/fixtures/webview/index.html'),
    'utf8'
  );
  const scriptStart = html.indexOf('<script>') + '<script>'.length;
  const scriptEnd = html.indexOf('</script>', scriptStart);
  const fixtureScript = html.slice(scriptStart, scriptEnd);
  runInNewContext(fixtureScript, {
    window,
    document: { getElementById: node, createElement: () => ({}) },
  });
  return { nodes, buttons, window, messages };
}

it.each(['android', 'ios'])(
  'routes the ten Flutter fixture actions and executes the %s callbacks',
  async (platform) => {
    const View =
      platform === 'ios'
        ? require('../index.ios').default
        : require('../index.android').default;
    const native =
      platform === 'ios'
        ? NativeModules.VisitRnSdkViewManager
        : NativeModules.VisitFitnessModule;
    const linking = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true);
    mockEnsureLocationSettings.mockResolvedValue(true);
    mount(View);
    const fixture = openFixture();
    expect(fixture.buttons).toHaveLength(10);
    for (const button of fixture.buttons) {
      button.onclick();
      await act(async () => {
        await send(fixture.messages.shift());
      });
    }
    for (const [script] of mockInject.mock.calls) {
      runInNewContext(script, { window: fixture.window });
    }
    const log = fixture.nodes.log.textContent;
    expect(log).toContain(`setSdkPlatform ["${platform.toUpperCase()}"]`);
    expect(log).toContain('updateCalorieBurned [234]');
    expect(log).toContain('updateFitnessPermissions [true,900,450]');
    expect(log).toContain(
      'DetailedGraph.updateData [[1],[123],"calories","day","0"]'
    );
    expect(log).toContain('checkTheGpsPermission [true]');
    expect(native.downloadAndShare).toHaveBeenCalledWith(
      'https://example.test/report.pdf',
      'test-token'
    );
    expect(linking).toHaveBeenCalledWith('tel:5550100');
    expect(mockEmit).toHaveBeenCalledWith('visit-event', {
      message: 'CLOSE_VIEW',
    });
    if (platform === 'ios') {
      expect(native.updateApiUrl).toHaveBeenCalledWith({
        apiBaseUrl: 'https://example.invalid',
        authToken: 'synthetic',
        googleFitLastSync: -1,
        gfHourlyLastSync: -1,
      });
    } else {
      expect(native.updateApiBaseUrl).toHaveBeenCalledWith(
        'https://example.invalid',
        'synthetic',
        -1,
        -1
      );
    }
  }
);

it.each(['android', 'ios'])(
  'forwards the %s sync URL without validating its format',
  async (platform) => {
    const message = {
      method: 'UPDATE_API_BASE_URL',
      apiBaseUrl: '  malformed base address  ',
      authToken: 'test-token',
      googleFitLastSync: String(day),
      gfHourlyLastSync: null,
    };
    const View =
      platform === 'ios'
        ? require('../index.ios').default
        : require('../index.android').default;
    mount(View);
    await act(async () => {
      await send(message);
    });
    if (platform === 'ios') {
      expect(
        NativeModules.VisitRnSdkViewManager.updateApiUrl
      ).toHaveBeenCalledWith({
        apiBaseUrl: 'malformed base address',
        authToken: 'test-token',
        googleFitLastSync: day,
        gfHourlyLastSync: -1,
      });
    } else {
      expect(
        NativeModules.VisitFitnessModule.updateApiBaseUrl
      ).toHaveBeenCalledWith('malformed base address', 'test-token', day, -1);
    }
  }
);

it.each(['android', 'ios'])(
  'opens the %s dialer for a formatted number with a country code',
  async (platform) => {
    const View =
      platform === 'ios'
        ? require('../index.ios').default
        : require('../index.android').default;
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    mount(View);
    await act(async () => {
      await send({ name: 'OPEN_DAILER', number: ' +1 (555)\t0100 ' });
      await send({ name: 'OPEN_DAILER', number: '+15550100;123' });
      await send({ name: 'OPEN_DAILER', number: -123 });
    });
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL).toHaveBeenCalledWith('tel:+15550100');
  }
);

it('decodes named and numeric entities in an escaped iOS message once', async () => {
  mount(require('../index.ios').default);
  await act(async () => {
    await app.root.findByType(WebView).props.onMessage({
      nativeEvent: {
        data:
          '{&quot;name&quot;:&quot;DOWNLOAD_PDF&quot;,' +
          '&quot;link&quot;:&quot;https://example.test/report.pdf&quot;,' +
          '&quot;authToken&quot;:&quot;&#65;&#x42;&amp;quot;&unknown;&quot;}',
      },
    });
  });
  expect(
    NativeModules.VisitRnSdkViewManager.downloadAndShare
  ).toHaveBeenCalledWith(
    'https://example.test/report.pdf',
    'AB&quot;&unknown;'
  );
});

it.each(['android', 'ios'])(
  'keeps %s graph results separate and drops results from a previous SSO',
  async (platform) => {
    const pending = {};
    let View;
    if (platform === 'ios') {
      View = require('../index.ios').default;
      NativeModules.VisitRnSdkViewManager.renderGraph.mockImplementation(
        ({ type }, callback) => {
          pending[type] = (graph) => callback(null, [graph]);
        }
      );
    } else {
      View = require('../index.android').default;
      NativeModules.VisitFitnessModule.requestActivityDataFromHealthConnect.mockImplementation(
        (type) =>
          new Promise((resolve) => {
            pending[type] = resolve;
          })
      );
    }
    const graphRequest = (type) =>
      send({ name: 'GET_DATA_TO_GENERATE_GRAPH', type, frequency: 'day' });
    mount(View);

    let requests;
    await act(async () => {
      requests = ['sleep', 'calories', 'steps'].map(graphRequest);
    });
    await act(async () => {
      pending.calories(calorieGraph);
      await requests[1];
      pending.sleep(sleepGraph);
      await requests[0];
    });
    act(() => app.update(<View ssoURL="https://example.test/next-sso" />));
    await act(async () => {
      pending.steps('DetailedGraph.updateData([],[])');
      await requests[2];
    });
    expect(mockInject.mock.calls).toEqual([
      [`window.${calorieGraph}`],
      [`window.${sleepGraph}`],
    ]);
  }
);

it.each(['android', 'ios'])(
  'handles a rejected PDF download on %s without interrupting the next action',
  async (platform) => {
    const View =
      platform === 'ios'
        ? require('../index.ios').default
        : require('../index.android').default;
    const native =
      platform === 'ios'
        ? NativeModules.VisitRnSdkViewManager
        : NativeModules.VisitFitnessModule;
    native.downloadAndShare.mockRejectedValueOnce(new Error('Download failed'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mount(View);
    await act(async () => {
      await send({
        name: 'DOWNLOAD_PDF',
        link: 'https://example.test/test.pdf',
      });
      await send({ method: 'CLOSE_VIEW' });
    });
    expect(native.downloadAndShare).toHaveBeenCalledWith(
      'https://example.test/test.pdf',
      null
    );
    expect(alert).not.toHaveBeenCalled();
    expect(mockEmit).toHaveBeenCalledWith('visit-event', {
      message: 'CLOSE_VIEW',
    });
  }
);

it('refreshes an already-connected iOS dashboard on every reopen from the Flutter status message', async () => {
  const View = require('../index.ios').default;
  const native = NativeModules.VisitRnSdkViewManager;
  for (let opening = 0; opening < 2; opening++) {
    if (opening > 0) act(() => app.unmount());
    mount(View);
    act(() => app.root.findByType(WebView).props.onLoadStart());
    expect(native.getHealthKitConnectStatus).toHaveBeenCalledTimes(opening);
    await act(async () => {
      await send({ name: 'GET_HEALTH_CONNECT_STATUS' });
    });
    expect(mockInject).toHaveBeenLastCalledWith(
      'window.updateFitnessPermissions(true,1000,460)'
    );
  }
  expect(native.getHealthKitConnectStatus).toHaveBeenCalledTimes(2);
  expect(native.connectToAppleHealth).not.toHaveBeenCalled();
});

it('coalesces iOS status queries and drops the result when a new SSO loads', async () => {
  const View = require('../index.ios').default;
  const native = NativeModules.VisitRnSdkViewManager;
  let finish;
  native.getHealthKitConnectStatus.mockReturnValueOnce(
    new Promise((resolveStatus) => {
      finish = resolveStatus;
    })
  );
  mount(View);
  let requests;
  await act(async () => {
    requests = [
      send({ method: 'GET_HEALTH_CONNECT_STATUS' }),
      send({ name: 'GET_HEALTH_CONNECT_STATUS' }),
    ];
  });
  expect(native.getHealthKitConnectStatus).toHaveBeenCalledTimes(1);
  act(() => app.update(<View ssoURL="https://example.test/next-sso" />));
  await act(async () => {
    finish('CONNECTED');
    await Promise.all(requests);
  });
  expect(mockInject).not.toHaveBeenCalled();
});

it('reports iOS denied location and distinguishes valid zero calories from an empty read', async () => {
  const native = NativeModules.VisitRnSdkViewManager;
  native.requestWebLocationPermission.mockResolvedValue('DENIED');
  native.getTodayCaloriesForWeb
    .mockResolvedValueOnce(0)
    .mockResolvedValueOnce(null);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mount(require('../index.ios').default);
  await act(async () => {
    await send({ name: 'GET_LOCATION_PERMISSIONS' });
    await send({ name: 'GET_CALORIE_BURNED' });
    await send({ name: 'GET_CALORIE_BURNED' });
  });
  expect(alert).toHaveBeenCalledTimes(1);
  expect(mockInject).toHaveBeenCalledWith(
    'window.checkTheGpsPermission(false)'
  );
  expect(
    mockInject.mock.calls.filter(([script]) =>
      script.includes('updateCalorieBurned')
    )
  ).toEqual([[expect.stringContaining('window.updateCalorieBurned(0)')]]);
});

it('discards stale Android status when Connect granted during a status read', async () => {
  const native = NativeModules.VisitFitnessModule;
  let finishOldStatus;
  native.getHealthConnectStatus.mockReturnValueOnce(
    new Promise((resolveStatus) => {
      finishOldStatus = resolveStatus;
    })
  );
  mount(require('../index.android').default);
  let old;
  await act(async () => {
    old = send({ method: 'GET_HEALTH_CONNECT_STATUS' });
  });
  await act(async () => {
    await send({ method: 'CONNECT_TO_GOOGLE_FIT' });
    finishOldStatus('INSTALLED');
    await old;
  });
  expect(mockInject).toHaveBeenCalledTimes(1);
  expect(mockInject).toHaveBeenCalledWith(
    'window.updateFitnessPermissions(true,900,450)'
  );
});

it('accepts fresh iOS sync credentials after an SSO change and safely normalizes cursors', async () => {
  const View = require('../index.ios').default;
  const native = NativeModules.VisitRnSdkViewManager;
  mount(View);
  const credentials = {
    name: 'UPDATE_API_BASE_URL',
    apiBaseUrl: 'https://example.test',
    authtoken: 'old-token',
    googleFitLastSync: '1770000000000',
    gfHourlyLastSync: null,
  };
  await act(async () => {
    await send(credentials);
  });
  act(() => app.update(<View ssoURL="https://example.test/next" />));
  await act(async () => {
    await send({ ...credentials, authtoken: 'new-token' });
  });
  expect(native.updateApiUrl).toHaveBeenCalledTimes(2);
  expect(native.updateApiUrl).toHaveBeenLastCalledWith({
    apiBaseUrl: 'https://example.test',
    authToken: 'new-token',
    googleFitLastSync: day,
    gfHourlyLastSync: -1,
  });
});
