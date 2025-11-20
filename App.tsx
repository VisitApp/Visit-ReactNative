/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {SafeAreaView} from 'react-native';

import VisitRnSdkView from 'react-native-visit-rn-sdk';

function App(): React.JSX.Element {
  return (
    <SafeAreaView style={{flex: 1}}>
      <VisitRnSdkView
        isLoggingEnabled={true}
        magicLink={
          'https://star-health.getvisitapp.net/?code=xqVubp40&pid=1767'
        }
      />
    </SafeAreaView>
  );
}
export default App;
