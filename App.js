import React, {useRef, Component, useEffect} from 'react';

import {
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  Button,
  NativeModules,
  PermissionsAndroid,
  LogBox,
} from 'react-native';

import WebView from 'react-native-webview';

const HelloWorldApp = () => {
  const webviewRef = useRef(null);

  console.log('hello world 13456');

  const onSubmit = async () => {
    try {
      const eventId = await NativeModules.CalendarModule.createCalendarEvent(
        'Party',
        'My House',
      );
      console.log(`Created a new event with id ${eventId}`);
    } catch (e) {
      console.error(e);
    }
  };

  const onImagePick = async () => {
    try {
      const imageUri = await NativeModules.ImagePickerModule.pickImage();
      console.log(`Image Uri: ${imageUri}`);
    } catch (e) {
      console.error(e);
    }
  };

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
        console.log('You can google fit now');
        askForGoogleFitPermission();
      } else {
        console.log('Fitness permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  //todo: call this when the webpage is loaded completely automatically.
  const askForGoogleFitPermission = async () => {
    try {
      NativeModules.GoogleFitPermissionModule.initiateSDK(
        DEFAULT_CLIENT_ID,
        BASEURL,
      );

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

    NativeModules.GoogleFitPermissionModule.initiateSDK(
      DEFAULT_CLIENT_ID,
      BASEURL,
    );

    NativeModules.GoogleFitPermissionModule.requestDailyFitnessData(data => {
      console.log(`getDailyFitnessData() data: ` + data);
      webviewRef.current.injectJavaScript(data);
    });
  };

  const requestActivityData = (type, frequency, timeStamp) => {
    console.log('requestActivityData() called');

    NativeModules.GoogleFitPermissionModule.initiateSDK(
      DEFAULT_CLIENT_ID,
      BASEURL,
    );

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

  // //this is used when the url is loaded for the first time and we send the url data to our backend server.
  // const updateApiBaseUrl = () => {
  //   NativeModules.GoogleFitPermissionModule.updateApiBaseUrl();
  // };

  const runBeforeFirst = `
        window.isNativeApp = true;
        window.platform = "ANDROID";
        window.setSdkPlatform('ANDROID');
        true; // note: this is required, or you'll sometimes get silent failures
    `;

  const html = `
        <html>
        <head></head>
        <body>
        <button onclick="msgprint()">Connect to Google Fit</button>
          <script>
          
            function msgprint() { 
              window.ReactNativeWebView.postMessage("CONNECT_TO_GOOGLE_FIT")
            }  
          </script>
        </body>
        </html>
      `;

  const handleMessage = event => {
    console.log(event);

    switch (event.nativeEvent.data) {
      case 'CONNECT_TO_GOOGLE_FIT':
        requestActivityRecognitionPermission();
        break;
      case 'UPDATE_PLATFORM':
        webviewRef.current?.injectJavaScript(
          'window.setSdkPlatform("ANDROID")',
        );
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={{flex: 1}}>
      <Button title="Click me" onPress={() => alert('This is an alert')} />
      <Button
        title="Click to invoke the native module here!"
        color="#841584"
        onPress={onSubmit}
      />
      <Button
        title="Click to pick image"
        color="#841584"
        onPress={onImagePick}
      />
      <Button
        title="Click to Ask for Google Fit Permission"
        color="#841584"
        onPress={() => {
          requestActivityRecognitionPermission();
        }}
      />
      <Button
        title="Click to request Data of particular date"
        color="#841584"
        onPress={() => {
          requestActivityData('steps', 'day', 1654509069463.0);
        }}
      />

      <Button
        title="Click to get Daily fitness data"
        color="#841584"
        onPress={() => {
          getDailyFitnessData();
        }}
      />

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
      />
    </SafeAreaView>
  );
};

// const onPress = () => {
//   NativeModules.CalendarModule.createCalendarEvent(
//     'testName',
//     'testLocation',
//     error => {
//       console.error(`Error found! ${error}`);
//     },
//     eventId => {
//       console.log(`event id ${eventId} returned`);
//     },
//   );
// };

export default HelloWorldApp;
