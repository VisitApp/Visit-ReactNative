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
} from 'react-native';
import { WebView } from 'react-native-webview';
import DeviceInfo from 'react-native-device-info';

const LINKING_ERROR =
  "The package 'Visit-ReactNative' doesn't seem to be linked. Make sure: \n\n" +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

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

const VisitHealthView = ({
  baseUrl,
  token,
  id,
  phone,
  moduleName,
  magicLink,
  isLoggingEnabled,
}) => {
  const [source, setSource] = useState('');
  useEffect(() => {
    if ((magicLink?.trim()?.length || 0) > 0) {
      setSource(magicLink);
    } else {
      console.log('in here');
      const deviceId = DeviceInfo.getDeviceId();
      const buildNumber = DeviceInfo.getBuildNumber();
      const systemVersion = DeviceInfo.getSystemVersion();
      const version = DeviceInfo.getVersion();

      if (isLoggingEnabled) {
        console.log(
          'buildNumber:' +
            buildNumber +
            ' systemVersion:' +
            systemVersion +
            ' version : ' +
            version +
            ' deviceId',
          deviceId
        );
      }

      let finalUrl = `${baseUrl}?token=${token}&id=${id}&phone=${phone}`;

      if ((moduleName?.trim()?.length || 0) > 0) {
        finalUrl += `&moduleName=${moduleName}`;
      }

      finalUrl += `&srcClientId=iOS&deviceId=${deviceId}&appVersion=${version}&deviceVersion=${systemVersion}`;

      if (isLoggingEnabled) {
        console.log('final Url: ', finalUrl);
      }
      setSource(finalUrl);
    }
  }, [id, token, baseUrl, phone, moduleName, magicLink, isLoggingEnabled]);

  const VisitHealthRn = useMemo(
    () =>
      NativeModules.VisitHealthRn
        ? NativeModules.VisitHealthRn
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
    const apiManagerEmitter = new NativeEventEmitter(VisitHealthRn);
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
  }, [VisitHealthRn, callEmbellishApi, callSyncApi]);

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
        VisitHealthRn?.connectToAppleHealth((res) => {
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
        break;
      case 'GET_DATA_TO_GENERATE_GRAPH':
        VisitHealthRn?.renderGraph(
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
          VisitHealthRn?.updateApiUrl({ googleFitLastSync, gfHourlyLastSync });
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

  console.log('source: ', source);

  return (
    <SafeAreaView style={styles.webViewContainer}>
      {source ? (
        <WebView
          ref={webviewRef}
          source={{ uri: source }}
          style={styles.webView}
          javascriptEnabled
          onMessage={handleMessage}
        />
      ) : null}
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

VisitHealthView.defaultProps = {
  id: '',
  token: '',
  baseUrl: '',
  phone: '',
  moduleName: '',
};

export default VisitHealthView;

export const fetchHourlyFitnessData = (timestamp) => {
  return new Promise((resolve, reject) => {
    NativeModules?.VisitHealthRn?.fetchHourlyData(timestamp)
      .then((res) => {
        if (Array.isArray(res) && res.length) {
          resolve(res[0]);
        } else {
          reject('Error fetching hourly data');
        }
      })
      .catch((err) => reject(err));
  });
};

export const fetchDailyFitnessData = (timestamp) => {
  return new Promise((resolve, reject) => {
    NativeModules?.VisitHealthRn?.fetchDailyData(timestamp)
      .then((res) => {
        if (Array.isArray(res) && res.length) {
          resolve(res[0]);
        } else {
          reject('Error fetching daily data');
        }
      })
      .catch((err) => reject(err));
  });
};
