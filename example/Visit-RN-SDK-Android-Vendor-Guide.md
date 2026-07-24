# Visit React Native SDK Android Vendor Guide

This guide is for Android integration of the Visit React Native SDK `3.x` line.
It replaces the older Android PDF instructions. Do not use this document for iOS;
keep the existing iOS integration steps unchanged.

## Version To Install

Install the RN `3.x` SDK from the `rn3` npm tag:

```sh
npm install react-native-visit-rn-sdk@rn3
```

At the time this guide was prepared, `rn3` resolves to `3.0.4`.

Do not use this command for RN `3.x` integrations:

```sh
npm install react-native-visit-rn-sdk
```

The npm `latest` tag currently points to the `5.x` line, not the RN `3.x` line.

After installing, rebuild the Android app. React Native autolinking should add
the native package automatically:

```sh
npx react-native config
```

Confirm the output contains:

```text
react-native-visit-rn-sdk
packageImportPath: import com.visitrnsdk.VisitRnSdkPackage;
packageInstance: new VisitRnSdkPackage()
```

## Required RN App Dependencies

The vendor app must also install these React Native packages directly:

```sh
npm install \
  react-native-device-info@^14.1.1 \
  react-native-event-listeners@^1.0.7 \
  react-native-webview@^13.16.0 \
  react-native-location-enabler@github:sashko9807/react-native-location-enabler
```

Keep these dependencies in the app's `package.json`. Because they are direct app
dependencies, React Native autolinking will discover their native Android
projects normally. No extra `react-native.config.js` bridge is required.

## Android Build Requirements

The Android app must use Android Gradle Plugin `8.9.1` or newer because the SDK
uses Health Connect `1.1.0` and AndroidX Core `1.17.0`. The verified
configuration is:

- Android Gradle Plugin: `8.13.2`
- Kotlin Gradle plugin: `1.9.25`
- `compileSdkVersion = 36`
- `targetSdkVersion = 35`
- `minSdkVersion = 23`
- Java 17
- Core library desugaring enabled

Example root `android/build.gradle`:

```gradle
buildscript {
    ext {
        buildToolsVersion = "35.0.0"
        minSdkVersion = 23
        compileSdkVersion = 36
        targetSdkVersion = 35
        kotlinVersion = "1.9.25"
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:8.13.2")
        classpath("com.facebook.react:react-native-gradle-plugin")
        classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
    }
}
```

Example `android/app/build.gradle` Android config:

```gradle
android {
    compileSdk rootProject.ext.compileSdkVersion

    defaultConfig {
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
    }

    compileOptions {
        coreLibraryDesugaringEnabled true
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

dependencies {
    coreLibraryDesugaring "com.android.tools:desugar_jdk_libs:2.1.5"
}
```

The SDK package owns these Android dependencies internally:

- `com.github.VisitApp:AndroidSDK:v3.10`
- `androidx.health.connect:connect-client:1.1.0`
- `com.jakewharton.timber:timber:5.0.1`
- `org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1`

Do not add those dependencies directly to the app unless Visit explicitly asks
you to for a future release.

## Android Manifest Setup

Add the Health Connect privacy policy URL as application metadata in
`android/app/src/main/AndroidManifest.xml`:

```xml
<application>
    <meta-data
        android:name="visit_android_sdk.health_connect_privacy_policy_url"
        android:value="https://your-privacy-policy-url" />
</application>
```

Use the same privacy policy URL that is configured for Health Connect in Google
Play Console.

The SDK provides the Health Connect permission usage activity and Android 14+
permission usage alias through its merged manifest:

- `com.getvisitapp.visit.healthConnect.activity.HealthConnectPermissionUsageActivity`
- `com.getvisitapp.visit.healthConnect.activity.HealthConnectViewPermissionUsageActivity`

The RN SDK and its AndroidSDK dependency provide the Visit-owned Android
permissions through the merged manifest:

- `android.permission.INTERNET`
- `android.permission.CAMERA`
- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.ACCESS_COARSE_LOCATION`
- Health Connect read permissions

App-specific permissions should be declared by the app only if the app's own
features need additional behavior outside the Visit SDK flow.

## JavaScript Usage

Render the Visit SDK WebView:

```js
import React, {useEffect} from 'react';
import {Alert, SafeAreaView} from 'react-native';
import {EventRegister} from 'react-native-event-listeners';
import VisitRnSdkView from 'react-native-visit-rn-sdk';

const visitEvent = 'visit-event';

export default function VisitScreen() {
  useEffect(() => {
    const listener = EventRegister.addEventListener(visitEvent, data => {
      if (data.message === 'unauthorized-wellness-access') {
        Alert.alert('Error', data.errorMessage);
      } else if (data.message === 'generate-magic-link-failed') {
        console.log('Magic link failed', data);
      } else if (data.message === 'getDeviceInfo-failed') {
        console.log('Device info failed', data);
      } else if (data.message === 'web-view-error') {
        console.log('WebView error', data.errorMessage);
      } else if (data.message === 'external-server-error') {
        Alert.alert('Error', data.errorMessage);
      } else if (data.message === 'health-connect-error-event') {
        console.log('Health Connect error', data.errorMessage);
      }
    });

    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, []);

  return (
    <SafeAreaView style={{flex: 1}}>
      <VisitRnSdkView
        baseUrl="https://api.getvisitapp.com/v3"
        errorBaseUrl="https://star-health.getvisitapp.com/"
        token="Bearer <visit-token>"
        cpsid="<customer-policy-or-session-id>"
        moduleName="<module-name>"
        environment="prod"
        isLoggingEnabled={false}
      />
    </SafeAreaView>
  );
}
```

If Visit provides a pre-generated magic link, pass it with `magicLink`:

```jsx
<VisitRnSdkView
  magicLink="<visit-magic-link>"
  isLoggingEnabled={false}
/>
```

## Optional Android Health Connect APIs

For Android-only screens that need to show Health Connect status or today's
metrics outside the Visit WebView, use `NativeModules.VisitFitnessModule`.

```js
import {NativeModules, Platform} from 'react-native';

async function loadTodayHealthMetrics() {
  if (Platform.OS !== 'android') {
    return;
  }

  await NativeModules.VisitFitnessModule.initiateSDK(false);

  let status =
    await NativeModules.VisitFitnessModule.getHealthConnectStatus();

  if (status === 'INSTALLED') {
    const permissionResult =
      await NativeModules.VisitFitnessModule.askForFitnessPermission();

    if (permissionResult === 'GRANTED') {
      status =
        await NativeModules.VisitFitnessModule.getHealthConnectStatus();
    }
  }

  if (status === 'CONNECTED') {
    const [steps, sleepMinutes, calories] = await Promise.all([
      NativeModules.VisitFitnessModule.getTodayStepCount(),
      NativeModules.VisitFitnessModule.getTodaySleepMinutes(),
      NativeModules.VisitFitnessModule.getTodayCalorieCount(),
    ]);

    console.log({steps, sleepMinutes, calories});
  }
}
```

Available Android native module methods:

- `initiateSDK(isLoggingEnabled)`
- `getHealthConnectStatus()`
- `askForFitnessPermission()`
- `getTodayStepCount()`
- `getTodaySleepMinutes()`
- `getTodayCalorieCount()`
- `triggerManualSync()`
- `openHealthConnectApp()`

Possible Health Connect status values:

- `NOT_SUPPORTED`
- `NOT_INSTALLED`
- `INSTALLED`
- `CONNECTED`

## Do Not Do This Anymore

The following steps from the older Android PDF are no longer required and should
not be copied into vendor apps:

- Do not copy `.aar` files into the app module.
- Do not add `implementation files('google_fit-debug.aar')`.
- Do not add `implementation "androidx.health.connect:connect-client:1.1.0"` in the app.
- Do not add `implementation "com.github.VisitApp:AndroidSDK:..."` in the app.
- Do not declare Visit-owned camera or location permissions in the app manifest.
- Do not declare Visit-owned Health Connect read permissions in the app manifest.
- Do not declare Visit-owned camera features in the app manifest.
- Do not copy `VisitFitnessModule` into the app.
- Do not copy `MyAppPackage` into the app.
- Do not copy `VisitSessionStorage` into the app.
- Do not copy `TimberUtils` into the app.
- Do not copy `HealthConnectPermissionUsageActivity` into the app.
- Do not copy `activity_health_connect_permission_usage.xml` into the app.
- Do not manually add `MyAppPackage` in `MainApplication`.
- Do not add the old Health Connect permission launcher code in `MainActivity`.

These pieces are now owned by `react-native-visit-rn-sdk@rn3` and the AndroidSDK
dependency shipped inside it.

## Verification

Run autolinking verification:

```sh
npx react-native config
```

Confirm these packages are present:

- `react-native-visit-rn-sdk`
- `react-native-device-info`
- `react-native-location-enabler`
- `react-native-webview`

Confirm `react-native-visit-rn-sdk` resolves to
`com.visitrnsdk.VisitRnSdkPackage`.

Run Android build verification:

```sh
cd android
./gradlew :react-native-visit-rn-sdk:compileDebugKotlin --no-daemon --console=plain
./gradlew :app:assembleDebug --no-daemon --console=plain
```

Inspect the merged manifest:

```sh
cd android
./gradlew :app:processDebugMainManifest --no-daemon --console=plain
```

Confirm the merged manifest contains:

- `visit_android_sdk.health_connect_privacy_policy_url`
- `HealthConnectPermissionUsageActivity`
- `HealthConnectViewPermissionUsageActivity`
- camera and location permissions from `react-native-visit-rn-sdk`
- Health Connect read permissions

Confirm Health Connect is resolved through the SDK package, not directly from
the app:

```sh
cd android
./gradlew :app:dependencyInsight \
  --dependency androidx.health.connect:connect-client \
  --configuration debugRuntimeClasspath \
  --no-daemon \
  --console=plain
```

Expected result: `androidx.health.connect:connect-client:1.1.0` is present via
`project :react-native-visit-rn-sdk` and/or `com.github.VisitApp:AndroidSDK:v3.10`.

## Troubleshooting

If Gradle fails with AAR metadata errors mentioning Health Connect or AndroidX
Core requiring AGP `8.9.1+`, upgrade the app to AGP `8.13.2` and keep
`compileSdkVersion = 36`.

If Gradle cannot resolve `com.github.VisitApp:AndroidSDK:v3.10`, ensure the
React Native Gradle plugin is applied normally. If the project uses custom
repository management, add JitPack to the dependency repositories:

```gradle
maven { url "https://www.jitpack.io" }
```

If the Health Connect privacy page shows a fallback error page, the app is
missing a valid `visit_android_sdk.health_connect_privacy_policy_url` metadata
entry or the value is not a valid `http` or `https` URL.

If `NativeModules.VisitFitnessModule` is undefined, rebuild the app and verify
autolinking with `npx react-native config`. The app should not manually register
old copied native modules.
