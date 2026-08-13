const {
  routeHealthConnectConnectionRequest,
} = require('../healthConnectRouting');

describe('routeHealthConnectConnectionRequest', () => {
  it('starts the permission flow when the Health Connect status check fails', async () => {
    const statusError = new Error('status check failed');
    const getHealthConnectStatus = jest.fn().mockRejectedValue(statusError);
    const isNativeStepTrackingAvailable = jest.fn();
    const startPermissionFlow = jest.fn().mockResolvedValue(undefined);
    const showDisclaimer = jest.fn();
    const onHealthConnectStatusCheckError = jest.fn();

    const result = await routeHealthConnectConnectionRequest({
      disclaimerAccepted: false,
      isLoggingEnabled: false,
      getHealthConnectStatus,
      isNativeStepTrackingAvailable,
      startPermissionFlow,
      showDisclaimer,
      onHealthConnectStatusCheckError,
      onCapabilityCheckError: jest.fn(),
    });

    expect(result).toBe('PERMISSION_FLOW');
    expect(onHealthConnectStatusCheckError).toHaveBeenCalledWith(statusError);
    expect(startPermissionFlow).toHaveBeenCalledTimes(1);
    expect(isNativeStepTrackingAvailable).not.toHaveBeenCalled();
    expect(showDisclaimer).not.toHaveBeenCalled();
  });
});
