import { Alert, Linking, NativeModules } from 'react-native';

export const NATIVE_LOCATION_RESPONSE_VERSION = 2;

export const NATIVE_LOCATION_OPTIONS = {
  maximumAgeMs: 60000,
  timeoutMs: 10000,
};

const LOCATION_PERMISSION_ERROR_CODES = new Set([
  'E_LOCATION_SERVICES_DISABLED',
  'E_LOCATION_PERMISSION_DENIED',
  'E_LOCATION_PERMISSION_DENIED_PREVIOUSLY',
  'E_LOCATION_PERMISSION_RESTRICTED',
  'E_LOCATION_USAGE_DESCRIPTION_MISSING',
]);

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
    timestamp <= 0 ||
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
    source: 'ios-core-location',
  };
};

export const createIosGpsPermissionCallbackScript = (
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
        'hasLocation:', ${Boolean(location)}
      );
      window.checkTheGpsPermission(${callbackArguments});
    } else {
      console.warn('[VisitLocation] checkTheGpsPermission is not defined');
    }
    return true;
  })();
  true;`;
};

export const requestIosLocation = async ({
  webviewRef,
  locationResponseVersion,
  isLoggingEnabled,
}) => {
  let hasResponded = false;
  const startedAt = Date.now();
  const logTiming = (stage) => {
    if (isLoggingEnabled) {
      console.log(`[VisitLocation] iOS ${stage}: ${Date.now() - startedAt}ms`);
    }
  };
  const respond = (isAvailable, location = null) => {
    if (hasResponded) {
      return;
    }
    hasResponded = true;
    webviewRef.current?.injectJavaScript(
      createIosGpsPermissionCallbackScript(isAvailable, location)
    );
  };

  const supportsNativeLocation =
    Number(locationResponseVersion) >= NATIVE_LOCATION_RESPONSE_VERSION;
  if (!supportsNativeLocation) {
    respond(true);
    return;
  }

  const locationModule = NativeModules.VisitLocationModule;
  if (!locationModule?.getCurrentLocation) {
    logTiming('native module unavailable; using WebView fallback');
    respond(true);
    return;
  }

  try {
    const nativeLocation = await locationModule.getCurrentLocation(
      NATIVE_LOCATION_OPTIONS
    );
    const location = normalizeLocation(nativeLocation);
    logTiming('native location resolved');

    if (!location && isLoggingEnabled) {
      console.warn(
        '[VisitLocation] iOS native location was invalid; using WebView fallback'
      );
    }
    respond(true, location);
  } catch (error) {
    const errorCode = error?.code;
    if (isLoggingEnabled) {
      console.warn('[VisitLocation] iOS native location failed', errorCode);
    }

    if (errorCode === 'E_LOCATION_PERMISSION_DENIED_PREVIOUSLY') {
      showLocationPermissionAlert();
    }

    if (LOCATION_PERMISSION_ERROR_CODES.has(errorCode)) {
      respond(false);
      return;
    }

    respond(true);
  }
};
