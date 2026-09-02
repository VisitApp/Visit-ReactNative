import React, { useCallback, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
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

const getHttpUrl = (url) => {
  const link = typeof url === 'string' ? url.trim() : '';
  return /^https?:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/i.test(link) ? link : '';
};

const isWebViewLocalUrl = (url) =>
  /^(about|data|blob):/i.test(typeof url === 'string' ? url.trim() : '');

const runBeforeFirst = `
      window.isNativeApp = true;
      window.platform = "IOS";
      if (typeof window.setSdkPlatform === 'function') {
        window.setSdkPlatform('IOS');
      }
      true; // note: this is required, or you'll sometimes get silent failures
  `;

const SecondaryWebView = ({ link, isLoggingEnabled, onClose }) => {
  const webviewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);

  const handleMessage = (event) => {
    if (event.nativeEvent.data != null) {
      try {
        if (isLoggingEnabled) {
          console.log('Secondary WebView event received');
        }

        const parsedObject = JSON.parse(unescapeHTML(event.nativeEvent.data));

        switch (parsedObject.method) {
          case 'GET_LOCATION_PERMISSIONS':
            webviewRef.current?.injectJavaScript(
              'window.checkTheGpsPermission(true)'
            );
            break;
          case 'OPEN_PDF':
            Linking.openURL(parsedObject.url);
            break;
          case 'OPEN_FACE_SCAN_FLOW':
            EventRegister.emitEvent('visit-event', {
              message: 'OPEN_FACE_SCAN_FLOW',
            });
            break;
          case 'OPEN_SECONDARY_WEB_VIEW':
            break;
          default:
            break;
        }
      } catch (exception) {
        console.log('Exception occured:' + exception.message);
      }
    }
  };

  const handleBack = useCallback(() => {
    if (canGoBack && webviewRef.current) {
      webviewRef.current.goBack();
      return;
    }

    onClose();
  }, [canGoBack, onClose]);

  const source = getHttpUrl(link);
  if (!source) {
    return null;
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={handleBack}
      presentationStyle="fullScreen"
      visible={true}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={handleBack}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </Pressable>
        </View>
        <WebView
          ref={webviewRef}
          source={{ uri: source }}
          style={styles.webView}
          onShouldStartLoadWithRequest={(request) => {
            if (request.isTopFrame === false) {
              return true;
            }
            if (getHttpUrl(request.url) || isWebViewLocalUrl(request.url)) {
              return true;
            }
            Linking.openURL(request.url).catch((error) => {
              if (isLoggingEnabled) {
                console.warn('Linking.openURL error: ', error);
              }
            });
            return false;
          }}
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={runBeforeFirst}
          javaScriptEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsBackForwardNavigationGestures={true}
          onLoadProgress={(event) => setCanGoBack(event.nativeEvent.canGoBack)}
          onError={(errorMessage) => {
            EventRegister.emitEvent('visit-event', {
              message: 'web-view-error',
              errorMessage: errorMessage,
            });
            if (isLoggingEnabled) {
              console.warn('Webview error: ', errorMessage);
            }
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    minHeight: 44,
    justifyContent: 'center',
    borderBottomColor: '#E5E5EA',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 17,
  },
  webView: {
    flex: 1,
  },
});

export default SecondaryWebView;
