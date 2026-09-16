import React, { useState } from 'react';
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
  type VisitRnSdkViewProps,
} from 'react-native-visit-rn-sdk';

export type RootStackParamList = {
  Home: undefined;
  VisitPage: {
    ssoLink: VisitRnSdkViewProps['ssoLink'];
  };
};

type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;
type VisitPageProps = NativeStackScreenProps<RootStackParamList, 'VisitPage'>;

const Stack = createNativeStackNavigator<RootStackParamList>();

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

function VisitPage({ route }: VisitPageProps) {
  const props: VisitRnSdkViewProps = {
    ssoLink: route.params.ssoLink,
    isLoggingEnabled: true,
  };

  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{ flex: 1 }}>
      <VisitRnSdkView {...props} />
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
});

export default App;
