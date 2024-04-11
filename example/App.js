/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';

import VisitRnSdkView from 'react-native-visit-rn-sdk';

import {SafeAreaView} from 'react-native';

function App() {
  return (
    <SafeAreaView style={{flex: 1}}>
      {/* <Button
        title="Press me"
        color="#f194ff"
        onPress={() => Alert.alert('Button with adjusted color pressed')}
      /> */}

      <VisitRnSdkView
        isLoggingEnabled={true}
        magicLink={
          'https://digit-visit.getvisitapp.xyz/sso?userParams=rZO06fTBddwYlizYcahUHtU6RdAuHD6hcPoxKlDaj_B05A0ryYs7Mon_P_yX7nFKjeud5mN9T_IlE_ch8Cbgye8y-_z6RtIUWgiB87HweKGPLFSywSuzkO077oa1srKJ3ENWlkVuysvvOgplM7MNNO6RuNHWjIpxmDDxV8bsFMCNBynwEEKQEKi3QyjE5bpYYicqd8JRCozN9Cn-o2iY1gPzwwC86_OR0ckCukoZP9_S7_Pt41mrH8IzVsjX6JAHsModhAEaZesQfS4wc2uq0omEREyQ2V4PG77dNFCWkd4=&clientId=digit-777'
        }
      />
    </SafeAreaView>
  );
}

export default App;
