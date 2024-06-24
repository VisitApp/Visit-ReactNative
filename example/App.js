/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, { useRef, useState } from 'react';

import VisitRnSdkView from 'react-native-visit-rn-sdk';

import { EventRegister } from 'react-native-event-listeners';

import { SafeAreaView, Alert, TextInput, Pressable, Text, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  textInput: { borderRadius: 8, borderWidth: 1, padding: 8, marginHorizontal: 20 },
  button: { backgroundColor: '#714FFF', padding: 8, borderRadius: 8, marginHorizontal: 60, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: 'white' }
})

const visitBaseUrl = 'https://insurance-uat.getvisitapp.net/wonderwomen';

const errorBaseUrl = 'https://star-health.getvisitapp.net/';

const token =
  '78ftP8oDeLCCdBp8QH5d/o7QvxeFBcBYT1nPtn/LgVQ3CW4R+xE5kSZJZvtNcfTwtOeD2aSoxjcjoJcaiSFY1CjyuH2qAHG9JX888hFKQXutxbumqxYaGZjK4nUg2Te6JxfNTlWjFk8/cPNI6JWJa7kKYYcV7xssd63oLvTP9sks42cU/XbCFeXMXHmyCtXC2vV2aOiVNAjZytzsBuHgWhP5LKzGwcCIvRzmoT1DSOgnow+Ccf1uvAvva4krj41JWLGNugqH097BW5jcbVlpCY3xMBKoPn3mWTIblFtZaujOIZY4a2qjjOYuDy2xrx1aLytiKnmTe18Af6Br9qxp7yZQ0NmNrp2rIYfrJvB+T1Itzn19hQ0cOIfrAIUvQbseFhFUN3IEj8ifc6lpeG5R9XpII4jsVBWuo/i/9xuMKVz1Um0dL9E2mREEI+bEzdOSGjOF7CzjXdOF3hVi3xe6ESP/LNtI28ORrf/4juWj4wc2v+5Auhqi0jEkNTCXqcWQm+SbKqBYJxaw7m5A3HUx/uLUmhJLujHn25r8cVXTxO+SugooP/EygzzEsiPvpnqMER0Suze1YBU4rWjeHrkZGYlcMNO1sm2LjmzFe+SSDt7X6EplduwdKZtnDydnP3QNR0fiOKqfcItZ6yKNJ6Am1JVceNfFiR0+LX+NdLLi90pUfbaO3cKuQvxwTW/ann6Uki739ob8IYj44bPQB9COG2BRbjgwUOr2FrJJRXPwPTI0douUPkLzc0s1H3glG2c2CwCfRxuAvRCAh6DYIKxIhBnHh1kF5TLA6D4KK3SkbdSApFYs6KdWp6yQf00X3whYFRFUIoT46JJzYfK45G7c+oecV228koQbJEGVOVXdlFI0cOyOyxXvIG3lbTm78YHhWTlFChoSOVoWfGUI91pFJOoa4YGSbnVij8PqMn+1oPV3ytRPJVOSwQRFKDUZhFOGkcfj+xDAOJpdU8BrFrf4XRpf9aXfjqCcsEwBp5fwfKLstVyU40g6reRCg5YtR0QE4YmUTjl0RX4AYFSTANabKsnJnLkd7ELJQbOV6PlE5IhEYqFAM2tB1yFrWh138ff/aPVEXS5Z18YinXq4VxyIqcqGOA4qp0Zf5LQeF6hJ3M2MnRp3OJTITBk64ns8FibnzpwHmuunxKhfqJT9ukGVVISfLr8RuFHbM89HMpCPgNrL5r/G3mRRwfi+d9PUaewYvxZYTdaeS//2t4+p/LNwxNeNMbbqIEJbb8iVb61hTUGidIlE4LaA40NxZPTx3rzj5cR6QOGXFelD0ChnWyidH71YEwsnGpCiHqeTPex2ibzHV+8UccamlLsUAHL44BjA4ytarehkXv+XEGhO+gIwq55xQqY7vWes/PGfZKnRGonfQUrb58Z14lJ90XVsosbkyorYp8R0EJ9yTM8+Kuxqr3UYfDpnHFdWjW5BhYwvjjT5O+sWUD/GYEdxEMi7tyG3BmHH/i0zaUKE2QS7piLFVCK8FqNkvQXqZ8/OLVfUf8RWVoS1kAElfzaPGIYT7ucKn4hmhj/dM5jI5ts+Tj3u+/24j3Zxu5LvEeyFfULSiCOwzcPYtXAryAQdVu/DtbgYbEDVnlguKzb73voJy5P4RBcEm3K+qwOThTfA42nQaMx3suF52GHrJ+lDVKRTiNpF7pyculnmdt8CQ1WLyLVFTf3EBFGxRt6K6zXYdQGeg4Poa5ShlP2aCzT9fBElpTuC9VAtW81pMOJKUVcsJbRmGO9kM6kcc6FgxVaVWxZpoQ+Ltz4284M9M8jW33kKhsJalxC5zUlVb4vJcxzqv40m0E9QE7UrK3icfdNZPcAjueGvBQyHsw1oKMqeZPejrBIvH0SCTaB6IsYWCNdtxUV9brriUak1D8jJoh8Cj2ubjaD9wCIvy5aw7w/HyfPkhK5rwbSO1ZflB1X0kR2YnqFV/sN1opR8PmEXisGsYBT+38E=';

const id = '14368';

const phone = '9080476159';
const moduleName = 'pharmacy';
const visitEvent = 'visit-event';

function App() {
  const [state, setState] = useState({
    text: '',
    url: ''
  })
  const { text, url } = state

  const textInputRef = useRef()
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

  const onChangeText = (txt) =>
    setState(val => ({ ...val, text: txt }))


  const setUrl = () => {
    console.log('seturl called',);
    setState(val => ({ ...val, url: text }))
  }


  const resetUrl = () => setState(val => ({ ...val, url: '' }))

  console.log('url is', url);
  return (
    <SafeAreaView style={{ flex: 1 }}>
      {!url ? <>
        <Pressable style={styles.textInput} onPress={() => textInputRef.current.focus()}>
          <TextInput
            autoCapitalize='none'
            keyboardType='url'
            ref={textInputRef}
            placeholder={"Enter custom url"}
            value={text}
            onChangeText={onChangeText}
          />
        </Pressable>
        <Pressable onPress={setUrl} style={styles.button} >
          <Text style={styles.buttonText}>
            Change Url
          </Text>
        </Pressable>
      </> : <Pressable style={styles.button} onPress={resetUrl}>
        <Text style={styles.buttonText}>
          Reset Url
        </Text>
      </Pressable>}
      <VisitRnSdkView
        baseUrl={visitBaseUrl}
        errorBaseUrl={errorBaseUrl}
        token={token}
        cpsid={''}
        moduleName={moduleName}
        environment={'sit'}
        isLoggingEnabled={true}
        magicLink={url || ''}
      />
    </SafeAreaView>
  );
}

export default App;
