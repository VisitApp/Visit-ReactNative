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

const visitBaseUrl = 'https://api.getvisitapp.com/v3';

const errorBaseUrl = 'https://star-health.getvisitapp.net/';

const token = '';

const moduleName = '';
const visitEvent = 'visit-event';

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
    'https://star-health.getvisitapp.net/?mluib7c=%5B%7B%22policyNumber%22%3A%226634112600097934%22%2C%22policyId%22%3A1948%2C%22masterPolicyNo%22%3Anull%2C%22userId%22%3A45237%2C%22magicUserId%22%3A41056%2C%22agentCode%22%3Anull%2C%22userMagicCode%22%3A%22sxTxMIhW%22%2C%22policyName%22%3A%22Super%20Star%22%2C%22policyStartDate%22%3A%222025-05-24T18%3A30%3A00.000Z%22%2C%22policyEndDate%22%3A%222026-05-23T18%3A30%3A00.000Z%22%2C%22isHospiCash%22%3Afalse%2C%22isAlreadyOnboarded%22%3Atrue%2C%22isPolicyAvailable%22%3Atrue%7D%2C%7B%22policyNumber%22%3A%221658112600068227%22%2C%22policyId%22%3A1949%2C%22masterPolicyNo%22%3Anull%2C%22userId%22%3A45237%2C%22magicUserId%22%3A41056%2C%22agentCode%22%3Anull%2C%22userMagicCode%22%3A%22sxTxMIhW%22%2C%22policyName%22%3A%22Super%20Star%22%2C%22policyStartDate%22%3A%222025-05-24T18%3A30%3A00.000Z%22%2C%22policyEndDate%22%3A%222026-05-23T18%3A30%3A00.000Z%22%2C%22isHospiCash%22%3Afalse%2C%22isAlreadyOnboarded%22%3Atrue%2C%22isPolicyAvailable%22%3Atrue%7D%2C%7B%22policyNumber%22%3A%227578112600032035%22%2C%22policyId%22%3A1958%2C%22masterPolicyNo%22%3Anull%2C%22userId%22%3A45237%2C%22magicUserId%22%3A41056%2C%22agentCode%22%3Anull%2C%22userMagicCode%22%3A%22sxTxMIhW%22%2C%22policyName%22%3A%22Super%20Star%22%2C%22policyStartDate%22%3A%222025-06-05T18%3A30%3A00.000Z%22%2C%22policyEndDate%22%3A%222026-06-04T18%3A30%3A00.000Z%22%2C%22isHospiCash%22%3Afalse%2C%22isAlreadyOnboarded%22%3Atrue%2C%22isPolicyAvailable%22%3Atrue%7D%2C%7B%22policyNumber%22%3A%229235112600034242%22%2C%22policyId%22%3A1959%2C%22masterPolicyNo%22%3Anull%2C%22userId%22%3A45237%2C%22magicUserId%22%3A41056%2C%22agentCode%22%3Anull%2C%22userMagicCode%22%3A%22sxTxMIhW%22%2C%22policyName%22%3A%22Super%20Star%22%2C%22policyStartDate%22%3A%222025-06-05T18%3A30%3A00.000Z%22%2C%22policyEndDate%22%3A%222026-06-04T18%3A30%3A00.000Z%22%2C%22isHospiCash%22%3Afalse%2C%22isAlreadyOnboarded%22%3Atrue%2C%22isPolicyAvailable%22%3Atrue%7D%2C%7B%22policyNumber%22%3A%222440112600032584%22%2C%22policyId%22%3A1961%2C%22masterPolicyNo%22%3Anull%2C%22userId%22%3A45237%2C%22magicUserId%22%3A41056%2C%22agentCode%22%3Anull%2C%22userMagicCode%22%3A%22sxTxMIhW%22%2C%22policyName%22%3A%22Super%20Star%22%2C%22policyStartDate%22%3A%222025-04-30T18%3A30%3A00.000Z%22%2C%22policyEndDate%22%3A%222026-04-29T18%3A30%3A00.000Z%22%2C%22isHospiCash%22%3Afalse%2C%22isAlreadyOnboarded%22%3Atrue%2C%22isPolicyAvailable%22%3Atrue%7D%2C%7B%22policyNumber%22%3A%223785112600000983%22%2C%22policyId%22%3A1962%2C%22masterPolicyNo%22%3Anull%2C%22userId%22%3A45237%2C%22magicUserId%22%3A41056%2C%22agentCode%22%3Anull%2C%22userMagicCode%22%3A%22sxTxMIhW%22%2C%22policyName%22%3A%22Super%20Star%22%2C%22policyStartDate%22%3A%222025-04-30T18%3A30%3A00.000Z%22%2C%22policyEndDate%22%3A%222026-04-29T18%3A30%3A00.000Z%22%2C%22isHospiCash%22%3Afalse%2C%22isAlreadyOnboarded%22%3Atrue%2C%22isPolicyAvailable%22%3Atrue%7D%2C%7B%22policyNumber%22%3A%228402112600033452%22%2C%22policyId%22%3A1963%2C%22masterPolicyNo%22%3Anull%2C%22userId%22%3A45237%2C%22magicUserId%22%3A41056%2C%22agentCode%22%3Anull%2C%22userMagicCode%22%3A%22sxTxMIhW%22%2C%22policyName%22%3A%22Super%20Star%22%2C%22policyStartDate%22%3A%222025-04-30T18%3A30%3A00.000Z%22%2C%22policyEndDate%22%3A%222026-04-29T18%3A30%3A00.000Z%22%2C%22isHospiCash%22%3Afalse%2C%22isAlreadyOnboarded%22%3Atrue%2C%22isPolicyAvailable%22%3Atrue%7D%2C%7B%22policyNumber%22%3A%226479112600062800%22%2C%22policyId%22%3A1964%2C%22masterPolicyNo%22%3Anull%2C%22userId%22%3A45237%2C%22magicUserId%22%3A41056%2C%22agentCode%22%3Anull%2C%22userMagicCode%22%3A%22sxTxMIhW%22%2C%22policyName%22%3A%22Super%20Star%22%2C%22policyStartDate%22%3A%222025-04-30T18%3A30%3A00.000Z%22%2C%22policyEndDate%22%3A%222026-04-29T18%3A30%3A00.000Z%22%2C%22isHospiCash%22%3Afalse%2C%22isAlreadyOnboarded%22%3Atrue%2C%22isPolicyAvailable%22%3Atrue%7D%2C%7B%22policyNumber%22%3A%225041112600022685%22%2C%22policyId%22%3A2033%2C%22masterPolicyNo%22%3Anull%2C%22userId%22%3A45237%2C%22magicUserId%22%3A41056%2C%22agentCode%22%3Anull%2C%22userMagicCode%22%3A%22sxTxMIhW%22%2C%22policyName%22%3A%22Super%20Star%22%2C%22policyStartDate%22%3A%222025-04-30T18%3A30%3A00.000Z%22%2C%22policyEndDate%22%3A%222028-04-29T18%3A30%3A00.000Z%22%2C%22isHospiCash%22%3Afalse%2C%22isAlreadyOnboarded%22%3Atrue%2C%22isPolicyAvailable%22%3Atrue%7D%2C%7B%22policyNumber%22%3A%227576112600017208%22%2C%22policyId%22%3A2034%2C%22masterPolicyNo%22%3Anull%2C%22userId%22%3A45237%2C%22magicUserId%22%3A41056%2C%22agentCode%22%3Anull%2C%22userMagicCode%22%3A%22sxTxMIhW%22%2C%22policyName%22%3A%22Super%20Star%22%2C%22policyStartDate%22%3A%222025-04-30T18%3A30%3A00.000Z%22%2C%22policyEndDate%22%3A%222026-04-29T18%3A30%3A00.000Z%22%2C%22isHospiCash%22%3Afalse%2C%22isAlreadyOnboarded%22%3Atrue%2C%22isPolicyAvailable%22%3Atrue%7D%5D',
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
      {/* <VisitRnSdkView isLoggingEnabled={true} magicLink={ssoUrl} /> */}

      <VisitRnSdkView
        baseUrl={'https://api.getvisitapp.com/v3'}
        errorBaseUrl={'https://star-health.getvisitapp.com/'}
        token={
          'Bearer Q8wDXpPdbtMlrUdJeCpNPDeX_WQfHcqzaJQSc4ROTiyrnVXr9GgBYVv5DgKwJ8lqSBGwR0x_P82DBe_aW1VYRHg14PK23V1Oauq1oI2oqrSU-NFvYtKNpwHp_5wtWOuRIII9-TaxSXEXGiiEwlZ_lczMl9lXtMfuHW2cRMM5VHHN8pGn6QQyJH5XveCSQ2q2azYOfB_cr3_hiN3cREOh5p_fQIhZnCioppVdA3jjx-xuQHOmhtcelc-d_0_7VhWWrPPmq1s507mq0whrkH0bP_8lsPm3158Uqk706a6tdMs4-1etQQrZWTo6vnzI9rc3tXBQQOyD3OgJ6kzFJio3QG8sldqraz05OmCOOLza2hQb04ub6-P-6DeO_YAo1cWN8e01upcH_4wdt1QXmH52SY0_jb60_sFQHZ2cXOPKBRHie82z8aKA3PKdn51BcheU7nMXzlRcU7t2xbxBA5O93ftFQ1Td3dgEX82mDb0IIVoRAG7jVba9A5usmQ5TXAtflgCtuX-GZZwHmOuJf2W6Sl-OQ7I7I6cY3fzzx2UXjuIQQrWUlKHID9F_g08Pm_RDkB7VdBR83ziOFbf5Wj1sPSmOSbZkfFKsgPLTB_33idSqRRuJk_vi_tVdpSugvFJLiDIIYaHQxMAVD0EZBlLymeA0ve89x_sdhKwj2P2qSr8OjVQwaJvr0-Nd5CYWogOGfrzoqN8U8kO9S6qJLE0GgPDk6UqkbVcbklLRwEF5qCXvYIJxxsQ2Kr-BzDKh_wYh6l_LlqWL5TEfetIRmpf-xRymSYwj48EZpFR6mGlTTT_AR1w5gpqaUQgeBBAyaUK8oXg4YYoHWu01a57N5S5SUS4ayq5Lcrv3mXVMm3jaAcwGASUVi-F5loasuwN_6t7nxryZ7E5gfnNwWbRVLy_MlqaEnUgS8NmwY3zrkna2PZj2dBQpJ4Rop5-i_7eEjAzsKfgRF_6oQrXCnddIEl5zBZKR6wvpCuZ8GSwt3VRxkFAxVTyeppblzjIGU4ho8Lr1WZ8IDbffBtnwI4thkd1UQPtowg5gejwqLOgP1FT6-jlmVKvO3QOVKZsEx6pM4zi0uQol74FXcZk51C2VzX4GJqFtRsC_-D2s9j45_MCJSCJ2iDIO5h3-ae0UzIpv7LTRwgIMhHBLLsWn3DBpdX7p12npUo-YIcA8-iPO2ThVTPASv39wBfz1qaUk09o0U55BDvKuTRyn8BSuTK-Cdc9UUag0i0HOx0fLVPwfa0dUqMSynHCPakPzgiatpC8AUPtTBmPzKv7ez-X15yiYdsIZ1VIdT6KnDdAqZ3gzUtofYK8zJGBy7S_Bd5ZiNLR9QJU3V8CDwCcZlCwnsFHjoVHP3whtvs-rMqBty03CwBCMfMSf_VDE0fpjBAi9xrzMN8FvjrjvJVcV4Ufm8WdnEAKv6zWlh0qpD398-BWdcw_Q7IZFoUbL_mye9m8iGhBxewS7uybP9eVINNrdfuTPy88ldF_GDfcz2ekI_sOfKxjNmXNl52fxydQKWWOSLXrW0cUui3Du1PwiP5hPs0DaXBcCliIybdFvoOGnD4a97vy292Z_WWK3IOwxjCUFxwU6mZ-pts5cFjTk4PYq8GTwl5uk_ox_Rr-OL6109-ed5Z3C7QE8c61nd7LjMQxOE71mpCKPbr79_hmgN3y5oOMSB1S-Mw3uwjnHK42A5EX8WG2Hn_UfoeYlq8K5Vx_6VQYT9H7sPDsTvkQa2WXhMmwFfTNfO8YFezBJpq1DL39xC6Iuw4UKhI1cP7p-XQQUUh9OIR0DDPSQkKEBISK93lMsYQgNS6iNsPjNBuf36V5aJBdZNQS4ISN51gb6aVbAu6u2C2p96gX0t31EercPdKjHJC9b8akwU72Jk6I_QHnSzBs5SU0xEyySJMT1DZUVboqrxT59EqsfxpjouGJmE_ih3JwbID4DLdZWEjU0F5iBlJg6DVo='
        }
        cpsid={'CPS1830380877849624013'}
        moduleName={moduleName}
        environment={'prod'}
        isLoggingEnabled={true}
        magicLink={ssoUrl}
      />
    </SafeAreaView>
  );
}

/**
 * 
 <VisitRnSdkView
        baseUrl={'https://api.getvisitapp.com/v4'}
        errorBaseUrl={'https://star-health.getvisitapp.com/'}
        token={
          ''
        }
        cpsid={'CPS1830380877849624013'}
        moduleName={moduleName}
        environment={'prod'}
        isLoggingEnabled={true}
        // magicLink={ssoUrl}
      />
 */

export default App;
