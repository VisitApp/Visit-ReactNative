import React, { useRef, useCallback, type ComponentType } from 'react';
import { StyleSheet, SafeAreaView, Linking, Dimensions } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import VideoCallComponent, {
  type VideoCallComponentHandle,
} from './components/VideoCallComponent';
import type { VisitRnSdkViewProps } from './types';

// react-native-webview typings can collapse to `never` under React 17 @types.
const SdkWebView = WebView as unknown as ComponentType<Record<string, unknown>>;

const escapeChars = {
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  amp: '&',
};

type WebViewBridgePayload = {
  method?: string;
  url?: string;
  roomName?: string;
  token?: string;
  doctorName?: string;
  userName?: string;
};

const unescapeHTML = (str: string) =>
  // modified from underscore.string and string.js
  // eslint-disable-next-line no-useless-escape
  str.replace(/\&([^;]+);/g, (entity, entityCode) => {
    let match;

    if (entityCode in escapeChars) {
      return escapeChars[entityCode as keyof typeof escapeChars];
    } else if ((match = entityCode.match(/^#x([\da-fA-F]+)$/))) {
      return String.fromCharCode(parseInt(match[1], 16));
    } else if ((match = entityCode.match(/^#(\d+)$/))) {
      return String.fromCharCode(match[1] as any);
    } else {
      return entity;
    }
  });

const VisitRnSdkView = ({
  ssoLink = '',
  isLoggingEnabled = false,
}: VisitRnSdkViewProps) => {
  const source = typeof ssoLink === 'string' ? ssoLink.trim() : '';

  const webviewRef = useRef<{
    injectJavaScript: (_script: string) => void;
  } | null>(null);
  const videoCallRef = useRef<VideoCallComponentHandle>(null);

  const runBeforeFirst = `
  window.isNativeApp = true;
  window.platform = "IOS";
  window.setSdkPlatform('IOS');
  true; // note: this is required, or you'll sometimes get silent failures
  `;

  const startVideoConsultation = useCallback(
    (payload: WebViewBridgePayload) => {
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

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(
        unescapeHTML(event.nativeEvent.data)
      ) as WebViewBridgePayload;
      const { method, url } = data;
      if (isLoggingEnabled) {
        console.log('Received WebView method:', method);
      }
      switch (method) {
        case 'startVideoCall':
          startVideoConsultation(data);
          break;
        case 'UPDATE_PLATFORM':
          webviewRef.current?.injectJavaScript('window.setSdkPlatform("IOS")');
          break;

        case 'OPEN_PDF':
          if (url) {
            Linking.openURL(url);
          }
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
    } catch (error) {
      if (isLoggingEnabled) {
        console.warn('Unable to handle WebView message.', error);
      }
    }
  };

  const { height, width } = Dimensions.get('screen');
  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white', height, width }}>
      {source ? (
        <SdkWebView
          ref={webviewRef}
          source={{ uri: source }}
          style={styles.webView}
          javaScriptEnabled
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={runBeforeFirst}
          onError={(errorMessage: unknown) => {
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

export default VisitRnSdkView;
