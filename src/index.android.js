import React, { useRef, useEffect, useState, useCallback } from 'react';

import {
  SafeAreaView,
  BackHandler,
  Linking,
  PermissionsAndroid,
} from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import {
  isLocationEnabled,
  promptForEnableLocationIfNeeded,
} from 'react-native-android-location-enabler';

import WebView from 'react-native-webview';

const visitEvent = 'visit-event';

const VisitRnSdkView = ({ ssoURL, isLoggingEnabled }) => {
  const [source, setSource] = useState(ssoURL);

  useEffect(() => {
    if (ssoURL && ssoURL !== source) {
      setSource(ssoURL);
    }
  }, [ssoURL, source]);

  const webviewRef = useRef(null);

  const runBeforeFirst = `
        window.isNativeApp = true;
        window.platform = "ANDROID";
        true; // note: this is required, or you'll sometimes get silent failures
    `;

  const sendLocationPermissionStatus = useCallback((isAllowed) => {
    webviewRef.current?.injectJavaScript(
      `window.checkTheGpsPermission(${isAllowed ? 'true' : 'false'}); true;`
    );
  }, []);

  const requestLocationPermission = useCallback(async () => {
    try {
      const isLocationPermissionPresent = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      let isPermissionGranted = isLocationPermissionPresent;

      if (!isPermissionGranted) {
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

        isPermissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
      }

      if (!isPermissionGranted) {
        if (isLoggingEnabled) {
          console.log('Location permission denied');
        }
        sendLocationPermissionStatus(false);
        return;
      }

      const locationEnabled = await isLocationEnabled();

      if (!locationEnabled) {
        await promptForEnableLocationIfNeeded();
      }

      sendLocationPermissionStatus(true);
    } catch (error) {
      if (isLoggingEnabled) {
        console.warn('Location permission failed: ', error);
      }
      sendLocationPermissionStatus(false);
    }
  }, [isLoggingEnabled, sendLocationPermissionStatus]);

  const handleMessage = (event) => {
    if (event.nativeEvent.data != null) {
      try {
        if (isLoggingEnabled) {
          console.log('Event :' + event.nativeEvent.data);
        }
        const parsedObject = JSON.parse(event.nativeEvent.data);
        if (parsedObject.method != null) {
          switch (parsedObject.method) {
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
            case 'closeView':
              EventRegister.emitEvent(visitEvent, {
                message: 'closeView',
              });
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
    if (isLoggingEnabled) {
      console.log(
        'handleBack called: ' + canGoBack + ' webviewRef: ' + webviewRef.current
      );
    }

    if (canGoBack && webviewRef.current) {
      webviewRef.current?.goBack();
      return true;
    }
    return false;
  }, [canGoBack, isLoggingEnabled]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBack
    );
    return () => {
      backHandler.remove();
    };
  }, [handleBack]);

  if (!source) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <WebView
        ref={webviewRef}
        source={{
          uri: source,
          headers: {
            platform: 'ANDROID',
          },
        }}
        onMessage={handleMessage}
        startInLoadingState={true}
        injectedJavaScriptBeforeContentLoaded={runBeforeFirst}
        javaScriptEnabled={true}
        onLoadProgress={(event) => setCanGoBack(event.nativeEvent.canGoBack)}
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
    </SafeAreaView>
  );
};

export default VisitRnSdkView;
