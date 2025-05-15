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
  Linking,
} from 'react-native';

import {
  NavigationContainer,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

import {createNativeStackNavigator} from '@react-navigation/native-stack';

function App() {
  const Stack = createNativeStackNavigator();

  const linking = {
    prefixes: ['https://star.test-app.link'],
    config: {
      screens: {
        Home: {
          path: ':rest*',
        },
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
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

function Home({route}) {
  const [deepLinkUrl, setDeepLinkUrl] = useState(null);

  useEffect(() => {
    // For cold start (app opened via deep link)
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('App launched with deep link:', url);
        setDeepLinkUrl(url);
      }
    });

    // For already running app (deep link triggers screen)
    const handleDeepLink = ({url}) => {
      console.log('Deep link triggered while app is open:', url);
      setDeepLinkUrl(url);
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  // Route params (query params parsed by React Navigation)
  const params = route.params;

  useEffect(() => {
    if (params) {
      console.log('Query Params:');
      Object.entries(params).forEach(([key, value]) => {
        console.log(`${key}:`, value);
      });
    }
  }, [params]);

  const navigation = useNavigation();

  const [text, setText] = useState(
    'https://kli.getvisitapp.net/kli/sso?userId=jvPDGgaJjN6QZ1DiSDEJ5vUeO/7CcE7MkDCWv/t4kTMpj94yZhL8klroqricvek86Tq6TD+Zoj6FZNFZoqbNBFWq44U14xA6yLam2eWhYAIGZPaXaPySyXrayMs2QfBtsXROoPNeujYiDb2E6kx8xwAIGcYruYh86rzBTqBseXk=',
  );

  const [healthTrackerConnectionStatus, setHealthTrackerConnectionStatus] =
    useState(null);
  const [isAndroidSDKInitialized, setIsAndroidSDKInitialized] = useState(false);
  const [stepCount, setStepCount] = useState(0);

  const {VisitRnSdkViewManager} = NativeModules;

  const checkIosHealthKitStatus = async () => {
    try {
      const result = await VisitRnSdkViewManager.getHealthKitStatus();
      if (result) {
        setHealthTrackerConnectionStatus('CONNECTED');
        setStepCount(result?.steps[0]);
      } else {
        setHealthTrackerConnectionStatus('NOT CONNECTED');
      }
    } catch (error) {
      console.error('Error checking HealthKit authorization:', error);
    }
  };

  const checkAndroidHealthConnectStatus = useCallback(async () => {
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

      setHealthTrackerConnectionStatus(status);
    } catch (e) {
      console.error(e);
      setHealthTrackerConnectionStatus('Error fetching health connect status');
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
      if (Platform.OS === 'android') {
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
        checkAndroidHealthConnectStatus();
      }
      if (Platform.OS === 'ios') {
        checkIosHealthKitStatus();
      }
    }, [
      isAndroidSDKInitialized,
      checkAndroidHealthConnectStatus,
      healthTrackerConnectionStatus,
    ]),
  );

  useEffect(() => {
    if (Platform.OS === 'android') {
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
              deepLinkUrl: deepLinkUrl,
            });
          }}
        />

        <Text style={styles.text}>
          {Platform.OS === 'ios' ? 'Running on iOS' : 'Running on Android'}
        </Text>

        <Text style={styles.text}>
          Health Connect Status: {healthTrackerConnectionStatus}
        </Text>

        <Text style={styles.text}>Steps Count: {stepCount}</Text>

        <Button
          title="Start Step Sync"
          color="#7e55fa"
          onPress={() => {
            if (healthTrackerConnectionStatus == 'CONNECTED') {
              initiateStepSync();
            }
          }}
        />

        <>{deepLinkUrl && <Text>Deeplink: {deepLinkUrl}</Text>}</>
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
  const {deepLinkUrl} = route.params;

  console.log('====================================');
  console.log('SSO URL:', ssoUrl);
  console.log('Deeplink URL:', deepLinkUrl);
  console.log('====================================');

  const visitBaseUrl = 'https://insurance-uat.getvisitapp.net/wonderwomen';

  const errorBaseUrl = 'https://star-health.getvisitapp.net/';

  const token =
    'Q8wDXpPdbtMlrUdJeCpNPDeX_WQfHcqzaJQSc4ROTiyrnVXr9GgBYVv5DgKwJ8lqroZqzgLtccREju1C7yneiEHczb8xrp-fFPMUODB0QUEPLR-cSvkhsBFyqw5GgKJr6q6-e6PueUSsiqmVcbdEeszMl9lXtMfuHW2cRMM5VHFAj_RYxFDf8TNfeSnOLIk2ApVJ1eCBG1i8diJtO7j_VHjiU3e2TYpL0AJS4xkmDOj1AP5VqNK9mI6SSTqsl3TnlgMCCLmS5ueVoselvrRJcAAtixx5atZiGJMZKMQTYwI4-1etQQrZWTo6vnzI9rc3kV5jIakGNXYv926wruWTuP_YZUc6xLFZq6wWlLEkcSvbQ94gVgdwKkjMeGLQFJA_caeOmBqlG9FzDsawMvPXQavfvUA8zF_BnIzhmqnZfleSOwhYYO2v0S5kHIEBywzCM-PEI_2aeBAAM0FBvXwHRKEvjnLTHUcRZD7umvJO-2HUIeZbp7fGI6gQVoCJPzBnzakmu32BOMZT3tCmd9ESOh4RHk89CXo97nHXClswKHcmDdvxLm2sD1u1Oo1gG9LLikMcox_xcOMzV_D0VNEsq6yTQl7kO7K-gNAi6ps2TW4a6Yp3ZBqFNzefkej4iUNJNotAZUfnPRHa6VhMUX4vdV0FTO6Hynca3rMdtpDcRwrM2x62PyGoWTJIalJyg0EEmBshVQfKNCPkjlgOvpKIqt7QIRvxo8Nn7QZn8B_ku85YKK1Q90wCUQI-yCesKqgLw1VddT1BJsQhJbk75PHoJ8l7uJMN_S42piggS1w4X4x3fKMJ4G7tQQsgdC5GW1nNEr9_cAX89amlJNPaNFOeQY2s-JlY4B9KWvFdjqPRc9PTf605IePnRKXnDQYgHQV0z8Xz2Y2xiGh69x1lLrEgeZGQ2aayyBR-Ax2OAlBLw_SP78RLGEWh-z-E8KVaSFeliIpRME-smr7T1S9RPT0Z-TYuubNGtp4g_Ek8KJ0BaYtl90Xmk9YfL6C_iC4J6DTdXYS4KXu2N2YuUBWWZ1CWWUkog0iPdO0HxVS1Jezt6L0H2csrbWQD4np8UUv5nMMfmfDkGcQ7a2DG1zr0FNEgT-3ZptpqY59kGKNBJCr1rEw0ZCxCOR5Rk_sNKn2Q1fojXuNOeAgQKksnr_pEhDD_7RQxNcJtnYZ8IgzoDP8LP32zsgJXuTW5ggtpgSRDaRK0Z7dNTmIIvfaMyqaedHngZoqOwNv7ZBA2KMCkJob-keBox3FS3R0UtYhwXwQnQVrSSRXGi1BxSZc9Gi5Q3SxhQ5t4hVP8064omZq2mw9_0XI_iETb2HyFC49BUDDjfPo9RL3OhZ48r42eO1FFtcBglxuT-NnsxVshLPA_2Qzg2FGJ20ORa3zotS5WkJhqA4uNAiHQMOR5_RuMAvNMrJd39UCAX9p_0bNgGDCgyBF7tn1wK1N-2F4c-kk5j2s2t6bYqH1eveVcJWZ8LFjnhCb6UBYnnD550B0L_6nPkWZ_qs6v0WFLiUjGl48wgqEq1M-mKExI7bdH87l1snnSMXl9Ca_ADdLwbWkmOVbjkKQTdwY=';

  const moduleName = '';

  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{flex: 1}}>
      <VisitRnSdkView
        baseUrl={visitBaseUrl}
        errorBaseUrl={errorBaseUrl}
        token={token}
        cpsid={'CPS2136627208883812429'}
        moduleName={moduleName}
        environment={'uat'}
        isLoggingEnabled={true}
        deepLinkUrl={deepLinkUrl}
        // magicLink={ssoUrl},
      />
    </SafeAreaView>
  );
}

export default App;
