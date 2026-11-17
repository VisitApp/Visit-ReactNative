import React, {
  useRef,
  useEffect,
  useState,
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

  const webviewRef = useRef(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const refreshHealthKitPermissionState = useCallback(async () => {
    try {
      const status = await VisitRnSdkViewManager?.getHealthKitConnectStatus?.();

      if (isLoggingEnabled) {
        console.log('getHealthKitConnectStatus on foreground: ', status);
      }

      if (status === 'NOT_SUPPORTED') {
        webviewRef.current?.injectJavaScript(
          'window.unsupportedHealthKitDevice(true)'
        );
        return;
      }

      if (status === 'CONNECTED') {
        const [steps, sleep] = await Promise.allSettled([
          VisitRnSdkViewManager?.getTodayStepCount?.(),
          VisitRnSdkViewManager?.getTodaySleepMinutes?.(),
        ]);
        const stepCount =
          steps.status === 'fulfilled' ? Number(steps.value) || 0 : 0;
        const sleepMinutes =
          sleep.status === 'fulfilled' ? Number(sleep.value) || 0 : 0;
        webviewRef.current?.injectJavaScript(
          `window.updateFitnessPermissions(true,${stepCount},${sleepMinutes})`
        );
        return;
      }

      webviewRef.current?.injectJavaScript(
        'window.updateFitnessPermissions(false,0,0)'
      );
    } catch (err) {
      if (isLoggingEnabled) {
        console.warn('refreshHealthKitPermissionState failed: ', err?.message);
      }
    }
  }, [VisitRnSdkViewManager, isLoggingEnabled]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        refreshHealthKitPermissionState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshHealthKitPermissionState]);

  const handleMessage = async (event) => {
    const data = JSON.parse(unescapeHTML(event.nativeEvent.data));
    const {
      method,
      type,
      frequency,
      timestamp,
      apiBaseUrl,
      authtoken,
      googleFitLastSync,
      gfHourlyLastSync,
      url,
    } = data;
    console.log('handleMessage data is', data);
    console.log(unescapeHTML(event.nativeEvent.data));
    switch (method) {
      case 'UPDATE_PLATFORM':
        webviewRef.current?.injectJavaScript('window.setSdkPlatform("IOS")');
        break;
      case 'CONNECT_TO_GOOGLE_FIT':
        if (Platform.isPad) {
          console.log('unsupportedHealthKitDevice triggered');
          webviewRef.current?.injectJavaScript(
            'window.unsupportedHealthKitDevice(true)'
          );
        } else {
          VisitRnSdkViewManager?.connectToAppleHealth((res) => {
            const authStatus = res?.authStatus;
            const steps = Number(res?.numberOfSteps) || 0;
            const sleep = Number(res?.sleepTime) || 0;

            if (authStatus === 'GRANTED') {
              webviewRef.current?.injectJavaScript(
                `window.updateFitnessPermissions(true,${steps},${sleep})`
              );
              return;
            }

            // Denied / unavailable: tell the WebView permission isn't granted
            // and offer to open the Apple Health app so the user can toggle
            // it manually (mirrors Android's Health Connect flow).
            webviewRef.current?.injectJavaScript(
              'window.updateFitnessPermissions(false,0,0)'
            );

            if (authStatus === 'DENIED') {
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
                      VisitRnSdkViewManager?.openAppleHealthApp?.().catch(
                        (err) =>
                          console.log(
                            'openAppleHealthApp failed:',
                            err?.message
                          )
                      );
                    },
                  },
                ]
              );
            }
          });
        }
        break;
      case 'GET_DATA_TO_GENERATE_GRAPH':
        VisitRnSdkViewManager?.renderGraph(
          { type, frequency, timestamp },
          (err, results) => {
            if (err) {
              console.log('error initializing Healthkit: ', err);
              return;
            }
            if (results[0]) {
              console.log('results initializing Healthkit: ', results[0]);
              webviewRef.current?.injectJavaScript(`window.${results[0]}`);
            }
          }
        );
        break;
      case 'UPDATE_API_BASE_URL':
        if (!hasLoadedOnce) {
          VisitRnSdkViewManager?.updateApiUrl({
            apiBaseUrl,
            authToken: authtoken,
            googleFitLastSync,
            gfHourlyLastSync,
          });
          setHasLoadedOnce(true);
        }
        break;

      case 'OPEN_PDF':
        Linking.openURL(url);
        break;
      case 'OPEN_FACE_SCAN_FLOW':
        EventRegister.emitEvent('visit-event', {
          message: 'OPEN_FACE_SCAN_FLOW',
        });
        break;
      case 'CLOSE_VIEW':
        break;
      case 'GET_LOCATION_PERMISSIONS':
        webviewRef.current?.injectJavaScript(
          'window.checkTheGpsPermission(true)'
        );
        break;

      default:
        break;
    }
  };

  const { height, width } = Dimensions.get('screen');
  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white', height, width }}>
      {source ? (
        <WebView
          ref={webviewRef}
          source={{ uri: source }}
          style={styles.webView}
          javascriptEnabled
          onMessage={handleMessage}
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
