import React, { useRef, useCallback } from 'react';
import { StyleSheet, SafeAreaView, Linking, Dimensions } from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import { WebView } from 'react-native-webview';
import VideoCallComponent from './components/VideoCallComponent';

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

const VisitRnSdkView = ({ magicLink, isLoggingEnabled }) => {
  const source = typeof magicLink === 'string' ? magicLink.trim() : '';

  const webviewRef = useRef(null);
  const videoCallRef = useRef(null);

  const runBeforeFirst = `
  window.isNativeApp = true;
  window.platform = "IOS";
  window.setSdkPlatform('IOS');
  true; // note: this is required, or you'll sometimes get silent failures
  `;

  const startVideoConsultation = useCallback(
    (payload) => {
      const roomName = payload?.roomName;
      const accessToken = payload?.token;
      const rawDoctorName = payload?.doctorName;
      const visibleDoctorName =
        rawDoctorName && rawDoctorName.indexOf('Dr.') > -1
          ? rawDoctorName.replace('Dr. ', '')
          : rawDoctorName && rawDoctorName.indexOf('Dr') > -1
          ? rawDoctorName.replace('Dr ', '')
          : null;
      const userName = payload?.userName;

      if (!roomName || !accessToken) {
        if (isLoggingEnabled) {
          console.warn('Video call payload missing roomName/accessToken.');
        }
        return;
      }

      videoCallRef.current?.startVideoCall({
        roomName,
        accessToken,
        doctorName: rawDoctorName ?? '',
        visibleDoctorName: visibleDoctorName ?? '',
        userName,
      });
    },
    [isLoggingEnabled]
  );

  const handleMessage = async (event) => {
    const data = JSON.parse(unescapeHTML(event.nativeEvent.data));
    const { method, url } = data;
    console.log('handleMessage data is', data);
    console.log(unescapeHTML(event.nativeEvent.data));
    switch (method) {
      case 'startVideoCall':
        startVideoConsultation(data);
        break;
      case 'UPDATE_PLATFORM':
        webviewRef.current?.injectJavaScript('window.setSdkPlatform("IOS")');
        break;

      case 'OPEN_PDF':
        Linking.openURL(url);
        break;
      case 'OPEN_FACE_SCAN_FLOW':
        EventRegister.emitEvent('visit-event', {
          message: 'OPEN_FACE_SCAN_FLOW',
        });
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
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white', height, width }}>
      {source ? (
        <WebView
          ref={webviewRef}
          source={{ uri: source }}
          style={styles.webView}
          javascriptEnabled
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={runBeforeFirst}
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
      ) : null}
      <VideoCallComponent
        ref={videoCallRef}
        onCallConnected={(info) => {
          if (isLoggingEnabled) {
            console.log('Video call connected:', info);
          }
        }}
        onCallEnded={(info) => {
          if (isLoggingEnabled) {
            console.log('Video call ended:', info);
          }
        }}
        onError={(error) => {
          if (isLoggingEnabled) {
            console.error('Video call error:', error);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  webView: {
    flex: 1,
  },
});

VisitRnSdkView.defaultProps = {
  magicLink: '',
  isLoggingEnabled: false,
};

export default VisitRnSdkView;
