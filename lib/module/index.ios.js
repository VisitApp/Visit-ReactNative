import axios from 'axios';
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet, SafeAreaView, NativeModules, NativeEventEmitter, Linking, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
const LINKING_ERROR = `The package 'Visit-ReactNative' doesn't seem to be linked. Make sure: \n\n` + Platform.select({
  ios: "- You have run 'pod install'\n",
  default: ''
}) + '- You rebuilt the app after installing the package\n' + '- You are not using Expo managed workflow\n';
const escapeChars = {
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  amp: '&'
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
    phone
  } = _ref;
  const [source, setSource] = useState('');
  useEffect(() => {
    setSource(`${baseUrl}?token=${token}&id=${id}&phone=${phone}`);
  }, [id, token, baseUrl, phone]);
  const VisitHealthRn = useMemo(() => NativeModules.VisitHealthRn ? NativeModules.VisitHealthRn : new Proxy({}, {
    get() {
      throw new Error(LINKING_ERROR);
    }

  }), []);
  const webviewRef = useRef(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const callSyncApi = useCallback(data => axios.post(`${apiBaseUrl}/users/data-sync`, data, {
    headers: {
      Authorization: authToken
    }
  }).then(res => console.log('callSyncData response,', res)).catch(err => console.log('callSyncData err,', {
    err
  })), [apiBaseUrl, authToken]);
  const callEmbellishApi = useCallback(data => axios.post(`${apiBaseUrl}/users/embellish-sync`, data, {
    headers: {
      Authorization: authToken
    }
  }).then(res => console.log('callEmbellishApi response,', res)).catch(err => console.log('callEmbellishApi err,', {
    err
  })), [apiBaseUrl, authToken]);
  useEffect(() => {
    const apiManagerEmitter = new NativeEventEmitter(VisitHealthRn);
    const subscription = apiManagerEmitter.addListener('EventReminder', reminder => {
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
    var _webviewRef$current;

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
    console.log('handleMessage data is', data);
    console.log(unescapeHTML(event.nativeEvent.data));

    switch (method) {
      case 'UPDATE_PLATFORM':
        (_webviewRef$current = webviewRef.current) === null || _webviewRef$current === void 0 ? void 0 : _webviewRef$current.injectJavaScript('window.setSdkPlatform("IOS")');
        break;

      case 'CONNECT_TO_GOOGLE_FIT':
        VisitHealthRn === null || VisitHealthRn === void 0 ? void 0 : VisitHealthRn.connectToAppleHealth(res => {
          if (res !== null && res !== void 0 && res.sleepTime || res !== null && res !== void 0 && res.numberOfSteps) {
            var _webviewRef$current2;

            (_webviewRef$current2 = webviewRef.current) === null || _webviewRef$current2 === void 0 ? void 0 : _webviewRef$current2.injectJavaScript(`window.updateFitnessPermissions(true,${res === null || res === void 0 ? void 0 : res.numberOfSteps},${res === null || res === void 0 ? void 0 : res.sleepTime})`);
          } else {
            var _webviewRef$current3;

            (_webviewRef$current3 = webviewRef.current) === null || _webviewRef$current3 === void 0 ? void 0 : _webviewRef$current3.injectJavaScript('window.updateFitnessPermissions(true,0,0)');
          }
        });
        break;

      case 'GET_DATA_TO_GENERATE_GRAPH':
        VisitHealthRn === null || VisitHealthRn === void 0 ? void 0 : VisitHealthRn.renderGraph({
          type,
          frequency,
          timestamp
        }, (err, results) => {
          if (err) {
            console.log('error initializing Healthkit: ', err);
            return;
          }

          if (results[0]) {
            var _webviewRef$current4;

            console.log('results initializing Healthkit: ', results[0]);
            (_webviewRef$current4 = webviewRef.current) === null || _webviewRef$current4 === void 0 ? void 0 : _webviewRef$current4.injectJavaScript(`window.${results[0]}`);
          }
        });
        break;

      case 'UPDATE_API_BASE_URL':
        if (!hasLoadedOnce) {
          console.log('apiBaseUrl is,', apiBaseUrl);
          setApiBaseUrl(apiBaseUrl);
          setAuthToken(authtoken);
          VisitHealthRn === null || VisitHealthRn === void 0 ? void 0 : VisitHealthRn.updateApiUrl({
            googleFitLastSync,
            gfHourlyLastSync
          });
          setHasLoadedOnce(true);
        }

        break;

      case 'OPEN_PDF':
        Linking.openURL(url);
        break;

      case 'CLOSE_VIEW':
        break;

      default:
        break;
    }
  };

  return /*#__PURE__*/React.createElement(SafeAreaView, {
    style: styles.webViewContainer
  }, /*#__PURE__*/React.createElement(WebView, {
    ref: webviewRef,
    source: {
      uri: source
    },
    style: styles.webView,
    javascriptEnabled: true,
    onMessage: handleMessage
  }));
};

const styles = StyleSheet.create({
  webViewContainer: {
    flex: 1,
    backgroundColor: 'white'
  },
  webView: {
    flex: 1
  }
});
export default VisitHealthView;
VisitHealthView.defaultProps = {
  id: '',
  token: '',
  baseUrl: '',
  phone: ''
};
//# sourceMappingURL=index.ios.js.map