import React, {useEffect, useState} from 'react';

import VisitRnSdkView from 'react-native-visit-rn-sdk';

import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  Platform,
  Alert,
} from 'react-native';

import {NavigationContainer, useNavigation} from '@react-navigation/native';

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
    'https://digit-visit.getvisitapp.com/sso?userParams=AogPOG-g1eeEKvpBJanqsy9uytwIdeBx1drCEvgZbsrELVgkcSvYWYGYAt0LGbtX2iPW9PUkYaZYjwnUaLhvcDPB7EXUI27dkmkCO0YT_XvaZwt8DQSK_Ihpx4aodWMPAO3wkH61iqvHgBOMQnLbE6yfwenopFWOaZTLfQcH3uEOFUzsf7s8SDNTl2LrUyY5ia-EM4O0ZlokeUjaaqdOadR0xWyMkcVZS_ynkUlJ0quNcNSf1aE3PcxIX6YATj2lftQZbC0BBASPc6DszEAttY5a-duv32yEgkZ53vSTaoK57i33S6rbGzlZ_bOa-p22&clientId=digit-777&consultationId=6703526&redirectTo=video-call&sessionId=265432',
  );

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
    <View style={styles.container}>
      <View style={styles.inputContainer}>
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

      <View style={styles.buttonContainer}>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputContainer: {
    padding: 16,
  },
  buttonContainer: {
    paddingHorizontal: 20,
  },
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

function VisitPage({route}) {
  const {ssoUrl} = route.params;

  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{flex: 1}}>
      <VisitRnSdkView isLoggingEnabled={true} ssoLink={ssoUrl} />
    </SafeAreaView>
  );
}

export default App;
