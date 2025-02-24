#import <React/RCTBridgeModule.h>
#import <HealthKit/HealthKit.h>
#import <React/RCTEventEmitter.h>

@interface VisitRnSdkViewManager : RCTEventEmitter <RCTBridgeModule>{
  NSCalendar* calendar;
  NSUInteger bmrCaloriesPerHour;
  NSString *gender;
  BOOL hasLoadedOnce;
}

@property (nonatomic) HKHealthStore *healthStore;
+ (HKHealthStore *)sharedManager;
- (void)renderGraph:(NSDictionary *)input callback:(RCTResponseSenderBlock)callback;
- (void)updateApiUrl:(NSDictionary *)input;
- (void)connectToAppleHealth:(RCTResponseSenderBlock)callback;
- (void)fetchHourlyData:(NSInteger)gfHourlyLastSync resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)fetchDailyData:(NSInteger)googleFitLastSync resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)getHealthKitStatus:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject;
- (void)triggerManualSync;

@end
