import React, { useRef, useEffect, useMemo, useCallback } from 'react';
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
import {
  handleWebAction,
  readMessage,
  refreshCalorieCard,
  syncConfiguration,
  timestampOrNull,
  useWebDocument,
} from './webBridge';

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

const unescapeHTML = (str) =>
  // modified from underscore.string and string.js
  // eslint-disable-next-line no-useless-escape
  str.replace(/\&([^;]+);/g, (entity, entityCode) => {
    let match;

    if (entityCode in escapeChars) {
      return escapeChars[entityCode];
    } else if ((match = entityCode.match(/^#x([\da-fA-F]+)$/))) {
      return String.fromCharCode(parseInt(match[1], 16));
    } else if ((match = entityCode.match(/^#(\d+)$/))) {
      return String.fromCharCode(match[1]);
    } else {
      return entity;
    }
  });

const visitEvent = 'visit-event';

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

  const bridge = useWebDocument(source);
  const connecting = useRef(false);
  const connectionRevision = useRef(0);

  const sendUnsupported = useCallback(
    (document) => {
      bridge.inject(
        document,
        `if (typeof window.unsupportedHealthKitDevice === 'function') {
          window.unsupportedHealthKitDevice(true);
        } else {
          if (typeof window.healthConnectNotSupported === 'function') window.healthConnectNotSupported();
          if (typeof window.updateFitnessPermissions === 'function') window.updateFitnessPermissions(false,0,0);
        } true;`
      );
    },
    [bridge]
  );

  const refreshHealthKitPermissionState = useCallback(
    (document) => {
      if (!bridge.isCurrent(document) || connecting.current) return;
      return bridge.run(document, 'status', async () => {
        if (connecting.current) return;
        if (Platform.isPad) {
          sendUnsupported(document);
          return;
        }
        const revision = connectionRevision.current;
        try {
          const status =
            await VisitRnSdkViewManager.getHealthKitConnectStatus();
          if (
            revision !== connectionRevision.current ||
            !bridge.isCurrent(document)
          )
            return;
          if (status === 'NOT_SUPPORTED') {
            sendUnsupported(document);
            return;
          }
          if (status === 'CONNECTED') {
            const [steps, sleep] = await Promise.allSettled([
              VisitRnSdkViewManager.getTodayStepCount(),
              VisitRnSdkViewManager.getTodaySleepMinutes(),
            ]);
            if (revision !== connectionRevision.current) return;
            const stepCount =
              steps.status === 'fulfilled' ? Number(steps.value) || 0 : 0;
            const sleepMinutes =
              sleep.status === 'fulfilled' ? Number(sleep.value) || 0 : 0;
            bridge.inject(
              document,
              `window.updateFitnessPermissions(true,${stepCount},${sleepMinutes})`
            );
          } else if (status === 'INSTALLED') {
            bridge.inject(
              document,
              "if (typeof window.healthConnectAvailable === 'function') window.healthConnectAvailable(); true;"
            );
            bridge.inject(
              document,
              'window.updateFitnessPermissions(false,0,0)'
            );
          }
        } catch {
          if (isLoggingEnabled) console.warn('HealthKit status refresh failed');
        }
      });
    },
    [bridge, isLoggingEnabled, sendUnsupported, VisitRnSdkViewManager]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const document = bridge.current.current;
      if (source && nextAppState === 'active' && document?.fitnessReady) {
        refreshHealthKitPermissionState(document);
      }
    });
    return () => subscription.remove();
  }, [bridge, refreshHealthKitPermissionState, source]);

  const watchForDashboard = () => {
    const document = bridge.current.current;
    if (!document || document.fitnessReady || document.watchingDashboard)
      return;
    document.watchingDashboard = true;
    bridge.inject(
      document,
      `(function waitForDashboard(attempts) {
        if (typeof window.updateFitnessPermissions === 'function') {
          window.ReactNativeWebView.postMessage(JSON.stringify({ method: 'VISIT_FITNESS_READY', documentId: ${document.id} }));
        } else if (attempts > 0) {
          setTimeout(function () { waitForDashboard(attempts - 1); }, 100);
        }
      })(50); true;`
    );
  };

  const connect = async (document) => {
    if (Platform.isPad) {
      sendUnsupported(document);
      return;
    }
    if (connecting.current) return;
    connecting.current = true;
    connectionRevision.current++;
    document.fitnessReady = true;
    try {
      const result = await new Promise((resolve) => {
        VisitRnSdkViewManager.connectToAppleHealth(resolve);
      });
      if (!bridge.isCurrent(document)) return;
      if (result?.authStatus === 'GRANTED') {
        const steps = Number(result.numberOfSteps) || 0;
        const sleep = Number(result.sleepTime) || 0;
        bridge.inject(
          document,
          `window.updateFitnessPermissions(true,${steps},${sleep})`
        );
        if (document.syncConfiguration) {
          VisitRnSdkViewManager.updateApiUrl(document.syncConfiguration);
        }
        return;
      }

      bridge.inject(document, 'window.updateFitnessPermissions(false,0,0)');
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
                VisitRnSdkViewManager.openAppleHealthApp?.().catch(() => {
                  if (isLoggingEnabled)
                    console.warn('Could not open Apple Health settings');
                });
              },
            },
          ]
        );
      }
    } finally {
      connecting.current = false;
      const current = bridge.current.current;
      if (current !== document && current?.fitnessReady) {
        refreshHealthKitPermissionState(current);
      }
    }
  };

  const requestLocation = (document) =>
    bridge.run(document, 'location', async () => {
      let status;
      try {
        status = await VisitRnSdkViewManager.requestWebLocationPermission();
      } catch {
        if (isLoggingEnabled) console.warn('Location authorization failed');
      }
      if (!bridge.isCurrent(document)) return;
      bridge.inject(
        document,
        `window.checkTheGpsPermission(${status === 'GRANTED'})`
      );
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
              onPress: () => {
                Linking.openSettings().catch(() => {});
              },
            },
          ]
        );
      }
    });

  const handleMessage = async (event) => {
    const data = readMessage(event.nativeEvent.data, unescapeHTML);
    const document = bridge.current.current;
    if (!data || !bridge.isCurrent(document)) return;
    try {
      switch (data.method) {
        case 'UPDATE_PLATFORM':
          bridge.inject(document, 'window.setSdkPlatform("IOS")');
          break;
        case 'VISIT_FITNESS_READY':
          if (data.documentId !== document.id || document.fitnessReady) break;
          document.fitnessReady = true;
          await refreshHealthKitPermissionState(document);
          break;
        case 'GET_HEALTH_CONNECT_STATUS':
          document.fitnessReady = true;
          await refreshHealthKitPermissionState(document);
          break;
        case 'CONNECT_TO_GOOGLE_FIT':
          await connect(document);
          break;
        case 'GET_CALORIE_BURNED':
          if (!Platform.isPad)
            await refreshCalorieCard(bridge, document, VisitRnSdkViewManager);
          break;
        case 'GET_DATA_TO_GENERATE_GRAPH': {
          const { type, frequency } = data;
          if (typeof type !== 'string' || typeof frequency !== 'string') break;
          const timestamp = timestampOrNull(data.timestamp) ?? Date.now();
          VisitRnSdkViewManager.renderGraph(
            { type, frequency, timestamp },
            (err, results) => {
              if (!err && results?.[0])
                bridge.inject(document, `window.${results[0]}`);
            }
          );
          break;
        }
        case 'UPDATE_API_BASE_URL': {
          const configuration = syncConfiguration(data);
          if (configuration) {
            document.syncConfiguration = configuration;
            VisitRnSdkViewManager.updateApiUrl(configuration);
          }
          break;
        }
        case 'GET_LOCATION_PERMISSIONS':
          await requestLocation(document);
          break;
        default:
          await handleWebAction(data, VisitRnSdkViewManager, bridge, document);
      }
    } catch {
      if (isLoggingEnabled)
        console.warn('Could not handle Visit WebView request');
    }
  };

  const { height, width } = Dimensions.get('screen');
  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white', height, width }}>
      {source ? (
        <WebView
          key={source}
          ref={bridge.webviewRef}
          source={{ uri: source }}
          style={styles.webView}
          javascriptEnabled
          onMessage={handleMessage}
          onLoadStart={bridge.reset}
          onLoad={watchForDashboard}
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
