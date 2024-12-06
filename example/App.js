import React from 'react';

import VisitRnSdkView from 'react-native-visit-rn-sdk';

import {EventRegister} from 'react-native-event-listeners';

import {SafeAreaView, Alert} from 'react-native';

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
      {/* <Button
        title="Press me"
        color="#f194ff"
        onPress={() => Alert.alert('Button with adjusted color pressed')}
      /> */}

      <VisitRnSdkView
        isLoggingEnabled={true}
        ssoURL={
          'https://star-health.getvisitapp.net/?mluib7c=%5B%7B%22policyNumber%22:%2211240005416800%22,%22policyId%22:1480,%22userId%22:1004565,%22magicUserId%22:41213,%22userMagicCode%22:%22S7fFT4ci%22,%22policyName%22:%22Young%20Star%20Insurance%20Policy%22,%22policyStartDate%22:%222024-08-02T18:30:00.000Z%22,%22policyEndDate%22:%222025-07-03T18:29:59.000Z%22,%22isHospiCash%22:false,%22isAlreadyOnboarded%22:true%7D,%7B%22policyNumber%22:%2211240005434900%22,%22policyId%22:1481,%22userId%22:1004565,%22magicUserId%22:41213,%22userMagicCode%22:%22S7fFT4ci%22,%22policyName%22:%22Star%20Family%20Health%20Optima%22,%22policyStartDate%22:%222024-12-02T18:30:00.000Z%22,%22policyEndDate%22:%222025-11-03T18:29:59.000Z%22,%22isHospiCash%22:false,%22isAlreadyOnboarded%22:true%7D,%7B%22policyNumber%22:%2211240006100000%22,%22policyId%22:1503,%22userId%22:1004565,%22magicUserId%22:41213,%22userMagicCode%22:%22S7fFT4ci%22,%22policyName%22:%22Star%20Out%20Patient%20Care%20Insurance%20Policy%22,%22policyStartDate%22:%222024-03-28T18:30:00.000Z%22,%22policyEndDate%22:%222025-03-28T18:29:59.000Z%22,%22isHospiCash%22:false,%22isAlreadyOnboarded%22:true%7D,%7B%22policyNumber%22:%2211240006101300%22,%22policyId%22:1505,%22userId%22:1004565,%22magicUserId%22:41213,%22userMagicCode%22:%22S7fFT4ci%22,%22policyName%22:%22Star%20Women%20Care%20Insurance%20-%202021%22,%22policyStartDate%22:%222024-03-28T18:30:00.000Z%22,%22policyEndDate%22:%222025-03-28T18:29:59.000Z%22,%22isHospiCash%22:false,%22isAlreadyOnboarded%22:true%7D,%7B%22policyNumber%22:%2211250007707700%22,%22policyId%22:1563,%22userId%22:1004565,%22magicUserId%22:41213,%22userMagicCode%22:%22S7fFT4ci%22,%22policyName%22:%22Young%20Star%20Insurance%20Policy%22,%22policyStartDate%22:%222024-06-25T18:30:00.000Z%22,%22policyEndDate%22:%222024-12-22T18:29:59.000Z%22,%22isHospiCash%22:false,%22isAlreadyOnboarded%22:true%7D,%7B%22policyNumber%22:%2218250007708000%22,%22policyId%22:1564,%22userId%22:2083479,%22magicUserId%22:41652,%22userMagicCode%22:%22yS1PVPF6%22,%22policyName%22:%22Star%20Travel%20Protect%20Insurance%20Policy%22,%22policyStartDate%22:%222024-06-25T18:30:00.000Z%22,%22policyEndDate%22:%222024-12-22T18:29:59.000Z%22,%22isHospiCash%22:false,%22isAlreadyOnboarded%22:true%7D%5D'
        }
      />
    </SafeAreaView>
  );
}

export default App;
