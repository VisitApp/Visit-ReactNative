import {NativeModules, PermissionsAndroid} from 'react-native';



export const requestActivityRecognitionPermission = async (
  webviewRef
) => {
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

      askForGoogleFitPermission(webviewRef);
    } else {
      console.log('Fitness permission denied');
    }
  } catch (err) {
    console.warn(err);
  }
};

const askForGoogleFitPermission = async (webviewRef) => {
  try {
    NativeModules.VisitFitnessModule.initiateSDK();

    const isPermissionGranted =
      await NativeModules.VisitFitnessModule.askForFitnessPermission();
    if (isPermissionGranted == 'GRANTED') {
      getDailyFitnessData(webviewRef);
    }
    console.log(`Google Fit Permissionl: ${isPermissionGranted}`);
  } catch (e) {
    console.error(e);
  }
};

const getDailyFitnessData = webviewRef => {
  console.log('getDailyFitnessData() called');

  NativeModules.VisitFitnessModule.requestDailyFitnessData(data => {
    console.log(`getDailyFitnessData() data: ` + data);
    webviewRef.current.injectJavaScript(data);
  });
};

export const requestActivityData = (type, frequency, timeStamp, webviewRef) => {
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

export const requestLocationPermission = async () => {
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
    } else {
      console.log('Fitness permission denied');
    }
  } catch (e) {
    console.error(e);
  }
};

export const updateApiBaseUrl = (
  apiBaseUrl,
  authtoken,
  googleFitLastSync,
  gfHourlyLastSync
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


const setCalorieFromWeb=(calorieCount)=>{

  console.log('setCalorieFromWeb() called.');

  NativeModules.VisitFitnessModule.initiateSDK();

  NativeModules.VisitFitnessModule.setCalorieFromWeb(calorieCount);

}

export const handleMessage = (event, webviewRef,onBack) => {
  console.log(
    'event:' +
      event +
      ' webviewRef: ' +
      webviewRef
  );

  if (event.nativeEvent.data != null) {
    try {
      const parsedObject = JSON.parse(event.nativeEvent.data);

      if (parsedObject.method != null) {
        switch (parsedObject.method) {
          case 'CONNECT_TO_GOOGLE_FIT':
            requestActivityRecognitionPermission(webviewRef);
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
                  apiBaseUrl +
                  ' authtoken: ' +
                  authtoken +
                  ' googleFitLastSync: ' +
                  googleFitLastSync +
                  ' gfHourlyLastSync: ' +
                  gfHourlyLastSync,
              );

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

              console.log(
                'type: ' +
                  type +
                  ' frequency:' +
                  frequency +
                  ' timeStamp: ' +
                  timeStamp,
              );

              requestActivityData(type, frequency, timeStamp, webviewRef);
            }
            break;
          case 'GET_LOCATION_PERMISSIONS':
            {
              requestLocationPermission();
            }
            break;
          case 'CLOSE_VIEW':
            {
              onBack();
              break;
            }
            break;
          case 'UPDATE_CALORIE':
            {
                console.log("calories from webview: "+parsedObject.calories)
                setCalorieFromWeb(parsedObject.calories);
            }
            break;
          case 'OPEN_PDF':
            {
              let hraUrl = parsedObject.url;

              NativeModules.VisitFitnessModule.openHraLink(hraUrl);
              console.log('HRA URL:' + hraUrl);
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


  //independent method to check if the google fit is connected or not.
 export const checkActivityPermission=()=>{
    return new Promise((resolve,reject)=>{
      NativeModules.VisitFitnessModule.initiateSDK();
      NativeModules.VisitFitnessModule.checkGoogleFitPermission()
      .then((result)=>{
          resolve(result)
      })
      .catch((err)=>
           reject(err)
      );
    });
  }


//Request android native ACTIVITY_RECOGNITIONO_PERMISSION ---> Get Google Fit Permission ---> Get Google Fit Data
//It will check the all the permission and will return data in this format ("{numberOfSteps: 136, sleepTime: 540, calories : 283.0}") or will 
//return error.

export const requestActivityPermissionAndGetData =()=>{
  return new Promise(async (resolve,reject)=>{
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
         const permissionGranted= await askForGoogleFitPermission();
         if(permissionGranted){
            const fitnessData= await getDailyFitnessData();
            resolve(fitnessData);
         }
      } else {
        reject("ACTIVITY_RECOGNITION denied"); 
      }
    }catch(err){
      reject(err);
    }
  });
};

const askForGoogleFitPermission =  () => {

  return new Promise(async (resolve,reject)=>{
    try {

      NativeModules.VisitFitnessModule.initiateSDK();

      const isPermissionGranted =
        await NativeModules.VisitFitnessModule.askForFitnessPermission();
      if (isPermissionGranted == 'GRANTED') {
        resolve(true);
      } else {
        reject(false);
      }
    } catch (e) {
      reject(e);
    }
  });
 
};


  
const getDailyFitnessData = () => {
  return new Promise(async (resolve,reject)=>{
    console.log('getDailyFitnessData() called');
    try{
      NativeModules.VisitFitnessModule.initiateSDK();
      const data= await NativeModules.VisitFitnessModule.requestDailyFitnessData();
      resolve(data);
    }catch(e){
      reject(e);
    }
});
};
