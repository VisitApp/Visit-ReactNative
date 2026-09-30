import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

import VisitRnSdkView from 'react-native-visit-rn-sdk';

import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  Platform,
  NativeModules,
  Alert,
} from 'react-native';

import {
  NavigationContainer,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

import {EventRegister} from 'react-native-event-listeners';

import {createNativeStackNavigator} from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#6a51ae',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#e8e4f3',
          },
        }}>
        <Stack.Screen
          name="Home"
          component={Home}
          options={{
            title: 'Visit SDK Demo App',
            headerStyle: {
              backgroundColor: '#6a51ae',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        />

        <Stack.Screen name="VisitPage" component={VisitPage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function Home() {
  const navigation = useNavigation();

  const [text, setText] = useState(
    'https://mchi.getvisitapp.net/sso?userParams=DovHeDheih2iR_Kh_kWA2xXs5DJ3I3fW2ezi-K71IR9qYQYYSHXfDsIwenvecBrYTIA0Wlp5luyiGdFBIUQ9AOJZB23D2cG5WE-qoqJRKG58bYjXaPctQ_Qq7b8uAzwaiJRyHLVPua7ByW7-Sz-hpYSGELV7R8G7IEPBo_bMj4c_kqicKb6agLM9lKUqRIOEIeW9IQNwi2kaSaByA1mb8RCyXlxzf5cEBI88xH6OMSU&clientId=mchi-ds-we-09',
  );

  const [healthTrackerConnectionStatus, setHealthTrackerConnectionStatus] =
    useState(null);
  const [isAndroidSDKInitialized, setIsAndroidSDKInitialized] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [calorieCount, setCalorieCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncMessage, setSyncMessage] = useState('');

  const {VisitRnSdkViewManager} = NativeModules;
  const automaticSyncAttemptedRef = useRef(false);
  const syncFlowInFlightRef = useRef(false);

  const syncStatusStyle = useMemo(() => {
    if (syncStatus === 'success') {
      return styles.syncSuccessText;
    }

    if (syncStatus === 'error') {
      return styles.syncErrorText;
    }

    return styles.syncProgressText;
  }, [syncStatus]);

  const fetchTodayHealthMetrics = useCallback(async () => {
    const nativeMetricsModule =
      Platform.OS === 'android'
        ? NativeModules.VisitFitnessModule
        : VisitRnSdkViewManager;

    if (!nativeMetricsModule) {
      return false;
    }

    const [stepsResult, sleepResult, caloriesResult] = await Promise.allSettled(
      [
        nativeMetricsModule.getTodayStepCount(),
        nativeMetricsModule.getTodaySleepMinutes(),
        nativeMetricsModule.getTodayCalorieCount(),
      ],
    );

    if (stepsResult.status === 'fulfilled') {
      console.log('fetchTodayStepCount: ' + stepsResult.value);
      setStepCount(Number(stepsResult.value) || 0);
    } else {
      console.error(stepsResult.reason);
    }

    if (sleepResult.status === 'fulfilled') {
      console.log('fetchTodaySleepMinutes: ' + sleepResult.value);
      setSleepMinutes(Number(sleepResult.value) || 0);
    } else {
      console.error(sleepResult.reason);
    }

    if (caloriesResult.status === 'fulfilled') {
      console.log('fetchTodayCalorieCount: ' + caloriesResult.value);
      setCalorieCount(Number(caloriesResult.value) || 0);
    } else {
      console.error(caloriesResult.reason);
    }

    return stepsResult.status === 'fulfilled';
  }, [VisitRnSdkViewManager]);

  const performStepSync = useCallback(async () => {
    setSyncStatus('syncing');
    setSyncMessage('Syncing in progress...');

    try {
      const nativeSyncModule =
        Platform.OS === 'android'
          ? NativeModules.VisitFitnessModule
          : VisitRnSdkViewManager;

      if (!nativeSyncModule?.triggerManualSync) {
        throw new Error('Visit health sync module is unavailable');
      }

      const syncResult = await nativeSyncModule.triggerManualSync();

      console.log('triggerManualSync resolved:', syncResult);
      setSyncStatus('success');
      setSyncMessage('Syncing has been done successfully');
      return true;
    } catch (e) {
      console.error('triggerManualSync failed:', e?.code, e?.message);
      setSyncStatus('error');
      setSyncMessage(e?.message || 'Syncing failed');
      return false;
    }
  }, [VisitRnSdkViewManager]);

  const initiateStepSync = useCallback(async () => {
    if (syncFlowInFlightRef.current) {
      return false;
    }

    syncFlowInFlightRef.current = true;

    try {
      return await performStepSync();
    } finally {
      syncFlowInFlightRef.current = false;
    }
  }, [performStepSync]);

  const runHealthStatusFlow = useCallback(
    async shouldTriggerAutomaticSync => {
      let ownsAutomaticSyncLock = false;

      if (shouldTriggerAutomaticSync) {
        if (syncFlowInFlightRef.current) {
          return;
        }

        syncFlowInFlightRef.current = true;
        ownsAutomaticSyncLock = true;
        setSyncStatus('preparing');
        setSyncMessage("Checking permissions and today's steps...");
      }

      try {
        const nativeHealthModule =
          Platform.OS === 'android'
            ? NativeModules.VisitFitnessModule
            : VisitRnSdkViewManager;

        if (!nativeHealthModule) {
          throw new Error('Visit health module is unavailable');
        }

        const status =
          Platform.OS === 'android'
            ? await nativeHealthModule.getHealthConnectStatus()
            : await nativeHealthModule.getHealthKitConnectStatus();

        console.log(
          (Platform.OS === 'android'
            ? 'getHealthConnectStatus'
            : 'getHealthKitConnectStatus') +
            ': ' +
            status,
        );

        setHealthTrackerConnectionStatus(status);

        if (status !== 'CONNECTED') {
          if (shouldTriggerAutomaticSync) {
            setSyncStatus('idle');
            setSyncMessage('');
          }
          return;
        }

        const didFetchTodaySteps = await fetchTodayHealthMetrics();

        if (!shouldTriggerAutomaticSync) {
          return;
        }

        if (!didFetchTodaySteps) {
          setSyncStatus('error');
          setSyncMessage(
            "Today's step count could not be fetched. Sync was not started.",
          );
          return;
        }

        await performStepSync();
      } catch (e) {
        console.error('Health status flow failed:', e);

        const statusErrorMessage =
          Platform.OS === 'android'
            ? 'Error fetching health connect status'
            : 'Error fetching health kit status';

        setHealthTrackerConnectionStatus(statusErrorMessage);

        if (shouldTriggerAutomaticSync) {
          setSyncStatus('error');
          setSyncMessage(e?.message || statusErrorMessage);
        }
      } finally {
        if (ownsAutomaticSyncLock) {
          syncFlowInFlightRef.current = false;
        }
      }
    },
    [VisitRnSdkViewManager, fetchTodayHealthMetrics, performStepSync],
  );

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android' && !isAndroidSDKInitialized) {
        return;
      }

      const shouldTriggerAutomaticSync = !automaticSyncAttemptedRef.current;
      automaticSyncAttemptedRef.current = true;
      runHealthStatusFlow(shouldTriggerAutomaticSync);
    }, [isAndroidSDKInitialized, runHealthStatusFlow]),
  );

  useEffect(() => {
    if (Platform.OS === 'android') {
      NativeModules.VisitFitnessModule.initiateSDK(true);
      setIsAndroidSDKInitialized(true);
    }
  }, []);

  useEffect(() => {
    const unauthorizedListener = EventRegister.addEventListener(
      'unauthorized-wellness-access',
      () => {
        Alert.alert('unauthorized-wellness-access');
      },
    );

    const visitEventListener = EventRegister.addEventListener(
      'visit-event',
      data => {
        console.log(
          'visit-event: message:' +
            data.message +
            ' errorMessage:' +
            data.errorMessage,
        );

        if (data.message === 'OPEN_FACE_SCAN_FLOW') {
          Alert.alert('Navigate to Face Scan Feature');
        }
      },
    );

    return () => {
      EventRegister.removeEventListener(unauthorizedListener);
      EventRegister.removeEventListener(visitEventListener);
    };
  }, []);

  return (
    <View style={{flex: 1}}>
      <View style={{padding: 16}}>
        <TextInput
          style={styles.input}
          multiline
          numberOfLines={4} // Adjust number of visible lines
          placeholder="Enter SSO URL"
          value={text}
          onChangeText={setText}
          cursorColor="black"
        />
      </View>

      <View style={{paddingHorizontal: 20}}>
        <Button
          title="Go to next page"
          color="#7e55fa"
          onPress={() => {
            navigation.navigate('VisitPage', {
              ssoUrl: text,
            });
          }}
        />

        <Text style={styles.text}>
          {Platform.OS === 'ios' ? 'Running on iOS' : 'Running on Android'}
        </Text>

        <Text style={styles.text}>
          Health Connect Status: {healthTrackerConnectionStatus}
        </Text>

        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Steps</Text>
            <Text style={styles.metricValue}>{stepCount}</Text>
            <Text style={styles.metricUnit}>steps</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Sleep</Text>
            <Text style={styles.metricValue}>{sleepMinutes}</Text>
            <Text style={styles.metricUnit}>min</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Calories</Text>
            <Text style={styles.metricValue}>{calorieCount}</Text>
            <Text style={styles.metricUnit}>kcal</Text>
          </View>
        </View>

        <Button
          title={
            syncStatus === 'preparing'
              ? 'Preparing Sync...'
              : syncStatus === 'syncing'
              ? 'Syncing...'
              : 'Start Step Sync'
          }
          color="#7e55fa"
          disabled={
            syncStatus === 'preparing' ||
            syncStatus === 'syncing' ||
            healthTrackerConnectionStatus !== 'CONNECTED'
          }
          onPress={() => {
            if (healthTrackerConnectionStatus === 'CONNECTED') {
              initiateStepSync();
            }
          }}
        />

        {syncStatus !== 'idle' ? (
          <Text style={[styles.syncStatusText, syncStatusStyle]}>
            {syncMessage}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 120, // Adjust height as needed
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top', // Ensures text starts from the top
  },
  text: {
    paddingTop: 12,
    fontSize: 16,
    color: 'black',
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd8ec',
    padding: 10,
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 13,
    color: '#4c4663',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f1a2e',
  },
  metricUnit: {
    fontSize: 12,
    color: '#6d6684',
  },
  syncStatusText: {
    paddingTop: 12,
    fontSize: 15,
  },
  syncProgressText: {
    color: '#6a51ae',
  },
  syncSuccessText: {
    color: '#1f7a3a',
  },
  syncErrorText: {
    color: '#b42318',
  },
});

function VisitPage({route, navigation}) {
  const {ssoUrl} = route.params;

  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{flex: 1}}>
      {/* <VisitRnSdkView isLoggingEnabled={true} magicLink={ssoUrl} /> */}

      <VisitRnSdkView isLoggingEnabled={true} magicLink={ssoUrl} />
    </SafeAreaView>
  );
}

export default App;
