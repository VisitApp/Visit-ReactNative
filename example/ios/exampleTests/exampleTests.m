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
