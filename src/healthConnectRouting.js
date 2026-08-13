export const routeHealthConnectConnectionRequest = async ({
  disclaimerAccepted,
  isLoggingEnabled,
  getHealthConnectStatus,
  isNativeStepTrackingAvailable,
  startPermissionFlow,
  showDisclaimer,
  onHealthConnectStatusCheckError,
  onCapabilityCheckError,
}) => {
  if (disclaimerAccepted === true) {
    logHealthConnectRouting(
      isLoggingEnabled,
      'Disclaimer accepted. Starting the permission flow without another capability check.'
    );
    await startPermissionFlow();
    return 'PERMISSION_FLOW';
  }

  let healthConnectStatus;

  try {
    healthConnectStatus = await getHealthConnectStatus();

    logHealthConnectRouting(
      isLoggingEnabled,
      `Health Connect status result: ${healthConnectStatus}`
    );
  } catch (error) {
    logHealthConnectRouting(
      isLoggingEnabled,
      'Health Connect status check failed. Starting the permission flow.'
    );
    onHealthConnectStatusCheckError?.(error);
    await startPermissionFlow();
    return 'PERMISSION_FLOW';
  }

  if (healthConnectStatus === 'NOT_INSTALLED') {
    logHealthConnectRouting(
      isLoggingEnabled,
      'Health Connect is not installed. Starting the permission flow to open the Play Store.'
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
};

const logHealthConnectRouting = (isLoggingEnabled, message) => {
  if (isLoggingEnabled) {
    console.log(`[VisitRnSdk][HealthConnect] ${message}`);
  }
};
