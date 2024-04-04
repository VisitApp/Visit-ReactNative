/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';

import VisitRnSdkView from 'react-native-visit-rn-sdk';

import {EventRegister} from 'react-native-event-listeners';

import {
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  Button,
  NativeModules,
  PermissionsAndroid,
  BackHandler,
  LogBox,
  Alert,
} from 'react-native';

const visitBaseUrl = 'https://insurance-uat.getvisitapp.xyz/wonderwomen';

const errorBaseUrl = 'https://api.samuraijack.xyz';

const token =
  '78ftP8oDeLCCdBp8QH5d/o7QvxeFBcBYT1nPtn/LgVQ3CW4R+xE5kSZJZvtNcfTwtOeD2aSoxjcjoJcaiSFY1CjyuH2qAHG9JX888hFKQXutxbumqxYaGZjK4nUg2Te6JxfNTlWjFk8/cPNI6JWJaypvOpMgLSpU6v53G5n/pwkUwIEZUst3utaVuF2deBpa9eNIT2CDadScgplcHI04gqqBEbkf1l7osI6qkNMJBE4vIxdCX6OjYMIpWo5YWBTUbATXb81SrkhmV6Kg5uKefjmaCh9Q3NRGUKC+3rM2qQgtv7RUnygqCLnuH93rhUOTb99rSCW7UNxpPo257oXxx/pN8P+xquP+2Y7z1esUjTezw+tQDoO/3EsTeZq7/B4V7aUOZgz3EYSDIXj+7nkJ3M3ONJJ2CyYWXr/YIuPl5xVWSui9i/IEmJDyiqOe9fToG/iU9oUsf9S/uYEMZB8koklSmTGX5XXaWYvZb4IpUMUYbsHS0yAyf8m8icd8zS594NDpj/N0+DBVY+YFjPViRXTC7pcAt3/83f8LYLxUQd+xSHAOG0cGsAXHh5qJKNAG1j7oTLKq13Rjxd8maX0RSjXrHgWmuIYuYGUWU7R2unB68z3cpjva71nZSEyuZi/sCDamtxoSf5TT1hA5tBWP5ywTwfHb+SUCBkG9t7cgjHP9WIneFZKU5/7XGeAE/PFEBr1HlXeUDdycFg3E4RqFZZvOXjprVeUaTgA23gcKjxtG1ewfCU/DIEKrmEcjVlHUz6ULNQ+pwKew8puYaZT34xelFYsavPLA+ycdrWKP8AsIHWRani7tKn3G1GAN3af6MUaSxo/JuZJ4AQbXCqZL6wtxa1xooLIumYokmqJW06r1bnpGlS/1d6MLaRKHElQKxVTBU++gB6WYeZVA3hq19Qv3nqxMFde3boPuMQOdTCFUOVvQgbMSKna4XI6bCZY1T5S9sY9XdP/EfhhRm5p64o8/785TcuqAT6QDekeF2y6HmkVPoagFQwlNoeJaQqcMTml5P1WN5jS7H49xxUu0pGkdMOnyBtNLmg7bflf0JJox39gOfmVVnWHTLx9KkR8BxgvkKwp3xdS97Dl9eALL0+oM0C9kuXQTrRQIuE6oi1PfGbj6vft78hbQqZQzdU0N7LwOVDrHIwXvfU+pPR3On7l71zlhGEx1kXLkZuy+lkwsieLB70kGYfWzKXW+MwMIUQ3ip/sQ8RvAtrVoSp0LUsIr6scl5su4sCeWeKiyHq7Bj2Lm0M4gy6luq8uXWc6S3Fqx1EUMSpylR6+qHfTsKw/DRcP25N/IWuQa1A4ggfc4sJp37EeXYjVSPbuNjgVGerRKZrutQnmwRU3OSYT6oY83DRANTOtfsFPaEE0a4G6anvnlnr8xlafbGVsna38y3x4+kcIKtLgQGJpvCQYcqWOK8fivO+KTJnZX1sfSQkQeDzKyAeucYZ2XxjdIz/Iaec1oD51W6/DOGR7/rC3C2TJ3VqKDoZ3Oig81UhFGgWOxxImkcIset0/HBSxLATLmkEirwCcJBtNe/bre9TEzK/efDS5zfcpO4Iu2f5B5yCaNoMkosDNARhYzJiUEIb0k+iwiCmsnOOis9a0BPw/J5U32/P1mleR3vqi4ULLpTvvDPRXgiMtaKFJgdQ4dBbJLlRe/S67tWVZISQ/PUWUG//V52yNch8766XeEnygaOuQ6WSrqDGDSMt06KB4SThXhIPUjMsnQAJEFKSf5MWzEqL5UkMIfXFfFFO0D1imNb0h2+zafoSyy5ls0uDCv4HLvsRdPgjFKBYGFAieYZosoIRzPEG1YYPGOJCBiDYgxrDsr64oXJeNdeNoevGMxDuAJVtMEsN5FDfR6pf36+Prs9+8uQtH+S3ome9Ui9zf9uMXn6rsAbe3QB6rJp5J+eapqXgObbnz0PaxhmRl7kCbtLAusQWaOx7bOnIMYl2rEmjg=';

const id = '14368';

const phone = '9080476159';
const moduleName = 'pharmacy';

const visitEvent = 'visit-event';

function App() {
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

      <VisitRnSdkView
        baseUrl={visitBaseUrl}
        errorBaseUrl={'https://star-health.getvisitapp.xyz/'}
        token={token}
        cpsid={'CPS1871416363965810178'}
        moduleName={moduleName}
        environment={'sit'}
        isLoggingEnabled={true}
        // magicLink={
        //   'https://digit-visit.getvisitapp.xyz/sso?userParams=rZO06fTBddwYlizYcahUHtU6RdAuHD6hcPoxKlDaj_B05A0ryYs7Mon_P_yX7nFKjeud5mN9T_IlE_ch8Cbgye8y-_z6RtIUWgiB87HweKGPLFSywSuzkO077oa1srKJ3ENWlkVuysvvOgplM7MNNO6RuNHWjIpxmDDxV8bsFMCNBynwEEKQEKi3QyjE5bpYYicqd8JRCozN9Cn-o2iY1gPzwwC86_OR0ckCukoZP9_S7_Pt41mrH8IzVsjX6JAHsModhAEaZesQfS4wc2uq0omEREyQ2V4PG77dNFCWkd4=&clientId=digit-777'
        // }
      />
    </SafeAreaView>
  );
}

export default App;
