#import "VisitLocationModule.h"

#import <math.h>

static NSString *const VisitLocationErrorServicesDisabled = @"E_LOCATION_SERVICES_DISABLED";
static NSString *const VisitLocationErrorPermissionDenied = @"E_LOCATION_PERMISSION_DENIED";
static NSString *const VisitLocationErrorPermissionDeniedPreviously = @"E_LOCATION_PERMISSION_DENIED_PREVIOUSLY";
static NSString *const VisitLocationErrorPermissionRestricted = @"E_LOCATION_PERMISSION_RESTRICTED";
static NSString *const VisitLocationErrorUsageDescriptionMissing = @"E_LOCATION_USAGE_DESCRIPTION_MISSING";
static NSString *const VisitLocationErrorTimeout = @"E_LOCATION_TIMEOUT";
static NSString *const VisitLocationErrorUnavailable = @"E_LOCATION_UNAVAILABLE";
static NSString *const VisitLocationErrorRequestFailed = @"E_LOCATION_REQUEST_FAILED";

static NSTimeInterval const VisitLocationDefaultMaximumAgeMs = 60000.0;
static NSTimeInterval const VisitLocationMaximumAllowedAgeMs = 300000.0;
static NSTimeInterval const VisitLocationDefaultTimeoutMs = 10000.0;
static NSTimeInterval const VisitLocationMinimumTimeoutMs = 1000.0;
static NSTimeInterval const VisitLocationMaximumTimeoutMs = 60000.0;

@interface VisitLocationModule ()

@property(nonatomic, strong) CLLocationManager *locationManager;
@property(nonatomic, strong) NSMutableArray *pendingResolvers;
@property(nonatomic, strong) NSMutableArray *pendingRejecters;
@property(nonatomic, strong) NSTimer *locationTimeoutTimer;
@property(nonatomic, assign) BOOL requestInProgress;
@property(nonatomic, assign) BOOL locationAcquisitionStarted;
@property(nonatomic, assign) NSTimeInterval maximumAgeMs;
@property(nonatomic, assign) NSTimeInterval timeoutMs;

@end

@implementation VisitLocationModule

RCT_EXPORT_MODULE(VisitLocationModule)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (instancetype)init
{
  self = [super init];
  if (self) {
    _locationManager = [[CLLocationManager alloc] init];
    _locationManager.delegate = self;
    _pendingResolvers = [NSMutableArray array];
    _pendingRejecters = [NSMutableArray array];
  }
  return self;
}

RCT_REMAP_METHOD(getCurrentLocation,
                 getCurrentLocationWithOptions:(NSDictionary *)options
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  if (![self hasLocationUsageDescription]) {
    reject(VisitLocationErrorUsageDescriptionMissing,
           @"NSLocationWhenInUseUsageDescription must contain a user-facing purpose string",
           nil);
    return;
  }

  if (![CLLocationManager locationServicesEnabled]) {
    reject(VisitLocationErrorServicesDisabled,
           @"Location Services are disabled on this device",
           nil);
    return;
  }

  CLAuthorizationStatus status = [self currentAuthorizationStatus];
  if (status == kCLAuthorizationStatusDenied) {
    reject(VisitLocationErrorPermissionDeniedPreviously,
           @"Location permission was previously denied",
           nil);
    return;
  }

  if (status == kCLAuthorizationStatusRestricted) {
    reject(VisitLocationErrorPermissionRestricted,
           @"Location permission is restricted on this device",
           nil);
    return;
  }

  [self.pendingResolvers addObject:[resolve copy]];
  [self.pendingRejecters addObject:[reject copy]];

  if (self.requestInProgress) {
    return;
  }

  self.requestInProgress = YES;
  self.maximumAgeMs = [self optionFrom:options
                                    key:@"maximumAgeMs"
                           defaultValue:VisitLocationDefaultMaximumAgeMs
                            minimumValue:0.0
                            maximumValue:VisitLocationMaximumAllowedAgeMs];
  self.timeoutMs = [self optionFrom:options
                               key:@"timeoutMs"
                      defaultValue:VisitLocationDefaultTimeoutMs
                       minimumValue:VisitLocationMinimumTimeoutMs
                       maximumValue:VisitLocationMaximumTimeoutMs];

  if (status == kCLAuthorizationStatusNotDetermined) {
    [self.locationManager requestWhenInUseAuthorization];
    return;
  }

  [self beginLocationAcquisition];
}

- (BOOL)hasLocationUsageDescription
{
  id value = [[NSBundle mainBundle] objectForInfoDictionaryKey:@"NSLocationWhenInUseUsageDescription"];
  if (![value isKindOfClass:[NSString class]]) {
    return NO;
  }

  NSString *description = [(NSString *)value stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
  return description.length > 0;
}

- (CLAuthorizationStatus)currentAuthorizationStatus
{
  if (@available(iOS 14.0, *)) {
    return self.locationManager.authorizationStatus;
  }

  return [CLLocationManager authorizationStatus];
}

- (NSTimeInterval)optionFrom:(NSDictionary *)options
                         key:(NSString *)key
                defaultValue:(NSTimeInterval)defaultValue
                 minimumValue:(NSTimeInterval)minimumValue
                 maximumValue:(NSTimeInterval)maximumValue
{
  id value = [options isKindOfClass:[NSDictionary class]] ? options[key] : nil;
  if (![value isKindOfClass:[NSNumber class]]) {
    return defaultValue;
  }

  double number = [(NSNumber *)value doubleValue];
  if (!isfinite(number)) {
    return defaultValue;
  }

  return MIN(MAX(number, minimumValue), maximumValue);
}

- (void)beginLocationAcquisition
{
  if (!self.requestInProgress || self.locationAcquisitionStarted) {
    return;
  }

  self.locationAcquisitionStarted = YES;

  CLLocation *cachedLocation = self.locationManager.location;
  if ([self isValidLocation:cachedLocation] && [self isCacheFresh:cachedLocation]) {
    [self finishWithLocation:cachedLocation];
    return;
  }

  if (@available(iOS 14.0, *)) {
    self.locationManager.desiredAccuracy =
      self.locationManager.accuracyAuthorization == CLAccuracyAuthorizationReducedAccuracy
        ? kCLLocationAccuracyReduced
        : kCLLocationAccuracyBest;
  } else {
    self.locationManager.desiredAccuracy = kCLLocationAccuracyBest;
  }

  self.locationTimeoutTimer = [NSTimer scheduledTimerWithTimeInterval:self.timeoutMs / 1000.0
                                                               target:self
                                                             selector:@selector(locationRequestTimedOut)
                                                             userInfo:nil
                                                              repeats:NO];
  [self.locationManager requestLocation];
}

- (BOOL)isValidLocation:(CLLocation *)location
{
  if (location == nil || location.timestamp == nil) {
    return NO;
  }

  CLLocationCoordinate2D coordinate = location.coordinate;
  return CLLocationCoordinate2DIsValid(coordinate) &&
    isfinite(coordinate.latitude) &&
    isfinite(coordinate.longitude) &&
    isfinite(location.horizontalAccuracy) &&
    location.horizontalAccuracy >= 0.0 &&
    isfinite(location.timestamp.timeIntervalSince1970) &&
    location.timestamp.timeIntervalSince1970 > 0.0;
}

- (BOOL)isCacheFresh:(CLLocation *)location
{
  NSTimeInterval ageMs = [[NSDate date] timeIntervalSinceDate:location.timestamp] * 1000.0;
  return ageMs >= -5000.0 && ageMs <= self.maximumAgeMs;
}

- (NSString *)currentPrecision
{
  if (@available(iOS 14.0, *)) {
    return self.locationManager.accuracyAuthorization == CLAccuracyAuthorizationReducedAccuracy
      ? @"approximate"
      : @"precise";
  }

  return @"precise";
}

- (void)locationRequestTimedOut
{
  [self finishWithErrorCode:VisitLocationErrorTimeout
                    message:@"Timed out while waiting for the current location"
                      error:nil];
}

- (void)finishWithLocation:(CLLocation *)location
{
  if (!self.requestInProgress) {
    return;
  }

  NSDictionary *payload = @{
    @"latitude": @(location.coordinate.latitude),
    @"longitude": @(location.coordinate.longitude),
    @"accuracy": @(location.horizontalAccuracy),
    @"timestamp": @(location.timestamp.timeIntervalSince1970 * 1000.0),
    @"precision": [self currentPrecision],
    @"source": @"ios-core-location",
  };
  NSArray *resolvers = [self.pendingResolvers copy];
  [self resetRequestState];

  for (RCTPromiseResolveBlock resolve in resolvers) {
    resolve(payload);
  }
}

- (void)finishWithErrorCode:(NSString *)code
                    message:(NSString *)message
                      error:(NSError *)error
{
  if (!self.requestInProgress) {
    return;
  }

  NSArray *rejecters = [self.pendingRejecters copy];
  [self resetRequestState];

  for (RCTPromiseRejectBlock reject in rejecters) {
    reject(code, message, error);
  }
}

- (void)resetRequestState
{
  [self.locationTimeoutTimer invalidate];
  self.locationTimeoutTimer = nil;
  [self.locationManager stopUpdatingLocation];
  [self.pendingResolvers removeAllObjects];
  [self.pendingRejecters removeAllObjects];
  self.requestInProgress = NO;
  self.locationAcquisitionStarted = NO;
}

- (void)handleAuthorizationStatus:(CLAuthorizationStatus)status
{
  if (!self.requestInProgress) {
    return;
  }

  switch (status) {
    case kCLAuthorizationStatusAuthorizedAlways:
    case kCLAuthorizationStatusAuthorizedWhenInUse:
      [self beginLocationAcquisition];
      break;
    case kCLAuthorizationStatusDenied:
      [self finishWithErrorCode:VisitLocationErrorPermissionDenied
                        message:@"Location permission was denied"
                          error:nil];
      break;
    case kCLAuthorizationStatusRestricted:
      [self finishWithErrorCode:VisitLocationErrorPermissionRestricted
                        message:@"Location permission is restricted on this device"
                          error:nil];
      break;
    case kCLAuthorizationStatusNotDetermined:
      break;
  }
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager *)manager
{
  if (@available(iOS 14.0, *)) {
    [self handleAuthorizationStatus:manager.authorizationStatus];
  }
}

- (void)locationManager:(CLLocationManager *)manager didChangeAuthorizationStatus:(CLAuthorizationStatus)status
{
  if (@available(iOS 14.0, *)) {
    return;
  }

  [self handleAuthorizationStatus:status];
}

- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray<CLLocation *> *)locations
{
  CLLocation *validLocation = nil;
  for (CLLocation *location in [locations reverseObjectEnumerator]) {
    if ([self isValidLocation:location]) {
      validLocation = location;
      break;
    }
  }

  if (validLocation == nil) {
    [self finishWithErrorCode:VisitLocationErrorUnavailable
                      message:@"Core Location returned invalid coordinates"
                        error:nil];
    return;
  }

  [self finishWithLocation:validLocation];
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error
{
  if (error.code == kCLErrorDenied) {
    NSString *code = [CLLocationManager locationServicesEnabled]
      ? VisitLocationErrorPermissionDenied
      : VisitLocationErrorServicesDisabled;
    [self finishWithErrorCode:code message:error.localizedDescription error:error];
    return;
  }

  if (error.code == kCLErrorLocationUnknown) {
    [self finishWithErrorCode:VisitLocationErrorUnavailable
                      message:error.localizedDescription
                        error:error];
    return;
  }

  [self finishWithErrorCode:VisitLocationErrorRequestFailed
                    message:error.localizedDescription ?: @"Unable to request the current location"
                      error:error];
}

- (void)invalidate
{
  [self.locationTimeoutTimer invalidate];
  self.locationTimeoutTimer = nil;
  [self.locationManager stopUpdatingLocation];
  self.locationManager.delegate = nil;
  [self.pendingResolvers removeAllObjects];
  [self.pendingRejecters removeAllObjects];
  self.requestInProgress = NO;
}

@end
