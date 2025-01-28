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
} from 'react-native';

import {
  NavigationContainer,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

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
    'https://kgi.getvisitapp.net/sso?userParams=wWroyW1yCr6MNoZ/udrhZPcY0dXIIJDUjIbl8XKyhkGP8b0754SP2INbMWLztcQnrm0pY1Awm5D3ZPmvP/itkJRVg/M1e5XPR3uA9TrqHBA=&clientId=kgi-zurich-101',
  );

  const [healthConnectStatus, setHealthConnectStatus] = useState(null);
  const [isAndroidSDKInitialized, setIsAndroidSDKInitialized] = useState(false);
  const [stepCount, setStepCount] = useState(0);

  const {VisitRnSdkViewManager} = NativeModules;

  const checkHealthKitStatus = async () => {
    try {
      const result = await VisitRnSdkViewManager.getHealthKitStatus();
      if (result) {
        setHealthConnectStatus('CONNECTED');
        setStepCount(result?.steps[0]);
      } else {
        setHealthConnectStatus('NOT CONNECTED');
      }
    } catch (error) {
      console.error('Error checking HealthKit authorization:', error);
    }
  };

  const fetchHealthConnectStatus = useCallback(async () => {
    try {
      const status =
        await NativeModules.VisitFitnessModule.getHealthConnectStatus();

      console.log('getHealthConnectStatus: ' + status);

      if (status === 'NOT_SUPPORTED') {
      } else if (status === 'NOT_INSTALLED') {
      } else if (status === 'INSTALLED') {
      } else if (status === 'CONNECTED') {
        fetchTodaysStepCount();
      }

      setHealthConnectStatus(status);
    } catch (e) {
      console.error(e);
      setHealthConnectStatus('Error fetching health connect status');
    }
  }, []);

  const fetchTodaysStepCount = useCallback(async () => {
    try {
      const stepCount =
        await NativeModules.VisitFitnessModule.getTodayStepCount();

      console.log('fetchTodaysStepCount: ' + stepCount);

      setStepCount(stepCount);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const initiateStepSync = useCallback(async () => {
    try {
      if (Platform.OS == 'android') {
        await NativeModules.VisitFitnessModule.triggerManualSync();
      } else {
        VisitRnSdkViewManager?.triggerManualSync();
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      console.log('useFocusEffect triggered');
      if (isAndroidSDKInitialized) {
        fetchHealthConnectStatus();
      } else {
        checkHealthKitStatus();
      }
    }, [
      isAndroidSDKInitialized,
      fetchHealthConnectStatus,
      healthConnectStatus,
    ]),
  );

  useEffect(() => {
    if (Platform.OS == 'android') {
      NativeModules.VisitFitnessModule.initiateSDK(true);
      setIsAndroidSDKInitialized(true);
    }
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
          Health Connect Status: {healthConnectStatus}
        </Text>

        <Text style={styles.text}>Steps Count: {stepCount}</Text>

        <Button
          title="Start Step Sync"
          color="#7e55fa"
          onPress={() => {
            if (healthConnectStatus == 'CONNECTED') {
              initiateStepSync();
            }
          }}
        />
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
});

function VisitPage({route, navigation}) {
  const {ssoUrl} = route.params;

  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{flex: 1}}>
      <VisitRnSdkView isLoggingEnabled={true} magicLink={ssoUrl} />
    </SafeAreaView>
  );
}

export default App;
