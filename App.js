import React, {useRef, useEffect, useState, useCallback} from 'react';

import {SafeAreaView, BackHandler, Platform} from 'react-native';
import {
  requestActivityRecognitionPermission,
  requestActivityData,
  requestLocationPermission,
  updateApiBaseUrl,
  handleMessage,
} from './VisitPluginAndroid';
import WebView from 'react-native-webview';

const HelloWorldApp = () => {
  const webviewRef = useRef(null);

  if (Platform.OS == 'android') {
    console.log('Platform is ANDROID');
  } else if (Platform.OS == 'ios') {
    console.log('Platform is IOS');
  }

  const DEFAULT_CLIENT_ID =
    '476467749625-f9hnkuihk4dcin8n0so8ffjgsvn07lb5.apps.googleusercontent.com';

  const runBeforeFirst = `
        window.isNativeApp = true;
        window.platform = "ANDROID";
        window.setSdkPlatform('ANDROID');
        true; // note: this is required, or you'll sometimes get silent failures
    `;

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
        onMessage={event => handleMessage(event, webviewRef)}
        injectedJavaScriptBeforeContentLoaded={runBeforeFirst}
        javaScriptEnabled={true}
        onLoadProgress={event => setCanGoBack(event.nativeEvent.canGoBack)}
      />
    </SafeAreaView>
  );
};

export default HelloWorldApp;
