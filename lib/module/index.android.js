import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SafeAreaView, NativeModules, PermissionsAndroid, BackHandler, Linking } from 'react-native';
import WebView from 'react-native-webview';
import LocationEnabler from 'react-native-location-enabler';
import DeviceInfo from 'react-native-device-info';
import axios from 'axios';
const {
  PRIORITIES: {
    HIGH_ACCURACY
  },
  useLocationSettings,
  addListener
} = LocationEnabler;

const VisitHealthView = _ref => {
  let {
    magicLinkBaseUrl,
    errorBaseUrl,
    token,
    id,
    phone,
    moduleName,
    environment,
    magicLink,
    isLoggingEnabled
  } = _ref;
  const [source, setSource] = useState('');
  useEffect(() => {
    var _magicLink$trim;

    if (((magicLink === null || magicLink === void 0 ? void 0 : (_magicLink$trim = magicLink.trim()) === null || _magicLink$trim === void 0 ? void 0 : _magicLink$trim.length) || 0) > 0) {
      setSource(magicLink);
    } else {
      DeviceInfo.getAndroidId().then(deviceId => {
        var buildNumber = DeviceInfo.getBuildNumber();
        let systemVersion = DeviceInfo.getSystemVersion();
        let version = DeviceInfo.getVersion();

        if (isLoggingEnabled) {
          console.log('buildNumber:' + buildNumber + ' systemVersion:' + systemVersion + ' version : ' + version + ' deviceId', deviceId);
        }

        var finalEndPoint = `${magicLinkBaseUrl}/partners/v2/generate-magic-link-star-health`;

        if (isLoggingEnabled) {
          console.log('finalEndPoint: ' + finalEndPoint);
        }

        axios.post(finalEndPoint, {
          token: token,
          phone: phone,
          sId: id,
          srcClientId: 'Android',
          deviceId: deviceId,
          appVersion: version,
          deviceVersion: systemVersion,
          userEnv: environment
        }).then(response => {
          var data = response.data;
          var visitMagicLink = data.result;
          var errorMessage = data.errorMessage;

          if (data.message === 'success') {
            var _moduleName$trim;

            if (((moduleName === null || moduleName === void 0 ? void 0 : (_moduleName$trim = moduleName.trim()) === null || _moduleName$trim === void 0 ? void 0 : _moduleName$trim.length) || 0) > 0) {
              visitMagicLink += `&tab=${moduleName}`;
            }

            if (isLoggingEnabled) {
              console.log('magicLink: ' + visitMagicLink);
            }

            setSource(visitMagicLink);
          } else {
            var errorUrl = `${errorBaseUrl}/star-health?error=${errorMessage}`;
            setSource(errorUrl);

            if (isLoggingEnabled) {
              console.log('erorMessage: ' + data.errorMessage + ' errorUrl: ' + errorUrl);
            }
          }
        }).catch(error => {
          if (isLoggingEnabled) {
            console.log('error: ' + error);
          }
        });
      }).catch(err => {
        if (isLoggingEnabled) {
          console.log('getDeviceInfo err', err);
        }
      });
    }
  }, [id, token, magicLinkBaseUrl, errorBaseUrl, phone, moduleName, environment, magicLink, isLoggingEnabled]);
  const [enabled, requestResolution] = useLocationSettings({
    priority: HIGH_ACCURACY,
    // default BALANCED_POWER_ACCURACY
    alwaysShow: true,
    // default false
    needBle: true // default false

  }, false
  /* optional: default undefined */
  );
  const webviewRef = useRef(null);

  const requestActivityRecognitionPermission = async () => {
    console.log('inside requestActivityRecognitionPermission()');

    try {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION, {
        title: 'Need Activity Recognition Permission',
        message: 'This needs access to your Fitness Permission',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK'
      });

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
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
        title: 'Need Location Permission',
        message: 'Need access to location permission',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK'
      });

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Location permission granted');

        if (!enabled) {
          requestResolution();
        } else {
          var _webviewRef$current;

          var finalString = `window.checkTheGpsPermission(true)`;
          console.log('requestLocationPermission: ' + finalString);
          (_webviewRef$current = webviewRef.current) === null || _webviewRef$current === void 0 ? void 0 : _webviewRef$current.injectJavaScript(finalString);
        }
      } else {
        console.log('Location permission denied');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const askForGoogleFitPermission = async () => {
    try {
      NativeModules.VisitFitnessModule.initiateSDK(isLoggingEnabled);
      const isPermissionGranted = await NativeModules.VisitFitnessModule.askForFitnessPermission();

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
    NativeModules.VisitFitnessModule.requestDailyFitnessData(data => {
      var _webviewRef$current2;

      // console.log(`getDailyFitnessData() data: ` + data);
      (_webviewRef$current2 = webviewRef.current) === null || _webviewRef$current2 === void 0 ? void 0 : _webviewRef$current2.injectJavaScript(data);
    });
  };

  const requestActivityData = (type, frequency, timeStamp) => {
    console.log('requestActivityData() called');
    NativeModules.VisitFitnessModule.requestActivityDataFromGoogleFit(type, frequency, timeStamp, data => {
      var _webviewRef$current3;

      // console.log(`requestActivityData() data: ` + data);
      (_webviewRef$current3 = webviewRef.current) === null || _webviewRef$current3 === void 0 ? void 0 : _webviewRef$current3.injectJavaScript('window.' + data);
    });
  };

  const updateApiBaseUrl = (apiBaseUrl, authtoken, googleFitLastSync, gfHourlyLastSync) => {
    console.log('updateApiBaseUrl() called.');
    NativeModules.VisitFitnessModule.initiateSDK(isLoggingEnabled);
    NativeModules.VisitFitnessModule.updateApiBaseUrl(apiBaseUrl, authtoken, googleFitLastSync, gfHourlyLastSync);
  };

  const runBeforeFirst = `
        window.isNativeApp = true;
        window.platform = "ANDROID";
        window.setSdkPlatform('ANDROID');
        true; // note: this is required, or you'll sometimes get silent failures
    `;

  const handleMessage = event => {
    var _webviewRef$current4;

    if (event.nativeEvent.data != null) {
      try {
        // console.log("Event :"+event.nativeEvent.data);
        const parsedObject = JSON.parse(event.nativeEvent.data);

        if (parsedObject.method != null) {
          switch (parsedObject.method) {
            case 'CONNECT_TO_GOOGLE_FIT':
              if (parseInt(DeviceInfo.getSystemVersion(), 10) >= 10) {
                requestActivityRecognitionPermission();
              } else {
                askForGoogleFitPermission();
              }

              break;

            case 'UPDATE_PLATFORM':
              (_webviewRef$current4 = webviewRef.current) === null || _webviewRef$current4 === void 0 ? void 0 : _webviewRef$current4.injectJavaScript('window.setSdkPlatform("ANDROID")');
              break;

            case 'UPDATE_API_BASE_URL':
              {
                let apiBaseUrl = parsedObject.apiBaseUrl;
                let authtoken = parsedObject.authtoken;
                let googleFitLastSync = parsedObject.googleFitLastSync;
                let gfHourlyLastSync = parsedObject.gfHourlyLastSync;
                console.log('apiBaseUrl: ' + 'NOT SHOWN' + ' authtoken: ' + 'NOT SHOWN' + ' googleFitLastSync: ' + googleFitLastSync + ' gfHourlyLastSync: ' + gfHourlyLastSync);
                updateApiBaseUrl(apiBaseUrl, authtoken, googleFitLastSync, gfHourlyLastSync);
              }
              break;

            case 'GET_DATA_TO_GENERATE_GRAPH':
              {
                let type = parsedObject.type;
                let frequency = parsedObject.frequency;
                let timeStamp = parsedObject.timestamp;
                console.log('type: ' + type + ' frequency:' + frequency + ' timeStamp: ' + timeStamp);
                requestActivityData(type, frequency, timeStamp);
              }
              break;

            case 'GET_LOCATION_PERMISSIONS':
              {
                requestLocationPermission();
              }
              break;

            case 'OPEN_PDF':
              {
                let pdfUrl = parsedObject.url; // console.log("pdfUrl "+pdfUrl);

                Linking.openURL(pdfUrl);
              }
              break;

            case 'CLOSE_VIEW':
              {}
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
      var _webviewRef$current5;

      (_webviewRef$current5 = webviewRef.current) === null || _webviewRef$current5 === void 0 ? void 0 : _webviewRef$current5.goBack();
      return true;
    }

    return false;
  }, [canGoBack]);
  useEffect(() => {
    const gpsListener = addListener(_ref2 => {
      let {
        locationEnabled
      } = _ref2;

      if (locationEnabled) {
        var _webviewRef$current6;

        var finalString = `window.checkTheGpsPermission(true)`;
        console.log('listener: ' + finalString);
        (_webviewRef$current6 = webviewRef.current) === null || _webviewRef$current6 === void 0 ? void 0 : _webviewRef$current6.injectJavaScript(finalString);
      }
    });
    BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBack);
      gpsListener.remove();
    };
  }, [handleBack]);
  return /*#__PURE__*/React.createElement(SafeAreaView, {
    style: {
      flex: 1
    }
  }, source ? /*#__PURE__*/React.createElement(WebView, {
    ref: webviewRef,
    source: {
      uri: source,
      headers: {
        platform: 'ANDROID'
      }
    },
    onMessage: handleMessage,
    injectedJavaScriptBeforeContentLoaded: runBeforeFirst,
    javaScriptEnabled: true,
    onLoadProgress: event => setCanGoBack(event.nativeEvent.canGoBack)
  }) : null);
};

export const fetchDailyFitnessData = (startTimeStamp, isLoggingEnabled) => {
  return new Promise((resolve, reject) => {
    console.log('fetchDailyFitnessData called: ' + startTimeStamp);
    NativeModules.VisitFitnessModule.initiateSDK(isLoggingEnabled);
    NativeModules.VisitFitnessModule.fetchDailyFitnessData(startTimeStamp).then(result => {
      resolve(result);
    }).catch(err => reject(err));
  });
};
export const fetchHourlyFitnessData = (startTimeStamp, isLoggingEnabled) => {
  return new Promise((resolve, reject) => {
    console.log('fetchHourlyFitnessData called: ' + startTimeStamp);
    NativeModules.VisitFitnessModule.initiateSDK(isLoggingEnabled);
    NativeModules.VisitFitnessModule.fetchHourlyFitnessData(startTimeStamp).then(result => {
      resolve(result);
    }).catch(err => reject(err));
  });
};
export default VisitHealthView;
VisitHealthView.defaultProps = {
  id: '',
  token: '',
  magicLinkBaseUrl: '',
  errorBaseUrl: '',
  phone: '',
  moduleName: '',
  environment: '',
  magicLink: '',
  isLoggingEnabled: false
};
//# sourceMappingURL=index.android.js.map