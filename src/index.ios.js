import React, {
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  StyleSheet,
  SafeAreaView,
  NativeModules,
  Linking,
  Platform,
  Dimensions,
  Alert,
  AppState,
} from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import { WebView } from 'react-native-webview';

const LINKING_ERROR =
  `The package 'react-native-visit-rn-sdk' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const escapeChars = {
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  amp: '&',
};

function decodeEntity(entity) {
  if (Object.prototype.hasOwnProperty.call(escapeChars, entity)) {
    return escapeChars[entity];
  }
  if (!entity.startsWith('#')) return null;

  const isHex = entity.startsWith('#x');
  const digits = entity.slice(isHex ? 2 : 1);
  const alphabet = isHex ? '0123456789abcdef' : '0123456789';
  if (
    !digits ||
    !Array.from(digits.toLowerCase()).every((digit) => alphabet.includes(digit))
  ) {
    return null;
  }
  return String.fromCharCode(Number.parseInt(digits, isHex ? 16 : 10));
}

function unescapeHTML(text) {
  let decoded = '';
  let cursor = 0;
  let start = text.indexOf('&');
  while (start !== -1) {
    const end = text.indexOf(';', start + 1);
    if (end === -1) break;
    decoded += text.slice(cursor, start);
    decoded +=
      decodeEntity(text.slice(start + 1, end)) ?? text.slice(start, end + 1);
    cursor = end + 1;
    start = text.indexOf('&', cursor);
  }
  return decoded + text.slice(cursor);
}

const visitEvent = 'visit-event';

function readTimestamp(value, fallback) {
  const timestamp =
    typeof value === 'string' ? Number(value.trim() || NaN) : value;
  return Number.isSafeInteger(timestamp) &&
    Math.abs(timestamp) <= 8640000000000000
    ? timestamp
    : fallback;
}

/** @param {{ ssoURL: string, isLoggingEnabled?: boolean }} props */
const VisitRnSdkView = ({ ssoURL, isLoggingEnabled = false }) => {
  const source = ssoURL?.trim();
  const VisitRnSdkViewManager = useMemo(
    () =>
      NativeModules.VisitRnSdkViewManager
        ? NativeModules.VisitRnSdkViewManager
        : new Proxy(
            {},
            {
              get() {
                throw new Error(LINKING_ERROR);
              },
            }
          ),
    []
  );

  const webView = useRef(null);
  const currentPage = useRef(null);
  const connecting = useRef(false);
  const connectionRevision = useRef(0);
  const locationRequestInFlight = useRef(false);

  const resetPage = useCallback(() => {
    currentPage.current = {};
  }, []);

  useLayoutEffect(() => {
    resetPage();
    return () => {
      currentPage.current = null;
    };
  }, [resetPage, source]);

  const inject = useCallback((page, script) => {
    if (page === currentPage.current) webView.current?.injectJavaScript(script);
  }, []);

  const logMessageError = useCallback(() => {
    if (isLoggingEnabled)
      console.warn('Could not handle Visit WebView request');
  }, [isLoggingEnabled]);

  const sendUnsupported = useCallback(
    (page) => {
      inject(
        page,
        `if (typeof window.unsupportedHealthKitDevice === 'function') {
          window.unsupportedHealthKitDevice(true);
        } else {
          if (typeof window.healthConnectNotSupported === 'function') window.healthConnectNotSupported();
          if (typeof window.updateFitnessPermissions === 'function') window.updateFitnessPermissions(false,0,0);
        } true;`
      );
    },
    [inject]
  );

  const refreshHealthKitPermissionState = useCallback(
    async (page) => {
      if (connecting.current || page.statusPending) return;
      if (Platform.isPad) {
        sendUnsupported(page);
        return;
      }

      page.statusPending = true;
      const revision = connectionRevision.current;
      try {
        const status = await VisitRnSdkViewManager.getHealthKitConnectStatus();
        if (
          page !== currentPage.current ||
          revision !== connectionRevision.current
        ) {
          return;
        }
        if (status === 'NOT_SUPPORTED') {
          sendUnsupported(page);
        } else if (status === 'CONNECTED') {
          const [steps, sleep] = await Promise.allSettled([
            VisitRnSdkViewManager.getTodayStepCount(),
            VisitRnSdkViewManager.getTodaySleepMinutes(),
          ]);
          if (revision !== connectionRevision.current) return;
          inject(
            page,
            `window.updateFitnessPermissions(true,${Number(steps.value) || 0},${
              Number(sleep.value) || 0
            })`
          );
        } else if (status === 'INSTALLED') {
          inject(
            page,
            "if (typeof window.healthConnectAvailable === 'function') window.healthConnectAvailable(); true;"
          );
          inject(page, 'window.updateFitnessPermissions(false,0,0)');
        }
      } finally {
        page.statusPending = false;
      }
    },
    [inject, sendUnsupported, VisitRnSdkViewManager]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const page = currentPage.current;
      if (source && nextAppState === 'active' && page?.fitnessRequested) {
        refreshHealthKitPermissionState(page).catch(logMessageError);
      }
    });
    return () => subscription.remove();
  }, [logMessageError, refreshHealthKitPermissionState, source]);

  const connect = async (page) => {
    if (Platform.isPad) {
      sendUnsupported(page);
      return;
    }
    if (connecting.current) return;
    connecting.current = true;
    connectionRevision.current++;
    page.fitnessRequested = true;
    try {
      const result = await new Promise((resolve) => {
        VisitRnSdkViewManager.connectToAppleHealth(resolve);
      });
      if (page !== currentPage.current) return;
      if (result?.authStatus === 'GRANTED') {
        const steps = Number(result.numberOfSteps) || 0;
        const sleep = Number(result.sleepTime) || 0;
        inject(page, `window.updateFitnessPermissions(true,${steps},${sleep})`);
        if (page.syncConfiguration) {
          VisitRnSdkViewManager.updateApiUrl(page.syncConfiguration);
        }
        return;
      }

      inject(page, 'window.updateFitnessPermissions(false,0,0)');
      if (result?.authStatus === 'DENIED') {
        Alert.alert(
          'Permission Denied',
          'To allow permission, please follow these steps:\n\n' +
            '1. Open Settings\n' +
            '2. Tap on Apps → Health\n' +
            '3. Tap Data Access & Devices\n' +
            '4. Select this app and enable all categories',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                VisitRnSdkViewManager.openAppleHealthApp?.().catch(
                  logMessageError
                );
              },
            },
          ]
        );
      }
    } finally {
      connecting.current = false;
      const current = currentPage.current;
      if (current !== page && current?.fitnessRequested) {
        refreshHealthKitPermissionState(current).catch(logMessageError);
      }
    }
  };

  const requestLocation = async (page) => {
    if (locationRequestInFlight.current) return;
    locationRequestInFlight.current = true;
    let status;
    try {
      status = await VisitRnSdkViewManager.requestWebLocationPermission();
    } finally {
      locationRequestInFlight.current = false;
      inject(page, `window.checkTheGpsPermission(${status === 'GRANTED'})`);
    }
    if (page !== currentPage.current) return;
    if (status === 'SERVICES_DISABLED') {
      Alert.alert(
        'Turn on Location Services',
        'Open Settings → Privacy & Security → Location Services, then try again.'
      );
    } else if (status === 'DENIED') {
      Alert.alert(
        'Allow Location Access',
        'Allow location access in Settings, then try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings().catch(logMessageError),
          },
        ]
      );
    }
  };

  const handleMessage = async (event) => {
    const page = currentPage.current;
    if (!page) return;

    try {
      const raw = event.nativeEvent.data;
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        data = JSON.parse(unescapeHTML(raw));
      }
      const method = data?.method ?? data?.name;
      switch (method) {
        case 'UPDATE_PLATFORM':
          inject(page, 'window.setSdkPlatform("IOS")');
          break;
        case 'GET_HEALTH_CONNECT_STATUS':
          page.fitnessRequested = true;
          await refreshHealthKitPermissionState(page);
          break;
        case 'CONNECT_TO_GOOGLE_FIT':
          await connect(page);
          break;
        case 'GET_CALORIE_BURNED': {
          if (Platform.isPad) break;
          const calories = await VisitRnSdkViewManager.getTodayCaloriesForWeb();
          if (Number.isFinite(calories)) {
            inject(
              page,
              `if (typeof window.updateCalorieBurned === 'function') window.updateCalorieBurned(${calories}); true;`
            );
          }
          break;
        }
        case 'GET_DATA_TO_GENERATE_GRAPH': {
          const { type, frequency } = data;
          if (typeof type !== 'string' || typeof frequency !== 'string') break;
          const timestamp = readTimestamp(data.timestamp, Date.now());
          VisitRnSdkViewManager.renderGraph(
            { type, frequency, timestamp },
            (err, results) => {
              if (!err && results?.[0]) inject(page, `window.${results[0]}`);
            }
          );
          break;
        }
        case 'UPDATE_API_BASE_URL': {
          const apiBaseUrl = data.apiBaseUrl?.trim();
          const authToken = data.authtoken ?? data.authToken;
          if (!apiBaseUrl || !authToken?.trim()) {
            break;
          }
          page.syncConfiguration = {
            apiBaseUrl,
            authToken,
            googleFitLastSync: Math.max(
              -1,
              readTimestamp(data.googleFitLastSync, -1)
            ),
            gfHourlyLastSync: Math.max(
              -1,
              readTimestamp(data.gfHourlyLastSync, -1)
            ),
          };
          VisitRnSdkViewManager.updateApiUrl(page.syncConfiguration);
          break;
        }
        case 'GET_LOCATION_PERMISSIONS':
          await requestLocation(page);
          break;
        case 'CLOSE_VIEW':
        case 'OPEN_FACE_SCAN_FLOW':
          EventRegister.emitEvent(visitEvent, { message: method });
          break;
        case 'OPEN_PDF':
          if (data.url) await Linking.openURL(data.url);
          break;
        case 'OPEN_DAILER': {
          const value = data.number;
          if (typeof value !== 'string' && !Number.isSafeInteger(value)) break;
          const number =
            typeof value === 'string'
              ? Array.from(value)
                  .filter(
                    (character) =>
                      character.trim() && !'()-'.includes(character)
                  )
                  .join('')
              : String(value);
          const digits = number.startsWith('+') ? number.slice(1) : number;
          if (
            digits &&
            Array.from(digits).every((digit) => digit >= '0' && digit <= '9')
          ) {
            await Linking.openURL(`tel:${number}`);
          }
          break;
        }
        case 'DOWNLOAD_PDF': {
          const link = data.link?.trim();
          if (link) {
            await VisitRnSdkViewManager.downloadAndShare(
              link,
              typeof data.authToken === 'string' ? data.authToken : null
            );
          }
          break;
        }
      }
    } catch {
      logMessageError();
    }
  };

  const { height, width } = Dimensions.get('screen');
  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white', height, width }}>
      {source ? (
        <WebView
          key={source}
          ref={webView}
          source={{ uri: source }}
          style={styles.webView}
          javascriptEnabled
          onMessage={handleMessage}
          onLoadStart={resetPage}
          onError={(errorMessage) => {
            EventRegister.emitEvent(visitEvent, {
              message: 'web-view-error',
              errorMessage: errorMessage,
            });
            if (isLoggingEnabled) {
              console.warn('Webview error: ', errorMessage);
            }
          }}
        />
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  webViewContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  webView: {
    flex: 1,
  },
});

export default VisitRnSdkView;
