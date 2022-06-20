"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.updateApiBaseUrl = exports.requestLocationPermission = exports.requestActivityRecognitionPermission = exports.requestActivityData = exports.handleMessage = void 0;

var _reactNative = require("react-native");

const requestActivityRecognitionPermission = async webviewRef => {
  console.log('inside requestActivityRecognitionPermission()');

  try {
    const granted = await _reactNative.PermissionsAndroid.request(_reactNative.PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION, {
      title: 'Need Activity Recognition Permission',
      message: 'This needs access to your Fitness Permission',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK'
    });

    if (granted === _reactNative.PermissionsAndroid.RESULTS.GRANTED) {
      console.log('ACTIVITY_RECOGNITION granted');
      askForGoogleFitPermission(webviewRef);
    } else {
      console.log('Fitness permission denied');
    }
  } catch (err) {
    console.warn(err);
  }
};

exports.requestActivityRecognitionPermission = requestActivityRecognitionPermission;

const askForGoogleFitPermission = async webviewRef => {
  try {
    _reactNative.NativeModules.VisitFitnessModule.initiateSDK();

    const isPermissionGranted = await _reactNative.NativeModules.VisitFitnessModule.askForFitnessPermission();

    if (isPermissionGranted == 'GRANTED') {
      getDailyFitnessData(webviewRef);
    }

    console.log(`Google Fit Permissionl: ${isPermissionGranted}`);
  } catch (e) {
    console.error(e);
  }
};

const getDailyFitnessData = webviewRef => {
  console.log('getDailyFitnessData() called');

  _reactNative.NativeModules.VisitFitnessModule.requestDailyFitnessData(data => {
    console.log(`getDailyFitnessData() data: ` + data);
    webviewRef.current.injectJavaScript(data);
  });
};

const requestActivityData = (type, frequency, timeStamp, webviewRef) => {
  console.log('requestActivityData() called');

  _reactNative.NativeModules.VisitFitnessModule.requestActivityDataFromGoogleFit(type, frequency, timeStamp, data => {
    console.log(`requestActivityData() data: ` + data);
    webviewRef.current.injectJavaScript('window.' + data);
  });
};

exports.requestActivityData = requestActivityData;

const requestLocationPermission = async () => {
  try {
    const granted = await _reactNative.PermissionsAndroid.request(_reactNative.PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
      title: 'Need Location Permission',
      message: 'Need access to location permission',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK'
    });

    if (granted === _reactNative.PermissionsAndroid.RESULTS.GRANTED) {
      console.log('Location permission granted');
    } else {
      console.log('Fitness permission denied');
    }
  } catch (e) {
    console.error(e);
  }
};

exports.requestLocationPermission = requestLocationPermission;

const updateApiBaseUrl = (apiBaseUrl, authtoken, googleFitLastSync, gfHourlyLastSync) => {
  console.log('updateApiBaseUrl() called.');

  _reactNative.NativeModules.VisitFitnessModule.initiateSDK();

  _reactNative.NativeModules.VisitFitnessModule.updateApiBaseUrl(apiBaseUrl, authtoken, googleFitLastSync, gfHourlyLastSync);
};

exports.updateApiBaseUrl = updateApiBaseUrl;

const handleMessage = (event, webviewRef) => {
  var _webviewRef$current;

  console.log('event:' + event + ' webviewRef: ' + webviewRef);

  if (event.nativeEvent.data != null) {
    try {
      const parsedObject = JSON.parse(event.nativeEvent.data);

      if (parsedObject.method != null) {
        switch (parsedObject.method) {
          case 'CONNECT_TO_GOOGLE_FIT':
            requestActivityRecognitionPermission(webviewRef);
            break;

          case 'UPDATE_PLATFORM':
            (_webviewRef$current = webviewRef.current) === null || _webviewRef$current === void 0 ? void 0 : _webviewRef$current.injectJavaScript('window.setSdkPlatform("ANDROID")');
            break;

          case 'UPDATE_API_BASE_URL':
            {
              let apiBaseUrl = parsedObject.apiBaseUrl;
              let authtoken = parsedObject.authtoken;
              let googleFitLastSync = parsedObject.googleFitLastSync;
              let gfHourlyLastSync = parsedObject.gfHourlyLastSync;
              console.log('apiBaseUrl: ' + apiBaseUrl + ' authtoken: ' + authtoken + ' googleFitLastSync: ' + googleFitLastSync + ' gfHourlyLastSync: ' + gfHourlyLastSync);
              updateApiBaseUrl(apiBaseUrl, authtoken, googleFitLastSync, gfHourlyLastSync);
            }
            break;

          case 'GET_DATA_TO_GENERATE_GRAPH':
            {
              let type = parsedObject.type;
              let frequency = parsedObject.frequency;
              let timeStamp = parsedObject.timestamp;
              console.log('type: ' + type + ' frequency:' + frequency + ' timeStamp: ' + timeStamp);
              requestActivityData(type, frequency, timeStamp, webviewRef);
            }
            break;

          case 'GET_LOCATION_PERMISSIONS':
            {
              requestLocationPermission();
            }
            break;

          case 'CLOSE_VIEW':
            {}
            break;

          case 'OPEN_PDF':
            let hraUrl = parsedObject.url;

            _reactNative.NativeModules.VisitFitnessModule.openHraLink(hraUrl);

            console.log('HRA URL:' + hraUrl);
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

exports.handleMessage = handleMessage;
//# sourceMappingURL=VisitPluginAndroid.js.map