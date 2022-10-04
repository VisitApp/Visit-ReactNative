import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SafeAreaView, BackHandler, Platform } from 'react-native';
import { handleMessage, fetchHourlyFitnessData, fetchDailyFitnessData } from './VisitPluginAndroid';
import WebView from 'react-native-webview';

function getRunBeforeFirst(platform) {
  let runBeforeFirst = null;

  if (Platform.OS == 'android') {
    runBeforeFirst = `
        window.isNativeApp = true;
        window.platform = "ANDROID";
        window.setSdkPlatform('ANDROID');
        true; // note: this is required, or you'll sometimes get silent failures
    `;
  } else if (Platform.OS == 'ios') {
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
    baseUrl,
    token,
    id,
    phone,
    moduleName
  } = _ref;
  const [source, setSource] = useState('');
  useEffect(() => {
    setSource(`${baseUrl}?token=${token}&id=${id}&phone=${phone}&moduleName=${moduleName}`);
  }, [id, token, baseUrl, phone, moduleName]);
  const webviewRef = useRef(null);
  const runBeforeStart = getRunBeforeFirst(Platform.OS);
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
  console.log('source: ', source);
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
    onMessage: event => handleMessage(event, webviewRef),
    injectedJavaScriptBeforeContentLoaded: runBeforeStart,
    javaScriptEnabled: true,
    onLoadProgress: event => setCanGoBack(event.nativeEvent.canGoBack)
  }) : null);
};

export default VisitHealthView;
export { fetchHourlyFitnessData, fetchDailyFitnessData };
VisitHealthView.defaultProps = {
  id: '',
  token: '',
  baseUrl: '',
  phone: '',
  moduleName: ''
};
//# sourceMappingURL=index.android.js.map