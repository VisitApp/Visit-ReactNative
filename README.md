### **Instructions for configuring your Android Project**

* Install Visit React Native Plugin   
  `npm install react-native-visit-rn-sdk@3.0.6`
* Install these transitive plugins that Visit Plugin requires internally:   
  `npm install react-native-device-info`   
  `npm install https://github.com/sashko9807/react-native-location-enabler`  
  `npm install react-native-event-listeners`   
  `npm install react-native-webview`
* Enable code desugaring in your app, or there add the dependency. 

```
coreLibraryDesugaring 'com.android.tools:desugar_jdk_libs:2.1.5'
```

* Inside the `:app` `build.gradle` android block specify these. 

```

android {
	compileOptions {
		coreLibraryDesugaringEnabled true
        sourceCompatibility JavaVersion.VERSION_17
		targetCompatibility JavaVersion.VERSION_17
	}    
}
```

* In the `AndroidManifest.xml` file, add the metadata tag to serve the privacy manifest URL

    ```
     <meta-data
                android:name="visit_android_sdk.health_connect_privacy_policy_url"
                android:value="https://www.google.com" />
    ```
* Version Requirement:  
  AGP: `8.13.2` or higher  
  Kotlin: `1.9.25`or higher  
  `compileSdkVersion`: 36 or higher  

‌

### **Instructions for configuring Plugin in iOS project** 

* Add the plugin `npm install react-native-visit-rn-sdk@3.0.6 && npx pod-install`
* Install pods(for M1 processors running build on `x86_64` hardware)

    `arch -x86_64 pod install`


* In the Signing & Capabilities section in Xcode, add HealthKit as a capability
* Add these keys inside `info.plist` file

```
<key>NSHealthShareUsageDescription</key>
<string>Visit requires your permission to read health and fitness data.</string>
<key>NSHealthUpdateUsageDescription</key>
<string>Visit requires your permission to store health and fitness data in HealthKit.</string>
```

# **Usage**

```
import React from 'react';
import VisitRnSdkView from 'react-native-visit-rn-sdk';
import {EventRegister} from 'react-native-event-listeners';
import {SafeAreaView, Alert} from 'react-native';

function App() {

  return (
    <SafeAreaView style={{flex: 1}}>
      <VisitRnSdkView
        magicLink={<Enter the sso link here>}
        isLoggingEnabled={true}
        }
      />
    </SafeAreaView>
  );
}

export default App;
```

To see the full usage code for getting Health Connect/Health Kit connection status and retriving step data, refer [here](https://github.com/VisitApp/Visit-ReactNative/blob/master/example/App.js).

### **Sample Project**

Please use the below project which demonstrates how to use the SDK. `https://github.com/VisitApp/Visit-ReactNative/tree/mchi-rn-sdk-3x/example`  

**Permission Usage Declaration:**

1\. For android, Google needs the declaration of how you are using the Health Data in your organisation privacy policy webpage.  
 Description for this is present inside this document along with the permission that needs to be added in the Google Play Console  
<custom data-type="smartlink" data-id="id-0">https://docs.google.com/document/d/1QKtC9ofRtrLIroBzW0pG7BrdrpG_KorHbM5Y0zcgGQI/edit?usp=sharing</custom>   
  

2. For iOS, Health and Fitness permission needs to be added in the App Store Connect Dashboard.  

    ![](blob:https://media.staging.atl-paas.net/?type=file&localId=d0ec2b9a9fa8&id=e6019c8d-ca4b-4cae-bbae-9434437759ca&&collection=contentId-2202599425&height=523&occurrenceKey=null&width=1181&__contextId=null&__displayType=null&__external=false&__fileMimeType=null&__fileName=null&__fileSize=null&__mediaTraceId=null&url=null)

       



‌
