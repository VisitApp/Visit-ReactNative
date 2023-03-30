import React, {useRef, useEffect, useState, useCallback} from 'react';

import {
  SafeAreaView,
  NativeModules,
  PermissionsAndroid,
  BackHandler,
  Linking,
} from 'react-native';

import WebView from 'react-native-webview';

import LocationEnabler from 'react-native-location-enabler';

const {
  PRIORITIES: { HIGH_ACCURACY },
  useLocationSettings,
  addListener
} = LocationEnabler;



const VisitHealthView = ({ baseUrl, token, id, phone, moduleName,magicLink }) => {

  const [source, setSource] = useState('');
  useEffect(() => {
    if((magicLink?.trim()?.length || 0) > 0){
      setSource(
        magicLink
      );
    }else{
      setSource(
        `${baseUrl}?token=${token}&id=${id}&phone=${phone}&moduleName=${moduleName}`
      );
    }
   
  }, [id, token, baseUrl, phone, moduleName,magicLink]);

  const [enabled, requestResolution] = useLocationSettings(
    {
      priority: HIGH_ACCURACY, // default BALANCED_POWER_ACCURACY
      alwaysShow: true, // default false
      needBle: true, // default false
    },
    false /* optional: default undefined */
  );




  
  const webviewRef = useRef(null);


  const requestActivityRecognitionPermission = async () => {
    console.log('inside requestActivityRecognitionPermission()');
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        {
          title: 'Need Activity Recognition Permission',
          message: 'This needs access to your Fitness Permission',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('ACTIVITY_RECOGNITION granted');
        askForGoogleFitPermission();
      } else {
        console.log('Fitness permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  };

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
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('Location permission granted');

        if(!enabled){

          requestResolution();
          
        }else{

          var finalString=`window.checkTheGpsPermission(true)`;
          console.log("requestLocationPermission: "+finalString);

          webviewRef.current?.injectJavaScript(
            finalString
          );
        }
       
      } else {
        console.log('Location permission denied');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const askForGoogleFitPermission = async () => {
    try {
      NativeModules.VisitFitnessModule.initiateSDK();

      const isPermissionGranted =
        await NativeModules.VisitFitnessModule.askForFitnessPermission();
      if (isPermissionGranted == 'GRANTED') {
        getDailyFitnessData();
      }
      console.log(`Google Fit Permissionl: ${isPermissionGranted}`);
    } catch (e) {
      console.error(e);
    }
  };

  const getDailyFitnessData = () => {
    console.log('getDailyFitnessData() called');

    NativeModules.VisitFitnessModule.requestDailyFitnessData(data => {
      console.log(`getDailyFitnessData() data: ` + data);
      webviewRef.current.injectJavaScript(data);
    });
  };

  const requestActivityData = (type, frequency, timeStamp) => {
    console.log('requestActivityData() called');

    NativeModules.VisitFitnessModule.requestActivityDataFromGoogleFit(
      type,
      frequency,
      timeStamp,
      data => {
        console.log(`requestActivityData() data: ` + data);
        webviewRef.current.injectJavaScript('window.' + data);
      },
    );
  };

  const updateApiBaseUrl = (
    apiBaseUrl,
    authtoken,
    googleFitLastSync,
    gfHourlyLastSync,
  ) => {
    console.log('updateApiBaseUrl() called.');
    NativeModules.VisitFitnessModule.initiateSDK();

    NativeModules.VisitFitnessModule.updateApiBaseUrl(
      apiBaseUrl,
      authtoken,
      googleFitLastSync,
      gfHourlyLastSync,
    );
  };

  const runBeforeFirst = `
        window.isNativeApp = true;
        window.platform = "ANDROID";
        window.setSdkPlatform('ANDROID');
        true; // note: this is required, or you'll sometimes get silent failures
    `;


  const handleMessage = event => {

    if (event.nativeEvent.data != null) {
      try {
        // console.log("Event :"+event.nativeEvent.data);
        const parsedObject = JSON.parse(event.nativeEvent.data);
        if (parsedObject.method != null) {
          switch (parsedObject.method) {
            case 'CONNECT_TO_GOOGLE_FIT':
              requestActivityRecognitionPermission();
              break;
            case 'UPDATE_PLATFORM':
              webviewRef.current?.injectJavaScript(
                'window.setSdkPlatform("ANDROID")',
              );
              break;
            case 'UPDATE_API_BASE_URL':
              {
                let apiBaseUrl = parsedObject.apiBaseUrl;
                let authtoken = parsedObject.authtoken;

                let googleFitLastSync = parsedObject.googleFitLastSync;
                let gfHourlyLastSync = parsedObject.gfHourlyLastSync;

                console.log(
                  'apiBaseUrl: ' +
                    "NOT SHOWN" +
                    ' authtoken: ' +
                    "NOT SHOWN" +
                    ' googleFitLastSync: ' +
                    googleFitLastSync +
                    ' gfHourlyLastSync: ' +
                    gfHourlyLastSync,
                );

                updateApiBaseUrl(
                  apiBaseUrl,
                  authtoken,
                  googleFitLastSync,
                  gfHourlyLastSync,
                );
              }
              break;
            case 'GET_DATA_TO_GENERATE_GRAPH':
              {
                let type = parsedObject.type;
                let frequency = parsedObject.frequency;
                let timeStamp = parsedObject.timestamp;

                console.log(
                  'type: ' +
                    type +
                    ' frequency:' +
                    frequency +
                    ' timeStamp: ' +
                    timeStamp,
                );

                requestActivityData(type, frequency, timeStamp);
              }
              break;
            case 'GET_LOCATION_PERMISSIONS':
              {
                requestLocationPermission();
              }
              break;
            case 'OPEN_PDF':{
                let pdfUrl=parsedObject.url;
                console.log("pdfUrl "+pdfUrl);

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
      webviewRef.current.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);

  useEffect(() => {

    const gpsListener = addListener(({ locationEnabled }) =>{

      if(locationEnabled){
        var finalString=`window.checkTheGpsPermission(true)`;

        console.log("listener: "+finalString);
  
        webviewRef.current?.injectJavaScript(
          finalString
        );
      }
      
    }  
    );

    BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBack);
      gpsListener.remove();
    };
  }, [handleBack]);

  return (

    
    <SafeAreaView style={{flex: 1}}>
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
        onLoadProgress={event => setCanGoBack(event.nativeEvent.canGoBack)}
      />
      ): null }
      
    </SafeAreaView>
  );
};



export const fetchDailyFitnessData = (startTimeStamp)=>{

  return new Promise((resolve,reject)=>{
    console.log("fetchDailyFitnessData called: "+startTimeStamp);

    NativeModules.VisitFitnessModule.initiateSDK();

    NativeModules.VisitFitnessModule.fetchDailyFitnessData(startTimeStamp).then((result)=> {
      resolve(result);
    })
    .catch((err)=> reject(err));
  });

 
}

export const fetchHourlyFitnessData = startTimeStamp=>{

  return new Promise((resolve,reject)=>{

    console.log("fetchHourlyFitnessData called: "+startTimeStamp);

    NativeModules.VisitFitnessModule.initiateSDK();

    NativeModules.VisitFitnessModule.fetchHourlyFitnessData(startTimeStamp).then((result)=> {
    resolve(result);
    }).catch((err)=>reject(err));
    
});
}


export default VisitHealthView;

VisitHealthView.defaultProps = {
  id: '',
  token: '',
  baseUrl: '',
  phone: '',
  moduleName: '',
  magicLink: '',
};

