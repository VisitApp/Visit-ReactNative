import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  Linking,
  Platform,
  Dimensions,
  NativeModules,
  Alert,
} from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import { WebView } from 'react-native-webview';

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
const { VisitRnSdkViewManager } = NativeModules;

const VisitRnSdkView = ({ ssoURL, isLoggingEnabled }) => {
  const [source, setSource] = useState(ssoURL);

  useEffect(() => {
    if (ssoURL && ssoURL !== source) {
      setSource(ssoURL);
    }
  }, [ssoURL, source]);

  const webviewRef = useRef(null);

  const sendLocationPermissionStatus = useCallback((isAllowed) => {
    webviewRef.current?.injectJavaScript(
      `window.checkTheGpsPermission(${isAllowed ? 'true' : 'false'}); true;`
    );
  }, []);

  const showLocationPermissionAlert = useCallback(() => {
    Alert.alert(
      'Need Location Permission',
      'Need access to location permission',
      [
        {
          text: 'Cancel',
          onPress: () => {
            sendLocationPermissionStatus(false);
          },
        },
        {
          text: 'Go to Settings',
          onPress: () => {
            Linking.openSettings();
            sendLocationPermissionStatus(false);
          },
        },
      ]
    );
  }, [sendLocationPermissionStatus]);

  const requestLocationPermission = useCallback(async () => {
    try {
      if (
        !VisitRnSdkViewManager?.getLocationPermissionStatus ||
        !VisitRnSdkViewManager?.requestLocationPermission
      ) {
        sendLocationPermissionStatus(false);
        return;
      }

      const status = await VisitRnSdkViewManager.getLocationPermissionStatus();

      if (status === 'authorized') {
        sendLocationPermissionStatus(true);
        return;
      }

      if (
        status === 'denied' ||
        status === 'restricted' ||
        status === 'services_disabled'
      ) {
        showLocationPermissionAlert();
        return;
      }

      const isGranted = await VisitRnSdkViewManager.requestLocationPermission();

      if (isGranted) {
        sendLocationPermissionStatus(true);
        return;
      }

      const updatedStatus =
        await VisitRnSdkViewManager.getLocationPermissionStatus();

      if (
        updatedStatus === 'denied' ||
        updatedStatus === 'restricted' ||
        updatedStatus === 'services_disabled'
      ) {
        showLocationPermissionAlert();
        return;
      }

      sendLocationPermissionStatus(false);
    } catch (error) {
      if (isLoggingEnabled) {
        console.warn('Location permission failed: ', error);
      }
      sendLocationPermissionStatus(false);
    }
  }, [
    isLoggingEnabled,
    sendLocationPermissionStatus,
    showLocationPermissionAlert,
  ]);

  const handleMessage = async (event) => {
    const data = JSON.parse(unescapeHTML(event.nativeEvent.data));
    const { method, url } = data;
    console.log('handleMessage data is', data);
    console.log(unescapeHTML(event.nativeEvent.data));
    switch (method) {
      case 'UPDATE_PLATFORM':
        webviewRef.current?.injectJavaScript('window.setSdkPlatform("IOS")');
        break;
      case 'OPEN_PDF':
        Linking.openURL(url);
        break;
      case 'closeView':
        EventRegister.emitEvent(visitEvent, {
          message: 'closeView',
        });
        break;
      case 'GET_LOCATION_PERMISSIONS':
        requestLocationPermission();
        break;

      default:
        break;
    }
  };

  const { height, width } = Dimensions.get('screen');

  if (!source) {
    return null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white', height, width }}>
      <WebView
        ref={webviewRef}
        source={{ uri: source }}
        style={styles.webView}
        startInLoadingState={true}
        javaScriptEnabled={true}
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