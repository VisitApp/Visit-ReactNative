import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EventRegister } from 'react-native-event-listeners';

import {
  SafeAreaView,
  NativeModules,
  PermissionsAndroid,
  BackHandler,
  Linking,
} from 'react-native';

import WebView from 'react-native-webview';

import LocationEnabler from 'react-native-location-enabler';

import DeviceInfo from 'react-native-device-info';

import axios from 'axios';

import constants from './constants';

export const httpClient = axios.create({
  timeout: 60000,
});

const {
  PRIORITIES: { HIGH_ACCURACY },
  useLocationSettings,
  addListener,
} = LocationEnabler;

const VisitRnSdkView = ({
  cpsid,
  baseUrl,
  errorBaseUrl,
  token,
  moduleName,
  environment,
  magicLink,
  isLoggingEnabled,
}) => {
  const [source, setSource] = useState('');
  useEffect(() => {
    if (isLoggingEnabled) {
      console.log('useEffect ran');
    }

    NativeModules.VisitFitnessModule.initiateSDK(isLoggingEnabled);

    if ((magicLink?.trim()?.length || 0) > 0) {
      setSource(magicLink);
    } else {
      DeviceInfo.getAndroidId()
        .then((deviceId) => {
          var buildNumber = DeviceInfo.getBuildNumber();
          let systemVersion = DeviceInfo.getSystemVersion();
          let version = DeviceInfo.getVersion();

          if (isLoggingEnabled) {
            console.log(
              ' baseUrl : ' +
                baseUrl +
                'token: ' +
                token +
                ' cpsid: ' +
                cpsid +
                ' environment: ' +
                environment +
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

          var finalEndPoint = `${baseUrl}/partners/v3/generate-magic-link-star-health`;

          if (isLoggingEnabled) {
            console.log('finalEndPoint: ' + finalEndPoint);
          }

          httpClient
            .post(finalEndPoint, {
              cpsid: cpsid,
              token: token,
              srcClientId: 'Android',
              deviceId: deviceId,
              appVersion: version,
              deviceVersion: systemVersion,
              userEnv: environment,
            })
            .then((response) => {
              let data = response.data;
              // let visitMagicLink = data.result; //@Deprecated. Superseded by magic code usage.
              const errorMessage = data.errorMessage;
              const magicCode = data.magicCode;
              const responseReferenceId = data.responseReferenceId;

              let finalBaseUrl = '';

              if (environment.toUpperCase() === 'PROD') {
                finalBaseUrl = constants.PROD_BASE_URL;
              } else {
                finalBaseUrl = constants.STAGE_BASE_URL;
              }

              let finalUrl = `${finalBaseUrl}=${magicCode}`;

              if (data.message === 'success') {
                if ((moduleName?.trim()?.length || 0) > 0) {
                  finalUrl += `&tab=${moduleName}`;
                }

                if ((responseReferenceId?.trim()?.length || 0) > 0) {
                  finalUrl += `&responseReferenceId=${responseReferenceId}`;
                }

                if (isLoggingEnabled) {
                  console.log('magicLink: ' + finalUrl);
                }

                setSource(finalUrl);
              } else {
                var errorUrl = `${errorBaseUrl}/star-health?error=${errorMessage}`;
                setSource(errorUrl);

                if (errorMessage != null) {
                  if (errorMessage === 'Please login again') {
                    EventRegister.emitEvent('visit-event', {
                      message: 'unauthorized-wellness-access',
                      errorMessage: errorMessage,
                    });
                  } else if (errorMessage.includes('External Server Error')) {
                    EventRegister.emitEvent('visit-event', {
                      message: 'external-server-error',
                      errorMessage: errorMessage,
                    });
                  }
                }

                if (isLoggingEnabled) {
                  console.log(
                    'erorMessage: ' +
                      data.errorMessage +
                      ' errorUrl: ' +
                      errorUrl
                  );
                }
              }
            })
            .catch((error) => {
              var errorUrl = `${errorBaseUrl}/star-health?error=${error}`;
              setSource(errorUrl);

              EventRegister.emitEvent('visit-event', {
                message: 'generate-magic-link-failed',
                errorMessage: `${error}`,
              });

              if (isLoggingEnabled) {
                console.log('error: ' + error);
              }
            });
        })
        .catch((err) => {
          var errorUrl = `${errorBaseUrl}/star-health?error=${err}`;
          setSource(errorUrl);

          EventRegister.emitEvent('visit-event', {
            message: 'getDeviceInfo-failed',
            errorMessage: `${err}`,
          });

          if (isLoggingEnabled) {
            console.log('getDeviceInfo err', err);
          }
        });
    }
  }, [
    cpsid,
    token,
    baseUrl,
    errorBaseUrl,
    moduleName,
    environment,
    magicLink,
    isLoggingEnabled,
  ]);

  const [enabled, requestResolution] = useLocationSettings(
    {
      priority: HIGH_ACCURACY, // default BALANCED_POWER_ACCURACY
      alwaysShow: true, // default false
      needBle: true, // default false
    },
    false /* optional: default undefined */
  );

  const webviewRef = useRef(null);

  const requestLocationPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Need Location Permission',
          message: 'Need access to location permission',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        if (isLoggingEnabled) {
          console.log('Location permission granted');
        }

        if (!enabled) {
          requestResolution();
        } else {
          var finalString = `window.checkTheGpsPermission(true)`;
          console.log('requestLocationPermission: ' + finalString);

          webviewRef.current?.injectJavaScript(finalString);
        }
      } else {
        console.log('Location permission denied');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const askForHealthConnectPermission = async () => {
    try {
      const isPermissionGranted =
        await NativeModules.VisitFitnessModule.askForFitnessPermission();

      if (isLoggingEnabled) {
        console.log('isPermissionGranted: ' + isPermissionGranted);
      }

      if (isPermissionGranted === 'GRANTED') {
        getDailyFitnessData();
      }
    } catch (e) {
      if (isLoggingEnabled) {
        console.error(e);
      }
    }
  };

  const getHealthConnectStatus = async () => {
    try {
      const healthConnectStatus =
        await NativeModules.VisitFitnessModule.getHealthConnectStatus();

      if (isLoggingEnabled) {
        console.log('getHealthConnectStatus: ' + healthConnectStatus);
      }

      if (healthConnectStatus === 'NOT_SUPPORTED') {
        webviewRef.current?.injectJavaScript(
          'window.healthConnectNotSupported()'
        );
      } else if (healthConnectStatus === 'NOT_INSTALLED') {
        webviewRef.current?.injectJavaScript(
          'window.healthConnectNotInstall()'
        );
      } else if (healthConnectStatus === 'INSTALLED') {
        webviewRef.current?.injectJavaScript('window.healthConnectAvailable()');
      }
    } catch (e) {
      if (isLoggingEnabled) {
        console.error(e);
      }
    }
  };

  const getDailyFitnessData = async () => {
    if (isLoggingEnabled) {
      console.log('getDailyFitnessData() called');
    }

    try {
      const dailyFitnessData =
        await NativeModules.VisitFitnessModule.requestDailyFitnessData();

      webviewRef.current?.injectJavaScript(dailyFitnessData);
    } catch (error) {
      if (isLoggingEnabled) {
        console.log(error);
      }
    }
  };

  const requestActivityData = async (type, frequency, timeStamp) => {
    if (isLoggingEnabled) {
      console.log('requestActivityData() called');
    }

    try {
      const graphData =
        await NativeModules.VisitFitnessModule.requestActivityDataFromHealthConnect(
          type,
          frequency,
          timeStamp
        );

      if (isLoggingEnabled) {
        console.log(`requestActivityData() data: ` + graphData);
      }

      webviewRef.current?.injectJavaScript('window.' + graphData);
    } catch (error) {
      if (isLoggingEnabled) {
        console.log(error);
      }
    }
  };

  const updateApiBaseUrl = (
    apiBaseUrl,
    authtoken,
    googleFitLastSync,
    gfHourlyLastSync
  ) => {
    if (isLoggingEnabled) {
      console.log('updateApiBaseUrl() called.');
    }

    NativeModules.VisitFitnessModule.updateApiBaseUrl(
      apiBaseUrl,
      authtoken,
      googleFitLastSync,
      gfHourlyLastSync
    );
  };

  const runBeforeFirst = `
        window.isNativeApp = true;
        window.platform = "ANDROID";
        window.setSdkPlatform('ANDROID');
        true; // note: this is required, or you'll sometimes get silent failures
    `;

  const handleMessage = (event) => {
    if (event.nativeEvent.data != null) {
      try {
        if (isLoggingEnabled) {
          console.log('Event :' + event.nativeEvent.data);
        }
        const parsedObject = JSON.parse(event.nativeEvent.data);
        if (parsedObject.method != null) {
          switch (parsedObject.method) {
            case 'GET_HEALTH_CONNECT_STATUS':
              getHealthConnectStatus();
              break;
            case 'CONNECT_TO_GOOGLE_FIT':
              askForHealthConnectPermission();
              break;
            case 'UPDATE_PLATFORM':
              webviewRef.current?.injectJavaScript(
                'window.setSdkPlatform("ANDROID")'
              );
              break;
            case 'UPDATE_API_BASE_URL':
              {
                let apiBaseUrl = parsedObject.apiBaseUrl;
                let authtoken = parsedObject.authtoken;

                let googleFitLastSync = parsedObject.googleFitLastSync;
                let gfHourlyLastSync = parsedObject.gfHourlyLastSync;

                if (isLoggingEnabled) {
                  console.log(
                    'apiBaseUrl: ' +
                      'NOT SHOWN' +
                      ' authtoken: ' +
                      'NOT SHOWN' +
                      ' googleFitLastSync: ' +
                      googleFitLastSync +
                      ' gfHourlyLastSync: ' +
                      gfHourlyLastSync
                  );
                }

                updateApiBaseUrl(
                  apiBaseUrl,
                  authtoken,
                  googleFitLastSync,
                  gfHourlyLastSync
                );
              }
              break;
            case 'GET_DATA_TO_GENERATE_GRAPH':
              {
                let type = parsedObject.type;
                let frequency = parsedObject.frequency;
                let timeStamp = parsedObject.timestamp;

                if (isLoggingEnabled) {
                  console.log(
                    'type: ' +
                      type +
                      ' frequency:' +
                      frequency +
                      ' timeStamp: ' +
                      timeStamp
                  );
                }

                requestActivityData(type, frequency, timeStamp);
              }
              break;
            case 'GET_LOCATION_PERMISSIONS':
              {
                requestLocationPermission();
              }
              break;
            case 'OPEN_PDF':
              {
                let pdfUrl = parsedObject.url;
                // console.log("pdfUrl "+pdfUrl);

                Linking.openURL(pdfUrl);
              }
              break;
            case 'CLOSE_VIEW':
              {
              }
              break;

            default:
              break;
          }
        }
      } catch (exception) {
        console.log('Exception occured:' + exception.message);
      }
    }
  };

  const [canGoBack, setCanGoBack] = useState(false);

  const handleBack = useCallback(() => {
    if (canGoBack && webviewRef.current) {
      webviewRef.current?.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);

  useEffect(() => {
    const gpsListener = addListener(({ locationEnabled }) => {
      if (locationEnabled) {
        var finalString = `window.checkTheGpsPermission(true)`;

        if (isLoggingEnabled) {
          console.log('listener: ' + finalString);
        }

        webviewRef.current?.injectJavaScript(finalString);
      }
    });

    BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBack);
      gpsListener.remove();
    };
  }, [handleBack]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {source ? (
        <WebView
          ref={webviewRef}
          source={{
            uri: source,
            headers: {
              platform: 'ANDROID',
            },
          }}
          onMessage={handleMessage}
          injectedJavaScriptBeforeContentLoaded={runBeforeFirst}
          javaScriptEnabled={true}
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
      ) : null}
    </SafeAreaView>
  );
};

export const fetchDailyFitnessData = (startTimeStamp, isLoggingEnabled) => {
  return new Promise((resolve, reject) => {
    console.log('fetchDailyFitnessData called: ' + startTimeStamp);

    NativeModules.VisitFitnessModule.fetchDailyFitnessData(startTimeStamp)
      .then((result) => {
        resolve(result);
      })
      .catch((err) => reject(err));
  });
};

export const fetchHourlyFitnessData = (startTimeStamp, isLoggingEnabled) => {
  return new Promise((resolve, reject) => {
    if (isLoggingEnabled) {
      console.log('fetchHourlyFitnessData called: ' + startTimeStamp);
    }

    NativeModules.VisitFitnessModule.fetchHourlyFitnessData(startTimeStamp)
      .then((result) => {
        resolve(result);
      })
      .catch((err) => reject(err));
  });
};

// debounce, deferred
function debounce(task, ms) {
  let t = { promise: null, cancel: (_) => void 0 };
  return async (...args) => {
    try {
      t.cancel();
      t = deferred(ms);
      await t.promise;
      await task(...args);
    } catch (_) {
      console.log('cleaning up cancelled promise');
    }
  };
}

function deferred(ms) {
  let cancel,
    promise = new Promise((resolve, reject) => {
      cancel = reject;
      setTimeout(resolve, ms);
    });
  return { promise, cancel };
}

export default VisitRnSdkView;

VisitRnSdkView.defaultProps = {
  cpsid: '',
  token: '',
  baseUrl: '',
  errorBaseUrl: '',
  moduleName: '',
  environment: '',
  magicLink: '',
  isLoggingEnabled: false,
};
