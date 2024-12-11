import React, { useRef, useEffect, useState, useCallback } from 'react';

import { SafeAreaView, BackHandler, Linking, Alert } from 'react-native';
import { EventRegister } from 'react-native-event-listeners';

import WebView from 'react-native-webview';

const VisitRnSdkView = ({ ssoURL, isLoggingEnabled }) => {
  const [source, setSource] = useState('');

  useEffect(() => {
    if (isLoggingEnabled) {
      console.log('useEffect ran: ' + ssoURL);
    }
    setSource(ssoURL);
  }, [ssoURL, isLoggingEnabled]);

  const webviewRef = useRef(null);

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

  const runBeforeFirst = `
        window.isNativeApp = true;
        window.platform = "ANDROID";
        window.setSdkPlatform('ANDROID');
        true; // note: this is required, or you'll sometimes get silent failures
    `;

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
              showLocationPermissionAlert();
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
  const visitEvent = 'visit-event';

  const handleBack = useCallback(() => {
    if (canGoBack && webviewRef.current) {
      webviewRef.current?.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBack);
    };
  }, [handleBack]);

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
