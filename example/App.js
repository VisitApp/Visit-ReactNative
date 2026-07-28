import React, {useCallback, useEffect, useMemo, useState} from 'react';

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
    'https://mchi.getvisitapp.net/sso?userParams=Wbu8XTldnlYz5TIeRwd-G8IpTToVDQer6HQYDD9jesef8BAlfF7NapDJ-ocgYEhaAUF6FNghSQlypxsg_Kz5spY7EqG_atHdQHlqCvuj17GkthdYWBG1x3u43YZoSuEaxB0nx8wvqbPptFyjLbasQJltJXgqWs7CNUcXSHJxwxY8b7_-_En_tUv5VZgXaA3i&clientId=mchi-ds-we-09',
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
      return;
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
  }, [VisitRnSdkViewManager]);

  const checkIosHealthKitStatus = useCallback(async () => {
    try {
      const status = await VisitRnSdkViewManager?.getHealthKitConnectStatus();

      console.log('getHealthKitConnectStatus: ' + status);

      if (status === 'NOT_SUPPORTED') {
      } else if (status === 'INSTALLED') {
      } else if (status === 'CONNECTED') {
        await fetchTodayHealthMetrics();
      }

      setHealthTrackerConnectionStatus(status);
    } catch (e) {
      console.error(e);
      setHealthTrackerConnectionStatus('Error fetching health kit status');
    }
  }, [VisitRnSdkViewManager, fetchTodayHealthMetrics]);

  const checkAndroidHealthConnectStatus = useCallback(async () => {
    try {
      const status =
        await NativeModules.VisitFitnessModule.getHealthConnectStatus();

      console.log('getHealthConnectStatus: ' + status);

      if (status === 'NOT_SUPPORTED') {
      } else if (status === 'NOT_INSTALLED') {
      } else if (status === 'INSTALLED') {
      } else if (status === 'CONNECTED') {
        fetchTodayHealthMetrics();
      }

      setHealthTrackerConnectionStatus(status);
    } catch (e) {
      console.error(e);
      setHealthTrackerConnectionStatus('Error fetching health connect status');
    }
  }, [fetchTodayHealthMetrics]);

  const initiateStepSync = useCallback(async () => {
    setSyncStatus('syncing');
    setSyncMessage('Syncing in progress...');

    try {
      const syncResult =
        Platform.OS === 'android'
          ? await NativeModules.VisitFitnessModule.triggerManualSync()
          : await VisitRnSdkViewManager?.triggerManualSync();

      console.log('triggerManualSync resolved:', syncResult);
      setSyncStatus('success');
      setSyncMessage('Syncing has been done successfully');
    } catch (e) {
      console.error('triggerManualSync failed:', e?.code, e?.message);
      setSyncStatus('error');
      setSyncMessage(e?.message || 'Syncing failed');
    }
  }, [VisitRnSdkViewManager]);

  useFocusEffect(
    React.useCallback(() => {
      if (isAndroidSDKInitialized) {
        checkAndroidHealthConnectStatus();
      }
      if (Platform.OS === 'ios') {
        checkIosHealthKitStatus();
      }
    }, [
      isAndroidSDKInitialized,
      checkAndroidHealthConnectStatus,
      checkIosHealthKitStatus,
    ]),
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
          title={syncStatus === 'syncing' ? 'Syncing...' : 'Start Step Sync'}
          color="#7e55fa"
          disabled={
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

      <VisitRnSdkView
        isLoggingEnabled={true}
        magicLink={ssoUrl}
      />
    </SafeAreaView>
  );
}

export default App;
