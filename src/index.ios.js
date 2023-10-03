import axios from 'axios';
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  StyleSheet,
  SafeAreaView,
  NativeModules,
  NativeEventEmitter,
  Linking,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { EventRegister } from 'react-native-event-listeners';
import { WebView } from 'react-native-webview';
import DeviceInfo from 'react-native-device-info';
import { getWebViewLink } from './Services';
import constants from './constants';

const LINKING_ERROR =
  `The package 'react-native-visit-rn-sdk' doesn't seem to be linked. Make sure: \n\n` +
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
  baseUrl,
  errorBaseUrl,
  token,
  id,
  phone,
  environment,
  moduleName,
  magicLink,
  isLoggingEnabled,
}) => {
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (magicLink?.trim()?.length) {
      setSource(magicLink);
      setLoading(false);
    } else {
      const systemVersion = DeviceInfo.getSystemVersion();
      const version = DeviceInfo.getVersion();
      DeviceInfo.getUniqueId()
        .then((uniqueId) =>
          getWebViewLink(
            baseUrl,
            token,
            phone,
            id,
            'iPhone',
            uniqueId,
            version,
            systemVersion,
            environment
          )
        )
        .then((res) => {
          if (res.data?.errorMessage) {
            const { errorMessage } = res.data;
            const errorUrl = `${errorBaseUrl}/star-health?error=${errorMessage}`;
            setSource(errorUrl);
            if (res.data?.errorMessage === 'Please login again') {
              EventRegister.emitEvent(visitEvent, {
                message: 'unauthorized-wellness-access',
                errorMessage: errorMessage,
              });
            }
          } else {
            const magicCode = res.data?.magicCode;
            let finalBaseUrl = '';
            if (magicCode) {
              if (environment.toUpperCase() === 'PROD') {
                finalBaseUrl = constants.PROD_BASE_URL;
              } else {
                finalBaseUrl = constants.STAGE_BASE_URL;
              }
            }
            if (isLoggingEnabled) {
              console.log('webviewlink is', { magicLink });
            }
            if (finalBaseUrl && magicCode) {
              console.log(
                'finalBaseUrl is',
                finalBaseUrl,
                'while magicCode is',
                magicCode
              );
              setSource(`${finalBaseUrl}=${magicCode}`);
            }
          }
        })
        .catch((err) => console.log('getWebViewLink err', { err }))
        .finally(() => {
          setLoading(false);
        });
    }
  }, [
    id,
    token,
    baseUrl,
    errorBaseUrl,
    phone,
    environment,
    moduleName,
    magicLink,
    isLoggingEnabled,
  ]);

  const VisitRnSdkViewManager = useMemo(
    () =>
      NativeModules.VisitRnSdkViewManager
        ? NativeModules.VisitRnSdkViewManager
        : new Proxy(
            {},
            {
              get() {
                throw new Error(LINKING_ERROR);
              },
            }
          ),
    []
  );

  const webviewRef = useRef(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const callSyncApi = useCallback(
    (data) =>
      axios
        .post(`${apiBaseUrl}/users/data-sync`, data, {
          headers: {
            Authorization: authToken,
          },
        })
        .then((res) => console.log('callSyncData response,', res))
        .catch((err) => console.log('callSyncData err,', { err })),
    [apiBaseUrl, authToken]
  );

  const callEmbellishApi = useCallback(
    (data) =>
      axios
        .post(`${apiBaseUrl}/users/embellish-sync`, data, {
          headers: {
            Authorization: authToken,
          },
        })
        .then((res) => console.log('callEmbellishApi response,', res))
        .catch((err) => console.log('callEmbellishApi err,', { err })),
    [apiBaseUrl, authToken]
  );

  useEffect(() => {
    const apiManagerEmitter = new NativeEventEmitter(VisitRnSdkViewManager);
    const subscription = apiManagerEmitter.addListener(
      'EventReminder',
      (reminder) => {
        if (reminder?.callSyncData && reminder?.callSyncData?.length) {
          callSyncApi(reminder?.callSyncData[0]);
        }
        if (reminder?.callEmbellishApi && reminder?.callEmbellishApi?.length) {
          callEmbellishApi(reminder?.callEmbellishApi[0]);
        }
      }
    );
    return () => {
      subscription.remove();
    };
  }, [VisitRnSdkViewManager, callEmbellishApi, callSyncApi]);

  const handleMessage = async (event) => {
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
      url,
    } = data;
    console.log('handleMessage data is', data);
    console.log(unescapeHTML(event.nativeEvent.data));
    switch (method) {
      case 'UPDATE_PLATFORM':
        webviewRef.current?.injectJavaScript('window.setSdkPlatform("IOS")');
        break;
      case 'CONNECT_TO_GOOGLE_FIT':
        if (DeviceInfo.getModel() === 'iPad') {
          console.log('unsupportedHealthKitDevice triggered');
          webviewRef.current?.injectJavaScript(
            'window.unsupportedHealthKitDevice(true)'
          );
        } else {
          VisitRnSdkViewManager?.connectToAppleHealth((res) => {
            if (res?.sleepTime || res?.numberOfSteps) {
              webviewRef.current?.injectJavaScript(
                `window.updateFitnessPermissions(true,${res?.numberOfSteps},${res?.sleepTime})`
              );
            } else {
              webviewRef.current?.injectJavaScript(
                'window.updateFitnessPermissions(true,0,0)'
              );
            }
          });
        }
        break;
      case 'GET_DATA_TO_GENERATE_GRAPH':
        VisitRnSdkViewManager?.renderGraph(
          { type, frequency, timestamp },
          (err, results) => {
            if (err) {
              console.log('error initializing Healthkit: ', err);
              return;
            }
            if (results[0]) {
              console.log('results initializing Healthkit: ', results[0]);
              webviewRef.current?.injectJavaScript(`window.${results[0]}`);
            }
          }
        );
        break;
      case 'UPDATE_API_BASE_URL':
        if (!hasLoadedOnce) {
          console.log('apiBaseUrl is,', apiBaseUrl);
          setApiBaseUrl(apiBaseUrl);
          setAuthToken(authtoken);
          VisitRnSdkViewManager?.updateApiUrl({
            googleFitLastSync,
            gfHourlyLastSync,
          });
          setHasLoadedOnce(true);
        }
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
  phone: '',
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
