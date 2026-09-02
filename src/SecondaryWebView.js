import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  PermissionsAndroid,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import WebView from 'react-native-webview';
import LocationEnabler from 'react-native-location-enabler';

const {
  PRIORITIES: { HIGH_ACCURACY },
  useLocationSettings,
  addListener,
} = LocationEnabler;

const getHttpUrl = (url) => {
  const link = typeof url === 'string' ? url.trim() : '';
  return /^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(link) ? link : '';
};

const isWebViewLocalUrl = (url) =>
  /^(about|data|blob):/i.test(typeof url === 'string' ? url.trim() : '');

const runBeforeFirst = `
      window.isNativeApp = true;
      window.platform = "ANDROID";
      window.setSdkPlatform('ANDROID');
      true; // note: this is required, or you'll sometimes get silent failures
  `;

export const checkSecondaryLocationPermissionAndSendCallback = async (
  webviewRef,
  isLoggingEnabled
) => {
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
    const finalString = 'window.checkTheGpsPermission(true)';
    console.log('listener: ' + finalString);
    webviewRef.current?.injectJavaScript(finalString);
  }
};

const SecondaryWebView = ({ link, isLoggingEnabled, onClose }) => {
  const webviewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [
    showPermissionAlreadyDeniedDialog,
    setShowPermissionAlreadyDeniedDialog,
  ] = useState(false);

  const [enabled, requestResolution] = useLocationSettings(
    {
      priority: HIGH_ACCURACY,
      alwaysShow: true,
      needBle: true,
    },
    false
  );

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
            const finalString = 'window.checkTheGpsPermission(true)';
            console.log('requestLocationPermission: ' + finalString);
            webviewRef.current?.injectJavaScript(finalString);
          }
        } else {
          setShowPermissionAlreadyDeniedDialog(true);
          console.log('Location permission denied');

          const finalString = 'window.checkTheGpsPermission(false)';
          console.log('requestLocationPermission: ' + finalString);
          webviewRef.current?.injectJavaScript(finalString);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const locationSub = addListener(({ locationEnabled }) => {
      if (locationEnabled) {
        checkSecondaryLocationPermissionAndSendCallback(
          webviewRef,
          isLoggingEnabled
        );
      }
    });

    return () => {
      locationSub?.remove();
    };
    // This intentionally mirrors the existing primary WebView listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMessage = (event) => {
    if (event.nativeEvent.data != null) {
      try {
        if (isLoggingEnabled) {
          console.log('Secondary WebView event received');
        }

        const parsedObject = JSON.parse(event.nativeEvent.data);

        switch (parsedObject.method) {
          case 'GET_LOCATION_PERMISSIONS':
            requestLocationPermission();
            break;
          case 'OPEN_PDF':
            Linking.openURL(parsedObject.url);
            break;
          case 'OPEN_FACE_SCAN_FLOW':
            EventRegister.emitEvent('visit-event', {
              message: 'OPEN_FACE_SCAN_FLOW',
            });
            break;
          case 'OPEN_SECONDARY_WEB_VIEW':
            break;
          default:
            break;
        }
      } catch (exception) {
        console.log('Exception occured:' + exception.message);
      }
    }
  };

  const handleRequestClose = useCallback(() => {
    if (canGoBack && webviewRef.current) {
      webviewRef.current.goBack();
      return;
    }

    onClose();
  }, [canGoBack, onClose]);

  const source = getHttpUrl(link);
  if (!source) {
    return null;
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleRequestClose}
      visible={true}
    >
      <SafeAreaView style={styles.container}>
        <WebView
          ref={webviewRef}
          source={{
            uri: source,
            headers: {
              platform: 'ANDROID',
            },
          }}
          onShouldStartLoadWithRequest={(request) => {
            if (request.isTopFrame === false) {
              return true;
            }
            if (getHttpUrl(request.url) || isWebViewLocalUrl(request.url)) {
              return true;
            }
            Linking.openURL(request.url).catch((error) => {
              if (isLoggingEnabled) {
                console.warn('Linking.openURL error: ', error);
              }
            });
            return false;
          }}
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={runBeforeFirst}
          javaScriptEnabled={true}
          mediaPlaybackRequiresUserAction={false}
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
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});

export default SecondaryWebView;
