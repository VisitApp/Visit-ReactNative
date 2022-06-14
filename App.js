import React, {useRef, useEffect, useState, useCallback} from 'react';

import {
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  Button,
  NativeModules,
  PermissionsAndroid,
  BackHandler,
} from 'react-native';

import WebView from 'react-native-webview';

const HelloWorldApp = () => {
  const webviewRef = useRef(null);

  const DEFAULT_CLIENT_ID =
    '476467749625-f9hnkuihk4dcin8n0so8ffjgsvn07lb5.apps.googleusercontent.com';

  const BASEURL = 'https://star-health.getvisitapp.xyz/';

  const requestActivityRecognitionPermission = async () => {
    console.log('inside requestActivityRecognitionPermission()');
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        {
          title: 'Need Activity Recognition Permission',
          message: 'This needs access to your Fitness Permission',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('ACTIVITY_RECOGNITION granted');
        askForGoogleFitPermission();
      } else {
        console.log('Fitness permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  };

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
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Location permission granted');
      } else {
        console.log('Fitness permission denied');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const askForGoogleFitPermission = async () => {
    try {
      NativeModules.GoogleFitPermissionModule.initiateSDK(DEFAULT_CLIENT_ID);

      const isPermissionGranted =
        await NativeModules.GoogleFitPermissionModule.askForFitnessPermission();
      if (isPermissionGranted == 'GRANTED') {
        getDailyFitnessData();
      }
      console.log(`Google Fit Permissionl: ${isPermissionGranted}`);
    } catch (e) {
      console.error(e);
    }
  };

  const getDailyFitnessData = () => {
    console.log('getDailyFitnessData() called');

    NativeModules.GoogleFitPermissionModule.initiateSDK(DEFAULT_CLIENT_ID);

    NativeModules.GoogleFitPermissionModule.requestDailyFitnessData(data => {
      console.log(`getDailyFitnessData() data: ` + data);
      webviewRef.current.injectJavaScript(data);
    });
  };

  const requestActivityData = (type, frequency, timeStamp) => {
    console.log('requestActivityData() called');

    NativeModules.GoogleFitPermissionModule.initiateSDK(DEFAULT_CLIENT_ID);

    NativeModules.GoogleFitPermissionModule.requestActivityDataFromGoogleFit(
      type,
      frequency,
      timeStamp,
      data => {
        console.log(`requestActivityData() data: ` + data);
        webviewRef.current.injectJavaScript('window.' + data);
      },
    );
  };

  const updateApiBaseUrl = (
    apiBaseUrl,
    authtoken,
    googleFitLastSync,
    gfHourlyLastSync,
  ) => {
    console.log('updateApiBaseUrl() called.');
    NativeModules.GoogleFitPermissionModule.initiateSDK(DEFAULT_CLIENT_ID);

    NativeModules.GoogleFitPermissionModule.updateApiBaseUrl(
      apiBaseUrl,
      authtoken,
      googleFitLastSync,
      gfHourlyLastSync,
    );
  };

  const runBeforeFirst = `
        window.isNativeApp = true;
        window.platform = "ANDROID";
        window.setSdkPlatform('ANDROID');
        true; // note: this is required, or you'll sometimes get silent failures
    `;

  const handleMessage = event => {
    console.log(event);

    if (event.nativeEvent.data != null) {
      try {
        const parsedObject = JSON.parse(event.nativeEvent.data);
        if (parsedObject.method != null) {
          switch (parsedObject.method) {
            case 'CONNECT_TO_GOOGLE_FIT':
              requestActivityRecognitionPermission();
              break;
            case 'UPDATE_PLATFORM':
              webviewRef.current?.injectJavaScript(
                'window.setSdkPlatform("ANDROID")',
              );
              break;
            case 'UPDATE_API_BASE_URL':
              {
                let apiBaseUrl = parsedObject.apiBaseUrl;
                let authtoken = parsedObject.authtoken;

                let googleFitLastSync = parsedObject.googleFitLastSync;
                let gfHourlyLastSync = parsedObject.gfHourlyLastSync;

                console.log(
                  'apiBaseUrl: ' +
                    apiBaseUrl +
                    ' authtoken: ' +
                    authtoken +
                    ' googleFitLastSync: ' +
                    googleFitLastSync +
                    ' gfHourlyLastSync: ' +
                    gfHourlyLastSync,
                );

                updateApiBaseUrl(
                  apiBaseUrl,
                  authtoken,
                  googleFitLastSync,
                  gfHourlyLastSync,
                );
              }
              break;
            case 'GET_DATA_TO_GENERATE_GRAPH':
              {
                let type = parsedObject.type;
                let frequency = parsedObject.frequency;
                let timeStamp = parsedObject.timestamp;

                console.log(
                  'type: ' +
                    type +
                    ' frequency:' +
                    frequency +
                    ' timeStamp: ' +
                    timeStamp,
                );

                requestActivityData(type, frequency, timeStamp);
              }
              break;
            case 'GET_LOCATION_PERMISSIONS':
              {
                requestLocationPermission();
              }
              break;
            case 'CLOSE_VIEW':
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

    switch (event.nativeEvent.data) {
    }
  };

  const [canGoBack, setCanGoBack] = useState(false);

  const handleBack = useCallback(() => {
    if (canGoBack && webviewRef.current) {
      webviewRef.current.goBack();
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
    <SafeAreaView style={{flex: 1}}>
      <WebView
        ref={webviewRef}
        source={{
          uri: 'https://star-health.getvisitapp.xyz/login',
          headers: {
            platform: 'ANDROID',
          },
        }}
        onMessage={handleMessage}
        injectedJavaScriptBeforeContentLoaded={runBeforeFirst}
        javaScriptEnabled={true}
        onLoadProgress={event => setCanGoBack(event.nativeEvent.canGoBack)}
      />
    </SafeAreaView>
  );
};

export default HelloWorldApp;
