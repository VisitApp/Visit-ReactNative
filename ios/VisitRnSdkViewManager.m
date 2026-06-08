#import "VisitRnSdkViewManager.h"
#import <CoreLocation/CoreLocation.h>

@interface VisitRnSdkViewManager () <CLLocationManagerDelegate>
@property (nonatomic, strong) CLLocationManager *locationManager;
@property (nonatomic, copy) RCTPromiseResolveBlock locationPermissionResolve;
@end

@implementation VisitRnSdkViewManager

RCT_EXPORT_MODULE(VisitRnSdkViewManager)

- (instancetype)init
{
  self = [super init];
  if (self) {
    _locationManager = [[CLLocationManager alloc] init];
    _locationManager.delegate = self;
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (NSString *)authorizationStatusString:(CLAuthorizationStatus)status
{
  switch (status) {
    case kCLAuthorizationStatusAuthorizedWhenInUse:
    case kCLAuthorizationStatusAuthorizedAlways:
      return @"authorized";
    case kCLAuthorizationStatusDenied:
      return @"denied";
    case kCLAuthorizationStatusRestricted:
      return @"restricted";
    default:
      return @"not_determined";
  }
}

- (CLAuthorizationStatus)currentAuthorizationStatus
{
  if (@available(iOS 14.0, *)) {
    return self.locationManager.authorizationStatus;
  }
  return [CLLocationManager authorizationStatus];
}

RCT_REMAP_METHOD(getLocationPermissionStatus,
                 getLocationPermissionStatusWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  if (![CLLocationManager locationServicesEnabled]) {
    resolve(@"services_disabled");
    return;
  }

  resolve([self authorizationStatusString:[self currentAuthorizationStatus]]);
}

RCT_REMAP_METHOD(requestLocationPermission,
                 requestLocationPermissionWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  if (![CLLocationManager locationServicesEnabled]) {
    resolve(@(NO));
    return;
  }

  CLAuthorizationStatus status = [self currentAuthorizationStatus];

  if (status == kCLAuthorizationStatusAuthorizedWhenInUse ||
      status == kCLAuthorizationStatusAuthorizedAlways) {
    resolve(@(YES));
    return;
  }

  if (status == kCLAuthorizationStatusDenied ||
      status == kCLAuthorizationStatusRestricted) {
    resolve(@(NO));
    return;
  }

  self.locationPermissionResolve = resolve;
  [self.locationManager requestWhenInUseAuthorization];
}

- (void)handleAuthorizationChange:(CLAuthorizationStatus)status
{
  if (!self.locationPermissionResolve) {
    return;
  }

  if (status == kCLAuthorizationStatusNotDetermined) {
    return;
  }

  RCTPromiseResolveBlock resolve = self.locationPermissionResolve;
  self.locationPermissionResolve = nil;

  if (status == kCLAuthorizationStatusAuthorizedWhenInUse ||
      status == kCLAuthorizationStatusAuthorizedAlways) {
    resolve(@(YES));
  } else {
    resolve(@(NO));
  }
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager *)manager API_AVAILABLE(ios(14.0))
{
  CLAuthorizationStatus status;
  if (@available(iOS 14.0, *)) {
    status = manager.authorizationStatus;
  } else {
    status = [CLLocationManager authorizationStatus];
  }
  [self handleAuthorizationChange:status];
}

- (void)locationManager:(CLLocationManager *)manager didChangeAuthorizationStatus:(CLAuthorizationStatus)status
{
  if (@available(iOS 14.0, *)) {
    return;
  }
  [self handleAuthorizationChange:status];
}

@end
