import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  Linking,
  Platform,
  Dimensions,
} from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import { WebView } from 'react-native-webview';

Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const escapeChars = {
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  amp: '&',
};

const unescapeHTML = (str) =>
  // modified from underscore.string and string.js
  // eslint-disable-next-line no-useless-escape
  str.replace(/\&([^;]+);/g, (entity, entityCode) => {
    let match;

    if (entityCode in escapeChars) {
      return escapeChars[entityCode];
    } else if ((match = entityCode.match(/^#x([\da-fA-F]+)$/))) {
      return String.fromCharCode(parseInt(match[1], 16));
    } else if ((match = entityCode.match(/^#(\d+)$/))) {
      return String.fromCharCode(match[1]);
    } else {
      return entity;
    }
  });

const visitEvent = 'visit-event';

const VisitRnSdkView = ({ ssoLink, isLoggingEnabled }) => {
  const [source, setSource] = useState('');

  useEffect(() => {
    setSource(ssoLink);
  }, [ssoLink, isLoggingEnabled]);

  const webviewRef = useRef(null);

  const handleMessage = async (event) => {
    const data = JSON.parse(unescapeHTML(event.nativeEvent.data));
    const { method, url } = data;
    console.log('handleMessage data is', data);
    console.log(unescapeHTML(event.nativeEvent.data));
    switch (method) {
      case 'UPDATE_PLATFORM':
        webviewRef.current?.injectJavaScript('window.setSdkPlatform("IOS")');
        break;
      case 'OPEN_PDF':
        Linking.openURL(url);
        break;
      case 'CLOSE_VIEW':
        break;
      case 'GET_LOCATION_PERMISSIONS':
        webviewRef.current?.injectJavaScript(
          'window.checkTheGpsPermission(true)'
        );
        break;

      default:
        break;
    }
  };

  const { height, width } = Dimensions.get('screen');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white', height, width }}>
      <WebView
        ref={webviewRef}
        source={{ uri: source }}
        style={styles.webView}
        javascriptEnabled
        onMessage={handleMessage}
        onError={(errorMessage) => {
          EventRegister.emitEvent(visitEvent, {
            message: 'web-view-error',
            errorMessage: errorMessage,
          });
          if (isLoggingEnabled) {
            console.warn('Webview error: ', errorMessage);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  webViewContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  webView: {
    flex: 1,
  },
});

export default VisitRnSdkView;
