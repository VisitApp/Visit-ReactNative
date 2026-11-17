#import "VisitRnSdkViewManager.h"
#import <HealthKit/HealthKit.h>
#import <UIKit/UIKit.h>

static NSString *const kVisitApiBaseUrlKey = @"visit_api_base_url";
static NSString *const kVisitAuthTokenKey = @"visit_auth_token";
static NSString *const kVisitHourlyLastSyncKey = @"gfHourlyLastSync";
static NSString *const kVisitDailyLastSyncKey = @"googleFitLastSync";

static NSDateInterval *VisitFitnessDateInterval(NSCalendar *calendar, NSCalendarUnit unit, NSDate *date) {
    NSDate *start;
    NSTimeInterval duration;
    [calendar rangeOfUnit:unit startDate:&start interval:&duration forDate:date];
    return [[NSDateInterval alloc] initWithStartDate:start duration:duration];
}

@interface VisitRnSdkViewManager ()
@property (atomic, assign) BOOL isSyncInProgress;
@end

@implementation VisitRnSdkViewManager

RCT_EXPORT_MODULE(VisitRnSdkViewManager)

// Example method
// See // https://reactnative.dev/docs/native-modules-ios
RCT_REMAP_METHOD(multiply,
                 multiplyWithA:(nonnull NSNumber*)a withB:(nonnull NSNumber*)b
                 withResolver:(RCTPromiseResolveBlock)resolve
                 withRejecter:(RCTPromiseRejectBlock)reject)
{
  NSNumber *result = @([a floatValue] * [b floatValue]);

  resolve(result);
}

- (instancetype)init
{
    self = [super init];
    self->calendar = [[NSCalendar alloc] initWithCalendarIdentifier:NSCalendarIdentifierISO8601];
    self->calendar.timeZone = [NSTimeZone timeZoneWithName:@"IST"];
    NSLog(@"Do some stuff here");
    return self;
}

+ (BOOL)requiresMainQueueSetup{
    return YES;
}

+ (HKHealthStore *)sharedManager {
    __strong static HKHealthStore *store = nil;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        store = [[HKHealthStore alloc] init];
    });

    return store;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"EventReminder"];
}

- (void)fetchQuantitySamplesOfType:(HKQuantityType *)quantityType
                              unit:(HKUnit *)unit
                         predicate:(NSPredicate *)predicate
                         ascending:(BOOL)asc
                             limit:(NSUInteger)lim
                        completion:(void (^)(NSArray *, NSError *))completion {

    NSSortDescriptor *timeSortDescriptor = [[NSSortDescriptor alloc] initWithKey:HKSampleSortIdentifierEndDate
                                                                       ascending:asc];
    __block NSTimeInterval totalActivityDuration = 0;
    // declare the block
    void (^handlerBlock)(HKSampleQuery *query, NSArray *results, NSError *error);
    // create and assign the block
    handlerBlock = ^(HKSampleQuery *query, NSArray *results, NSError *error) {
        if (!results) {
            if (completion) {
                completion(nil, error);
            }
            return;
        }

        if (completion) {
            NSMutableArray *data = [NSMutableArray arrayWithCapacity:1];
            NSMutableArray *dataByFrequency = [NSMutableArray new];
            dispatch_async(dispatch_get_main_queue(), ^{
                for (HKQuantitySample *sample in results) {
                    HKQuantity *quantity = sample.quantity;
                    double value = [quantity doubleValueForUnit:unit];
                    if(value){
                        NSLog(@"startDate and endDate for fetchQuantitySamplesOfType is %@ & %@", sample.startDate,sample.endDate);
                        NSNumber* val = [NSNumber numberWithDouble:[sample.endDate timeIntervalSinceDate:sample.startDate]/60];
                        NSDictionary *element = @{
                            @"date" : sample.endDate,
                            @"value" : val,
                        };
                        NSMutableDictionary *dict =[NSMutableDictionary dictionaryWithDictionary:element];
                        
                        if([dataByFrequency count]>0){
                            NSMutableDictionary* ele = [dataByFrequency objectAtIndex:[dataByFrequency count]-1];
                            if([[NSCalendar currentCalendar] isDate:sample.endDate inSameDayAsDate:[ele valueForKey:@"date"]]){
                                double myValue = [[ele valueForKey:@"value"] doubleValue];
                                myValue+=[val doubleValue];
                                [ele setObject:sample.endDate forKey:@"date" ];
                                [ele setObject: [NSNumber numberWithDouble:myValue] forKey:@"value" ];
                            }else{
                                [dataByFrequency addObject:dict];
                            }
                        }
                        else{
                            [dataByFrequency addObject:dict];
                        }
                        
                        NSTimeInterval duration = [sample.endDate timeIntervalSinceDate:sample.startDate];
                        totalActivityDuration+=duration;
                        NSLog(@"fetchQuantitySamplesOfType dict is %@",dict);
                    }
                }
                NSLog(@"fetchQuantitySamplesOfType dataByFrequency %@ ",dataByFrequency);
                [data addObject:[NSString stringWithFormat:@"%f",totalActivityDuration/60]];
                [data addObject:dataByFrequency];
                completion(data, error);
            });
        }
    };

    HKSampleQuery *query = [[HKSampleQuery alloc] initWithSampleType:quantityType
                                                           predicate:predicate
                                                               limit:lim
                                                     sortDescriptors:@[timeSortDescriptor]
                                                      resultsHandler:handlerBlock];

    [[VisitRnSdkViewManager sharedManager] executeQuery:query];
}


- (void) getActivityTime:(NSDate*) endDate frequency:(NSString*) frequency days:(NSInteger) days callback:(void(^)(NSMutableArray*))callback{
    HKQuantityType *stepCountType = [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount];
    NSDate *startDate;
    NSDate *endDatePeriod;
    if([frequency isEqualToString:@"day"]){
        NSTimeInterval interval;
        [self->calendar rangeOfUnit:NSCalendarUnitDay
                           startDate:&startDate
                            interval:&interval
                             forDate:endDate];
        endDatePeriod = [startDate dateByAddingTimeInterval:interval-1];
    }else if ([frequency isEqualToString:@"week"]){
        NSTimeInterval interval;
        [self->calendar rangeOfUnit:NSCalendarUnitWeekOfYear
                           startDate:&startDate
                            interval:&interval
                             forDate:endDate];
        endDatePeriod = [startDate dateByAddingTimeInterval:interval-1];
    }else if ([frequency isEqualToString:@"month"]){
        NSTimeInterval interval;
        [self->calendar rangeOfUnit:NSCalendarUnitMonth
                           startDate:&startDate
                            interval:&interval
                             forDate:endDate];
        endDatePeriod = [startDate dateByAddingTimeInterval:interval-1];
    }else if([frequency isEqualToString:@"custom"]){
        endDatePeriod = endDate;
        startDate = [self->calendar dateByAddingUnit:NSCalendarUnitDay
                                                 value:1-days
                                                toDate:endDatePeriod
                                               options:0];
    }
    NSPredicate *predicate = [HKQuery predicateForSamplesWithStartDate:startDate endDate:endDatePeriod options:HKQueryOptionStrictStartDate];
    NSPredicate *userEnteredValuePredicate = [HKQuery predicateForObjectsWithMetadataKey:HKMetadataKeyWasUserEntered operatorType: NSNotEqualToPredicateOperatorType value: @YES];
    
    NSCompoundPredicate *compoundPredicate = [NSCompoundPredicate andPredicateWithSubpredicates:@[predicate, userEnteredValuePredicate]];
    [self fetchQuantitySamplesOfType:stepCountType unit:[HKUnit countUnit] predicate:compoundPredicate ascending:true limit:HKObjectQueryNoLimit completion:^(NSArray *results, NSError *error) {
            if (results) {
                NSLog(@"the results of getActivityTime %@",results);
                callback([NSMutableArray arrayWithArray:results]);
                return;
            } else {
                NSLog(@"error getting step count samples: %@", error);
                callback([NSMutableArray arrayWithArray:@[@"0", @[]]]);
            }
        }];
}

- (NSSet<HKObjectType *> *)fitnessReadTypes {
    return [NSSet setWithArray:@[
        [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount],
        [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierDistanceWalkingRunning],
        [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierActiveEnergyBurned],
        [HKCategoryType categoryTypeForIdentifier:HKCategoryTypeIdentifierSleepAnalysis],
    ]];
}

- (void)fetchFitnessBuckets:(NSString *)metric
                      start:(NSDate *)start
                        end:(NSDate *)end
                     hourly:(BOOL)hourly
                 completion:(void (^)(NSArray<NSNumber *> *, NSError *))completion {
    if ([start compare:end] == NSOrderedDescending) {
        completion(@[], nil);
        return;
    }

    HKQuantityTypeIdentifier identifier = HKQuantityTypeIdentifierStepCount;
    HKUnit *unit = [HKUnit countUnit];
    if ([metric isEqualToString:@"calories"]) {
        identifier = HKQuantityTypeIdentifierActiveEnergyBurned;
        unit = [HKUnit kilocalorieUnit];
    } else if ([metric isEqualToString:@"distance"]) {
        identifier = HKQuantityTypeIdentifierDistanceWalkingRunning;
        unit = [HKUnit meterUnit];
    }

    NSCalendar *bucketCalendar = self->calendar;
    NSDate *anchor = [bucketCalendar startOfDayForDate:start];
    NSDateComponents *interval = [NSDateComponents new];
    if (hourly) {
        interval.hour = 1;
    } else {
        interval.day = 1;
    }
    NSPredicate *predicate = [HKQuery predicateForSamplesWithStartDate:start
                                                              endDate:end
                                                              options:HKQueryOptionNone];
    if (hourly && [metric isEqualToString:@"steps"]) {
        NSPredicate *automatic = [HKQuery predicateForObjectsWithMetadataKey:HKMetadataKeyWasUserEntered
                                                                operatorType:NSNotEqualToPredicateOperatorType
                                                                       value:@YES];
        predicate = [NSCompoundPredicate andPredicateWithSubpredicates:@[predicate, automatic]];
    }

    HKQuantityType *type = [HKQuantityType quantityTypeForIdentifier:identifier];
    HKStatisticsCollectionQuery *query = [[HKStatisticsCollectionQuery alloc]
        initWithQuantityType:type
     quantitySamplePredicate:predicate
                     options:HKStatisticsOptionCumulativeSum
                  anchorDate:anchor
          intervalComponents:interval];
    query.initialResultsHandler = ^(HKStatisticsCollectionQuery *query,
                                    HKStatisticsCollection *results,
                                    NSError *error) {
        if (error) {
            completion(@[], error);
            return;
        }
        NSMutableArray<NSNumber *> *values = [NSMutableArray new];
        if (hourly) {
            for (NSInteger hour = 0; hour < 24; hour++) {
                [values addObject:@0];
            }
            [results enumerateStatisticsFromDate:start toDate:end withBlock:^(HKStatistics *stat, BOOL *stop) {
                NSInteger hour = [bucketCalendar component:NSCalendarUnitHour fromDate:stat.startDate];
                double value = [stat.sumQuantity doubleValueForUnit:unit];
                values[hour] = @(values[hour].doubleValue + value);
            }];
        } else {
            NSDate *lastDay = [bucketCalendar startOfDayForDate:end];
            for (NSDate *day = anchor; [day compare:lastDay] != NSOrderedDescending;
                 day = [bucketCalendar dateByAddingUnit:NSCalendarUnitDay value:1 toDate:day options:0]) {
                HKStatistics *stat = [results statisticsForDate:day];
                [values addObject:@((NSInteger)[stat.sumQuantity doubleValueForUnit:unit])];
            }
        }
        completion([values copy], error);
    };
    [[VisitRnSdkViewManager sharedManager] executeQuery:query];
}

- (void)fetchHourlyFitnessForDate:(NSDate *)date
                      completion:(void (^)(NSArray<NSNumber *> *, NSArray<NSNumber *> *, NSArray<NSNumber *> *))completion {
    NSDateInterval *day = VisitFitnessDateInterval(self->calendar, NSCalendarUnitDay, date);
    NSDate *end = [day.endDate dateByAddingTimeInterval:-1];
    NSArray<NSString *> *metrics = @[@"steps", @"calories", @"distance"];
    NSMutableDictionary<NSString *, NSArray<NSNumber *> *> *series = [NSMutableDictionary new];
    dispatch_group_t group = dispatch_group_create();
    for (NSString *metric in metrics) {
        dispatch_group_enter(group);
        [self fetchFitnessBuckets:metric start:day.startDate end:end hourly:YES
                       completion:^(NSArray<NSNumber *> *values, NSError *error) {
            if (error) NSLog(@"HealthKit %@ query failed: %@", metric, error.localizedDescription);
            @synchronized (series) { if (!error) series[metric] = values; }
            dispatch_group_leave(group);
        }];
    }
    dispatch_group_notify(group, dispatch_get_main_queue(), ^{
        completion(series[@"steps"], series[@"calories"], series[@"distance"]);
    });
}

- (void)fetchSleepFromDay:(NSDate *)firstDay
               throughDay:(NSDate *)lastDay
               completion:(void (^)(NSDictionary<NSDate *, NSArray<NSDateInterval *> *> *, NSError *))completion {
    NSCalendar *sleepCalendar = self->calendar;
    NSDate *end = [sleepCalendar dateByAddingUnit:NSCalendarUnitDay value:1 toDate:lastDay options:0];
    NSDate *lookback = [firstDay dateByAddingTimeInterval:-36 * 60 * 60];
    NSPredicate *predicate = [HKQuery predicateForSamplesWithStartDate:lookback endDate:end options:HKQueryOptionNone];
    HKCategoryType *type = [HKCategoryType categoryTypeForIdentifier:HKCategoryTypeIdentifierSleepAnalysis];
    NSSortDescriptor *byStart = [NSSortDescriptor sortDescriptorWithKey:HKSampleSortIdentifierStartDate ascending:YES];
    HKSampleQuery *query = [[HKSampleQuery alloc] initWithSampleType:type
                                                          predicate:predicate
                                                              limit:HKObjectQueryNoLimit
                                                    sortDescriptors:@[byStart]
                                                     resultsHandler:^(HKSampleQuery *query,
                                                                      NSArray<__kindof HKSample *> *samples,
                                                                      NSError *error) {
        NSMutableDictionary<NSDate *, NSMutableArray<NSDateInterval *> *> *asleep = [NSMutableDictionary new];
        NSMutableDictionary<NSDate *, NSMutableArray<NSDateInterval *> *> *inBed = [NSMutableDictionary new];
        for (HKCategorySample *sample in samples) {
            NSDate *day = [sleepCalendar startOfDayForDate:sample.endDate];
            if ([day compare:firstDay] == NSOrderedAscending || [day compare:lastDay] == NSOrderedDescending ||
                [sample.startDate compare:sample.endDate] != NSOrderedAscending) {
                continue;
            }
            NSMutableDictionary<NSDate *, NSMutableArray<NSDateInterval *> *> *target;
            if (sample.value == HKCategoryValueSleepAnalysisInBed) {
                target = inBed;
            } else if (sample.value == HKCategoryValueSleepAnalysisAwake) {
                continue;
            } else {
                target = asleep;
            }
            NSMutableArray<NSDateInterval *> *intervals = target[day];
            if (!intervals) {
                intervals = [NSMutableArray new];
                target[day] = intervals;
            }
            NSDateInterval *previous = intervals.lastObject;
            if (previous && [sample.startDate compare:previous.endDate] != NSOrderedDescending) {
                NSDate *latestEnd = [previous.endDate laterDate:sample.endDate];
                intervals[intervals.count - 1] = [[NSDateInterval alloc] initWithStartDate:previous.startDate endDate:latestEnd];
            } else {
                [intervals addObject:[[NSDateInterval alloc] initWithStartDate:sample.startDate endDate:sample.endDate]];
            }
        }
        // In-bed-only sources still provide a sleep window. Prefer actual
        // asleep samples when both exist on the same wake day.
        NSMutableDictionary *sleepByDay = [inBed mutableCopy];
        [sleepByDay addEntriesFromDictionary:asleep];
        completion(sleepByDay, error);
    }];
    [[VisitRnSdkViewManager sharedManager] executeQuery:query];
}

- (void)fetchTodaySleepMinutes:(void (^)(NSNumber *, NSError *))completion {
    NSDate *today = [self->calendar startOfDayForDate:[NSDate date]];
    [self fetchSleepFromDay:today throughDay:today
                 completion:^(NSDictionary<NSDate *, NSArray<NSDateInterval *> *> *sleepByDay, NSError *error) {
        NSTimeInterval seconds = 0;
        for (NSDateInterval *interval in sleepByDay[today]) {
            seconds += interval.duration;
        }
        completion(@((NSInteger)(seconds / 60)), error);
    }];
}

- (void)requestAuthorization:(void(^)(NSDictionary*))callback {
    
    if ([HKHealthStore isHealthDataAvailable] == NO) {
        // If our device doesn't support HealthKit -> return.
        return;
    }
    [[VisitRnSdkViewManager sharedManager] requestAuthorizationToShareTypes:nil readTypes:[self fitnessReadTypes]
                                                                completion:^(BOOL success, NSError *error) {
        NSLog(@"requestAuthorizationToShareTypes executed");
        [self canAccessHealthKit:^(BOOL value){
            if(value){
                NSLog(@"the health kit permission granted");
              [self onHealthKitPermissionGranted:^(NSDictionary * data) {
                callback(data);
              }];
            }else{
                NSLog(@"the health kit permission not granted");
            }
        }];
    }];
}

- (void)onHealthKitPermissionGranted:(void (^)(NSDictionary *))callback {
    NSDate *now = [NSDate date];
    NSDate *today = [self->calendar startOfDayForDate:now];
    [self fetchFitnessBuckets:@"steps" start:today end:now hourly:NO
                   completion:^(NSArray<NSNumber *> *steps, NSError *stepsError) {
        [self fetchTodaySleepMinutes:^(NSNumber *minutes, NSError *sleepError) {
            NSDictionary *result = @{@"numberOfSteps": steps.firstObject ?: @0, @"sleepTime": minutes};
            dispatch_async(dispatch_get_main_queue(), ^{
                self->hasLoadedOnce = true;
                callback(result);
            });
        }];
    }];
}

-(void) healthKitRequestStatus:(void(^)(HKAuthorizationRequestStatus))callback {
    if (![HKHealthStore isHealthDataAvailable]) {
        callback(HKAuthorizationRequestStatusUnknown);
        return;
    }

    NSSet *readTypes = [self fitnessReadTypes];

    [[VisitRnSdkViewManager sharedManager]
        getRequestStatusForAuthorizationToShareTypes:[NSSet set]
                                           readTypes:readTypes
                                          completion:^(HKAuthorizationRequestStatus status,
                                                       NSError *error) {
        if (error) {
            NSLog(@"healthKitRequestStatus error: %@", error.localizedDescription);
        }
        callback(status);
    }];
}

- (void)hasReadableFitnessSamples:(void (^)(BOOL))callback {
    if (![HKHealthStore isHealthDataAvailable]) {
        callback(NO);
        return;
    }

    dispatch_group_t group = dispatch_group_create();
    NSObject *lock = [NSObject new];
    __block BOOL found = NO;
    for (HKSampleType *type in [self fitnessReadTypes]) {
        dispatch_group_enter(group);
        HKSampleQuery *query = [[HKSampleQuery alloc] initWithSampleType:type
                                                              predicate:nil
                                                                  limit:1
                                                        sortDescriptors:nil
                                                         resultsHandler:^(HKSampleQuery *query, NSArray *results, NSError *error) {
            if (results.count > 0) {
                @synchronized (lock) { found = YES; }
            }
            dispatch_group_leave(group);
        }];
        [[VisitRnSdkViewManager sharedManager] executeQuery:query];
    }
    dispatch_group_notify(group, dispatch_get_main_queue(), ^{ callback(found); });
}

-(void) canAccessHealthKit: (void(^)(BOOL))callback {
    __weak typeof(self) weakSelf = self;
    [self healthKitRequestStatus:^(HKAuthorizationRequestStatus status) {
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!strongSelf || status != HKAuthorizationRequestStatusUnnecessary) {
            callback(NO);
            return;
        }
        [strongSelf hasReadableFitnessSamples:callback];
    }];
}

static NSNumber *VisitHealthTimestamp(NSDate *date) {
    return @((long long)([date timeIntervalSince1970] * 1000));
}

- (void)renderGraphData:(NSString *)type frequency:(NSString *)frequency date:(NSDate *)date callback:(void (^)(NSArray *))callback {
    BOOL isDay = [frequency isEqualToString:@"day"];
    BOOL isWeek = [frequency isEqualToString:@"week"];
    BOOL isMonth = [frequency isEqualToString:@"month"];
    if (!isDay && !isWeek && !isMonth) {
        callback(@[]);
        return;
    }

    NSCalendar *graphCalendar = self->calendar;
    NSCalendarUnit unit = isDay ? NSCalendarUnitDay : (isWeek ? NSCalendarUnitWeekOfYear : NSCalendarUnitMonth);
    NSDateInterval *range = VisitFitnessDateInterval(graphCalendar, unit, date);
    NSDate *end = [range.endDate dateByAddingTimeInterval:-1];

    if ([type isEqualToString:@"sleep"]) {
        if (isMonth) {
            callback(@[]);
            return;
        }
        NSDate *lastDay = [graphCalendar startOfDayForDate:end];
        [self fetchSleepFromDay:range.startDate throughDay:lastDay
                     completion:^(NSDictionary<NSDate *, NSArray<NSDateInterval *> *> *sleepByDay, NSError *error) {
            if (isDay) {
                NSArray<NSDateInterval *> *sleep = sleepByDay[range.startDate];
                callback(@[[NSString stringWithFormat:@"DetailedGraph.updateDailySleep(%@,%@)",
                    VisitHealthTimestamp(sleep.firstObject.startDate), VisitHealthTimestamp(sleep.lastObject.endDate)]]);
                return;
            }
            NSMutableArray *days = [NSMutableArray new];
            for (NSDate *day = range.startDate; [day compare:lastDay] != NSOrderedDescending;
                 day = [graphCalendar dateByAddingUnit:NSCalendarUnitDay value:1 toDate:day options:0]) {
                NSArray<NSDateInterval *> *sleep = sleepByDay[day];
                NSInteger weekday = [graphCalendar component:NSCalendarUnitWeekday fromDate:day];
                [days addObject:@{
                    @"sleepTime": VisitHealthTimestamp(sleep.firstObject.startDate),
                    @"wakeupTime": VisitHealthTimestamp(sleep.lastObject.endDate),
                    @"day": graphCalendar.shortWeekdaySymbols[weekday - 1],
                    @"startTimestamp": VisitHealthTimestamp(day),
                }];
            }
            NSData *data = [NSJSONSerialization dataWithJSONObject:days options:0 error:nil];
            NSString *json = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
            callback(@[[NSString stringWithFormat:@"DetailedGraph.updateSleepData(JSON.stringify(%@))", json]]);
        }];
        return;
    }

    if (![@[@"steps", @"calories", @"distance"] containsObject:type ?: @""]) {
        callback(@[]);
        return;
    }

    dispatch_group_t group = dispatch_group_create();
    __block NSArray<NSNumber *> *values = @[];
    __block NSString *activity = @"0";
    dispatch_group_enter(group);
    [self fetchFitnessBuckets:type start:range.startDate end:end hourly:isDay
                   completion:^(NSArray<NSNumber *> *result, NSError *error) {
        if (error) NSLog(@"HealthKit %@ graph query failed: %@", type, error.localizedDescription);
        values = result;
        dispatch_group_leave(group);
    }];
    dispatch_group_enter(group);
    [self getActivityTime:date frequency:frequency days:0 callback:^(NSMutableArray *result) {
        activity = result.firstObject ?: @"0";
        dispatch_group_leave(group);
    }];
    dispatch_group_notify(group, dispatch_get_main_queue(), ^{
        NSInteger count = isDay ? 24 : (isWeek ? 7 : 31);
        NSMutableArray *labels = [NSMutableArray new];
        NSMutableArray *buckets = [NSMutableArray new];
        for (NSInteger index = 0; index < count; index++) {
            [labels addObject:@(index + 1)];
            [buckets addObject:index < values.count ? @(values[index].integerValue) : @0];
        }
        callback(@[[NSString stringWithFormat:@"DetailedGraph.updateData([%@],[%@],'%@','%@','%@')",
            [labels componentsJoinedByString:@","], [buckets componentsJoinedByString:@","], type, frequency, activity]]);
    });
}

- (NSDate *)convertStringToDate:(NSString *)date {
    NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
    [formatter setDateFormat:@"yyyy-MM-dd'T'HH:mm:ss.SSSZ"];
    NSLocale *posix = [[NSLocale alloc] initWithLocaleIdentifier:@"en_US_POSIX"];
    [formatter setLocale:posix];
    return [formatter dateFromString:date];
}

-(void) getDateRanges:(NSDate*) startDate callback:(void(^)(NSMutableArray*))callback{
    NSCalendar *calendar = [NSCalendar currentCalendar];
    dispatch_group_t loadDetailsGroup=dispatch_group_create();
    NSDate *startOfToday = [[NSCalendar calendarWithIdentifier:NSCalendarIdentifierISO8601] startOfDayForDate:[NSDate date]];
    NSDate *startOfNextDay = [[NSCalendar calendarWithIdentifier:NSCalendarIdentifierISO8601] dateByAddingUnit:NSCalendarUnitDay value:1 toDate:startOfToday options:0];
    NSDate *endOfToday = [[NSCalendar calendarWithIdentifier:NSCalendarIdentifierISO8601] dateByAddingUnit:NSCalendarUnitSecond value:-1 toDate:startOfNextDay options:0];
    NSDateComponents *days = [[NSDateComponents alloc] init];
    NSInteger dayCount = 0;
    NSMutableArray *dates=[NSMutableArray new];
    NSDate* startingDate = startDate;
    NSDateComponents *component = [calendar components:NSCalendarUnitDay
                                                        fromDate:startingDate
                                                          toDate:endOfToday
                                                         options:0];
    
    NSInteger numberOfDays =[component day];
    if(numberOfDays>30){
        [component setDay:-30];
        startingDate =[calendar dateByAddingComponents:component toDate:endOfToday options:0];
        numberOfDays=30;
    }else{
        [component setDay:-numberOfDays-1];
        startingDate =[calendar dateByAddingComponents:component toDate:endOfToday options:0];
    }
    NSLog(@"numberOfDays are ,%ld, while startingDate is,%@",(long)numberOfDays,startDate);

    for (NSInteger i=numberOfDays; i>0; i--) {
        dispatch_group_enter(loadDetailsGroup);
        [days setDay: ++dayCount];
        NSDate *date = [calendar dateByAddingComponents: days toDate: startingDate options: 0];
        [dates addObject:date];
        dispatch_group_leave(loadDetailsGroup);
    }

    dispatch_group_notify(loadDetailsGroup,dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0),^{
        NSLog(@"dispatch_group_notify called %@",dates);
            callback(dates);
    });
}

- (NSDictionary *)hourlySyncPayloadForDate:(NSDate *)date
                                       steps:(NSArray<NSNumber *> *)steps
                                    calories:(NSArray<NSNumber *> *)calories
                                    distance:(NSArray<NSNumber *> *)distance {
    NSMutableArray *records = [NSMutableArray new];
    for (NSInteger hour = 0; hour < steps.count; hour++) {
        [records addObject:@{
            @"st": @(steps[hour].integerValue),
            @"c": @(calories[hour].integerValue),
            @"d": @(distance[hour].integerValue),
            @"h": @(hour),
            @"s": @"",
        }];
    }
    return @{@"data": records, @"dt": VisitHealthTimestamp(date)};
}

- (void)callSyncData:(NSInteger)days dates:(NSArray<NSDate *> *)dates callback:(void (^)(NSArray *))callback {
    if (dates.count == 0) {
        callback(@[]);
        return;
    }

    NSCalendar *syncCalendar = self->calendar;
    NSDate *firstDay = [syncCalendar startOfDayForDate:dates.firstObject];
    NSDate *lastDay = [syncCalendar startOfDayForDate:dates.lastObject];
    NSDate *nextDay = [syncCalendar dateByAddingUnit:NSCalendarUnitDay value:1 toDate:lastDay options:0];
    NSDate *end = [nextDay dateByAddingTimeInterval:-1];
    NSMutableDictionary<NSString *, NSArray<NSNumber *> *> *series = [NSMutableDictionary new];
    __block NSDictionary<NSDate *, NSArray<NSDateInterval *> *> *sleepByDay;
    __block NSArray<NSDictionary *> *activity;
    dispatch_group_t group = dispatch_group_create();

    for (NSString *metric in @[@"steps", @"calories", @"distance"]) {
        dispatch_group_enter(group);
        [self fetchFitnessBuckets:metric start:firstDay end:end hourly:NO
                       completion:^(NSArray<NSNumber *> *values, NSError *error) {
            if (error) NSLog(@"HealthKit %@ sync query failed: %@", metric, error.localizedDescription);
            @synchronized (series) { if (!error) series[metric] = values; }
            dispatch_group_leave(group);
        }];
    }
    dispatch_group_enter(group);
    [self fetchSleepFromDay:firstDay throughDay:lastDay
                 completion:^(NSDictionary<NSDate *, NSArray<NSDateInterval *> *> *sleep, NSError *error) {
        if (error) NSLog(@"HealthKit sleep sync query failed: %@", error.localizedDescription);
        if (!error) sleepByDay = sleep;
        dispatch_group_leave(group);
    }];
    dispatch_group_enter(group);
    [self getActivityTime:end frequency:@"custom" days:days callback:^(NSArray *result) {
        activity = result.count > 1 ? result[1] : @[];
        dispatch_group_leave(group);
    }];
    dispatch_group_notify(group, dispatch_get_main_queue(), ^{
        if (series.count != 3 || !sleepByDay) {
            callback(@[]);
            return;
        }
        NSMutableDictionary<NSDate *, NSNumber *> *activityByDay = [NSMutableDictionary new];
        for (NSDictionary *value in activity) {
            activityByDay[[syncCalendar startOfDayForDate:value[@"date"]]] = value[@"value"];
        }
        NSMutableArray *fitnessData = [NSMutableArray new];
        for (NSDate *date in dates) {
            NSDate *day = [syncCalendar startOfDayForDate:date];
            NSInteger index = [syncCalendar components:NSCalendarUnitDay fromDate:firstDay toDate:day options:0].day;
            NSMutableDictionary *record = [@{@"date": VisitHealthTimestamp(date)} mutableCopy];
            for (NSString *metric in @[@"steps", @"calories", @"distance"]) {
                NSArray<NSNumber *> *values = series[metric];
                record[metric] = index >= 0 && index < values.count ? values[index] : @0;
            }
            NSNumber *duration = activityByDay[day];
            if (duration) record[@"activity"] = duration;
            NSArray<NSDateInterval *> *sleep = sleepByDay[day];
            if (sleep.count > 0) {
                record[@"sleep"] = [NSString stringWithFormat:@"%@-%@",
                    VisitHealthTimestamp(sleep.firstObject.startDate), VisitHealthTimestamp(sleep.lastObject.endDate)];
            }
            [fitnessData addObject:record];
        }
        callback(@[@{@"fitnessData": fitnessData}]);
    });
}

RCT_EXPORT_METHOD(connectToAppleHealth:(RCTResponseSenderBlock)callback)
{
    if (![HKHealthStore isHealthDataAvailable]) {
        callback(@[@{@"authStatus": @"UNAVAILABLE"}]);
        return;
    }

    NSSet *readTypes = [self fitnessReadTypes];

    __weak typeof(self) weakSelf = self;

    void (^finish)(void) = ^{
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!strongSelf) { return; }

        [strongSelf hasReadableFitnessSamples:^(BOOL readable) {
            if (!readable) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    callback(@[@{@"authStatus": @"DENIED"}]);
                });
                return;
            }
            [strongSelf onHealthKitPermissionGranted:^(NSDictionary *data) {
                NSMutableDictionary *out =
                    [NSMutableDictionary dictionaryWithDictionary:data ?: @{}];
                out[@"authStatus"] = @"GRANTED";
                dispatch_async(dispatch_get_main_queue(), ^{
                    callback(@[out]);
                });
            }];
        }];
    };

    [self healthKitRequestStatus:^(HKAuthorizationRequestStatus status) {
        if (status == HKAuthorizationRequestStatusUnnecessary) {
            finish();
            return;
        }

        [[VisitRnSdkViewManager sharedManager]
            requestAuthorizationToShareTypes:nil
                                   readTypes:readTypes
                                  completion:^(BOOL success, NSError *error) {
            if (!success) {
                NSLog(@"connectToAppleHealth authorization failed: %@", error.localizedDescription);
                dispatch_async(dispatch_get_main_queue(), ^{
                    callback(@[@{@"authStatus": @"DENIED"}]);
                });
                return;
            }
            finish();
        }];
    }];
}

// Opens Settings.app on the Health section (Settings → Health → Data Access
// & Devices path). Uses the unofficial `App-Prefs:root=HEALTH` URL scheme
// with a graceful fallback to `UIApplicationOpenSettingsURLString` (the
// current app's Settings page) if iOS refuses the deep link. Vendors should
// note the App Review caveat around `App-Prefs:` schemes documented in the
// iOS vendor guide.
RCT_EXPORT_METHOD(openAppleHealthApp:(RCTPromiseResolveBlock)resolve
                            rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        UIApplication *app = [UIApplication sharedApplication];

        void (^openAppSettings)(void) = ^{
            NSURL *settingsUrl = [NSURL URLWithString:UIApplicationOpenSettingsURLString];
            if (!settingsUrl) {
                reject(@"OPEN_HEALTH_FAILED", @"Settings URL is unavailable", nil);
                return;
            }
            [app openURL:settingsUrl options:@{} completionHandler:^(BOOL success) {
                if (success) {
                    resolve(@YES);
                } else {
                    reject(@"OPEN_HEALTH_FAILED", @"Unable to open Settings app", nil);
                }
            }];
        };

        NSURL *healthPrefsUrl = [NSURL URLWithString:@"App-Prefs:root=HEALTH"];
        if (!healthPrefsUrl) {
            openAppSettings();
            return;
        }
        [app openURL:healthPrefsUrl options:@{} completionHandler:^(BOOL success) {
            if (success) {
                resolve(@YES);
            } else {
                openAppSettings();
            }
        }];
    });
}

RCT_EXPORT_METHOD(renderGraph:(NSDictionary *)input callback:(RCTResponseSenderBlock)callback)
{
  NSString *type = [input objectForKey:@"type"];
 NSString *frequency = [input objectForKey:@"frequency"];
 NSString *timestamp = [input objectForKey:@"timestamp"];
  NSDate *date = [NSDate dateWithTimeIntervalSince1970:[timestamp doubleValue]/1000];
  [self renderGraphData:type frequency:frequency date:date callback:^(NSArray * data) {
    NSLog(@"renderGraphData data is, %@",data);
    callback(@[[NSNull null], data]);
  }];
}

- (void)postJSONBody:(NSDictionary *)body
              toURL:(NSString *)urlString
          authToken:(NSString *)authToken
         completion:(void (^)(NSError *error, NSInteger status))completion
{
    NSURL *url = [NSURL URLWithString:urlString];
    if (!url) {
        completion([NSError errorWithDomain:@"VisitSync" code:-1
                                   userInfo:@{NSLocalizedDescriptionKey:
                                                  [NSString stringWithFormat:@"Invalid URL: %@", urlString]}],
                   0);
        return;
    }

    NSError *jsonError = nil;
    NSData *bodyData = [NSJSONSerialization dataWithJSONObject:body options:0 error:&jsonError];
    if (jsonError) {
        completion(jsonError, 0);
        return;
    }

    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
    request.HTTPMethod = @"POST";
    [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
    if (authToken.length > 0) {
        [request setValue:authToken forHTTPHeaderField:@"Authorization"];
    }
    request.HTTPBody = bodyData;

    NSURLSessionDataTask *task =
        [[NSURLSession sharedSession] dataTaskWithRequest:request
                                        completionHandler:^(NSData *data,
                                                            NSURLResponse *response,
                                                            NSError *error) {
        NSInteger status = 0;
        if ([response isKindOfClass:[NSHTTPURLResponse class]]) {
            status = ((NSHTTPURLResponse *)response).statusCode;
        }
        completion(error, status);
    }];
    [task resume];
}

- (void)collectEmbellishBatchesForDates:(NSArray<NSDate *> *)dates
                             completion:(void (^)(NSArray<NSDictionary *> *))completion {
    dispatch_group_t group = dispatch_group_create();
    NSMutableDictionary<NSDate *, NSDictionary *> *batches = [NSMutableDictionary new];
    for (NSDate *date in dates) {
        dispatch_group_enter(group);
        [self fetchHourlyFitnessForDate:date completion:^(NSArray<NSNumber *> *steps,
                                                         NSArray<NSNumber *> *calories,
                                                         NSArray<NSNumber *> *distance) {
            if (steps && calories && distance) {
                batches[date] = [self hourlySyncPayloadForDate:date steps:steps calories:calories distance:distance];
            }
            dispatch_group_leave(group);
        }];
    }
    dispatch_group_notify(group, dispatch_get_main_queue(), ^{
        NSMutableArray *ordered = [NSMutableArray new];
        for (NSDate *date in dates) {
            NSDictionary *batch = batches[date];
            if (batch) [ordered addObject:batch];
        }
        completion(ordered);
    });
}

// Shared sync executor. Called from updateApiUrl (fire-and-forget) and
// triggerManualSync (promise). Handles date-range → collection → HTTP POST for
// both the embellish (hourly) and data-sync (daily) endpoints.
- (void)performVisitSyncWithBaseUrl:(NSString *)baseUrl
                          authToken:(NSString *)authToken
                        hourlySince:(NSTimeInterval)gfHourlyLastSync
                         dailySince:(NSTimeInterval)googleFitLastSync
                            resolve:(RCTPromiseResolveBlock)resolve
                             reject:(RCTPromiseRejectBlock)reject
{
    NSDate *hourlyDataSyncTime = [NSDate dateWithTimeIntervalSince1970:gfHourlyLastSync / 1000];
    NSDate *dailyDataSyncTime = [NSDate dateWithTimeIntervalSince1970:googleFitLastSync / 1000];

    NSString *embellishUrl = [NSString stringWithFormat:@"%@/users/embellish-sync", baseUrl];
    NSString *dataSyncUrl = [NSString stringWithFormat:@"%@/users/data-sync", baseUrl];

    __block NSError *firstError = nil;
    NSLock *errorLock = [[NSLock alloc] init];
    void (^recordError)(NSError *) = ^(NSError *err) {
        if (!err) { return; }
        [errorLock lock];
        if (!firstError) { firstError = err; }
        [errorLock unlock];
    };

    dispatch_group_t topGroup = dispatch_group_create();
    __weak typeof(self) weakSelf = self;

    // Hourly / embellish flow
    dispatch_group_enter(topGroup);
    [self getDateRanges:hourlyDataSyncTime callback:^(NSMutableArray *dates) {
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!strongSelf) {
            dispatch_group_leave(topGroup);
            return;
        }
        [strongSelf collectEmbellishBatchesForDates:dates
                                         completion:^(NSArray *batches) {
            if (batches.count == 0) {
                NSLog(@"[Visit Sync] no embellish batches to POST");
                dispatch_group_leave(topGroup);
                return;
            }
            dispatch_group_t postGroup = dispatch_group_create();
            for (NSDictionary *body in batches) {
                dispatch_group_enter(postGroup);
                [strongSelf postJSONBody:body
                                   toURL:embellishUrl
                               authToken:authToken
                              completion:^(NSError *err, NSInteger status) {
                    NSLog(@"[Visit Sync] embellish POST status=%ld err=%@",
                          (long)status, err.localizedDescription);
                    if (err) {
                        recordError(err);
                    } else if (status < 200 || status >= 300) {
                        recordError([NSError errorWithDomain:@"VisitSync"
                                                        code:status
                                                    userInfo:@{NSLocalizedDescriptionKey:
                                                                   [NSString stringWithFormat:
                                                                    @"embellish HTTP %ld",
                                                                    (long)status]}]);
                    }
                    dispatch_group_leave(postGroup);
                }];
            }
            dispatch_group_notify(postGroup,
                                  dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
                dispatch_group_leave(topGroup);
            });
        }];
    }];

    // Daily / data-sync flow
    dispatch_group_enter(topGroup);
    [self getDateRanges:dailyDataSyncTime callback:^(NSMutableArray *dates) {
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!strongSelf || dates.count == 0) {
            dispatch_group_leave(topGroup);
            return;
        }
        [strongSelf callSyncData:dates.count
                           dates:dates
                        callback:^(NSArray *data) {
            if (data.count == 0 || ![data[0] isKindOfClass:[NSDictionary class]]) {
                NSLog(@"[Visit Sync] no daily sync payload to POST");
                dispatch_group_leave(topGroup);
                return;
            }
            [strongSelf postJSONBody:data[0]
                               toURL:dataSyncUrl
                           authToken:authToken
                          completion:^(NSError *err, NSInteger status) {
                NSLog(@"[Visit Sync] data-sync POST status=%ld err=%@",
                      (long)status, err.localizedDescription);
                if (err) {
                    recordError(err);
                } else if (status < 200 || status >= 300) {
                    recordError([NSError errorWithDomain:@"VisitSync"
                                                    code:status
                                                userInfo:@{NSLocalizedDescriptionKey:
                                                               [NSString stringWithFormat:
                                                                @"data-sync HTTP %ld",
                                                                (long)status]}]);
                }
                dispatch_group_leave(topGroup);
            }];
        }];
    }];

    dispatch_group_notify(topGroup, dispatch_get_main_queue(), ^{
        self.isSyncInProgress = NO;
        if (firstError) {
            if (reject) {
                reject(@"SYNC_FAILED",
                       firstError.localizedDescription ?: @"Sync failed",
                       firstError);
            }
        } else {
            if (resolve) {
                resolve(@"Health Data Sync Completed");
            }
        }
    });
}

RCT_EXPORT_METHOD(updateApiUrl:(NSDictionary *)input)
{
    NSString *apiBaseUrl = [input objectForKey:@"apiBaseUrl"];
    NSString *authToken = [input objectForKey:@"authToken"];
    NSTimeInterval gfHourlyLastSync = [[input objectForKey:@"gfHourlyLastSync"] doubleValue];
    NSTimeInterval googleFitLastSync = [[input objectForKey:@"googleFitLastSync"] doubleValue];

    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    if (apiBaseUrl.length > 0) {
        [defaults setObject:apiBaseUrl forKey:kVisitApiBaseUrlKey];
    }
    if (authToken.length > 0) {
        [defaults setObject:authToken forKey:kVisitAuthTokenKey];
    }
    if (gfHourlyLastSync > 0) {
        [defaults setDouble:gfHourlyLastSync forKey:kVisitHourlyLastSyncKey];
    }
    if (googleFitLastSync > 0) {
        [defaults setDouble:googleFitLastSync forKey:kVisitDailyLastSyncKey];
    }

    NSString *storedBaseUrl = apiBaseUrl.length > 0 ? apiBaseUrl : [defaults stringForKey:kVisitApiBaseUrlKey];
    NSString *storedAuthToken = authToken.length > 0 ? authToken : [defaults stringForKey:kVisitAuthTokenKey];

    if (![HKHealthStore isHealthDataAvailable]) {
        return;
    }
    if (storedBaseUrl.length == 0 || storedAuthToken.length == 0) {
        return;
    }
    if (self.isSyncInProgress) {
        return;
    }

    self.isSyncInProgress = YES;
    __weak typeof(self) weakSelf = self;
    [self canAccessHealthKit:^(BOOL value) {
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!strongSelf) { return; }
        if (!value) {
            strongSelf.isSyncInProgress = NO;
            [strongSelf requestAuthorization:^(NSDictionary *data) { (void)data; }];
            return;
        }
        [strongSelf performVisitSyncWithBaseUrl:storedBaseUrl
                                     authToken:storedAuthToken
                                   hourlySince:gfHourlyLastSync
                                    dailySince:googleFitLastSync
                                       resolve:nil
                                        reject:nil];
    }];
}


RCT_EXPORT_METHOD(fetchHourlyData:(NSInteger)gfHourlyLastSync resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
    NSDate *date = [NSDate dateWithTimeIntervalSince1970:gfHourlyLastSync / 1000.0];
    [self canAccessHealthKit:^(BOOL readable) {
        if (!readable) {
            reject(@"error", @"Error fetching hourly data", nil);
            return;
        }
        [self collectEmbellishBatchesForDates:@[date] completion:^(NSArray *batches) {
            resolve(batches);
        }];
    }];
}

RCT_EXPORT_METHOD(fetchDailyData:(NSInteger)googleFitLastSync resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject){
    NSLog(@"gfHourlyLastSync in fetchHourlyData is %ld",(long)googleFitLastSync);
    NSDate* dailyDataSyncTime = [NSDate dateWithTimeIntervalSince1970:googleFitLastSync/1000];
    [self canAccessHealthKit:^(BOOL value){
        if(value){
            [self getDateRanges:dailyDataSyncTime callback:^(NSMutableArray * dates) {
                  if([dates count]>0){
                    [self callSyncData:[dates count] dates:dates callback:^(NSArray * data) {
                        NSLog(@"fetchDailyData data is, %@",data);
                        resolve(data);
                    }];
                  }
              }];
        }else{
            NSError* error;
            reject(@"error", @"Error fetching daily data", error);
        }
    }];
}

RCT_REMAP_METHOD(getHealthKitConnectStatus,
                 getHealthKitConnectStatusWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    if (![HKHealthStore isHealthDataAvailable]) {
        resolve(@"NOT_SUPPORTED");
        return;
    }

    [self canAccessHealthKit:^(BOOL granted) {
        dispatch_async(dispatch_get_main_queue(), ^{
            resolve(granted ? @"CONNECTED" : @"INSTALLED");
        });
    }];
}

// HealthKit Authorization Check
RCT_REMAP_METHOD(getHealthKitStatus,
                 checkHealthKitAuthorizationWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    if (![HKHealthStore isHealthDataAvailable]) {
        resolve(@(NO));
        return;
    }

    // Was gated on HKAuthorizationStatusSharingAuthorized, i.e. *write*
    // authorization, which this read-only SDK no longer requests. Now gated on
    // whether the permission sheet has been answered.
    [self canAccessHealthKit:^(BOOL resolved) {
        if (!resolved) {
            dispatch_async(dispatch_get_main_queue(), ^{
                resolve(@(NO)); // HealthKit access not granted
            });
            return;
        }

        NSDate *now = [NSDate date];
        NSDate *today = [self->calendar startOfDayForDate:now];
        [self fetchFitnessBuckets:@"steps" start:today end:now hourly:NO
                       completion:^(NSArray<NSNumber *> *stepsData, NSError *queryError) {
            dispatch_async(dispatch_get_main_queue(), ^{
                if (!queryError) {
                    resolve(@{@"steps": stepsData});
                } else {
                    reject(@"fetch_error", @"Error fetching step data", queryError);
                }
            });
        }];
    }];
}

RCT_REMAP_METHOD(requestHealthKitAuthorization,
                 requestHealthKitAuthorizationWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    if (![HKHealthStore isHealthDataAvailable]) {
        reject(@"HEALTH_DATA_UNAVAILABLE", @"HealthKit is not available on this device", nil);
        return;
    }

    NSSet *readTypes = [self fitnessReadTypes];

    __weak typeof(self) weakSelf = self;
    [[VisitRnSdkViewManager sharedManager]
        requestAuthorizationToShareTypes:nil
                               readTypes:readTypes
                              completion:^(BOOL success, NSError *error) {
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!success || !strongSelf) {
            dispatch_async(dispatch_get_main_queue(), ^{
                reject(@"AUTHORIZATION_FAILED",
                       error.localizedDescription ?: @"HealthKit authorization failed",
                       error);
            });
            return;
        }

        // HealthKit exposes readable samples rather than per-type read authorization.
        [strongSelf canAccessHealthKit:^(BOOL resolved) {
            dispatch_async(dispatch_get_main_queue(), ^{
                resolve(resolved ? @"GRANTED" : @"NOT_DETERMINED");
            });
        }];
    }];
}

RCT_REMAP_METHOD(getTodayStepCount,
                 getTodayStepCountWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    if (![HKHealthStore isHealthDataAvailable]) {
        reject(@"HEALTH_DATA_UNAVAILABLE", @"HealthKit is not available on this device", nil);
        return;
    }

    NSCalendar *cal = [NSCalendar currentCalendar];
    NSDate *startOfDay = [cal startOfDayForDate:[NSDate date]];
    NSDateComponents *dayInterval = [[NSDateComponents alloc] init];
    dayInterval.day = 1;

    HKQuantityType *stepType = [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount];

    HKStatisticsCollectionQuery *query = [[HKStatisticsCollectionQuery alloc]
        initWithQuantityType:stepType
     quantitySamplePredicate:nil
                     options:HKStatisticsOptionCumulativeSum
                  anchorDate:startOfDay
          intervalComponents:dayInterval];

    query.initialResultsHandler = ^(HKStatisticsCollectionQuery *q,
                                    HKStatisticsCollection *collection,
                                    NSError *error) {
        if (error) {
            reject(@"STEP_QUERY_FAILED",
                   error.localizedDescription ?: @"Failed to query step count",
                   error);
            return;
        }
        HKStatistics *todayStats = [collection statisticsForDate:startOfDay];
        HKQuantity *sum = todayStats.sumQuantity;
        NSInteger steps = sum ? (NSInteger)[sum doubleValueForUnit:[HKUnit countUnit]] : 0;
        resolve(@(steps));
    };

    [[VisitRnSdkViewManager sharedManager] executeQuery:query];
}

RCT_REMAP_METHOD(getTodaySleepMinutes,
                 getTodaySleepMinutesWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    if (![HKHealthStore isHealthDataAvailable]) {
        reject(@"HEALTH_DATA_UNAVAILABLE", @"HealthKit is not available on this device", nil);
        return;
    }
    [self fetchTodaySleepMinutes:^(NSNumber *minutes, NSError *error) {
        if (error) {
            reject(@"SLEEP_QUERY_FAILED", error.localizedDescription, error);
        } else {
            resolve(minutes);
        }
    }];
}

RCT_REMAP_METHOD(getTodayCalorieCount,
                 getTodayCalorieCountWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject) {
    if (![HKHealthStore isHealthDataAvailable]) {
        reject(@"HEALTH_DATA_UNAVAILABLE", @"HealthKit is not available on this device", nil);
        return;
    }
    NSDate *now = [NSDate date];
    NSDate *today = [self->calendar startOfDayForDate:now];
    [self fetchFitnessBuckets:@"calories" start:today end:now hourly:NO
                   completion:^(NSArray<NSNumber *> *values, NSError *error) {
        if (error) {
            reject(@"CALORIE_QUERY_FAILED", error.localizedDescription, error);
        } else {
            resolve(values.firstObject ?: @0);
        }
    }];
}

RCT_REMAP_METHOD(triggerManualSync,
                 triggerManualSyncWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    if (![HKHealthStore isHealthDataAvailable]) {
        reject(@"HEALTH_DATA_UNAVAILABLE", @"HealthKit is not available on this device", nil);
        return;
    }
    if (self.isSyncInProgress) {
        reject(@"SYNC_IN_PROGRESS", @"Health data sync is already in progress", nil);
        return;
    }

    NSUserDefaults *defaults = [NSUserDefaults standardUserDefaults];
    NSString *baseUrl = [defaults stringForKey:kVisitApiBaseUrlKey];
    NSString *authToken = [defaults stringForKey:kVisitAuthTokenKey];
    NSTimeInterval gfHourlyLastSync = [defaults doubleForKey:kVisitHourlyLastSyncKey];
    NSTimeInterval googleFitLastSync = [defaults doubleForKey:kVisitDailyLastSyncKey];

    if (baseUrl.length == 0 || authToken.length == 0) {
        reject(@"MISSING_SYNC_CREDENTIALS",
               @"Visit apiBaseUrl or authToken is missing. Ensure the WebView has mounted at least once so credentials are seeded.",
               nil);
        return;
    }
    if (gfHourlyLastSync <= 0 && googleFitLastSync <= 0) {
        reject(@"MISSING_SYNC_TIMESTAMPS",
               @"Visit sync timestamps are missing. Ensure the WebView has run at least once.",
               nil);
        return;
    }

    self.isSyncInProgress = YES;
    __weak typeof(self) weakSelf = self;
    [self canAccessHealthKit:^(BOOL value) {
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!strongSelf) { return; }
        if (!value) {
            strongSelf.isSyncInProgress = NO;
            reject(@"PERMISSION_DENIED", @"HealthKit permission is not granted", nil);
            return;
        }
        [strongSelf performVisitSyncWithBaseUrl:baseUrl
                                     authToken:authToken
                                   hourlySince:gfHourlyLastSync
                                    dailySince:googleFitLastSync
                                       resolve:resolve
                                        reject:reject];
    }];
}

@end
