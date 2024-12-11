import React from 'react';

import VisitRnSdkView from 'react-native-visit-rn-sdk';

import {EventRegister} from 'react-native-event-listeners';

import {SafeAreaView} from 'react-native';

const visitEvent = 'visit-event';

function App() {
  React.useEffect(() => {
    const listener = EventRegister.addEventListener(visitEvent, data => {
      if (data.message === 'web-view-error') {
        console.log('web-view-error', data.errorMessage);
        //when webview throws error.
      }
    });
    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, []);

  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <SafeAreaView style={{flex: 1}}>
      <VisitRnSdkView
        ssoURL={
          'https://web.getvisitapp.net/consultation/chat-only?authToken=Jwt%20eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRJZCI6Ik51bmk5ODIzTUkiLCJjbGllbnRVc2VySWQiOiIxIiwiY2xpZW50U2VjcmV0IjoiMkNGOTQ4NVRAbiYmbiIsInBvbGljeU51bWJlciI6IkdNQzAwMDAwMDE0MDAxMDBURVNUIiwiaWF0IjoxNzMzODU4MDAxLCJleHAiOjE3MzM5NDQ0MDF9.4lZ4kLNUe4YW7BhQHyRI3Rqq09aVTyITsBeCk6UsK8w&consultationId=29175'
        }
        isLoggingEnabled={true}
      />
    </SafeAreaView>
  );
}

export default App;
