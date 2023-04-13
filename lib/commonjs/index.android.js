"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchHourlyFitnessData = exports.fetchDailyFitnessData = exports.default = void 0;

var _react = _interopRequireWildcard(require("react"));

var _reactNative = require("react-native");

var _reactNativeWebview = _interopRequireDefault(require("react-native-webview"));

var _reactNativeLocationEnabler = _interopRequireDefault(require("react-native-location-enabler"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const {
  PRIORITIES: {
    HIGH_ACCURACY
  },
  useLocationSettings,
  addListener
} = _reactNativeLocationEnabler.default;

const VisitHealthView = _ref => {
  let {
    baseUrl,
    token,
    id,
    phone,
    moduleName,
    magicLink,
    isLoggingEnabled
  } = _ref;
  const [source, setSource] = (0, _react.useState)('');
  (0, _react.useEffect)(() => {
    var _magicLink$trim;

    if (((magicLink === null || magicLink === void 0 ? void 0 : (_magicLink$trim = magicLink.trim()) === null || _magicLink$trim === void 0 ? void 0 : _magicLink$trim.length) || 0) > 0) {
      setSource(magicLink);
    } else {
      DeviceInfo.getAndroidId().then(androidId => {
        console.log('getAndroidId', androidId);
        var buildNumber = DeviceInfo.getBuildNumber();
        let systemVersion = DeviceInfo.getSystemVersion();
        let version = DeviceInfo.getVersion();
      }).catch(err => console.log('getDeviceInfo err', err));
      setSource(`${baseUrl}?token=${token}&id=${id}&phone=${phone}&moduleName=${moduleName}`);
    }
  }, [id, token, baseUrl, phone, moduleName, magicLink]);
  const [enabled, requestResolution] = useLocationSettings({
    priority: HIGH_ACCURACY,
    // default BALANCED_POWER_ACCURACY
    alwaysShow: true,
    // default false
    needBle: true // default false

  }, false
  /* optional: default undefined */
  );
  const webviewRef = (0, _react.useRef)(null);

  const requestActivityRecognitionPermission = async () => {
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
      const granted = await _reactNative.PermissionsAndroid.request(_reactNative.PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
        title: 'Need Location Permission',
        message: 'Need access to location permission',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK'
      });

      if (granted === _reactNative.PermissionsAndroid.RESULTS.GRANTED) {
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
      _reactNative.NativeModules.VisitFitnessModule.initiateSDK(isLoggingEnabled);

      const isPermissionGranted = await _reactNative.NativeModules.VisitFitnessModule.askForFitnessPermission();

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

    _reactNative.NativeModules.VisitFitnessModule.requestDailyFitnessData(data => {
      // console.log(`getDailyFitnessData() data: ` + data);
      webviewRef.current.injectJavaScript(data);
    });
  };

  const requestActivityData = (type, frequency, timeStamp) => {
    console.log('requestActivityData() called');

    _reactNative.NativeModules.VisitFitnessModule.requestActivityDataFromGoogleFit(type, frequency, timeStamp, data => {
      // console.log(`requestActivityData() data: ` + data);
      webviewRef.current.injectJavaScript('window.' + data);
    });
  };

  const updateApiBaseUrl = (apiBaseUrl, authtoken, googleFitLastSync, gfHourlyLastSync) => {
    console.log('updateApiBaseUrl() called.');

    _reactNative.NativeModules.VisitFitnessModule.initiateSDK(isLoggingEnabled);

    _reactNative.NativeModules.VisitFitnessModule.updateApiBaseUrl(apiBaseUrl, authtoken, googleFitLastSync, gfHourlyLastSync);
  };

  const runBeforeFirst = `
        window.isNativeApp = true;
        window.platform = "ANDROID";
        window.setSdkPlatform('ANDROID');
        true; // note: this is required, or you'll sometimes get silent failures
    `;

  const handleMessage = event => {
    var _webviewRef$current2;

    if (event.nativeEvent.data != null) {
      try {
        // console.log("Event :"+event.nativeEvent.data);
        const parsedObject = JSON.parse(event.nativeEvent.data);

        if (parsedObject.method != null) {
          switch (parsedObject.method) {
            case 'CONNECT_TO_GOOGLE_FIT':
              requestActivityRecognitionPermission();
              break;

            case 'UPDATE_PLATFORM':
              (_webviewRef$current2 = webviewRef.current) === null || _webviewRef$current2 === void 0 ? void 0 : _webviewRef$current2.injectJavaScript('window.setSdkPlatform("ANDROID")');
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

                _reactNative.Linking.openURL(pdfUrl);
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

  const [canGoBack, setCanGoBack] = (0, _react.useState)(false);
  const handleBack = (0, _react.useCallback)(() => {
    if (canGoBack && webviewRef.current) {
      webviewRef.current.goBack();
      return true;
    }

    return false;
  }, [canGoBack]);
  (0, _react.useEffect)(() => {
    const gpsListener = addListener(_ref2 => {
      let {
        locationEnabled
      } = _ref2;

      if (locationEnabled) {
        var _webviewRef$current3;

        var finalString = `window.checkTheGpsPermission(true)`;
        console.log('listener: ' + finalString);
        (_webviewRef$current3 = webviewRef.current) === null || _webviewRef$current3 === void 0 ? void 0 : _webviewRef$current3.injectJavaScript(finalString);
      }
    });

    _reactNative.BackHandler.addEventListener('hardwareBackPress', handleBack);

    return () => {
      _reactNative.BackHandler.removeEventListener('hardwareBackPress', handleBack);

      gpsListener.remove();
    };
  }, [handleBack]);
  return /*#__PURE__*/_react.default.createElement(_reactNative.SafeAreaView, {
    style: {
      flex: 1
    }
  }, source ? /*#__PURE__*/_react.default.createElement(_reactNativeWebview.default, {
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

const fetchDailyFitnessData = (startTimeStamp, isLoggingEnabled) => {
  return new Promise((resolve, reject) => {
    console.log('fetchDailyFitnessData called: ' + startTimeStamp);

    _reactNative.NativeModules.VisitFitnessModule.initiateSDK(isLoggingEnabled);

    _reactNative.NativeModules.VisitFitnessModule.fetchDailyFitnessData(startTimeStamp).then(result => {
      resolve(result);
    }).catch(err => reject(err));
  });
};

exports.fetchDailyFitnessData = fetchDailyFitnessData;

const fetchHourlyFitnessData = (startTimeStamp, isLoggingEnabled) => {
  return new Promise((resolve, reject) => {
    console.log('fetchHourlyFitnessData called: ' + startTimeStamp);

    _reactNative.NativeModules.VisitFitnessModule.initiateSDK(isLoggingEnabled);

    _reactNative.NativeModules.VisitFitnessModule.fetchHourlyFitnessData(startTimeStamp).then(result => {
      resolve(result);
    }).catch(err => reject(err));
  });
};

exports.fetchHourlyFitnessData = fetchHourlyFitnessData;
var _default = VisitHealthView;
exports.default = _default;
VisitHealthView.defaultProps = {
  id: '',
  token: '',
  baseUrl: '',
  phone: '',
  moduleName: '',
  magicLink: '',
  isLoggingEnabled: false
};
//# sourceMappingURL=index.android.js.map