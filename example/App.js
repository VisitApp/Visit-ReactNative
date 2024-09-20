/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useState} from 'react';

import VisitRnSdkView from 'react-native-visit-rn-sdk';

import {EventRegister} from 'react-native-event-listeners';

import {SafeAreaView, Alert, TextInput, Button} from 'react-native';

const visitBaseUrl = 'https://insurance-uat.getvisitapp.net/wonderwomen';

const errorBaseUrl = 'https://star-health.getvisitapp.net/';

const token =
  '78ftP8oDeLCCdBp8QH5d/o7QvxeFBcBYT1nPtn/LgVQ3CW4R+xE5kSZJZvtNcfTwtOeD2aSoxjcjoJcaiSFY1CjyuH2qAHG9JX888hFKQXutxbumqxYaGZjK4nUg2Te6JxfNTlWjFk8/cPNI6JWJa7kKYYcV7xssd63oLvTP9sks42cU/XbCFeXMXHmyCtXC2vV2aOiVNAjZytzsBuHgWhP5LKzGwcCIvRzmoT1DSOgnow+Ccf1uvAvva4krj41JWLGNugqH097BW5jcbVlpCY3xMBKoPn3mWTIblFtZaujOIZY4a2qjjOYuDy2xrx1aLytiKnmTe18Af6Br9qxp7yZQ0NmNrp2rIYfrJvB+T1Itzn19hQ0cOIfrAIUvQbseFhFUN3IEj8ifc6lpeG5R9XpII4jsVBWuo/i/9xuMKVz1Um0dL9E2mREEI+bEzdOSGjOF7CzjXdOF3hVi3xe6ESP/LNtI28ORrf/4juWj4wc2v+5Auhqi0jEkNTCXqcWQm+SbKqBYJxaw7m5A3HUx/uLUmhJLujHn25r8cVXTxO+SugooP/EygzzEsiPvpnqMER0Suze1YBU4rWjeHrkZGYlcMNO1sm2LjmzFe+SSDt7X6EplduwdKZtnDydnP3QNR0fiOKqfcItZ6yKNJ6Am1JVceNfFiR0+LX+NdLLi90pUfbaO3cKuQvxwTW/ann6Uki739ob8IYj44bPQB9COG2BRbjgwUOr2FrJJRXPwPTI0douUPkLzc0s1H3glG2c2CwCfRxuAvRCAh6DYIKxIhBnHh1kF5TLA6D4KK3SkbdSApFYs6KdWp6yQf00X3whYFRFUIoT46JJzYfK45G7c+oecV228koQbJEGVOVXdlFI0cOyOyxXvIG3lbTm78YHhWTlFChoSOVoWfGUI91pFJOoa4YGSbnVij8PqMn+1oPV3ytRPJVOSwQRFKDUZhFOGkcfj+xDAOJpdU8BrFrf4XRpf9aXfjqCcsEwBp5fwfKLstVyU40g6reRCg5YtR0QE4YmUTjl0RX4AYFSTANabKsnJnLkd7ELJQbOV6PlE5IhEYqFAM2tB1yFrWh138ff/aPVEXS5Z18YinXq4VxyIqcqGOA4qp0Zf5LQeF6hJ3M2MnRp3OJTITBk64ns8FibnzpwHmuunxKhfqJT9ukGVVISfLr8RuFHbM89HMpCPgNrL5r/G3mRRwfi+d9PUaewYvxZYTdaeS//2t4+p/LNwxNeNMbbqIEJbb8iVb61hTUGidIlE4LaA40NxZPTx3rzj5cR6QOGXFelD0ChnWyidH71YEwsnGpCiHqeTPex2ibzHV+8UccamlLsUAHL44BjA4ytarehkXv+XEGhO+gIwq55xQqY7vWes/PGfZKnRGonfQUrb58Z14lJ90XVsosbkyorYp8R0EJ9yTM8+Kuxqr3UYfDpnHFdWjW5BhYwvjjT5O+sWUD/GYEdxEMi7tyG3BmHH/i0zaUKE2QS7piLFVCK8FqNkvQXqZ8/OLVfUf8RWVoS1kAElfzaPGIYT7ucKn4hmhj/dM5jI5ts+Tj3u+/24j3Zxu5LvEeyFfULSiCOwzcPYtXAryAQdVu/DtbgYbEDVnlguKzb73voJy5P4RBcEm3K+qwOThTfA42nQaMx3suF52GHrJ+lDVKRTiNpF7pyculnmdt8CQ1WLyLVFTf3EBFGxRt6K6zXYdQGeg4Poa5ShlP2aCzT9fBElpTuC9VAtW81pMOJKUVcsJbRmGO9kM6kcc6FgxVaVWxZpoQ+Ltz4284M9M8jW33kKhsJalxC5zUlVb4vJcxzqv40m0E9QE7UrK3icfdNZPcAjueGvBQyHsw1oKMqeZPejrBIvH0SCTaB6IsYWCNdtxUV9brriUak1D8jJoh8Cj2ubjaD9wCIvy5aw7w/HyfPkhK5rwbSO1ZflB1X0kR2YnqFV/sN1opR8PmEXisGsYBT+38E=';

const id = '14368';

const phone = '9080476159';
const moduleName = 'pharmacy';
const visitEvent = 'visit-event';

function App() {
  const [inputText, setInputText] = useState('');

  const [magicLink, setMagicLink] = useState(
    'https://star-health.getvisitapp.net/?mluib7c=%5B%7B%22policyNumber%22:%2211240005322400%22,%22policyId%22:1442,%22userId%22:1005320,%22magicUserId%22:41548,%22userMagicCode%22:%22gXGJC5JY%22,%22policyName%22:%22Assure%20Insurance-2021%22,%22policyStartDate%22:%222024-02-21T00:00:00.000Z%22,%22policyEndDate%22:%222025-02-20T23:59:59.000Z%22,%22isHospiCash%22:false,%22isAlreadyOnboarded%22:true,%22isPolicyAvailable%22:true%7D,%7B%22policyNumber%22:%2211250007942700%22,%22policyId%22:1537,%22userId%22:3462363,%22magicUserId%22:42010,%22userMagicCode%22:%22B0AZu5xW%22,%22policyName%22:%22Young%20Star%20Insurance%20Policy%22,%22policyStartDate%22:%222024-07-02T00:00:00.000Z%22,%22policyEndDate%22:%222025-07-01T23:59:59.000Z%22,%22isHospiCash%22:false,%22isAlreadyOnboarded%22:true,%22isPolicyAvailable%22:true%7D,%7B%22policyNumber%22:%2211230003549501%22,%22policyId%22:1566,%22userId%22:1005320,%22magicUserId%22:41548,%22userMagicCode%22:%22gXGJC5JY%22,%22policyName%22:%22POS%20Medi%20classic%20Individual%20Revised%202022%22,%22policyStartDate%22:%222023-11-22T00:00:00.000Z%22,%22policyEndDate%22:%222024-11-21T23:59:59.000Z%22,%22isHospiCash%22:false,%22isAlreadyOnboarded%22:true,%22isPolicyAvailable%22:true%7D,%7B%22policyNumber%22:%2211220002133602%22,%22policyId%22:1573,%22userId%22:1005320,%22magicUserId%22:41548,%22userMagicCode%22:%22gXGJC5JY%22,%22policyName%22:%22Family%20Health%20Optima%20Insurance%20-%202022%22,%22policyStartDate%22:%222023-12-29T00:00:00.000Z%22,%22policyEndDate%22:%222024-12-28T23:59:59.000Z%22,%22isHospiCash%22:false,%22isAlreadyOnboarded%22:true,%22isPolicyAvailable%22:true%7D%5D',
  );

  const handlePress = () => {
    setMagicLink(inputText);
  };

  React.useEffect(() => {
    const listener = EventRegister.addEventListener(visitEvent, data => {
      if (data.message === 'unauthorized-wellness-access') {
        Alert.alert('Error', data.errorMessage);
      } else if (data.message === 'generate-magic-link-failed') {
        console.log('magic link failed. ', data);
        //add analytics event to track for whom this is happening.
      } else if (data.message === 'getDeviceInfo-failed') {
        console.log('device Info library failed', data);
        //add analytics event to track for whom this is happening.
      } else if (data.message === 'web-view-error') {
        console.log('web-view-error', data.errorMessage);
        //when webview throws error.
      } else if (data.message === 'external-server-error') {
        Alert.alert('Error', data.errorMessage);
      }
    });
    return () => {
      EventRegister.removeEventListener(listener);
    };
  }, []);

  return (
    <SafeAreaView style={{flex: 1}}>
      {/* <Button
        title="Press me"
        color="#f194ff"
        onPress={() => Alert.alert('Button with adjusted color pressed')}
      /> */}

      <TextInput
        style={{
          height: 40,
          borderColor: 'gray',
          borderWidth: 1,
          paddingHorizontal: 10,
        }}
        placeholder="Type something"
        value={inputText}
        onChangeText={text => setInputText(text)}
      />

      <Button title="Update URL" onPress={handlePress} />

      <VisitRnSdkView
        baseUrl={visitBaseUrl}
        errorBaseUrl={errorBaseUrl}
        token={token}
        cpsid={''}
        moduleName={moduleName}
        environment={'sit'}
        isLoggingEnabled={true}
        magicLink={magicLink}
      />
    </SafeAreaView>
  );
}

export default App;
