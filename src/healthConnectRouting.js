export const routeHealthConnectConnectionRequest = async ({
  disclaimerAccepted,
  inFlightRef,
  isLoggingEnabled,
  isNativeStepTrackingAvailable,
  startPermissionFlow,
  showDisclaimer,
  onCapabilityCheckError,
}) => {
  if (inFlightRef.current) {
    logHealthConnectRouting(
      isLoggingEnabled,
      'Ignoring duplicate connection request because a flow is already in progress.'
    );
    return 'IGNORED';
  }

  inFlightRef.current = true;

  try {
    if (disclaimerAccepted === true) {
      logHealthConnectRouting(
        isLoggingEnabled,
        'Disclaimer accepted. Starting the permission flow without another capability check.'
      );
      await startPermissionFlow();
      return 'PERMISSION_FLOW';
    }

    let nativeStepTrackingAvailable = false;

    try {
      nativeStepTrackingAvailable =
        (await isNativeStepTrackingAvailable()) === true;

      logHealthConnectRouting(
        isLoggingEnabled,
        `Native step tracking capability result: ${nativeStepTrackingAvailable}`
      );
    } catch (error) {
      logHealthConnectRouting(
        isLoggingEnabled,
        'Capability check failed. Treating native step tracking as unavailable.'
      );
      onCapabilityCheckError?.(error);
    }

    if (nativeStepTrackingAvailable) {
      logHealthConnectRouting(
        isLoggingEnabled,
        'Native step tracking is available. Starting the permission flow.'
      );
      await startPermissionFlow();
      return 'PERMISSION_FLOW';
    }

    logHealthConnectRouting(
      isLoggingEnabled,
      'Native step tracking is unavailable. Showing the Health Connect disclaimer.'
    );
    await showDisclaimer();
    return 'DISCLAIMER';
  } finally {
    inFlightRef.current = false;
  }
};

const logHealthConnectRouting = (isLoggingEnabled, message) => {
  if (isLoggingEnabled) {
    console.log(`[VisitRnSdk][HealthConnect] ${message}`);
  }
};
