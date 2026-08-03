#import "VisitRnSdkViewManager.h"

@implementation VisitRnSdkViewManager

RCT_EXPORT_MODULE(VisitRnSdkViewManager)

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

RCT_REMAP_METHOD(multiply,
                 multiplyWithA:(nonnull NSNumber *)a
                 withB:(nonnull NSNumber *)b
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
  (void)reject;
  NSNumber *result = @([a floatValue] * [b floatValue]);
  resolve(result);
}

@end
