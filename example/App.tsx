import React, {useRef, useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  Platform,
} from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import VisitRnSdkView, {
  type VisitRnSdkViewHandle,
  type VisitRnSdkViewProps,
} from 'react-native-visit-rn-sdk';

export type RootStackParamList = {
  Home: undefined;
  VisitPage: {
    ssoLink: VisitRnSdkViewProps['ssoLink'];
  };
};

type VisitStackParamList = {
  VisitWeb: undefined;
  PaymentGateway: undefined;
};

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type VisitPageProps = NativeStackScreenProps<RootStackParamList, 'VisitPage'>;

const Stack = createNativeStackNavigator<RootStackParamList>();
const VisitStack = createNativeStackNavigator<VisitStackParamList>();

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
        }}
      >
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
        <Stack.Screen
          name="VisitPage"
          component={VisitPage}
          options={{
            title: 'VisitPage',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function Home() {
  const navigation = useNavigation<HomeNavigationProp>();
  const [ssoLink, setSsoLink] = useState(
    'https://digit-visit.getvisitapp.com/sso?userParams=AogPOG-g1eeEKvpBJanqsy9uytwIdeBx1drCEvgZbsrELVgkcSvYWYGYAt0LGbtX2iPW9PUkYaZYjwnUaLhvcDPB7EXUI27dkmkCO0YT_XvaZwt8DQSK_Ihpx4aodWMPAO3wkH61iqvHgBOMQnLbE6yfwenopFWOaZTLfQcH3uEOFUzsf7s8SDNTl2LrUyY5ia-EM4O0ZlokeUjaaqdOadR0xWyMkcVZS_ynkUlJ0quNcNSf1aE3PcxIX6YATj2lftQZbC0BBASPc6DszEAttY5a-duv32yEgkZ53vSTaoK57i33S6rbGzlZ_bOa-p22&clientId=digit-777&consultationId=6703526&redirectTo=video-call&sessionId=265432'
  );

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          multiline
          numberOfLines={4}
          placeholder="Enter SSO URL"
          value={ssoLink}
          onChangeText={setSsoLink}
          cursorColor="black"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          title="Open Visit SDK"
          color="#7e55fa"
          onPress={() => {
            navigation.navigate('VisitPage', {
              ssoLink: ssoLink.trim(),
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

function VisitPage({route}: VisitPageProps) {
  const sdkRef = useRef<VisitRnSdkViewHandle>(null);

  return (
    <VisitStack.Navigator>
      <VisitStack.Screen name="VisitWeb" options={{headerShown: false}}>
        {({navigation}) => (
          // eslint-disable-next-line react-native/no-inline-styles
          <SafeAreaView style={{flex: 1}}>
            <VisitRnSdkView
              ref={sdkRef}
              ssoLink={route.params.ssoLink}
              isLoggingEnabled
              onEvent={(eventName, properties) => { // eslint-disable-line @typescript-eslint/no-unused-vars
                if (eventName === 'INITIATE_PAYMENT') {
                  navigation.navigate('PaymentGateway');
                  return;
                }
              }}
            />
          </SafeAreaView>
        )}
      </VisitStack.Screen>
      <VisitStack.Screen
        name="PaymentGateway"
        options={{
          title: 'Host payment PWA (demo)',
          presentation: 'modal',
          headerBackButtonDisplayMode: 'minimal',
        }}>
        {({navigation}) => (
          <PaymentGateway
            onFinish={status => {
              sdkRef.current?.sendEvent('PAYMENT_STATUS', {status});
              navigation.goBack();
            }}
          />
        )}
      </VisitStack.Screen>
    </VisitStack.Navigator>
  );
}

function PaymentGateway({
  onFinish,
}: {
  onFinish: (status: 'success' | 'error') => void;
}) {
  return (
    <SafeAreaView style={styles.paymentScreen}>
      <Text style={styles.paymentTitle}>Host payment PWA (demo)</Text>
      <Button title="Payment success" onPress={() => onFinish('success')} />
      <Button title="Payment error" onPress={() => onFinish('error')} />
    </SafeAreaView>
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
    height: 120,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
  },
  text: {
    paddingTop: 12,
    fontSize: 16,
    color: 'black',
  },
  paymentScreen: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    gap: 8,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: 'black',
  },
});

export default App;
