import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  Linking,
  NativeModules,
  SafeAreaView,
} from 'react-native';
import {
  check,
  openSettings,
  PERMISSIONS,
  request,
  RESULTS,
} from 'react-native-permissions';
import WebView from 'react-native-webview';

import VideoCallComponent from './components/VideoCallComponent';

const LOCATION_SOURCE_SETTINGS = 'android.settings.LOCATION_SOURCE_SETTINGS';
const GENERAL_SETTINGS = 'android.settings.SETTINGS';
const { VisitRnSdkLocation } = NativeModules;

const VisitRnSdkView = ({ ssoLink, isLoggingEnabled }) => {
  const source = typeof ssoLink === 'string' ? ssoLink.trim() : '';
  const webviewRef = useRef(null);
  const videoCallRef = useRef(null);
  const locationFlowInProgressRef = useRef(false);
  const pendingSettingsRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const [canGoBack, setCanGoBack] = useState(false);

  const warn = useCallback(
    (message, error) => {
      if (isLoggingEnabled) {
        console.warn(message, error);
      }
    },
    [isLoggingEnabled]
  );

  const finishLocationFlow = useCallback((granted) => {
    locationFlowInProgressRef.current = false;
    pendingSettingsRef.current = null;
    webviewRef.current?.injectJavaScript(
      `window.checkTheGpsPermission(${granted}); true;`
    );
  }, []);

  const showLocationPermissionSettingsAlert = useCallback(() => {
    Alert.alert(
      'Location permission required',
      'Allow location access in app settings to continue.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => finishLocationFlow(false),
        },
        {
          text: 'Open Settings',
          onPress: async () => {
            pendingSettingsRef.current = 'location-permission';
            try {
              await openSettings();
            } catch (error) {
              warn('Unable to open application settings.', error);
              finishLocationFlow(false);
            }
          },
        },
      ],
      { cancelable: false }
    );
  }, [finishLocationFlow, warn]);

  const openLocationServicesSettings = useCallback(async () => {
    pendingSettingsRef.current = 'location-services';
    try {
      await Linking.sendIntent(LOCATION_SOURCE_SETTINGS);
    } catch (locationSettingsError) {
      warn(
        'Unable to open Location Services settings; opening general settings.',
        locationSettingsError
      );
      try {
        await Linking.sendIntent(GENERAL_SETTINGS);
      } catch (generalSettingsError) {
        warn('Unable to open Android settings.', generalSettingsError);
        finishLocationFlow(false);
      }
    }
  }, [finishLocationFlow, warn]);

  const checkLocationServices = useCallback(
    async ({ promptIfDisabled }) => {
      try {
        if (!VisitRnSdkLocation?.isLocationServicesEnabled) {
          throw new Error('VisitRnSdkLocation native module is unavailable.');
        }

        const isEnabled = await VisitRnSdkLocation.isLocationServicesEnabled();
        if (isEnabled) {
          finishLocationFlow(true);
          return;
        }

        if (!promptIfDisabled) {
          finishLocationFlow(false);
          return;
        }

        Alert.alert(
          'Turn on Location Services',
          'Enable Location Services in phone settings to continue.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => finishLocationFlow(false),
            },
            {
              text: 'Open Settings',
              onPress: openLocationServicesSettings,
            },
          ],
          { cancelable: false }
        );
      } catch (error) {
        warn('Unable to check Location Services.', error);
        finishLocationFlow(false);
      }
    },
    [finishLocationFlow, openLocationServicesSettings, warn]
  );

  const requestLocationPermission = useCallback(async () => {
    if (
      locationFlowInProgressRef.current ||
      pendingSettingsRef.current !== null
    ) {
      return;
    }

    locationFlowInProgressRef.current = true;

    try {
      let permissionStatus = await check(
        PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
      );

      if (permissionStatus === RESULTS.DENIED) {
        permissionStatus = await request(
          PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
        );
      }

      if (permissionStatus === RESULTS.GRANTED) {
        await checkLocationServices({ promptIfDisabled: true });
        return;
      }

      if (permissionStatus === RESULTS.BLOCKED) {
        showLocationPermissionSettingsAlert();
        return;
      }

      finishLocationFlow(false);
    } catch (error) {
      warn('Unable to check or request location permission.', error);
      finishLocationFlow(false);
    }
  }, [
    checkLocationServices,
    finishLocationFlow,
    showLocationPermissionSettingsAlert,
    warn,
  ]);

  const recheckAfterSettings = useCallback(async () => {
    const settingsType = pendingSettingsRef.current;
    if (!settingsType) {
      return;
    }

    pendingSettingsRef.current = null;

    try {
      const permissionStatus = await check(
        PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
      );
      if (permissionStatus !== RESULTS.GRANTED) {
        finishLocationFlow(false);
        return;
      }

      await checkLocationServices({
        promptIfDisabled: settingsType === 'location-permission',
      });
    } catch (error) {
      warn('Unable to recheck location access after settings.', error);
      finishLocationFlow(false);
    }
  }, [checkLocationServices, finishLocationFlow, warn]);

  const runBeforeFirst = `
        window.isNativeApp = true;
        window.platform = "ANDROID";
        window.setSdkPlatform('ANDROID');
        true; // note: this is required, or you'll sometimes get silent failures
    `;

  const startVideoConsultation = useCallback(
    (parsedObject) => {
      const roomName = parsedObject?.roomName;
      const accessToken = parsedObject?.token;
      const rawDoctorName = parsedObject?.doctorName;
      const visibleDoctorName =
        rawDoctorName && rawDoctorName.indexOf('Dr.') > -1
          ? rawDoctorName.replace('Dr. ', '')
          : rawDoctorName && rawDoctorName.indexOf('Dr') > -1
          ? rawDoctorName.replace('Dr ', '')
          : null;
      const userName = parsedObject?.userName;

      if (!roomName || !accessToken) {
        if (isLoggingEnabled) {
          console.warn('Video call payload missing roomName/accessToken.');
        }
        return;
      }

      videoCallRef.current?.startVideoCall({
        roomName,
        accessToken,
        doctorName: rawDoctorName ?? '',
        visibleDoctorName: visibleDoctorName ?? '',
        userName,
      });
    },
    [isLoggingEnabled]
  );

  const handleMessage = (event) => {
    if (event.nativeEvent.data != null) {
      try {
        const parsedObject = JSON.parse(event.nativeEvent.data);
        if (isLoggingEnabled) {
          console.log('Received WebView method:', parsedObject.method);
        }
        if (parsedObject.method != null) {
          switch (parsedObject.method) {
            case 'startVideoCall':
              startVideoConsultation(parsedObject);
              break;
            case 'UPDATE_PLATFORM':
              webviewRef.current?.injectJavaScript(
                'window.setSdkPlatform("ANDROID")'
              );
              break;
            case 'GET_LOCATION_PERMISSIONS':
              requestLocationPermission();
              break;
            case 'OPEN_PDF':
              Linking.openURL(parsedObject.url);
              break;
            case 'CLOSE_VIEW':
              break;
            default:
              break;
          }
        }
      } catch (error) {
        warn('Unable to handle WebView message.', error);
      }
    }
  };

  const handleBack = useCallback(() => {
    if (canGoBack && webviewRef.current) {
      webviewRef.current.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);

  useEffect(() => {
    const backSub = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBack
    );
    const appStateSub = AppState.addEventListener('change', (nextAppState) => {
      const wasInBackground = /inactive|background/.test(appStateRef.current);
      appStateRef.current = nextAppState;

      if (
        wasInBackground &&
        nextAppState === 'active' &&
        pendingSettingsRef.current
      ) {
        recheckAfterSettings();
      }
    });

    return () => {
      backSub?.remove();
      appStateSub?.remove();
    };
  }, [handleBack, recheckAfterSettings]);

  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{ flex: 1 }}>
      {source ? (
        <WebView
          ref={webviewRef}
          source={{
            uri: source,
            headers: {
              platform: 'ANDROID',
            },
          }}
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={runBeforeFirst}
          javaScriptEnabled={true}
          onLoadProgress={(event) => setCanGoBack(event.nativeEvent.canGoBack)}
          onError={(errorMessage) => {
            if (isLoggingEnabled) {
              console.warn('Webview error: ', errorMessage);
            }
          }}
        />
      ) : null}
      <VideoCallComponent
        ref={videoCallRef}
        onCallConnected={(info) => {
          if (isLoggingEnabled) {
            console.log('Video call connected:', info);
          }
        }}
        onCallEnded={(info) => {
          if (isLoggingEnabled) {
            console.log('Video call ended:', info);
          }
        }}
        onError={(error) => {
          if (isLoggingEnabled) {
            console.error('Video call error:', error);
          }
        }}
      />
    </SafeAreaView>
  );
};

export default VisitRnSdkView;

VisitRnSdkView.defaultProps = {
  ssoLink: '',
  isLoggingEnabled: false,
};
