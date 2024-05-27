/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';

import VisitRnSdkView from 'react-native-visit-rn-sdk';

import {EventRegister} from 'react-native-event-listeners';

import {
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  Button,
  NativeModules,
  PermissionsAndroid,
  BackHandler,
  LogBox,
  Alert,
} from 'react-native';

const visitBaseUrl = 'https://insurance-uat.getvisitapp.net/wonderwomen';

const cpsid = 'CPS1985253411823397284';

const errorBaseUrl = 'https://api.samuraijack.xyz';

const token =
  'vou2woxaoaTAQ57KUQavE0PbTC98G74uefWqF6Lm9RAnh4yYs7skuvpY3j7kML/jxQKMPSsKDIxHSEYfVl18pqfD2phNnqE0tbFnNZwlrKQIgchVP25PxiqBkCuL1NMkWH+wDJ+XMDunYWrUZouJfYPCA9gj3S3m4MMoZT9F/Jgs1IYLvb3exFT/gbEf1klIZIX0HFpmvZ+4GB8DBn6GARbZKPXyIac2WjJEqYF8zsfvzWFhbPzWvvk5ZYMIITQ0mV0GYMbKgBG48gVY1W8rx90EYnHe2s99mmpiNDFJyZ56E/nE2m2CU2mFXHSVfASYyERvUjUQbGBLiqLK23OKp2hBYgT8/A3dBwTVk022JlluBVzNxdOEB/DUiAIH9UAUg/qvTLK82lQg+o1ZSWpFiiTf6zVOJdobqLe9FsYTuSApemgqfaau8DZ7CiKd4FiGA9NaKGenKlwNLzEymXw5Y0Q7rp1LxZBAWZRPDmuFX1MQlRfxgwEr6u8ufIdNagCYUoq4qnw1um+Cnp/33GhwRXlnKosBaM5Rzoa6gw8hMvHjAP9t/KmPNq7kve8wi6SAvvm4e2a+cSCBYQJUq/Fwh8bQDL3UVskFAZIULQe2tMfp/LQNkGXCHjpTwFVknl8PFnso7TdHRDYeF6IjthnEFbh1h9Df/E6yo1kURw3jRRWvKmuz0O0joEHevZpDMPKB+P7U+LOD5dFVVUCofPSqbuszzRlptLYkKZAWexmWWLdcXxL5cQrIKeqqgGZuCzmGLDuTT2HPur8qKNG6H6XGRDJqdCdSpz/wZjWjGdMYqpMGrMAWzeHwNWhvytXwpnN2FzBZ+d1fREkIhYJnFFNaCOCSRAZlVo7Ka9wuHoXxydFCEADKcwmhbXOFMHzTDsBV680N/V+9Dw7b5tiT7ZNbqZpm20BKCcYIiUrNH47KfmzkBvd/PvcoM1IRI+0UC4x0x/YHNtGbZCi73n0G6wReUgSD8EJaCY7Q/vVNs35TS+0xySkfsysEbiQD+LTbdT03X4xDAvnGHKq4Z7G1BIU7GuYpCAcuL68ic6D4ZL4KJXaeIfm7xzIOKWRJsFt1r4n7g3giUUIinuxKVoPpZcCsreuIPTgXDLOTtiU2//xmOSMOO5S3xtojBNcFeh9emjah+lM1iwYUZkr+EQv1JsYE6ZFLxT76t7DOIWZM1068b8CkjNz9Gct0IxJ6cnzNWlS385o+VSp+5BLu/DsNZsxJcaos8GuIgA+XnI+CAwKde76uQH8ysUm4b4aOHuA5IeLLJtzrfk5QOy+yzTDmiCmGxmVyvKjjLfW926YQTum01CxW6BptsiOk+tso8t00JZUUsxvVW3SMCfVS3Jo/sAkzwN+re3rQRvLElOmkHt5X60tzbmcc9a894O1OZacuXeub+8mjV2vmpWRy1rScAs2/Okwj85f53xFM7HgNuLMYyzr9IYx89cAFCVK9ikZIMXOrYGUNervl1MRmv/TWJzpuBf0GQBXiuEuJ2Y2i0lNQB0rf52T/FqiWmeY31r+9zEGsxAfrUCNSf+1mdmxzFmxLWkBgWhc//nQlJRf63q5ZteahpoaklF4spxSEH3WKn8cyjRb+Tm5vzytuMc0mKaD5KwNMKhAaN2IRNzWgdIGFdPxdxMcjPIdScXrdh8EFjGnyeGZ1M/rtsJm9I+p45lMETXkLYaBGRf6pjWHMWneKqCiET9pPELMWGDLxg7/916Pr+4j7oXdV7NoeLkCnfVzHnMPl04Jp4EF0eJK8AIfa9MKHI+bLXWGmkXrIFLaY9ass6cm1fx+LdlNfC72S9jUCkdZaM4ODt8yyzURrUf1QMlALh+GEtKuF8Kx4A9Snkf6cIt2o5/kV8oJQ7YROUMJ5A7geaP/LYVzpyKtFdVIxBeRlxmNauWdTHDL7yuTAisbHsOu6ZVMyXfljHBvbwQynGkaAxGecGq4oa913soXcqMfrXSjqcYy1s8HjstnhpXRTqRw=';

const id = '14368';

const phone = '9080476159';
const moduleName = 'pharmacy';
const visitEvent = 'visit-event';

function App() {
  React.useEffect(() => {
    const listener = EventRegister.addEventListener(visitEvent, data => {
      if (data.message === 'unauthorized-wellness-access') {
        Alert.alert('Error', data.errorMessage);
      } else if (data.message === 'generate-magic-link-failed') {
        console.log('magic link failed. ', data);
        //add analytics event to track for whom this is happening.
      } else if (data.message === 'getDeviceInfo-failed') {
        console.log('device Info library failed', data);
        //add analytics event to track for whom this is happening.
      } else if (data.message === 'web-view-error') {
        console.log('web-view-error', data.errorMessage);
        //when webview throws error.
      } else if (data.message === 'external-server-error') {
        Alert.alert('Error', data.errorMessage);
      }
    });
    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, []);

  return (
    <SafeAreaView style={{flex: 1}}>
      {/* <Button
        title="Press me"
        color="#f194ff"
        onPress={() => Alert.alert('Button with adjusted color pressed')}
      /> */}

      <VisitRnSdkView
        baseUrl={visitBaseUrl}
        errorBaseUrl={'https://star-health.getvisitapp.net/'}
        token={token}
        cpsid={cpsid}
        moduleName={moduleName}
        environment={'qa'}
        isLoggingEnabled={true}
        // magicLink='https://star-health.getvisitapp.net/?mluib7c=LCPCcVb0'
      />
    </SafeAreaView>
  );
}

export default App;
