#import "VisitRnSdkViewManager.h"
#import <HealthKit/HealthKit.h>
#import <UIKit/UIKit.h>

static NSString *const kVisitApiBaseUrlKey = @"visit_api_base_url";
static NSString *const kVisitAuthTokenKey = @"visit_auth_token";
static NSString *const kVisitHourlyLastSyncKey = @"gfHourlyLastSync";
static NSString *const kVisitDailyLastSyncKey = @"googleFitLastSync";

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

- (NSString *)readGender
{
    NSError *error;
    HKBiologicalSexObject *gen=[[VisitRnSdkViewManager sharedManager] biologicalSexWithError:&error];
    if (gen.biologicalSex==HKBiologicalSexMale)
    {
        return(@"Male");
    }
    else if (gen.biologicalSex==HKBiologicalSexFemale)
    {
        return (@"Female");
    }
    else if (gen.biologicalSex==HKBiologicalSexOther)
    {
        return (@"Other");
    }
    else{
        return (@"Not Set");
    }
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
                return;
            }
        }];
}

- (void)fetchHourlySteps:(NSDate*) endDate callback:(void(^)(NSArray*))callback{
    HKQuantityType *stepCountType = [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount];
    HKQuantityType *activeEnergyType = [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierActiveEnergyBurned];
    NSCalendar *calendar = [NSCalendar currentCalendar];
    HKUnit *stepsUnit = [HKUnit countUnit];
    HKUnit *kcalUnit = [HKUnit kilocalorieUnit];
    NSDateComponents *interval = [[NSDateComponents alloc] init];
    interval.hour = 1;
    NSDate *startDate = [[NSCalendar calendarWithIdentifier:NSCalendarIdentifierISO8601] startOfDayForDate:endDate];
    NSDateComponents *dayInteval = [[NSDateComponents alloc] init];
    dayInteval.day = 1;
    dayInteval.second = -1;
    NSDate* endOfDay =  [calendar dateByAddingComponents:dayInteval toDate:startDate options:0];
    NSLog(@"endOfDay is, %@",endOfDay);
    NSDate *anchorDate = [calendar startOfDayForDate:startDate];
    NSPredicate *predicate = [HKQuery predicateForSamplesWithStartDate:startDate endDate:endOfDay options:HKQueryOptionStrictStartDate];
    NSPredicate *userEnteredValuePredicate = [HKQuery predicateForObjectsWithMetadataKey:HKMetadataKeyWasUserEntered operatorType: NSNotEqualToPredicateOperatorType value: @YES];

    NSCompoundPredicate *compoundPredicate = [NSCompoundPredicate andPredicateWithSubpredicates:@[predicate, userEnteredValuePredicate]];

    dispatch_group_t group = dispatch_group_create();
    NSMutableArray *stepsData = [NSMutableArray arrayWithCapacity:24];
    NSMutableArray *calorieData = [NSMutableArray arrayWithCapacity:24];

    dispatch_group_enter(group);
    HKStatisticsCollectionQuery *stepsQuery = [[HKStatisticsCollectionQuery alloc]
        initWithQuantityType:stepCountType
     quantitySamplePredicate:compoundPredicate
                     options:HKStatisticsOptionCumulativeSum
                  anchorDate:anchorDate
          intervalComponents:interval];
    stepsQuery.initialResultsHandler = ^(HKStatisticsCollectionQuery *q,
                                         HKStatisticsCollection *result,
                                         NSError *error) {
        if (error) {
            NSLog(@"fetchHourlySteps steps query error: %@", error.localizedDescription);
        } else {
            [result enumerateStatisticsFromDate:startDate toDate:endOfDay
                                      withBlock:^(HKStatistics *stat, BOOL *stop) {
                HKQuantity *quantity = stat.sumQuantity;
                int value = quantity ? (int)[quantity doubleValueForUnit:stepsUnit] : 0;
                [stepsData addObject:@(value)];
            }];
        }
        dispatch_group_leave(group);
    };
    [[VisitRnSdkViewManager sharedManager] executeQuery:stepsQuery];

    dispatch_group_enter(group);
    HKStatisticsCollectionQuery *caloriesQuery = [[HKStatisticsCollectionQuery alloc]
        initWithQuantityType:activeEnergyType
     quantitySamplePredicate:nil
                     options:HKStatisticsOptionCumulativeSum
                  anchorDate:anchorDate
          intervalComponents:interval];
    caloriesQuery.initialResultsHandler = ^(HKStatisticsCollectionQuery *q,
                                            HKStatisticsCollection *result,
                                            NSError *error) {
        if (error) {
            NSLog(@"fetchHourlySteps calories query error: %@", error.localizedDescription);
        } else {
            [result enumerateStatisticsFromDate:startDate toDate:endOfDay
                                      withBlock:^(HKStatistics *stat, BOOL *stop) {
                HKQuantity *quantity = stat.sumQuantity;
                int value = quantity ? (int)[quantity doubleValueForUnit:kcalUnit] : 0;
                [calorieData addObject:@(value)];
            }];
        }
        dispatch_group_leave(group);
    };
    [[VisitRnSdkViewManager sharedManager] executeQuery:caloriesQuery];

    dispatch_group_notify(group, dispatch_get_main_queue(), ^{
        callback(@[stepsData, calorieData]);
    });
}

-(void) fetchSteps:(NSString*) frequency endDate:(NSDate*) endDate days:(NSInteger) days callback:(void(^)(NSArray*))callback{
    NSDateComponents *interval = [[NSDateComponents alloc] init];
    NSDate *startDate;
    interval.day = 1;
    NSDate *endDatePeriod;
    if([frequency isEqualToString:@"day"]){
        endDatePeriod = endDate;
        startDate = [self->calendar dateByAddingUnit:NSCalendarUnitDay
                                                 value:0
                                                toDate:endDatePeriod
                                               options:0];
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
        NSLog(@"startDate and endDate in custom fetchSteps is, %@, %@",startDate,endDatePeriod);
    }
    NSLog(@"startDate and endDate in fetchSteps is, %@, %@",startDate,endDatePeriod);
    NSDateComponents *anchorComponents = [self->calendar components:NSCalendarUnitDay | NSCalendarUnitMonth | NSCalendarUnitYear
                                                     fromDate:[NSDate date]];
    anchorComponents.hour = 0;
    NSLog(@"anchorComponents in fetchSteps are, %@",anchorComponents);
    NSDate *anchorDate = [self->calendar dateFromComponents:anchorComponents];
    NSLog(@"anchorDate in fetchSteps are, %@",anchorDate);
    HKQuantityType *stepType = [HKObjectType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount];
    HKQuantityType *activeEnergyType = [HKObjectType quantityTypeForIdentifier:HKQuantityTypeIdentifierActiveEnergyBurned];
    HKUnit *kcalUnit = [HKUnit kilocalorieUnit];

    dispatch_group_t group = dispatch_group_create();
    NSMutableArray *stepsData = [NSMutableArray new];
    NSMutableArray *calorieData = [NSMutableArray new];

    dispatch_group_enter(group);
    HKStatisticsCollectionQuery *stepsQuery = [[HKStatisticsCollectionQuery alloc]
        initWithQuantityType:stepType
     quantitySamplePredicate:nil
                     options:HKStatisticsOptionCumulativeSum
                  anchorDate:anchorDate
          intervalComponents:interval];
    stepsQuery.initialResultsHandler = ^(HKStatisticsCollectionQuery *q,
                                         HKStatisticsCollection *results,
                                         NSError *error) {
        if (error) {
            NSLog(@"fetchSteps steps query error: %@", error.localizedDescription);
        } else {
            [results enumerateStatisticsFromDate:startDate
                                          toDate:endDatePeriod
                                       withBlock:^(HKStatistics *stat, BOOL *stop) {
                HKQuantity *quantity = stat.sumQuantity;
                int value = quantity ? (int)[quantity doubleValueForUnit:[HKUnit countUnit]] : 0;
                [stepsData addObject:@(value)];
            }];
        }
        dispatch_group_leave(group);
    };
    [[VisitRnSdkViewManager sharedManager] executeQuery:stepsQuery];

    dispatch_group_enter(group);
    HKStatisticsCollectionQuery *caloriesQuery = [[HKStatisticsCollectionQuery alloc]
        initWithQuantityType:activeEnergyType
     quantitySamplePredicate:nil
                     options:HKStatisticsOptionCumulativeSum
                  anchorDate:anchorDate
          intervalComponents:interval];
    caloriesQuery.initialResultsHandler = ^(HKStatisticsCollectionQuery *q,
                                            HKStatisticsCollection *results,
                                            NSError *error) {
        if (error) {
            NSLog(@"fetchSteps calories query error: %@", error.localizedDescription);
        } else {
            [results enumerateStatisticsFromDate:startDate
                                          toDate:endDatePeriod
                                       withBlock:^(HKStatistics *stat, BOOL *stop) {
                HKQuantity *quantity = stat.sumQuantity;
                int value = quantity ? (int)[quantity doubleValueForUnit:kcalUnit] : 0;
                [calorieData addObject:@(value)];
            }];
        }
        dispatch_group_leave(group);
    };
    [[VisitRnSdkViewManager sharedManager] executeQuery:caloriesQuery];

    dispatch_group_notify(group, dispatch_get_main_queue(), ^{
        callback(@[stepsData, calorieData]);
    });
}

-(void) fetchHourlyDistanceWalkingRunning:(NSDate*) endDate callback:(void(^)(NSArray*))callback{
    HKQuantityType *distanceType = [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierDistanceWalkingRunning];
    NSCalendar *calendar = [NSCalendar currentCalendar];
    NSDate *startDate = [[NSCalendar calendarWithIdentifier:NSCalendarIdentifierISO8601] startOfDayForDate:endDate];
        HKUnit *distanceUnit = [HKUnit meterUnit];
        NSDateComponents *interval = [[NSDateComponents alloc] init];
        interval.hour = 1;
    
    NSDateComponents *dayInteval = [[NSDateComponents alloc] init];
    dayInteval.day = 1;
    dayInteval.second = -1;
    NSDate* endOfDay =  [calendar dateByAddingComponents:dayInteval toDate:startDate options:0];
    
        NSDate *anchorDate = [calendar startOfDayForDate:startDate];
        NSPredicate *predicate = [HKQuery predicateForSamplesWithStartDate:startDate endDate:endOfDay options:HKQueryOptionStrictStartDate];
        NSPredicate *userEnteredValuePredicate = [HKQuery predicateForObjectsWithMetadataKey:HKMetadataKeyWasUserEntered operatorType: NSNotEqualToPredicateOperatorType value: @YES];
        
        NSCompoundPredicate *compoundPredicate = [NSCompoundPredicate andPredicateWithSubpredicates:@[predicate, userEnteredValuePredicate]];
        
        HKStatisticsCollectionQuery *query = [[HKStatisticsCollectionQuery alloc] initWithQuantityType:distanceType quantitySamplePredicate:compoundPredicate options:HKStatisticsOptionCumulativeSum anchorDate:anchorDate intervalComponents:interval];
        
        query.initialResultsHandler = ^(HKStatisticsCollectionQuery * _Nonnull query, HKStatisticsCollection * _Nullable result, NSError * _Nullable error) {
            if (error) {
                NSLog(@"*** An error occurred while calculating the statistics: %@ ***",
                      error.localizedDescription);
                return;
            }
            
            NSMutableArray *data = [NSMutableArray arrayWithCapacity:1];
            [result enumerateStatisticsFromDate:startDate toDate:endOfDay withBlock:^(HKStatistics * _Nonnull result, BOOL * _Nonnull stop) {
                HKQuantity *quantity = result.sumQuantity;
                if (quantity) {
                    int value =(int) [quantity doubleValueForUnit:distanceUnit];
                    [data addObject:[NSNumber numberWithInt:value]];
                } else {
                    [data addObject:[NSNumber numberWithInt:0]];
                }
            }];
            callback(data);
            NSLog(@"fetchDistanceWalkingRunning is,%@",data);
        };
        
        [[VisitRnSdkViewManager sharedManager] executeQuery:query];
}

-(void) fetchDistanceWalkingRunning:(NSString*) frequency endDate:(NSDate*) endDate days:(NSInteger) days callback:(void(^)(NSArray*))callback{
    NSDateComponents *interval = [[NSDateComponents alloc] init];
    NSDate *startDate;
    interval.day = 1;
    NSDate *endDatePeriod;
    HKUnit *distanceUnit = [HKUnit meterUnit];
    if([frequency isEqualToString:@"day"]){
        endDatePeriod = endDate;
        startDate = [self->calendar dateByAddingUnit:NSCalendarUnitDay
                                                 value:0
                                                toDate:endDatePeriod
                                               options:0];
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
        NSLog(@"startDate and endDate in custom fetchDistanceWalkingRunning is, %@, %@",startDate,endDatePeriod);
    }
    NSLog(@"startDate and endDate in fetchDistanceWalkingRunning is, %@, %@",startDate,endDatePeriod);
    NSDateComponents *anchorComponents = [self->calendar components:NSCalendarUnitDay | NSCalendarUnitMonth | NSCalendarUnitYear
                                                     fromDate:[NSDate date]];
    anchorComponents.hour = 0;
    NSDate *anchorDate = [self->calendar dateFromComponents:anchorComponents];
    HKQuantityType *quantityType = [HKObjectType quantityTypeForIdentifier:HKQuantityTypeIdentifierDistanceWalkingRunning];
    // Create the query
    HKStatisticsCollectionQuery *query = [[HKStatisticsCollectionQuery alloc] initWithQuantityType:quantityType
                                                                           quantitySamplePredicate:nil
                                                                                           options:HKStatisticsOptionCumulativeSum
                                                                                        anchorDate:anchorDate
                                                                                intervalComponents:interval];

    // Set the results handler
    query.initialResultsHandler = ^(HKStatisticsCollectionQuery *query, HKStatisticsCollection *results, NSError *error) {
        if (error) {
            // Perform proper error handling here
            NSLog(@"*** An error occurred while calculating the statistics: %@ ***",error.localizedDescription);
        }
        NSMutableArray *data = [NSMutableArray arrayWithCapacity:1];
        
        [results enumerateStatisticsFromDate:startDate
                                      toDate:endDatePeriod
                                   withBlock:^(HKStatistics *result, BOOL *stop) {

                                       HKQuantity *quantity = result.sumQuantity;
                                       if (quantity) {
                                           int value = [[NSNumber numberWithInt:[quantity doubleValueForUnit:distanceUnit]] intValue];
                                           NSLog(@"in fetchDistanceWalkingRunning %d", value);
                                           
                                           [data addObject:[NSNumber numberWithInt:value]];
                                       }else{
                                           [data addObject:[NSNumber numberWithInt:0]];
                                       }
                                   }];
        callback(data);
    };

    [[VisitRnSdkViewManager sharedManager] executeQuery:query];
}

- (void)fetchSleepCategorySamplesForPredicate:(NSPredicate *)predicate
                                   limit:(NSUInteger)lim
                                   completion:(void (^)(NSArray *, NSError *))completion {


    NSSortDescriptor *timeSortDescriptor = [[NSSortDescriptor alloc] initWithKey:HKSampleSortIdentifierEndDate
                                                                       ascending:true];


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
      NSLog(@"the results of sleep is, %@", results);

        if (completion) {
            NSMutableArray *data = [NSMutableArray arrayWithCapacity:1];

            dispatch_async(dispatch_get_main_queue(), ^{
                for (HKCategorySample *sample in results) {

                    NSInteger val = sample.value;

                    NSString *valueString;

                    switch (val) {
                      case HKCategoryValueSleepAnalysisInBed:
                        valueString = @"INBED";
                      break;
                      case HKCategoryValueSleepAnalysisAsleep:
                        valueString = @"ASLEEP";
                      break;
                     default:
                        valueString = @"UNKNOWN";
                     break;
                  }

                    NSDictionary *elem = @{
                            @"value" : valueString,
                            @"startDate" : sample.startDate,
                            @"endDate" : sample.endDate,
                    };

                    [data addObject:elem];
                }

                completion(data, error);
            });
        }
    };

    HKCategoryType *categoryType = [HKObjectType categoryTypeForIdentifier:HKCategoryTypeIdentifierSleepAnalysis];
    HKSampleQuery *query = [[HKSampleQuery alloc] initWithSampleType:categoryType
                                                          predicate:predicate
                                                              limit:lim
                                                    sortDescriptors:@[timeSortDescriptor]
                                                     resultsHandler:handlerBlock];
    
    [[VisitRnSdkViewManager sharedManager] executeQuery:query];
}

- (void)requestAuthorization:(void(^)(NSDictionary*))callback {
    
    if ([HKHealthStore isHealthDataAvailable] == NO) {
        // If our device doesn't support HealthKit -> return.
        return;
    }
    NSArray *writeTypes = @[[HKSampleType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount]];
    NSArray *readTypes = @[[HKSampleType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount],
                           [HKSampleType categoryTypeForIdentifier:HKCategoryTypeIdentifierSleepAnalysis],
                           [HKSampleType characteristicTypeForIdentifier:HKCharacteristicTypeIdentifierBiologicalSex],
                           [HKSampleType quantityTypeForIdentifier:HKQuantityTypeIdentifierDistanceWalkingRunning],
                           [HKSampleType quantityTypeForIdentifier:HKQuantityTypeIdentifierActiveEnergyBurned],
                           [HKSampleType quantityTypeForIdentifier:HKQuantityTypeIdentifierBasalEnergyBurned]];
    
    [[VisitRnSdkViewManager sharedManager] requestAuthorizationToShareTypes:[NSSet setWithArray:writeTypes] readTypes:[NSSet setWithArray:readTypes]
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

-(void) onHealthKitPermissionGranted:(void(^)(NSDictionary*))callback{
    dispatch_group_t loadDetailsGroup=dispatch_group_create();
    __block NSString* numberOfSteps = 0;
    __block NSTimeInterval totalSleepTime = 0;
    NSLog(@"gender is, %@",gender);
    for (int i = 0; i<2; i++) {
        
        dispatch_group_enter(loadDetailsGroup);
        if(i==0){
            //  getting steps for current day
            [self fetchSteps:@"day" endDate:[NSDate date] days:0 callback:^(NSArray * result) {
                if([[result objectAtIndex:0] count]>0){
                    numberOfSteps = [[result objectAtIndex:0] objectAtIndex:0];
                }
                dispatch_group_leave(loadDetailsGroup);
            }];
        }else if (i==1){
            //  getting sleep pattern for the day past
            [self fetchSleepPattern:[NSDate date] frequency:@"day" days:0 callback:^(NSArray * result) {
              NSLog(@"Sleep result is, %@",result);
                if([result count]>0){
                    for (NSDictionary* item in result) {
                        NSString* sleepValue = [item valueForKey:@"value"];
                        if([sleepValue isEqualToString:@"INBED"]||[sleepValue isEqualToString:@"ASLEEP"]){
                            NSDate* startDate = [item valueForKey:@"startDate"];
                            NSDate* endDate = [item valueForKey:@"endDate"];
                            NSTimeInterval duration = [endDate timeIntervalSinceDate:startDate] / 60;
                            totalSleepTime+=duration;
                            NSLog(@"Sleep value is, %@, while duration is %f",sleepValue,duration);
                    }
                    }
                }
                dispatch_group_leave(loadDetailsGroup);
            }];
        }
    }

    // Now outside the loop wait until everything is done. NOTE: this will
    // not block execution, the provided block will be called
    // asynchronously at a later point.
    dispatch_group_notify(loadDetailsGroup,dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0),^{
        self->gender= [self readGender];
        if([self->gender isEqualToString:@"Male"]){
            self->bmrCaloriesPerHour = 1662 / 24;
        }else{
            self->bmrCaloriesPerHour = 1493 / 24;
        }
        NSLog(@"the steps result is, %@",numberOfSteps);
        NSLog(@"total sleep time is %f",totalSleepTime);
//        if(!self->hasLoadedOnce){
            NSDictionary *element = @{
                    @"numberOfSteps" : numberOfSteps,
                    @"sleepTime" : [NSNumber numberWithInt:totalSleepTime]
            };
//            NSString *javascript = [NSString stringWithFormat:@"updateFitnessPermissions(true,'%@','%ld')",numberOfSteps, sleepTime];
            dispatch_async(dispatch_get_main_queue(), ^{
                self->hasLoadedOnce = true;
              callback(element);
            });
//        }
    });
}

-(void) canAccessHealthKit: (void(^)(BOOL))callback {
    double value = 1;
    NSDate *startDate = [NSDate date];
    NSDate *endDate = [NSDate date];
    
    HKUnit *unit = [HKUnit countUnit];
    HKQuantity *quantity = [HKQuantity quantityWithUnit:unit doubleValue:value];
    HKQuantityType *type = [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount];
    HKQuantitySample *sample = [HKQuantitySample quantitySampleWithType:type quantity:quantity startDate:startDate endDate:endDate];
    
    [[VisitRnSdkViewManager sharedManager] saveObject:sample withCompletion:^(BOOL success, NSError *error) {
            if (!success) {
                NSLog(@"An error occured saving the step count sample %@. The error was: %@.", sample, error);
                callback(NO);
            }else{
                [[VisitRnSdkViewManager sharedManager] deleteObject:sample withCompletion:^(BOOL success, NSError * _Nullable error) {
                    if(!success){
                        callback(NO);
                    }else{
                        callback(YES);
                    }
                }];
            }
        }];
}

-(void) fetchSleepPattern:(NSDate *) endDate frequency:(NSString*) frequency days:(NSInteger) days callback:(void(^)(NSArray*))callback{
    NSDate *startDate;
    NSDate *endDatePeriod;
    if([frequency isEqualToString:@"day"]){
        NSTimeInterval interval;
      NSLog(@"startDate and endDate in fetchSleepPattern before is, %@ %@",startDate,endDatePeriod);
        [self->calendar rangeOfUnit:NSCalendarUnitDay
                           startDate:&startDate
                            interval:&interval
                             forDate:endDate];
        endDatePeriod = [startDate dateByAddingTimeInterval:interval-1];
        startDate = [startDate dateByAddingTimeInterval:-3600*2];
          NSLog(@"startDate and endDate in fetchSleepPattern is, %@ %@",startDate,endDatePeriod);
    }else if ([frequency isEqualToString:@"week"]){
        NSTimeInterval interval;
        [self->calendar rangeOfUnit:NSCalendarUnitWeekOfYear
                           startDate:&startDate
                            interval:&interval
                             forDate:endDate];
        endDatePeriod = [startDate dateByAddingTimeInterval:interval-1];
    }else if([frequency isEqualToString:@"custom"]){
        endDatePeriod = endDate;
        startDate = [self->calendar dateByAddingUnit:NSCalendarUnitDay
                                                 value:-days
                                                toDate:endDatePeriod
                                               options:0];
//        NSLog(@"startDate and endDate in custom fetchSleepPattern is, %@, %@",startDate,endDatePeriod);
    }
//    NSLog(@"startDate and endDate in fetchSleepPattern is, %@ %@",startDate,endDatePeriod);
    NSPredicate *predicate = [HKQuery predicateForSamplesWithStartDate:startDate endDate:endDatePeriod options:HKQueryOptionStrictStartDate];
    [self fetchSleepCategorySamplesForPredicate:predicate
                                              limit:HKObjectQueryNoLimit
                                         completion:^(NSArray *results, NSError *error) {
                                             if(results){
//                                                 NSLog(@"fetchSleepCategorySamplesForPredicate result, %@",results);
                                                 callback(results);
                                                 return;
                                             } else {
//                                                 NSLog(@"error getting sleep samples: %@", error);
                                                 return;
                                             }
                                         }];
}

-(NSMutableArray*) getBlankSleepWeeks:(NSUInteger) currentCount date:(NSDate*) date{
    NSMutableArray *result = [[NSMutableArray alloc]init];
    NSInteger value = 1;
    NSDate *nextDayTime=date;
    NSNumber *nextDayTimeStamp;
    NSDateComponents *dateComponents;
    NSString* day;
    NSLog(@"day is, %@",day);
    int counter =(int) currentCount;
    while(counter<7){
        nextDayTime = [self->calendar dateByAddingUnit:NSCalendarUnitDay value:value toDate:nextDayTime options:NSCalendarMatchStrictly];
        nextDayTimeStamp = [NSNumber numberWithDouble: [@(floor([nextDayTime timeIntervalSince1970] * 1000)) longLongValue]];
        dateComponents = [self->calendar components: NSCalendarUnitWeekday fromDate: nextDayTime];
        day = self->calendar.shortWeekdaySymbols[dateComponents.weekday-1];
        NSDictionary *element = @{
                @"sleepTime" : @0,
                @"wakeupTime" : @0,
                @"day" : day,
                @"startTimestamp" : nextDayTimeStamp,
        };
        NSLog(@"element is %@",element);
        [result addObject:[NSMutableDictionary dictionaryWithDictionary:element]];
        counter++;
    }
    return result;
}

-(void) evaluateJavascript:(NSArray *) data type:(NSString *) type frequency:(NSString *) frequency activityTime:(NSString *) activityTime callback:(void(^)(NSArray*))callback{
    NSString* hoursInDay = @"[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24]";
    NSString* daysInWeek = @"[1,2,3,4,5,6,7]";
    NSString* daysInMonth = @"[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31]";
    NSString* samples;
    NSString *jsonArrayData;
    if([frequency isEqualToString:@"day"]){
        samples=hoursInDay;
    }else if ([frequency isEqualToString:@"week"]){
        samples=daysInWeek;
    }else if ([frequency isEqualToString:@"month"]){
        samples=daysInMonth;
    }
    if([type isEqualToString:@"steps"] || [type isEqualToString:@"calories"]){
        if([type isEqualToString:@"steps"]){
            jsonArrayData = [[data objectAtIndex:0] componentsJoinedByString:@","];
        }else{
            jsonArrayData = [[data objectAtIndex:1] componentsJoinedByString:@","];
        }
    }else{
         jsonArrayData = [data componentsJoinedByString:@","];
    }
    NSString *javascript = [NSString stringWithFormat:@"DetailedGraph.updateData(%@,[%@],'%@','%@','%@')", samples, jsonArrayData, type,frequency, activityTime];
    dispatch_async(dispatch_get_main_queue(), ^{
      callback(@[javascript]);
    });
}

-(void) renderGraphData:(NSString *) type frequency:(NSString *) frequency date:(NSDate *) date callback:(void(^)(NSArray*))callback{
    if([type isEqualToString:@"steps"] || [type isEqualToString:@"distance"]||[type isEqualToString:@"calories"]){
        dispatch_group_t loadDetailsGroup=dispatch_group_create();
        __block NSArray* stepsOrDistance = 0;
        __block NSString* totalActivityDuration = 0;
        for (int i = 0; i<2; i++) {
            dispatch_group_enter(loadDetailsGroup);
            if(i==0){
                [self getActivityTime:date frequency:frequency days:0 callback:^(NSMutableArray * result){
                    totalActivityDuration = [result objectAtIndex:0];
                    dispatch_group_leave(loadDetailsGroup);
                }];
            }else if(i==1){
                if([type isEqualToString:@"steps"] || [type isEqualToString:@"calories"]){
                    if([frequency isEqualToString:@"day"]){
                        [self fetchHourlySteps:date callback:^(NSArray * result) {
                            stepsOrDistance = result;
                            dispatch_group_leave(loadDetailsGroup);
                        }];
                    }else{
                        [self fetchSteps:frequency endDate: date days:0 callback:^(NSArray * result) {
                            stepsOrDistance = result;
                            dispatch_group_leave(loadDetailsGroup);
                        }];
                    }
                }else if ([type isEqualToString:@"distance"]){
                    if([frequency isEqualToString:@"day"]){
                        [self fetchHourlyDistanceWalkingRunning:date callback:^(NSArray * result) {
                            stepsOrDistance = result;
                            dispatch_group_leave(loadDetailsGroup);
                        }];
                    }else{
                        [self fetchDistanceWalkingRunning:frequency endDate: date days:0 callback:^(NSArray * result) {
                            stepsOrDistance = result;
                            dispatch_group_leave(loadDetailsGroup);
                        }];
                    }
                }
            }
        }
        dispatch_group_notify(loadDetailsGroup,dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0),^{
          [self evaluateJavascript:stepsOrDistance type:type frequency:frequency activityTime:totalActivityDuration callback:^(NSArray * data) {
            callback(data);
          }];
        });
    }else if([type isEqualToString:@"sleep"]){
            if([frequency isEqualToString:@"day"]){
                [self fetchSleepPattern:date frequency:frequency days:0 callback:^(NSArray * results) {
                NSNumber* sleepTime = 0;
                NSNumber* wakeTime = 0;
                int count = 0;
                for (NSDictionary *object in results) {
                    NSString* sleepValue = [object valueForKey:@"value"];
                    if([sleepValue isEqualToString:@"INBED"]||[sleepValue isEqualToString:@"ASLEEP"]){
                        if(count==0){
                            sleepTime =
                            [NSNumber numberWithDouble: [@(floor([[object valueForKey:@"startDate"] timeIntervalSince1970] * 1000)) longLongValue]];
                            
                        }
                        wakeTime =
                        [NSNumber numberWithDouble: [@(floor([[object valueForKey:@"endDate"] timeIntervalSince1970] * 1000)) longLongValue]];
                        count++;
                    }
                }
                NSLog(@"sleepTime and wakeTime data, %@ %@",sleepTime, wakeTime);
                    
                if(sleepTime && wakeTime){
                    NSString *javascript = [NSString stringWithFormat:@"DetailedGraph.updateDailySleep(%@,%@)", sleepTime,wakeTime];
                  callback(@[javascript]);
                }else{
                    NSString *javascript = [NSString stringWithFormat:@"DetailedGraph.updateDailySleep(0,0)"];
                  callback(@[javascript]);
                }
            } ];
            }else{
                [self fetchSleepPattern:date frequency:frequency days:0 callback:^(NSArray * results) {
                    NSMutableArray *data = [[NSMutableArray alloc]init];
                    NSLog(@"weekly sleep results, %@", results);
                    if([results count]){
                        for (NSDictionary* item in results) {
                            NSString* sleepValue = [item valueForKey:@"value"];
                            if([sleepValue isEqualToString:@"INBED"]||[sleepValue isEqualToString:@"ASLEEP"]){
                                NSDate* startDate = [item valueForKey:@"startDate"];
                                NSDate* endDate = [item valueForKey:@"endDate"];
                                NSTimeInterval interval;
                                NSNumber* sleepTime =
                                [NSNumber numberWithDouble: [@(floor([startDate timeIntervalSince1970] * 1000)) longLongValue]];
                                NSNumber* wakeupTime =
                                [NSNumber numberWithDouble: [@(floor([endDate timeIntervalSince1970] * 1000)) longLongValue]];
                                NSLog(@"startDate before calendar function ,%@",startDate);
                                [self->calendar rangeOfUnit:NSCalendarUnitDay
                                                   startDate:&startDate
                                                    interval:&interval
                                                     forDate:endDate];
                                NSLog(@"startDate after calendar function ,%@",startDate);
                                NSNumber* startTimestamp =
                                [NSNumber numberWithDouble: [@(floor([startDate timeIntervalSince1970] * 1000)) longLongValue]];
                                NSDateComponents * dateComponents = [self->calendar components: NSCalendarUnitDay | NSCalendarUnitWeekday fromDate: endDate];
                                NSString* day =self->calendar.shortWeekdaySymbols[dateComponents.weekday - 1];
                                NSLog(@"Day name: %@", day);
                                NSDictionary *element = @{
                                        @"sleepTime" : sleepTime,
                                        @"wakeupTime" : wakeupTime,
                                        @"day" : day,
                                        @"startTimestamp" : startTimestamp,
                                };
                                NSMutableDictionary *elem = [NSMutableDictionary dictionaryWithDictionary:element];

                                NSLog(@"data is, ====>> %@",data);
                                if([data count]>0){
                                    for (int i=0;i<[data count]; i++) {
                                        NSMutableDictionary* item = [data objectAtIndex:i];
                                        NSString* itemDay = [item objectForKey:@"day"];
                                        NSString* itemSleepTime = [item objectForKey:@"sleepTime"];
                                        if([itemDay isEqualToString:day]){
                                            [elem setValue:itemSleepTime forKey:@"sleepTime"];
                                            [data removeObjectAtIndex:i];
                                            NSLog(@"removed day is, ====>> %@",itemDay);
                                        }
                                    }
                                    [data addObject:elem];
                                }else{
                                    [data addObject:elem];
                                }
                            }
                        }
                    }
                    if([data count]<7 && [data count]>0){
                        NSMutableDictionary* item = [data objectAtIndex:[data count]-1];
                        NSNumber* startTimeStamp = [item objectForKey:@"startTimestamp"];
                        NSTimeInterval unixTimeStamp = [startTimeStamp doubleValue] / 1000.0;
                        NSMutableArray* newData = [self getBlankSleepWeeks:[data count] date:[NSDate dateWithTimeIntervalSince1970:unixTimeStamp]];
                        [data addObjectsFromArray:newData];
                    }
                    NSLog(@"data is, %@",data);
                    NSData* jsonArray = [NSJSONSerialization dataWithJSONObject:data options:NSJSONWritingPrettyPrinted error:nil ];
                    NSString *jsonString = [[NSString alloc] initWithData:jsonArray encoding:NSUTF8StringEncoding];
                    NSString *javascript = [NSString stringWithFormat:@"DetailedGraph.updateSleepData(JSON.stringify(%@))",  jsonString];
                  callback(@[javascript]);
                }];
           }
        
    }
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

-(void) preprocessEmbellishRequest:(NSArray*) steps calories:(NSArray*) calories distance:(NSArray*) distance date:(NSDate*) date callback:(void(^)(NSArray*))callback{
    NSLog(@"steps=%@, calories=%@, distance=%@, date=%@",steps, calories, distance, date);
                NSMutableArray* embellishData = [NSMutableArray new];
                int count=0;
                for (NSNumber* step in steps) {
                    NSDictionary *dict = @{
                            @"st" : step,
                            @"c" : [calories objectAtIndex:count],
                            @"d" : [distance objectAtIndex:count],
                            @"h" : [NSNumber numberWithInt:count],
                            @"s" : @"",
                    };
                    count++;
                    [embellishData addObject:dict];
                }
                NSLog(@"the httpBody is, %lu",(unsigned long)[embellishData count]);
                NSTimeInterval unixDate = [date timeIntervalSince1970]*1000;
                NSInteger finalDate = unixDate;
                NSDictionary *httpBody = @{
                        @"data" : embellishData,
                        @"dt" : [NSNumber numberWithLong:finalDate],
                };
    callback(@[httpBody]);
}

-(void)callSyncData:(NSInteger) days dates:(NSMutableArray*)dates callback:(void(^)(NSArray*))callback{
    dispatch_group_t syncDataGroup=dispatch_group_create();
    __block NSArray* steps;
    __block NSArray* calorie;
    __block NSArray* distanceData;
    __block NSArray* activityData;
    __block NSArray* sleep;
//    NSLog(@"days are %ld",(long)days);
    for (int i = 0; i<4; i++) {
        dispatch_group_enter(syncDataGroup);
        if(i==0){
            [self fetchSteps:@"custom" endDate:[NSDate date] days:days callback:^(NSArray * data) {
                NSLog(@"steps data for custom range is, %@ length %lu",[data objectAtIndex:0],[[data objectAtIndex:0] count]);
                steps = [data objectAtIndex:0];
                calorie = [data objectAtIndex:1];
                dispatch_group_leave(syncDataGroup);
            }];
        }else if(i==1){
            [self fetchDistanceWalkingRunning:@"custom" endDate:[NSDate date] days:days callback:^(NSArray * distance) {
                NSLog(@"distance data for custom range is, %@ length %lu",distance, [distance count]);
                distanceData=distance;
                dispatch_group_leave(syncDataGroup);
            }];
        }else if(i==2){
            [self getActivityTime:[NSDate date] frequency:@"custom" days:days callback:^(NSMutableArray * activity) {
                NSMutableArray* arr = [activity objectAtIndex:1];
                NSLog(@"activity data for custom range is, %@ length %lu",activity, [arr count]);
                activityData = arr;
                dispatch_group_leave(syncDataGroup);
            }];
        }else if(i==3){
            [self fetchSleepPattern:[NSDate date] frequency:@"custom" days:days callback:^(NSArray * sleepData) {
                NSMutableArray *data = [[NSMutableArray alloc]init];
                for (NSDictionary* item in sleepData) {
                    NSString* sleepValue = [item valueForKey:@"value"];
                    if([sleepValue isEqualToString:@"INBED"]||[sleepValue isEqualToString:@"ASLEEP"]){
                        NSDate* startDate = [item valueForKey:@"startDate"];
                        NSDate* endDate = [item valueForKey:@"endDate"];
                        NSTimeInterval interval;
                        NSNumber* sleepTime =
                        [NSNumber numberWithDouble: [@(floor([startDate timeIntervalSince1970] * 1000)) longLongValue]];
                        NSNumber* wakeupTime =
                        [NSNumber numberWithDouble: [@(floor([endDate timeIntervalSince1970] * 1000)) longLongValue]];
//                        NSLog(@"startDate before calendar function ,%@",startDate);
                        [self->calendar rangeOfUnit:NSCalendarUnitDay
                                           startDate:&startDate
                                            interval:&interval
                                             forDate:endDate];
//                        NSLog(@"startDate after calendar function ,%@",startDate);
                        NSNumber* startTimestamp =
                        [NSNumber numberWithDouble: [@(floor([startDate timeIntervalSince1970] * 1000)) longLongValue]];
                        NSDictionary *element = @{
                                @"sleepTime" : sleepTime,
                                @"wakeupTime" : wakeupTime,
                                @"endDate" : endDate,
                                @"startTimestamp" : startTimestamp,
                        };
                        NSMutableDictionary *elem = [NSMutableDictionary dictionaryWithDictionary:element];

                        if([data count]>0){
                            for (int i=0;i<[data count]; i++) {
                                NSMutableDictionary* item = [data objectAtIndex:i];
                                NSDate* itemEndDate = [item objectForKey:@"endDate"];
                                NSString* itemSleepTime = [item objectForKey:@"sleepTime"];
                                if([[NSCalendar currentCalendar] isDate:itemEndDate inSameDayAsDate:endDate]){
                                    [elem setValue:itemSleepTime forKey:@"sleepTime"];
                                    [data removeObjectAtIndex:i];
//                                    NSLog(@"removed date is, ====>> %@",endDate);
                                }
                            }
                            [data addObject:elem];
                        }else{
                            [data addObject:elem];
                        }
                    }
                }
                sleep = data;
                NSLog(@"fetchSleepPattern data is, ====>> %lu %@",(unsigned long)[data count],data);
                dispatch_group_leave(syncDataGroup);
            }];
        }
    }
//    NSLog(@"callSyncData steps=%@, calories=%@, distance=%@, activity=%@, sleep=%@",steps, calorie, distanceData, activityData, sleep);

    dispatch_group_notify(syncDataGroup,dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0),^{
if([steps count]>0 && [distanceData count]>0 && [activityData count]>0 && [sleep count]>0)
       {
           NSMutableArray* dailySyncData =[NSMutableArray new];
        int count = 0;
        for (NSDate* date in dates) {
            NSDictionary* dict = @{
                @"steps":[steps objectAtIndex:count],
                @"calories":[calorie objectAtIndex:count],
                @"distance":[distanceData objectAtIndex:count],
                @"date":date
            };
            [dailySyncData addObject:[NSMutableDictionary dictionaryWithDictionary:dict]];
            count++;
        }
        for (NSMutableDictionary* dict in dailySyncData) {
            for(NSMutableDictionary* sleepData in sleep){
                if([[NSCalendar currentCalendar] isDate:[sleepData objectForKey:@"endDate"] inSameDayAsDate:[dict objectForKey:@"date"]]){
                    NSString* sleepTime = [sleepData objectForKey:@"sleepTime"];
                    NSString* wakeupTime = [sleepData objectForKey:@"wakeupTime"];
                    [dict setObject:[NSString stringWithFormat:@"%@-%@",sleepTime,wakeupTime] forKey:@"sleep"];
                }
            }
            
            for(NSMutableDictionary* activity in activityData){
                if([[NSCalendar currentCalendar] isDate:[activity objectForKey:@"date"] inSameDayAsDate:[dict objectForKey:@"date"]]){
                    NSString* activityValue = [activity objectForKey:@"value"];
                    [dict setObject:activityValue forKey:@"activity"];
                }
            }
            
            [dict setObject: [NSNumber numberWithDouble: [@(floor([[dict objectForKey:@"date"] timeIntervalSince1970] * 1000)) longLongValue]]
              forKey:@"date"];
        }
        NSDictionary *httpBody = @{
                @"fitnessData" : dailySyncData,
        };
         callback(@[httpBody]);

      } else {
          // Callback must always fire so callers can proceed even when a
          // sub-fetch (steps/distance/activity/sleep) returned no data.
          callback(@[]);
      }
    });
}

-(void)callEmbellishApi:(NSMutableArray*) dates callback:(void(^)(NSArray*))callback{
    for (NSDate* date in dates) {
        dispatch_group_t loadDetailsGroup=dispatch_group_create();
        __block NSArray* steps;
        __block NSArray* calories;
        __block NSArray* distance;
        for(int i = 0; i<2;i++){
            dispatch_group_enter(loadDetailsGroup);
            if(i==0){
                [self fetchHourlySteps:date callback:^(NSArray * data) {
                    steps = [data objectAtIndex:0];
                    calories = [data objectAtIndex:1];
                    dispatch_group_leave(loadDetailsGroup);
                }];
            }else if(i==1){
                [self fetchHourlyDistanceWalkingRunning:date callback:^(NSArray * dist) {
                    distance = dist;
                    dispatch_group_leave(loadDetailsGroup);
                }];
            }
        }
        dispatch_group_notify(loadDetailsGroup,dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0),^{
            if([steps count]>0 && [calories count] > 0 && [distance count]>0){
              [self preprocessEmbellishRequest:steps calories:calories distance:distance date:date callback:^(NSArray * data) {
                NSLog(@"preprocessEmbellishRequest data, %@",data);
                callback(data);
              }];
            }
        });
    }
}


RCT_EXPORT_METHOD(connectToAppleHealth:(RCTResponseSenderBlock)callback)
{
    if (![HKHealthStore isHealthDataAvailable]) {
        callback(@[@{@"authStatus": @"UNAVAILABLE"}]);
        return;
    }

    HKObjectType *stepType =
        [HKObjectType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount];
    HKAuthorizationStatus preStatus =
        [[VisitRnSdkViewManager sharedManager] authorizationStatusForType:stepType];

    // Match Android: report DENIED to JS and let the caller decide whether to
    // prompt the user (via Alert) to open the Health app. Do NOT open Health
    // ourselves — the JS side calls openAppleHealthApp on user confirmation.
    if (preStatus == HKAuthorizationStatusSharingDenied) {
        callback(@[@{@"authStatus": @"DENIED"}]);
        return;
    }

    NSSet *writeTypes =
        [NSSet setWithObject:[HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount]];
    NSSet *readTypes = [NSSet setWithArray:@[
        [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount],
        [HKObjectType categoryTypeForIdentifier:HKCategoryTypeIdentifierSleepAnalysis],
        [HKObjectType characteristicTypeForIdentifier:HKCharacteristicTypeIdentifierBiologicalSex],
        [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierDistanceWalkingRunning],
        [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierActiveEnergyBurned],
        [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierBasalEnergyBurned],
    ]];

    __weak typeof(self) weakSelf = self;
    [[VisitRnSdkViewManager sharedManager]
        requestAuthorizationToShareTypes:writeTypes
                               readTypes:readTypes
                              completion:^(BOOL success, NSError *error) {
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!strongSelf) { return; }

        dispatch_async(dispatch_get_main_queue(), ^{
            HKAuthorizationStatus postStatus =
                [[VisitRnSdkViewManager sharedManager] authorizationStatusForType:stepType];

            if (postStatus == HKAuthorizationStatusSharingDenied) {
                callback(@[@{@"authStatus": @"DENIED"}]);
                return;
            }

            [strongSelf onHealthKitPermissionGranted:^(NSDictionary *data) {
                NSMutableDictionary *out =
                    [NSMutableDictionary dictionaryWithDictionary:data ?: @{}];
                out[@"authStatus"] = @"GRANTED";
                callback(@[out]);
            }];
        });
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

// Fans out to fetchHourlySteps + fetchHourlyDistanceWalkingRunning per date,
// then preprocessEmbellishRequest, collecting all httpBody dicts. Always fires
// completion exactly once, even when no batches are produced.
- (void)collectEmbellishBatchesForDates:(NSArray<NSDate *> *)dates
                             completion:(void (^)(NSArray<NSDictionary *> *batches))completion
{
    if (dates.count == 0) {
        completion(@[]);
        return;
    }

    dispatch_group_t outer = dispatch_group_create();
    NSMutableArray<NSDictionary *> *batches = [NSMutableArray new];
    __weak typeof(self) weakSelf = self;

    for (NSDate *date in dates) {
        dispatch_group_enter(outer);
        __block NSArray *steps = @[];
        __block NSArray *calories = @[];
        __block NSArray *distance = @[];
        dispatch_group_t inner = dispatch_group_create();

        dispatch_group_enter(inner);
        [weakSelf fetchHourlySteps:date callback:^(NSArray *data) {
            if (data.count >= 2) {
                steps = data[0] ?: @[];
                calories = data[1] ?: @[];
            }
            dispatch_group_leave(inner);
        }];

        dispatch_group_enter(inner);
        [weakSelf fetchHourlyDistanceWalkingRunning:date callback:^(NSArray *dist) {
            distance = dist ?: @[];
            dispatch_group_leave(inner);
        }];

        dispatch_group_notify(inner,
                              dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
            __strong typeof(weakSelf) strongSelf = weakSelf;
            if (steps.count > 0 && calories.count > 0 && distance.count > 0 && strongSelf) {
                [strongSelf preprocessEmbellishRequest:steps
                                              calories:calories
                                              distance:distance
                                                  date:date
                                              callback:^(NSArray *data) {
                    if (data.count > 0 && [data[0] isKindOfClass:[NSDictionary class]]) {
                        @synchronized (batches) {
                            [batches addObject:data[0]];
                        }
                    }
                    dispatch_group_leave(outer);
                }];
            } else {
                dispatch_group_leave(outer);
            }
        });
    }

    dispatch_group_notify(outer, dispatch_get_main_queue(), ^{
        completion([batches copy]);
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


RCT_EXPORT_METHOD(fetchHourlyData:(NSInteger)gfHourlyLastSync resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject){
    NSLog(@"gfHourlyLastSync in fetchHourlyData is %ld",(long)gfHourlyLastSync);
    NSDate* hourlyDataSyncTime = [NSDate dateWithTimeIntervalSince1970:gfHourlyLastSync/1000];
    [self canAccessHealthKit:^(BOOL value){
        if(value){
            dispatch_group_t loadDetailsGroup=dispatch_group_create();
            __block NSArray* steps;
            __block NSArray* calories;
            __block NSArray* distance;
            for(int i = 0; i<2;i++){
                dispatch_group_enter(loadDetailsGroup);
                if(i==0){
                    [self fetchHourlySteps:hourlyDataSyncTime callback:^(NSArray * data) {
                        steps = [data objectAtIndex:0];
                        calories = [data objectAtIndex:1];
                        dispatch_group_leave(loadDetailsGroup);
                    }];
                }else if(i==1){
                    [self fetchHourlyDistanceWalkingRunning:hourlyDataSyncTime callback:^(NSArray * dist) {
                        distance = dist;
                        dispatch_group_leave(loadDetailsGroup);
                    }];
                }
            }
            dispatch_group_notify(loadDetailsGroup,dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0),^{
                if([steps count]>0 && [calories count] > 0 && [distance count]>0){
                  [self preprocessEmbellishRequest:steps calories:calories distance:distance date:hourlyDataSyncTime callback:^(NSArray * data) {
                    NSLog(@"fetchHourlyData data, %@",data);
                      resolve(data);
                  }];
                }
            });
        }else{
            NSError* error;
            reject(@"error", @"Error fetching hourly data", error);
        }
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

    HKObjectType *stepCountType = [HKObjectType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount];
    HKAuthorizationStatus status = [[VisitRnSdkViewManager sharedManager] authorizationStatusForType:stepCountType];

    if (status == HKAuthorizationStatusSharingAuthorized) {
        NSInteger days = 1; // Example: Fetch data for the last 7 days
        dispatch_group_t syncDataGroup = dispatch_group_create();
        __block NSArray *stepsData;

        // Enter dispatch group before fetching data
        dispatch_group_enter(syncDataGroup);
        [self fetchSteps:@"custom"
                  endDate:[NSDate date]
                     days:days
                 callback:^(NSArray *data) {
            NSLog(@"Fetched steps data: %@", data);
            stepsData = [data objectAtIndex:0];
            dispatch_group_leave(syncDataGroup);
        }];

        // Wait for the fetch to complete
        dispatch_group_notify(syncDataGroup, dispatch_get_main_queue(), ^{
            if (stepsData) {
                NSDictionary *result = @{
                    @"steps": stepsData,
                };
                resolve(result);
            } else {
                NSError *error = [NSError errorWithDomain:@"HealthKit"
                                                     code:500
                                                 userInfo:@{NSLocalizedDescriptionKey: @"Failed to fetch step data"}];
                reject(@"fetch_error", @"Error fetching step data", error);
            }
        });
    } else {
        resolve(@(NO)); // HealthKit access not granted
    }
}

RCT_REMAP_METHOD(requestHealthKitAuthorization,
                 requestHealthKitAuthorizationWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    if (![HKHealthStore isHealthDataAvailable]) {
        reject(@"HEALTH_DATA_UNAVAILABLE", @"HealthKit is not available on this device", nil);
        return;
    }

    NSSet *writeTypes =
        [NSSet setWithObject:[HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount]];
    NSMutableSet *readTypes = [NSMutableSet setWithArray:@[
        [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount],
        [HKObjectType categoryTypeForIdentifier:HKCategoryTypeIdentifierSleepAnalysis],
        [HKObjectType characteristicTypeForIdentifier:HKCharacteristicTypeIdentifierBiologicalSex],
        [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierDistanceWalkingRunning],
        [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierActiveEnergyBurned],
        [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierBasalEnergyBurned],
    ]];

    [[VisitRnSdkViewManager sharedManager]
        requestAuthorizationToShareTypes:writeTypes
                               readTypes:readTypes
                              completion:^(BOOL success, NSError *error) {
        dispatch_async(dispatch_get_main_queue(), ^{
            if (!success) {
                reject(@"AUTHORIZATION_FAILED",
                       error.localizedDescription ?: @"HealthKit authorization failed",
                       error);
                return;
            }

            HKObjectType *stepType =
                [HKObjectType quantityTypeForIdentifier:HKQuantityTypeIdentifierStepCount];
            HKAuthorizationStatus status =
                [[VisitRnSdkViewManager sharedManager] authorizationStatusForType:stepType];

            NSString *statusString;
            switch (status) {
                case HKAuthorizationStatusSharingAuthorized:
                    statusString = @"GRANTED";
                    break;
                case HKAuthorizationStatusSharingDenied:
                    statusString = @"DENIED";
                    break;
                case HKAuthorizationStatusNotDetermined:
                default:
                    statusString = @"NOT_DETERMINED";
                    break;
            }
            resolve(statusString);
        });
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
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    if (![HKHealthStore isHealthDataAvailable]) {
        reject(@"HEALTH_DATA_UNAVAILABLE", @"HealthKit is not available on this device", nil);
        return;
    }

    // Sum sleep sessions whose end date falls on today. Look 36 hours back so
    // overnight sessions (e.g., 11pm → 7am) that started yesterday are still
    // considered, matching Apple Health's "sleep on wake day" convention.
    NSCalendar *cal = [NSCalendar currentCalendar];
    NSDate *now = [NSDate date];
    NSDate *startOfDay = [cal startOfDayForDate:now];
    NSDate *lookbackStart = [now dateByAddingTimeInterval:-36 * 60 * 60];

    NSPredicate *predicate = [HKQuery predicateForSamplesWithStartDate:lookbackStart
                                                               endDate:now
                                                               options:HKQueryOptionNone];
    HKCategoryType *sleepType = [HKObjectType categoryTypeForIdentifier:HKCategoryTypeIdentifierSleepAnalysis];
    NSSortDescriptor *sort = [[NSSortDescriptor alloc] initWithKey:HKSampleSortIdentifierEndDate ascending:YES];

    HKSampleQuery *query = [[HKSampleQuery alloc]
        initWithSampleType:sleepType
                 predicate:predicate
                     limit:HKObjectQueryNoLimit
           sortDescriptors:@[sort]
            resultsHandler:^(HKSampleQuery *q, NSArray<__kindof HKSample *> *results, NSError *error) {
        if (error) {
            reject(@"SLEEP_QUERY_FAILED", error.localizedDescription ?: @"Failed to query sleep data", error);
            return;
        }

        NSTimeInterval totalSleepSeconds = 0;
        for (HKCategorySample *sample in results) {
            if (![self isAsleepSleepAnalysisValue:sample.value]) {
                continue;
            }
            // Only count samples that ended today.
            if ([sample.endDate compare:startOfDay] == NSOrderedAscending) {
                continue;
            }
            totalSleepSeconds += [sample.endDate timeIntervalSinceDate:sample.startDate];
        }
        NSInteger minutes = (NSInteger)(totalSleepSeconds / 60.0);
        resolve(@(minutes));
    }];

    [[VisitRnSdkViewManager sharedManager] executeQuery:query];
}

- (BOOL)isAsleepSleepAnalysisValue:(NSInteger)value
{
    if (value == HKCategoryValueSleepAnalysisInBed) {
        return YES;
    }
    if (@available(iOS 16.0, *)) {
        if (value == HKCategoryValueSleepAnalysisAsleepUnspecified ||
            value == HKCategoryValueSleepAnalysisAsleepCore ||
            value == HKCategoryValueSleepAnalysisAsleepDeep ||
            value == HKCategoryValueSleepAnalysisAsleepREM) {
            return YES;
        }
    }
    // HKCategoryValueSleepAnalysisAsleep is deprecated on iOS 16+ but still reported by older samples.
    if (value == HKCategoryValueSleepAnalysisAsleep) {
        return YES;
    }
    return NO;
}

RCT_REMAP_METHOD(getTodayCalorieCount,
                 getTodayCalorieCountWithResolver:(RCTPromiseResolveBlock)resolve
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

    HKQuantityType *activeType = [HKQuantityType quantityTypeForIdentifier:HKQuantityTypeIdentifierActiveEnergyBurned];
    HKUnit *kcal = [HKUnit kilocalorieUnit];

    HKStatisticsCollectionQuery *query = [[HKStatisticsCollectionQuery alloc]
        initWithQuantityType:activeType
     quantitySamplePredicate:nil
                     options:HKStatisticsOptionCumulativeSum
                  anchorDate:startOfDay
          intervalComponents:dayInterval];
    query.initialResultsHandler = ^(HKStatisticsCollectionQuery *q,
                                    HKStatisticsCollection *collection,
                                    NSError *error) {
        if (error) {
            reject(@"CALORIE_QUERY_FAILED",
                   error.localizedDescription ?: @"Failed to query calorie data",
                   error);
            return;
        }
        HKStatistics *todayStats = [collection statisticsForDate:startOfDay];
        HKQuantity *sum = todayStats.sumQuantity;
        NSInteger activeKcal = sum ? (NSInteger)[sum doubleValueForUnit:kcal] : 0;
        resolve(@(activeKcal));
    };
    [[VisitRnSdkViewManager sharedManager] executeQuery:query];
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
