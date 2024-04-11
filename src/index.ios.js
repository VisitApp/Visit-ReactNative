import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  SafeAreaView,
  Linking,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import { WebView } from 'react-native-webview';

const escapeChars = {
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  amp: '&',
};

const unescapeHTML = (str) =>
  // modified from underscore.string and string.js
  str.replace(/\&([^;]+);/g, (entity, entityCode) => {
    let match;

    if (entityCode in escapeChars) {
      return escapeChars[entityCode];
    } else if ((match = entityCode.match(/^#x([\da-fA-F]+)$/))) {
      return String.fromCharCode(parseInt(match[1], 16));
    } else if ((match = entityCode.match(/^#(\d+)$/))) {
      return String.fromCharCode(~~match[1]);
    } else {
      return entity;
    }
  });

const visitEvent = 'visit-event';

const VisitRnSdkView = ({
  magicLink,
  isLoggingEnabled,
}) => {
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (magicLink?.trim()?.length) {
      setSource(magicLink);
      setLoading(false);
    }
  }, []);

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
      {loading ? (
        <LoadingIndicator />
      ) : (
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
      )}
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

VisitRnSdkView.defaultProps = {
  id: '',
  token: '',
  baseUrl: '',
  errorBaseUrl: '',
  moduleName: '',
};

export default VisitRnSdkView;

const LoadingIndicator = () => {
  return (
    <ActivityIndicator
      color="#000"
      size="small"
      style={{
        flex: 1,
        zIndex: 100,
        position: 'absolute',
        backgroundColor: '#fff',
        opacity: 0.4,
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    />
  );
};
