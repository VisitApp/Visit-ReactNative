import React, { useRef, useEffect, useState, useCallback } from 'react';
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
import {
  handleWebAction,
  readMessage,
  refreshCalorieCard,
  syncConfiguration,
  timestampOrNull,
  useWebDocument,
} from './webBridge';

const messageEmitter = new NativeEventEmitter(NativeModules.VisitFitnessModule);

const locationSettings = {
  priority: LocationEnabler.PRIORITIES.HIGH_ACCURACY,
  alwaysShow: true,
  needBle: true,
};

/** @param {{ ssoURL: string, isLoggingEnabled?: boolean }} props */
const VisitRnSdkView = ({ ssoURL, isLoggingEnabled = false }) => {
  const source = ssoURL?.trim();
  const [appState, setAppState] = useState(AppState.currentState);
  const [webGeolocationEnabled, setWebGeolocationEnabled] = useState(false);
  const [locationResult, setLocationResult] = useState(null);

  const locationRequestInFlight = useRef(false);

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

  const bridge = useWebDocument(source);

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
    bridge.inject(
      locationResult.document,
      `window.checkTheGpsPermission(${locationResult.enabled})`
    );
    setLocationResult(null);
    locationRequestInFlight.current = false;
  }, [bridge, locationResult]);

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

  const requestLocationPermission = async (document) => {
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
      if (!preciseLocationGranted) {
        const permissions = await PermissionsAndroid.requestMultiple([
          ACCESS_COARSE_LOCATION,
          ACCESS_FINE_LOCATION,
        ]);
        const precisePermission = permissions[ACCESS_FINE_LOCATION];
        preciseLocationGranted = precisePermission === GRANTED;
        if (precisePermission === NEVER_ASK_AGAIN) {
          if (bridge.isCurrent(document)) await showLocationPermissionAlert();
        }
      }

      setWebGeolocationEnabled(preciseLocationGranted);
      if (preciseLocationGranted && bridge.isCurrent(document)) {
        locationEnabled = await LocationEnabler.ensureLocationSettings(
          locationSettings
        );
      }
    } catch (error) {
      if (isLoggingEnabled) console.warn('Location request failed:', error);
    } finally {
      setLocationResult({ document, enabled: locationEnabled === true });
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

  const getHealthConnectStatus = (document) => {
    if (document.connecting) return;
    const revision = document.connectionRevision;
    const isCurrent = () =>
      bridge.isCurrent(document) && document.connectionRevision === revision;
    return bridge.run(document, `status:${revision}`, async () => {
      const native = NativeModules.VisitFitnessModule;
      if (!isCurrent()) return;
      const status = await native.getHealthConnectStatus();
      if (!isCurrent()) return;
      switch (status) {
        case 'NOT_SUPPORTED':
          bridge.inject(document, 'window.healthConnectNotSupported()');
          break;
        case 'NOT_INSTALLED':
        case 'INSTALLED':
          bridge.inject(
            document,
            status === 'NOT_INSTALLED'
              ? 'window.healthConnectNotInstall()'
              : 'window.healthConnectAvailable()'
          );
          bridge.inject(document, 'window.updateFitnessPermissions(false,0,0)');
          break;
        case 'CONNECTED': {
          const dailyFitnessData = await native.requestDailyFitnessData();
          if (dailyFitnessData && isCurrent()) {
            bridge.inject(document, dailyFitnessData);
          }
          break;
        }
      }
    });
  };

  const askForHealthConnectPermission = (document) =>
    bridge.run(document, 'connect', async () => {
      document.connecting = true;
      document.connectionRevision = (document.connectionRevision || 0) + 1;
      let permission;
      try {
        permission =
          await NativeModules.VisitFitnessModule.askForFitnessPermission();
      } finally {
        document.connecting = false;
      }
      if (!bridge.isCurrent(document)) return;
      if (permission === 'GRANTED') {
        await getHealthConnectStatus(document);
      } else if (permission === 'CANCELLED') {
        bridge.inject(document, 'window.updateFitnessPermissions(false,0,0)');
        showHealthConnectPermissionDeniedDialog();
      }
    });

  const runBeforeFirst = `
    window.isNativeApp = true;
    window.platform = "ANDROID";
    if (typeof window.setSdkPlatform === 'function') window.setSdkPlatform("ANDROID");
    true;
  `;

  const handleMessage = async (event) => {
    const data = readMessage(event.nativeEvent.data);
    const document = bridge.current.current;
    if (!data || !bridge.isCurrent(document)) return;
    const native = NativeModules.VisitFitnessModule;
    try {
      switch (data.method) {
        case 'GET_HEALTH_CONNECT_STATUS':
          await getHealthConnectStatus(document);
          break;
        case 'CONNECT_TO_GOOGLE_FIT':
          await askForHealthConnectPermission(document);
          break;
        case 'UPDATE_PLATFORM':
          bridge.inject(document, 'window.setSdkPlatform("ANDROID")');
          break;
        case 'GET_CALORIE_BURNED':
          await refreshCalorieCard(bridge, document, native);
          break;
        case 'UPDATE_API_BASE_URL': {
          const configuration = syncConfiguration(data);
          if (configuration) {
            await native.updateApiBaseUrl(
              configuration.apiBaseUrl,
              configuration.authToken,
              configuration.googleFitLastSync,
              configuration.gfHourlyLastSync
            );
          }
          break;
        }
        case 'GET_DATA_TO_GENERATE_GRAPH': {
          const { type, frequency } = data;
          if (typeof type !== 'string' || typeof frequency !== 'string') break;
          const timestamp = timestampOrNull(data.timestamp) ?? Date.now();
          const graph = await native.requestActivityDataFromHealthConnect(
            type,
            frequency,
            timestamp
          );
          if (graph) bridge.inject(document, `window.${graph}`);
          break;
        }
        case 'GET_LOCATION_PERMISSIONS':
          await requestLocationPermission(document);
          break;
        default:
          await handleWebAction(data, native, bridge, document);
      }
    } catch {
      if (isLoggingEnabled)
        console.warn('Could not handle Visit WebView request');
    }
  };

  const [canGoBack, setCanGoBack] = useState(false);

  const handleBack = useCallback(() => {
    if (canGoBack && bridge.webviewRef.current) {
      bridge.webviewRef.current?.goBack();
      return true;
    }
    return false;
  }, [bridge, canGoBack]);

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
          ref={bridge.webviewRef}
          source={{
            uri: source,
            headers: {
              platform: 'ANDROID',
            },
          }}
          onMessage={handleMessage}
          onLoadStart={bridge.reset}
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
