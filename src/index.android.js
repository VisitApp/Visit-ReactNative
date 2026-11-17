import React, {
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
} from 'react';
import { EventRegister } from 'react-native-event-listeners';

import {
  SafeAreaView,
  NativeModules,
  PermissionsAndroid,
  BackHandler,
  Linking,
  Alert,
  AppState,
  NativeEventEmitter,
} from 'react-native';

import WebView from 'react-native-webview';

import LocationEnabler from '@visit-health/react-native-location-enabler';

const messageEmitter = new NativeEventEmitter(NativeModules.VisitFitnessModule);

const locationSettings = {
  priority: LocationEnabler.PRIORITIES.HIGH_ACCURACY,
  alwaysShow: true,
  needBle: true,
};

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
  const [appState, setAppState] = useState(AppState.currentState);
  const [webGeolocationEnabled, setWebGeolocationEnabled] = useState(false);
  const [locationResult, setLocationResult] = useState(null);

  const webView = useRef(null);
  const currentPage = useRef(null);
  const connectingPage = useRef(null);
  const locationRequestInFlight = useRef(false);

  const resetPage = useCallback(() => {
    currentPage.current = { connectionRevision: 0 };
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

  useEffect(() => {
    if (isLoggingEnabled) {
      console.log('useEffect ran');
    }

    NativeModules.VisitFitnessModule.initiateSDK(isLoggingEnabled);
  }, [isLoggingEnabled]);

  useEffect(() => {
    const subscription = messageEmitter.addListener('onMessage', (message) => {
      console.log('Received message:', message);

      if (typeof message === 'string' && message.includes('RemoteException')) {
        Alert.alert(
          'Error!',
          'Something went wrong while connecting to Health Connect. Please try again.',
          []
        );
      }

      EventRegister.emitEvent('visit-event', {
        message: 'health-connect-error-event',
        errorMessage: message,
      });
    });

    return () => {
      // Clean up the subscription when the component unmounts
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!source || appState === 'background' || appState === 'inactive') {
      return;
    }

    let current = true;
    // A WebView geolocation request can otherwise open its own permission dialog.
    PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    )
      .then((granted) => {
        if (current) setWebGeolocationEnabled(granted);
      })
      .catch(() => {
        if (current) setWebGeolocationEnabled(false);
      });
    return () => {
      current = false;
    };
  }, [appState, source]);

  useEffect(() => {
    if (locationResult === null) return;
    // The WebView must have the updated geolocation setting before it retries.
    inject(
      locationResult.page,
      `window.checkTheGpsPermission(${locationResult.enabled})`
    );
    setLocationResult(null);
    locationRequestInFlight.current = false;
  }, [inject, locationResult]);

  const showLocationPermissionAlert = () =>
    new Promise((resolve, reject) => {
      Alert.alert(
        'Permission Required',
        'Allow location permission from app settings',
        [
          { text: 'Cancel', onPress: resolve },
          {
            text: 'Go to Settings',
            onPress: () => Linking.openSettings().then(resolve, reject),
          },
        ],
        { onDismiss: resolve }
      );
    });

  const requestLocationPermission = async (page) => {
    if (locationRequestInFlight.current) return;
    locationRequestInFlight.current = true;
    let locationEnabled = false;

    try {
      const { ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION } =
        PermissionsAndroid.PERMISSIONS;
      const { GRANTED, NEVER_ASK_AGAIN } = PermissionsAndroid.RESULTS;
      let preciseLocationGranted = await PermissionsAndroid.check(
        ACCESS_FINE_LOCATION
      );
      let blocked = false;
      if (!preciseLocationGranted) {
        if (page !== currentPage.current) return;
        const permissions = await PermissionsAndroid.requestMultiple([
          ACCESS_COARSE_LOCATION,
          ACCESS_FINE_LOCATION,
        ]);
        const precisePermission = permissions[ACCESS_FINE_LOCATION];
        preciseLocationGranted = precisePermission === GRANTED;
        blocked = precisePermission === NEVER_ASK_AGAIN;
      }

      setWebGeolocationEnabled(preciseLocationGranted);
      if (page !== currentPage.current) return;
      if (preciseLocationGranted) {
        locationEnabled = await LocationEnabler.ensureLocationSettings(
          locationSettings
        );
      } else if (blocked) {
        await showLocationPermissionAlert();
      }
    } finally {
      setLocationResult({ page, enabled: locationEnabled === true });
    }
  };

  const showHealthConnectPermissionDeniedDialog = () => {
    Alert.alert(
      'Permission Denied',
      'Go to Health Connect App to allow app permission',
      [
        {
          text: 'Cancel',
          onPress: () => {
            console.log('Cancel clicked');
          },
        },
        {
          text: 'Open Health Connect',
          onPress: () => {
            openHealthConnectApp();
          },
        },
      ]
    );
  };

  const openHealthConnectApp = async () => {
    NativeModules.VisitFitnessModule.openHealthConnectApp();
  };

  const getHealthConnectStatus = async (page) => {
    if (connectingPage.current === page) return;
    const revision = page.connectionRevision;
    const native = NativeModules.VisitFitnessModule;
    const status = await native.getHealthConnectStatus();
    if (page !== currentPage.current || page.connectionRevision !== revision) {
      return;
    }

    switch (status) {
      case 'NOT_SUPPORTED':
        inject(page, 'window.healthConnectNotSupported()');
        break;
      case 'NOT_INSTALLED':
      case 'INSTALLED':
        inject(
          page,
          status === 'NOT_INSTALLED'
            ? 'window.healthConnectNotInstall()'
            : 'window.healthConnectAvailable()'
        );
        inject(page, 'window.updateFitnessPermissions(false,0,0)');
        break;
      case 'CONNECTED': {
        const data = await native.requestDailyFitnessData();
        if (data && page.connectionRevision === revision) inject(page, data);
        break;
      }
    }
  };

  const askForHealthConnectPermission = async (page) => {
    if (connectingPage.current) return;
    connectingPage.current = page;
    page.connectionRevision++;
    let permission;
    try {
      permission =
        await NativeModules.VisitFitnessModule.askForFitnessPermission();
    } finally {
      connectingPage.current = null;
    }
    if (page !== currentPage.current) return;
    if (permission === 'GRANTED') {
      await getHealthConnectStatus(page);
    } else if (permission === 'CANCELLED') {
      inject(page, 'window.updateFitnessPermissions(false,0,0)');
      showHealthConnectPermissionDeniedDialog();
    }
  };

  const runBeforeFirst = `
    window.isNativeApp = true;
    window.platform = "ANDROID";
    if (typeof window.setSdkPlatform === 'function') window.setSdkPlatform("ANDROID");
    true;
  `;

  const handleMessage = async (event) => {
    const page = currentPage.current;
    if (!page) return;

    try {
      const data = JSON.parse(event.nativeEvent.data);
      const method = data?.method ?? data?.name;
      const native = NativeModules.VisitFitnessModule;
      switch (method) {
        case 'GET_HEALTH_CONNECT_STATUS':
          await getHealthConnectStatus(page);
          break;
        case 'CONNECT_TO_GOOGLE_FIT':
          await askForHealthConnectPermission(page);
          break;
        case 'UPDATE_PLATFORM':
          inject(page, 'window.setSdkPlatform("ANDROID")');
          break;
        case 'GET_CALORIE_BURNED': {
          const calories = await native.getTodayCaloriesForWeb();
          if (Number.isFinite(calories)) {
            inject(
              page,
              `if (typeof window.updateCalorieBurned === 'function') window.updateCalorieBurned(${calories}); true;`
            );
          }
          break;
        }
        case 'UPDATE_API_BASE_URL': {
          const apiBaseUrl = data.apiBaseUrl?.trim();
          const authToken = data.authtoken ?? data.authToken;
          if (apiBaseUrl && authToken?.trim()) {
            await native.updateApiBaseUrl(
              apiBaseUrl,
              authToken,
              Math.max(-1, readTimestamp(data.googleFitLastSync, -1)),
              Math.max(-1, readTimestamp(data.gfHourlyLastSync, -1))
            );
          }
          break;
        }
        case 'GET_DATA_TO_GENERATE_GRAPH': {
          const { type, frequency } = data;
          if (typeof type !== 'string' || typeof frequency !== 'string') break;
          const timestamp = readTimestamp(data.timestamp, Date.now());
          const graph = await native.requestActivityDataFromHealthConnect(
            type,
            frequency,
            timestamp
          );
          if (graph) inject(page, `window.${graph}`);
          break;
        }
        case 'GET_LOCATION_PERMISSIONS':
          await requestLocationPermission(page);
          break;
        case 'CLOSE_VIEW':
        case 'OPEN_FACE_SCAN_FLOW':
          EventRegister.emitEvent('visit-event', { message: method });
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
            await native.downloadAndShare(
              link,
              typeof data.authToken === 'string' ? data.authToken : null
            );
          }
          break;
        }
      }
    } catch {
      if (isLoggingEnabled)
        console.warn('Could not handle Visit WebView request');
    }
  };

  const [canGoBack, setCanGoBack] = useState(false);

  const handleBack = useCallback(() => {
    if (canGoBack && webView.current) {
      webView.current.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);

  useEffect(() => {
    const backSub = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBack
    );
    return () => backSub.remove();
  }, [handleBack]);

  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{ flex: 1 }}>
      {source ? (
        <WebView
          key={source}
          ref={webView}
          source={{
            uri: source,
            headers: {
              platform: 'ANDROID',
            },
          }}
          onMessage={handleMessage}
          onLoadStart={resetPage}
          injectedJavaScriptBeforeContentLoaded={runBeforeFirst}
          javaScriptEnabled={true}
          geolocationEnabled={webGeolocationEnabled}
          onLoadProgress={(event) => setCanGoBack(event.nativeEvent.canGoBack)}
          onError={(errorMessage) => {
            EventRegister.emitEvent('visit-event', {
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

export const fetchDailyFitnessData = (startTimeStamp, isLoggingEnabled) => {
  return new Promise((resolve, reject) => {
    console.log('fetchDailyFitnessData called: ' + startTimeStamp);

    NativeModules.VisitFitnessModule.fetchDailyFitnessData(startTimeStamp)
      .then((result) => {
        resolve(result);
      })
      .catch((err) => reject(err));
  });
};

export const fetchHourlyFitnessData = (startTimeStamp, isLoggingEnabled) => {
  return new Promise((resolve, reject) => {
    if (isLoggingEnabled) {
      console.log('fetchHourlyFitnessData called: ' + startTimeStamp);
    }

    NativeModules.VisitFitnessModule.fetchHourlyFitnessData(startTimeStamp)
      .then((result) => {
        resolve(result);
      })
      .catch((err) => reject(err));
  });
};

// debounce, deferred
// function debounce(task, ms) {
//   let t = { promise: null, cancel: (_) => void 0 };
//   return async (...args) => {
//     try {
//       t.cancel();
//       t = deferred(ms);
//       await t.promise;
//       await task(...args);
//     } catch (_) {
//       console.log('cleaning up cancelled promise');
//     }
//   };
// }

// function deferred(ms) {
//   let cancel,
//     promise = new Promise((resolve, reject) => {
//       cancel = reject;
//       setTimeout(resolve, ms);
//     });
//   return { promise, cancel };
// }

export default VisitRnSdkView;
