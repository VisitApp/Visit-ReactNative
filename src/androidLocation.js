import {
  Alert,
  Linking,
  NativeModules,
  PermissionsAndroid,
} from 'react-native';

export const NATIVE_LOCATION_RESPONSE_VERSION = 2;

export const NATIVE_LOCATION_OPTIONS = {
  maximumAgeMs: 60000,
  timeoutMs: 10000,
};

const isGranted = (result) => result === PermissionsAndroid.RESULTS.GRANTED;

const isPermanentlyDenied = (result) =>
  result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

const showLocationPermissionAlert = () => {
  Alert.alert(
    'Permission Required',
    'Allow location permission from app settings',
    [
      {
        text: 'Cancel',
      },
      {
        text: 'Go to Settings',
        onPress: () => {
          Linking.openSettings();
        },
      },
    ]
  );
};

const getForegroundLocationPermission = async () => {
  const finePermission = PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
  const coarsePermission =
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

  const [hasFinePermission, hasCoarsePermission] = await Promise.all([
    PermissionsAndroid.check(finePermission),
    PermissionsAndroid.check(coarsePermission),
  ]);

  if (hasFinePermission || hasCoarsePermission) {
    return {
      granted: true,
      precision: hasFinePermission ? 'precise' : 'approximate',
      permanentlyDenied: false,
    };
  }

  const results = await PermissionsAndroid.requestMultiple([
    finePermission,
    coarsePermission,
  ]);
  const fineResult = results[finePermission];
  const coarseResult = results[coarsePermission];
  const fineGranted = isGranted(fineResult);
  const coarseGranted = isGranted(coarseResult);

  return {
    granted: fineGranted || coarseGranted,
    precision: fineGranted ? 'precise' : 'approximate',
    permanentlyDenied:
      !fineGranted &&
      !coarseGranted &&
      (isPermanentlyDenied(fineResult) || isPermanentlyDenied(coarseResult)),
  };
};

const normalizeLocation = (location) => {
  if (!location || typeof location !== 'object') {
    return null;
  }

  const { latitude, longitude, accuracy, timestamp, precision } = location;
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    !Number.isFinite(accuracy) ||
    accuracy < 0 ||
    !Number.isFinite(timestamp) ||
    (precision !== 'precise' && precision !== 'approximate')
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    accuracy,
    timestamp,
    precision,
    source: 'android-fused',
  };
};

export const createGpsPermissionCallbackScript = (
  isAvailable,
  location = null
) => {
  const callbackArguments = isAvailable
    ? location
      ? `true, ${JSON.stringify(location)}`
      : 'true'
    : 'false';

  return `(function() {
    if (typeof window.checkTheGpsPermission === 'function') {
      console.log(
        '[VisitLocation] invoking checkTheGpsPermission',
        'isAvailable:', ${Boolean(isAvailable)},
        'hasLocation:', ${Boolean(location)},
        'callbackArguments:', ${callbackArguments},
      );
      window.checkTheGpsPermission(${callbackArguments});
    }
    return true;
  })();
  true;`;
};

export const requestAndroidLocation = async ({
  webviewRef,
  locationResponseVersion,
  isLoggingEnabled,
}) => {
  let hasResponded = false;
  const startedAt = Date.now();
  const logTiming = (stage) => {
    if (isLoggingEnabled) {
      console.log(`[VisitLocation] ${stage}: ${Date.now() - startedAt}ms`);
    }
  };
  const respond = (isAvailable, location = null) => {
    if (hasResponded) {
      return;
    }
    hasResponded = true;
    webviewRef.current?.injectJavaScript(
      createGpsPermissionCallbackScript(isAvailable, location)
    );
  };

  try {
    const permission = await getForegroundLocationPermission();
    logTiming('permission resolved');

    if (!permission.granted) {
      if (permission.permanentlyDenied) {
        showLocationPermissionAlert();
      }
      respond(false);
      return;
    }

    const locationModule = NativeModules.VisitLocationModule;
    if (!locationModule?.requestLocationSettings) {
      logTiming('native module unavailable; using WebView fallback');
      respond(true);
      return;
    }

    let locationSettingsEnabled;
    try {
      locationSettingsEnabled = await locationModule.requestLocationSettings();
    } catch (error) {
      if (isLoggingEnabled) {
        console.warn('[VisitLocation] location settings check failed', error);
      }
      respond(true);
      return;
    }
    logTiming('location settings resolved');

    if (!locationSettingsEnabled) {
      respond(false);
      return;
    }

    const supportsNativeLocation =
      Number(locationResponseVersion) >= NATIVE_LOCATION_RESPONSE_VERSION;
    if (!supportsNativeLocation || !locationModule.getCurrentLocation) {
      respond(true);
      return;
    }

    try {
      const nativeLocation = await locationModule.getCurrentLocation(
        NATIVE_LOCATION_OPTIONS
      );
      const location = normalizeLocation(nativeLocation);
      logTiming('native location resolved');
      respond(true, location);
    } catch (error) {
      if (isLoggingEnabled) {
        console.warn('[VisitLocation] native location failed', error);
      }
      respond(true);
    }
  } catch (error) {
    if (isLoggingEnabled) {
      console.warn('[VisitLocation] permission request failed', error);
    }
    respond(false);
  }
};
