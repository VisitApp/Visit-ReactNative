import React, {Component} from 'react';

import {
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  Button,
  NativeModules,
  PermissionsAndroid,
} from 'react-native';

import WebView from 'react-native-webview';

const HelloWorldApp = () => {
  console.log('hello world 13456');
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
        onPress={requestActivityRecognitionPermission}
      />
      <MyWebComponent />
    </SafeAreaView>
  );
};

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

const askForGoogleFitPermission = async () => {
  try {
    const isPermissionGranted =
      await NativeModules.GoogleFitPermissionModule.intiateGoogleFitPermission(
        DEFAULT_CLIENT_ID,
      );
    console.log(`Google Fit Permissionl: ${isPermissionGranted}`);
  } catch (e) {
    console.error(e);
  }
};

const requestActivityRecognitionPermission = async () => {
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
      {
        title: 'Cool Photo App Camera Permission',
        message:
          'Cool Photo App needs access to your camera ' +
          'so you can take awesome pictures.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );
    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('You can use the camera');
      askForGoogleFitPermission();
    } else {
      console.log('Camera permission denied');
    }
  } catch (err) {
    console.warn(err);
  }
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

const runBeforeFirst = `
      window.isNativeApp = true;
      window.platform = "ANDROID";
      true; // note: this is required, or you'll sometimes get silent failures
  `;

export default HelloWorldApp;

class MyWebComponent extends Component {
  handleMessage = event => {
    console.log('event:' + event.nativeEvent.data);
  };
  render() {
    return (
      <WebView
        source={{
          uri: 'https://star-health.getvisitapp.xyz/login',
          headers: {
            platform: 'ANDROID',
          },
        }}
        onMessage={this.handleMessage}
        injectedJavaScriptBeforeContentLoaded={runBeforeFirst}
        javaScriptEnabled={true}
      />
    );
  }
}
