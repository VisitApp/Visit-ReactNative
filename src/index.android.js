import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EventRegister } from 'react-native-event-listeners';

import {
  SafeAreaView,
  PermissionsAndroid,
  BackHandler,
  Linking,
  Alert,
} from 'react-native';

import WebView from 'react-native-webview';

import LocationEnabler from '@visit-health/react-native-location-enabler';

import VideoCallComponent from './components/VideoCallComponent';

const {
  PRIORITIES: { HIGH_ACCURACY },
  useLocationSettings,
  addListener,
} = LocationEnabler;

const VisitRnSdkView = ({ magicLink, isLoggingEnabled }) => {
  const source = typeof magicLink === 'string' ? magicLink.trim() : '';

  const [
    showPermissionAlreadyDeniedDialog,
    setShowPermissionAlreadyDeniedDialog,
  ] = useState(false);

  const [enabled, requestResolution] = useLocationSettings(
    {
      priority: HIGH_ACCURACY, // default BALANCED_POWER_ACCURACY
      alwaysShow: true, // default false
      needBle: true, // default false
    },
    false /* optional: default undefined */
  );

  const webviewRef = useRef(null);
  const videoCallRef = useRef(null);

  const showLocationPermissionAlert = () => {
    Alert.alert(
      'Permission Required',
      'Allow location permission from app settings',
      [
        {
          text: 'Cancel',
          onPress: () => {
            console.log('Cancel clicked');
          },
        },
        {
          text: 'Go to Settings',
          onPress: () => {
            Linking.openSettings();
          },
        },
      ]
    );
  };

  const requestLocationPermission = async () => {
    try {
      console.log('requestLocationPermission called');

      const isLocationPermissionPresent = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      console.log(
        'isLocationPermissionPresent: ' +
          isLocationPermissionPresent +
          ' showPermissionAlreadyDeniedDialog: ' +
          showPermissionAlreadyDeniedDialog
      );

      if (!isLocationPermissionPresent && showPermissionAlreadyDeniedDialog) {
        console.log('showLocationPermissionAlert() called');

        showLocationPermissionAlert();
      } else {
        console.log('requesting location permission');

        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Need Location Permission',
            message: 'Need access to location permission',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          if (isLoggingEnabled) {
            console.log('Location permission granted');
          }
          setShowPermissionAlreadyDeniedDialog(false);

          if (!enabled) {
            requestResolution();
          } else {
            var finalString = `window.checkTheGpsPermission(true)`;
            console.log('requestLocationPermission: ' + finalString);

            webviewRef.current?.injectJavaScript(finalString);
          }
        } else {
          setShowPermissionAlreadyDeniedDialog(true);
          console.log('Location permission denied');

          var finalString = `window.checkTheGpsPermission(false)`;
          console.log('requestLocationPermission: ' + finalString);

          webviewRef.current?.injectJavaScript(finalString);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

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
        if (isLoggingEnabled) {
          console.log('Event :' + event.nativeEvent.data);
        }
        const parsedObject = JSON.parse(event.nativeEvent.data);
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
              console.log('GET_LOCATION_PERMISSIONS');
              requestLocationPermission();
              break;
            case 'OPEN_PDF':
              {
                let pdfUrl = parsedObject.url;
                // console.log("pdfUrl "+pdfUrl);

                Linking.openURL(pdfUrl);
              }
              break;
            case 'OPEN_FACE_SCAN_FLOW':
              EventRegister.emitEvent('visit-event', {
                message: 'OPEN_FACE_SCAN_FLOW',
              });
              break;
            case 'CLOSE_VIEW':
              break;

            default:
              break;
          }
        }
      } catch (exception) {
        console.log('Exception occured:' + exception.message);
      }
    }
  };

  const [canGoBack, setCanGoBack] = useState(false);

  const handleBack = useCallback(() => {
    if (canGoBack && webviewRef.current) {
      webviewRef.current?.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);

  const checkLocationPermissionAndSendCallback = useCallback(async () => {
    const isLocationPermissionAvailable = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );

    if (isLoggingEnabled) {
      console.log(
        'checkLocationPermissionAndSendCallback() isLocationPermissionAvailable: ' +
          isLocationPermissionAvailable +
          'isGPSPermissionAvailabe: true'
      );
    }

    if (isLocationPermissionAvailable) {
      var finalString = `window.checkTheGpsPermission(true)`;

      console.log('listener: ' + finalString);

      webviewRef.current?.injectJavaScript(finalString);
    }
  }, [isLoggingEnabled]);

  useEffect(() => {
    // Subscribe to GPS/location setting changes
    const locationSub = addListener(({ locationEnabled }) => {
      if (locationEnabled) {
        checkLocationPermissionAndSendCallback();
      }
    });

    // Subscribe to Android hardware back press
    const backSub = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBack
    );

    // Cleanup subscriptions on unmount
    return () => {
      backSub?.remove();
      locationSub?.remove();
    };
  }, [handleBack, checkLocationPermissionAndSendCallback]);

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

VisitRnSdkView.defaultProps = {
  magicLink: '',
  isLoggingEnabled: false,
};
