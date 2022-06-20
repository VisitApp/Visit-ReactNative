"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireWildcard(require("react"));

var _reactNative = require("react-native");

var _VisitPluginAndroid = require("./VisitPluginAndroid");

var _reactNativeWebview = _interopRequireDefault(require("react-native-webview"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function getRunBeforeFirst(platform) {
  let runBeforeFirst = null;

  if (_reactNative.Platform.OS == 'android') {
    runBeforeFirst = `
        window.isNativeApp = true;
        window.platform = "ANDROID";
        window.setSdkPlatform('ANDROID');
        true; // note: this is required, or you'll sometimes get silent failures
    `;
  } else if (_reactNative.Platform.OS == 'ios') {
    runBeforeFirst = `
        window.isNativeApp = true;
        window.platform = "IOS";
        window.setSdkPlatform('IOS');
        true; // note: this is required, or you'll sometimes get silent failures
    `;
  }

  console.log('runBeforeFirst: ' + runBeforeFirst);
  return runBeforeFirst;
}

const VisitHealthView = _ref => {
  let {
    source
  } = _ref;
  const webviewRef = (0, _react.useRef)(null);
  const runBeforeStart = getRunBeforeFirst(_reactNative.Platform.OS);
  const [canGoBack, setCanGoBack] = (0, _react.useState)(false);
  const handleBack = (0, _react.useCallback)(() => {
    if (canGoBack && webviewRef.current) {
      webviewRef.current.goBack();
      return true;
    }

    return false;
  }, [canGoBack]);
  (0, _react.useEffect)(() => {
    _reactNative.BackHandler.addEventListener('hardwareBackPress', handleBack);

    return () => {
      _reactNative.BackHandler.removeEventListener('hardwareBackPress', handleBack);
    };
  }, [handleBack]);
  return /*#__PURE__*/_react.default.createElement(_reactNative.SafeAreaView, {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/_react.default.createElement(_reactNativeWebview.default, {
    ref: webviewRef,
    source: {
      uri: source,
      headers: {
        platform: 'ANDROID'
      }
    },
    onMessage: event => (0, _VisitPluginAndroid.handleMessage)(event, webviewRef),
    injectedJavaScriptBeforeContentLoaded: runBeforeStart,
    javaScriptEnabled: true,
    onLoadProgress: event => setCanGoBack(event.nativeEvent.canGoBack)
  }));
};

var _default = VisitHealthView;
exports.default = _default;
VisitHealthView.defaultProps = {
  source: ''
};
//# sourceMappingURL=index.android.js.map