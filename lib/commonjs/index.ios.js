"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.fetchHourlyFitnessData = exports.fetchDailyFitnessData = exports.default = void 0;

var _axios = _interopRequireDefault(require("axios"));

var _react = _interopRequireWildcard(require("react"));

var _reactNative = require("react-native");

var _reactNativeWebview = require("react-native-webview");

var _reactNativeDeviceInfo = _interopRequireDefault(require("react-native-device-info"));

var _Services = require("./Services");

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const LINKING_ERROR = "The package 'Visit-ReactNative' doesn't seem to be linked. Make sure: \n\n" + _reactNative.Platform.select({
  ios: "- You have run 'pod install'\n",
  default: ""
}) + "- You rebuilt the app after installing the package\n" + "- You are not using Expo managed workflow\n";
const escapeChars = {
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  amp: "&"
};

const unescapeHTML = str => // modified from underscore.string and string.js
str.replace(/\&([^;]+);/g, (entity, entityCode) => {
  let match;

  if (entityCode in escapeChars) {
    return escapeChars[entityCode];
  } else if (match = entityCode.match(/^#x([\da-fA-F]+)$/)) {
    return String.fromCharCode(parseInt(match[1], 16));
  } else if (match = entityCode.match(/^#(\d+)$/)) {
    return String.fromCharCode(~~match[1]);
  } else {
    return entity;
  }
});

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
  const [source, setSource] = (0, _react.useState)("");
  const [loading, setLoading] = (0, _react.useState)(true);
  (0, _react.useEffect)(() => {
    var _magicLink$trim;

    if (magicLink !== null && magicLink !== void 0 && (_magicLink$trim = magicLink.trim()) !== null && _magicLink$trim !== void 0 && _magicLink$trim.length) {
      setSource(magicLink);
    } else {
      const systemVersion = _reactNativeDeviceInfo.default.getSystemVersion();

      const version = _reactNativeDeviceInfo.default.getVersion();

      _reactNativeDeviceInfo.default.getUniqueId().then(uniqueId => (0, _Services.getWebViewLink)(baseUrl, token, phone, id, "iPhone", uniqueId, version, systemVersion)).then(res => {
        var _moduleName$trim;

        let magicLink = res.data.result;

        if (moduleName !== null && moduleName !== void 0 && (_moduleName$trim = moduleName.trim()) !== null && _moduleName$trim !== void 0 && _moduleName$trim.length) {
          magicLink += `&tab=${magicLink}`;
        }

        if (isLoggingEnabled) {
          console.log("webviewlink is", {
            magicLink
          });
        }

        setSource(magicLink);
      }).catch(err => {
        const errorMessage = err.errMessage;
        const errorUrl = `${baseUrl}/star-health?error=${errorMessage}`;
        setSource(errorUrl);

        if (isLoggingEnabled) {
          console.log("webviewlink is", {
            errorUrl
          });
        }
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [id, token, baseUrl, phone, moduleName, magicLink]);
  const VisitHealthRn = (0, _react.useMemo)(() => _reactNative.NativeModules.VisitHealthRn ? _reactNative.NativeModules.VisitHealthRn : new Proxy({}, {
    get() {
      throw new Error(LINKING_ERROR);
    }

  }), []);
  const webviewRef = (0, _react.useRef)(null);
  const [apiBaseUrl, setApiBaseUrl] = (0, _react.useState)("");
  const [authToken, setAuthToken] = (0, _react.useState)("");
  const [hasLoadedOnce, setHasLoadedOnce] = (0, _react.useState)(false);
  const callSyncApi = (0, _react.useCallback)(data => _axios.default.post(`${apiBaseUrl}/users/data-sync`, data, {
    headers: {
      Authorization: authToken
    }
  }).then(res => console.log("callSyncData response,", res)).catch(err => console.log("callSyncData err,", {
    err
  })), [apiBaseUrl, authToken]);
  const callEmbellishApi = (0, _react.useCallback)(data => _axios.default.post(`${apiBaseUrl}/users/embellish-sync`, data, {
    headers: {
      Authorization: authToken
    }
  }).then(res => console.log("callEmbellishApi response,", res)).catch(err => console.log("callEmbellishApi err,", {
    err
  })), [apiBaseUrl, authToken]);
  (0, _react.useEffect)(() => {
    const apiManagerEmitter = new _reactNative.NativeEventEmitter(VisitHealthRn);
    const subscription = apiManagerEmitter.addListener("EventReminder", reminder => {
      var _reminder$callSyncDat, _reminder$callEmbelli;

      if (reminder !== null && reminder !== void 0 && reminder.callSyncData && reminder !== null && reminder !== void 0 && (_reminder$callSyncDat = reminder.callSyncData) !== null && _reminder$callSyncDat !== void 0 && _reminder$callSyncDat.length) {
        callSyncApi(reminder === null || reminder === void 0 ? void 0 : reminder.callSyncData[0]);
      }

      if (reminder !== null && reminder !== void 0 && reminder.callEmbellishApi && reminder !== null && reminder !== void 0 && (_reminder$callEmbelli = reminder.callEmbellishApi) !== null && _reminder$callEmbelli !== void 0 && _reminder$callEmbelli.length) {
        callEmbellishApi(reminder === null || reminder === void 0 ? void 0 : reminder.callEmbellishApi[0]);
      }
    });
    return () => {
      subscription.remove();
    };
  }, [VisitHealthRn, callEmbellishApi, callSyncApi]);

  const handleMessage = async event => {
    var _webviewRef$current, _webviewRef$current5;

    const data = JSON.parse(unescapeHTML(event.nativeEvent.data));
    const {
      method,
      type,
      frequency,
      timestamp,
      apiBaseUrl,
      authtoken,
      googleFitLastSync,
      gfHourlyLastSync,
      url
    } = data;
    console.log("handleMessage data is", data);
    console.log(unescapeHTML(event.nativeEvent.data));

    switch (method) {
      case "UPDATE_PLATFORM":
        (_webviewRef$current = webviewRef.current) === null || _webviewRef$current === void 0 ? void 0 : _webviewRef$current.injectJavaScript('window.setSdkPlatform("IOS")');
        break;

      case "CONNECT_TO_GOOGLE_FIT":
        VisitHealthRn === null || VisitHealthRn === void 0 ? void 0 : VisitHealthRn.connectToAppleHealth(res => {
          if (res !== null && res !== void 0 && res.sleepTime || res !== null && res !== void 0 && res.numberOfSteps) {
            var _webviewRef$current2;

            (_webviewRef$current2 = webviewRef.current) === null || _webviewRef$current2 === void 0 ? void 0 : _webviewRef$current2.injectJavaScript(`window.updateFitnessPermissions(true,${res === null || res === void 0 ? void 0 : res.numberOfSteps},${res === null || res === void 0 ? void 0 : res.sleepTime})`);
          } else {
            var _webviewRef$current3;

            (_webviewRef$current3 = webviewRef.current) === null || _webviewRef$current3 === void 0 ? void 0 : _webviewRef$current3.injectJavaScript("window.updateFitnessPermissions(true,0,0)");
          }
        });
        break;

      case "GET_DATA_TO_GENERATE_GRAPH":
        VisitHealthRn === null || VisitHealthRn === void 0 ? void 0 : VisitHealthRn.renderGraph({
          type,
          frequency,
          timestamp
        }, (err, results) => {
          if (err) {
            console.log("error initializing Healthkit: ", err);
            return;
          }

          if (results[0]) {
            var _webviewRef$current4;

            console.log("results initializing Healthkit: ", results[0]);
            (_webviewRef$current4 = webviewRef.current) === null || _webviewRef$current4 === void 0 ? void 0 : _webviewRef$current4.injectJavaScript(`window.${results[0]}`);
          }
        });
        break;

      case "UPDATE_API_BASE_URL":
        if (!hasLoadedOnce) {
          console.log("apiBaseUrl is,", apiBaseUrl);
          setApiBaseUrl(apiBaseUrl);
          setAuthToken(authtoken);
          VisitHealthRn === null || VisitHealthRn === void 0 ? void 0 : VisitHealthRn.updateApiUrl({
            googleFitLastSync,
            gfHourlyLastSync
          });
          setHasLoadedOnce(true);
        }

        break;

      case "OPEN_PDF":
        _reactNative.Linking.openURL(url);

        break;

      case "CLOSE_VIEW":
        break;

      case "GET_LOCATION_PERMISSIONS":
        (_webviewRef$current5 = webviewRef.current) === null || _webviewRef$current5 === void 0 ? void 0 : _webviewRef$current5.injectJavaScript("window.checkTheGpsPermission(true)");
        break;

      default:
        break;
    }
  };

  console.log("source: ", source);
  return /*#__PURE__*/_react.default.createElement(_reactNative.SafeAreaView, {
    style: styles.webViewContainer
  }, loading ? /*#__PURE__*/_react.default.createElement(LoadingIndicator, null) : /*#__PURE__*/_react.default.createElement(_reactNativeWebview.WebView, {
    ref: webviewRef,
    source: {
      uri: source
    },
    style: styles.webView,
    javascriptEnabled: true,
    onMessage: handleMessage
  }));
};

const styles = _reactNative.StyleSheet.create({
  webViewContainer: {
    flex: 1,
    backgroundColor: "white"
  },
  webView: {
    flex: 1
  }
});

VisitHealthView.defaultProps = {
  id: "",
  token: "",
  baseUrl: "",
  phone: "",
  moduleName: ""
};
var _default = VisitHealthView;
exports.default = _default;

const fetchHourlyFitnessData = timestamp => {
  return new Promise((resolve, reject) => {
    var _NativeModules$VisitH;

    _reactNative.NativeModules === null || _reactNative.NativeModules === void 0 ? void 0 : (_NativeModules$VisitH = _reactNative.NativeModules.VisitHealthRn) === null || _NativeModules$VisitH === void 0 ? void 0 : _NativeModules$VisitH.fetchHourlyData(timestamp).then(res => {
      if (Array.isArray(res) && res.length) {
        resolve(res[0]);
      } else {
        reject("Error fetching hourly data");
      }
    }).catch(err => reject(err));
  });
};

exports.fetchHourlyFitnessData = fetchHourlyFitnessData;

const fetchDailyFitnessData = timestamp => {
  return new Promise((resolve, reject) => {
    var _NativeModules$VisitH2;

    _reactNative.NativeModules === null || _reactNative.NativeModules === void 0 ? void 0 : (_NativeModules$VisitH2 = _reactNative.NativeModules.VisitHealthRn) === null || _NativeModules$VisitH2 === void 0 ? void 0 : _NativeModules$VisitH2.fetchDailyData(timestamp).then(res => {
      if (Array.isArray(res) && res.length) {
        resolve(res[0]);
      } else {
        reject("Error fetching daily data");
      }
    }).catch(err => reject(err));
  });
};

exports.fetchDailyFitnessData = fetchDailyFitnessData;

const LoadingIndicator = () => {
  return /*#__PURE__*/_react.default.createElement(_reactNative.ActivityIndicator, {
    color: "#000",
    size: "small",
    style: {
      flex: 1,
      zIndex: 100,
      position: "absolute",
      backgroundColor: "#fff",
      opacity: 0.4,
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center"
    }
  });
};
//# sourceMappingURL=index.ios.js.map