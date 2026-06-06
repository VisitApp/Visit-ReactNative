import React, {useState} from 'react';

import VisitRnSdkView from 'react-native-visit-rn-web-sdk';

import {EventRegister} from 'react-native-event-listeners';

import {SafeAreaView, StyleSheet, TextInput, View, Button} from 'react-native';

import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {NavigationContainer, useNavigation} from '@react-navigation/native';

const Stack = createNativeStackNavigator();

const visitEvent = 'visit-event';

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
    '',
  );

  React.useEffect(() => {
    const listener = EventRegister.addEventListener(visitEvent, data => {
      if (data.message === 'web-view-error') {
        console.log('web-view-error', data.errorMessage);
        //when webview throws error.
      } else if (data.message === 'closeView') {
        navigation.goBack();
      }
    });
    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, [navigation]);

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
      </View>
    </View>
  );
}

function VisitPage({route, navigation}) {
  const {ssoUrl} = route.params;

  return <VisitRnSdkView ssoURL={ssoUrl} isLoggingEnabled={true} />;
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

export default App;
