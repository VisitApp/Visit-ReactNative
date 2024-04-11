import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EventRegister } from 'react-native-event-listeners';

import {
  SafeAreaView,
  PermissionsAndroid,
  BackHandler,
  Linking,
} from 'react-native';

import WebView from 'react-native-webview';

import LocationEnabler from 'react-native-location-enabler';

import axios from 'axios';

export const httpClient = axios.create({
  timeout: 60000,
});

const {
  PRIORITIES: { HIGH_ACCURACY },
  useLocationSettings,
  addListener,
} = LocationEnabler;

const VisitRnSdkView = ({ magicLink, isLoggingEnabled }) => {
  const [source, setSource] = useState('');
  useEffect(() => {
    if (isLoggingEnabled) {
      console.log(magicLink);
    }

    setSource(magicLink);
  }, [magicLink, isLoggingEnabled]);

  const [enabled, requestResolution] = useLocationSettings(
    {
      priority: HIGH_ACCURACY, // default BALANCED_POWER_ACCURACY
      alwaysShow: true, // default false
      needBle: true, // default false
    },
    false /* optional: default undefined */
  );

  const webviewRef = useRef(null);

  const requestLocationPermission = async () => {
    try {
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
        console.log('Location permission granted');

        if (!enabled) {
          requestResolution();
        } else {
          var finalString = `window.checkTheGpsPermission(true)`;
          console.log('requestLocationPermission: ' + finalString);

          webviewRef.current?.injectJavaScript(finalString);
        }
      } else {
        console.log('Location permission denied');
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

  const handleMessage = (event) => {
    if (event.nativeEvent.data != null) {
      try {
        // console.log("Event :"+event.nativeEvent.data);
        const parsedObject = JSON.parse(event.nativeEvent.data);
        if (parsedObject.method != null) {
          switch (parsedObject.method) {
            case 'UPDATE_PLATFORM':
              webviewRef.current?.injectJavaScript(
                'window.setSdkPlatform("ANDROID")'
              );
              break;
            case 'GET_LOCATION_PERMISSIONS':
              // eslint-disable-next-line no-lone-blocks
              {
                requestLocationPermission();
              }
              break;
            case 'OPEN_PDF':
              {
                let pdfUrl = parsedObject.url;
                // console.log("pdfUrl "+pdfUrl);

                Linking.openURL(pdfUrl);
              }
              break;
            case 'CLOSE_VIEW':
              // eslint-disable-next-line no-lone-blocks
              {
              }
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

  useEffect(() => {
    const gpsListener = addListener(({ locationEnabled }) => {
      if (locationEnabled) {
        var finalString = `window.checkTheGpsPermission(true)`;

        console.log('listener: ' + finalString);

        webviewRef.current?.injectJavaScript(finalString);
      }
    });

    BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBack);
      gpsListener.remove();
    };
  }, [handleBack]);

  return (
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
    </SafeAreaView>
  );
};

export default VisitRnSdkView;

VisitRnSdkView.defaultProps = {
  magicLink: '',
  isLoggingEnabled: false,
};
