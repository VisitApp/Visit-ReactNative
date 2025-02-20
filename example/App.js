import React, {useState} from 'react';

import VisitRnSdkView from 'react-native-visit-rn-sdk';

import {EventRegister} from 'react-native-event-listeners';

import {SafeAreaView, StyleSheet, TextInput, View} from 'react-native';

const visitEvent = 'visit-event';

function App() {
  const [text, setText] = useState(
    'https://web.getvisitapp.net/consultation/chat-only?authToken=Jwt%20eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6Ik51bmk5ODIzTUkiLCJjbGllbnRVc2VySWQiOiIxIiwiY2xpZW50U2VjcmV0IjoiMkNGOTQ4NVRAbiYmbiIsInBvbGljeU51bWJlciI6IkdNQzAwMDAwMDE0MDAxMDBURVNUIiwiaWF0IjoxNzMzODU4MDAxLCJleHAiOjE3MzM5NDQ0MDF9.4lZ4kLNUe4YW7BhQHyRI3Rqq09aVTyITsBeCk6UsK8w&consultationId=29175',
  );

  React.useEffect(() => {
    const listener = EventRegister.addEventListener(visitEvent, data => {
      if (data.message === 'web-view-error') {
        console.log('web-view-error', data.errorMessage);
        //when webview throws error.
      } else if (data.message === 'closeView') {
        console.log('close the app');
      }
    });
    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, []);

  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{flex: 1}}>
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
      <VisitRnSdkView ssoURL={text} isLoggingEnabled={true} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  input: {
    height: 100, // Adjust height as needed
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
