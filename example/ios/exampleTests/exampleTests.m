#import <UIKit/UIKit.h>
#import <XCTest/XCTest.h>

#import <React/RCTLog.h>
#import <React/RCTRootView.h>
#import <react-native-visit-rn-sdk/VisitRnSdkViewManager.h>

#define TIMEOUT_SECONDS 600
#define TEXT_TO_LOOK_FOR @"Welcome to React"

@interface GraphRequestRecorder : VisitRnSdkViewManager
@property (nonatomic, strong) NSDate *graphDate;
@end

@implementation GraphRequestRecorder

- (void)renderGraphData:(NSString *)type
              frequency:(NSString *)frequency
                   date:(NSDate *)date
               callback:(void (^)(NSArray *))callback
{
  self.graphDate = date;
  callback(@[@"DetailedGraph.updateData()"]);
}

@end

@interface SleepGraphRecorder : VisitRnSdkViewManager
@end

@implementation SleepGraphRecorder

- (void)fetchSleepFromDay:(NSDate *)firstDay
              throughDay:(NSDate *)lastDay
              completion:(void (^)(NSDictionary *, NSError *))completion
{
  NSDate *start = [firstDay dateByAddingTimeInterval:1];
  NSDate *end = [firstDay dateByAddingTimeInterval:24 * 60 * 60];
  completion(@{firstDay: @[[[NSDateInterval alloc] initWithStartDate:start endDate:end]]}, nil);
}

@end

@interface exampleTests : XCTestCase

@end

@implementation exampleTests

- (void)testGraphRequestWithoutTimestampUsesCurrentDate
{
  GraphRequestRecorder *manager = [GraphRequestRecorder new];
  for (NSDictionary *timestampInput in @[@{}, @{@"timestamp": [NSNull null]}, @{@"timestamp": @"invalid"}]) {
    NSMutableDictionary *input = [@{@"type": @"steps", @"frequency": @"day"} mutableCopy];
    [input addEntriesFromDictionary:timestampInput];
    NSDate *before = [NSDate date];
    __block NSArray *response = nil;
    [manager renderGraph:input callback:^(NSArray *arguments) {
      response = arguments;
    }];
    XCTAssertNotNil(manager.graphDate);
    XCTAssertGreaterThanOrEqual([manager.graphDate timeIntervalSinceDate:before], 0);
    XCTAssertLessThanOrEqual([manager.graphDate timeIntervalSinceNow], 0);
    XCTAssertEqualObjects(response, (@[[NSNull null], @[@"DetailedGraph.updateData()"]]));
  }
}

- (void)testGraphRequestPreservesNumericAndStringTimestamps
{
  GraphRequestRecorder *manager = [GraphRequestRecorder new];
  for (id timestamp in @[@1700000000123, @"1700000000123"]) {
    [manager renderGraph:@{@"type": @"steps", @"frequency": @"day", @"timestamp": timestamp}
               callback:^(NSArray *arguments) {}];
    XCTAssertEqualWithAccuracy(manager.graphDate.timeIntervalSince1970, 1700000000.123, 0.001);
  }
}

- (void)testLegacySleepGraphRanges
{
  SleepGraphRecorder *manager = [SleepGraphRecorder new];
  NSNumber *timestamp = @1700000000000;
  NSString *prefix = @"DetailedGraph.updateSleepData(JSON.stringify(";
  for (NSString *frequency in @[@"month", @"custom"]) {
    __block NSString *script;
    [manager renderGraph:@{@"type": @"sleep", @"frequency": frequency, @"timestamp": timestamp}
               callback:^(NSArray *arguments) {
      script = [arguments[1] firstObject];
    }];
    XCTAssertTrue([script hasPrefix:prefix]);
    if (![script hasPrefix:prefix] || ![script hasSuffix:@"))"]) continue;
    NSString *json = [script substringWithRange:NSMakeRange(prefix.length, script.length - prefix.length - 2)];
    NSArray *days = [NSJSONSerialization JSONObjectWithData:[json dataUsingEncoding:NSUTF8StringEncoding]
                                                    options:0 error:NULL];
    XCTAssertEqual(days.count, [frequency isEqualToString:@"month"] ? 30 : 1);
    NSDictionary *firstDay = days.firstObject;
    XCTAssertTrue([firstDay[@"day"] isKindOfClass:[NSString class]]);
    XCTAssertGreaterThan([firstDay[@"sleepTime"] longLongValue], [firstDay[@"startTimestamp"] longLongValue]);
    if ([frequency isEqualToString:@"custom"]) {
      XCTAssertEqualObjects(firstDay[@"wakeupTime"], timestamp);
    }
  }
}

- (BOOL)findSubviewInView:(UIView *)view matching:(BOOL (^)(UIView *view))test
{
  if (test(view)) {
    return YES;
  }
  for (UIView *subview in [view subviews]) {
    if ([self findSubviewInView:subview matching:test]) {
      return YES;
    }
  }
  return NO;
}

- (void)testRendersWelcomeScreen
{
  UIViewController *vc = [[[RCTSharedApplication() delegate] window] rootViewController];
  NSDate *date = [NSDate dateWithTimeIntervalSinceNow:TIMEOUT_SECONDS];
  BOOL foundElement = NO;

  __block NSString *redboxError = nil;
#ifdef DEBUG
  RCTSetLogFunction(
      ^(RCTLogLevel level, RCTLogSource source, NSString *fileName, NSNumber *lineNumber, NSString *message) {
        if (level >= RCTLogLevelError) {
          redboxError = message;
        }
      });
#endif

  while ([date timeIntervalSinceNow] > 0 && !foundElement && !redboxError) {
    [[NSRunLoop mainRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
    [[NSRunLoop mainRunLoop] runMode:NSRunLoopCommonModes beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];

    foundElement = [self findSubviewInView:vc.view
                                  matching:^BOOL(UIView *view) {
                                    if ([view.accessibilityLabel isEqualToString:TEXT_TO_LOOK_FOR]) {
                                      return YES;
                                    }
                                    return NO;
                                  }];
  }

#ifdef DEBUG
  RCTSetLogFunction(RCTDefaultLogFunction);
#endif

  XCTAssertNil(redboxError, @"RedBox error: %@", redboxError);
  XCTAssertTrue(foundElement, @"Couldn't find element with text '%@' in %d seconds", TEXT_TO_LOOK_FOR, TIMEOUT_SECONDS);
}

@end
