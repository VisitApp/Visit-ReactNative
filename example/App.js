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
  '78ftP8oDeLCCdBp8QH5d/o7QvxeFBcBYT1nPtn/LgVQ3CW4R+xE5kSZJZvtNcfTwtOeD2aSoxjcjoJcaiSFY1CjyuH2qAHG9JX888hFKQXutxbumqxYaGZjK4nUg2Te6JxfNTlWjFk8/cPNI6JWJa2ngUZ0LMIHj1bdDu5cfdASMHEa0f1dtKCyYZ4hwoEPt/N+/WHSfblJHg+DIB1h4WDXGPyd1S/PRzyD/xRarj/5wlaOHjxxmZ7lH+06suldnAUZJ7PV+AHiL/sMD7hrMrel5fG+fxT1hUwkKHTjiYJA/rSBVVS7KRcCfaHbkDjY/Gn2BOMYCMcQF9ZhAX17UWV1IPYM6q7TNQW+RHe+cX6Vnnf0sUIrkqAZdHpqjNUcrENguuoYYS8kyr5RyCQXfGy/EZBFsilCvL/NfYL2UjQQmK6G93/bW14JIcFVqD9NA0G0ERNekUke0xctxcTFKIJggLgUiaTbajePC3pTvG9kNYXgJYPRNRb3GmQPwT7YTJ+cVAKS1gj7QxRxb0CA72LLY9c6k2dtJSSZL94eOcdDtUhR7NnOIqHHw9lLNkKU5JVqMthZIzu4Xy8WKC0fF71PTQskTicT1km1qDP0XeJ4KT0o/EsUAXj9i9jopV7Tplb1C4vxZwgedV2a0IbEtbaHociXpbjOIACysN+THcCzBr5vyjMPJwKQT/J8tMu555nWXbMuK20fHe9MuepG07vAHcxt49dXycHaR2qQMzqKjU/rjea08ssLz7j7BVfgF3VZ0oauOE0KfmRFL1MgOlB01bfLQdpgDtwUU3L6nayDTm2pHR4Wdjx9W7kBNqtvxVufTJKhFjvy5mdhliyfxEnMSTT5NQEgnJdoSn3obzNgpgYyjxFhL0XlMPkdlFTK++0ahJnN73B1hmhry06OUmQb3GN3u28/dSmJzHf0INiFiebguxPbn8nih80x7pru2jgRVsN0hb1Upz+JI7hsBxJiLfRDRLET2kJULXPxIaK5GG5v7+wS2SS77xUmJipI4LPM5Pb/nlPYPtJ2cKc3sJqJT1q9D/XedosP8N8yM6gL+pZCGgBOVhwsoFxOjs4a+ohWkiSNp7B9I8lwOAGkg110HiIblNOTLeZ1OdbCfpuCDD/d9EHbb928IJt+trnoimGVWbUPQURolCiPa4OpJ1Mjao0Fmv6wmODLfCrw12l7r1Bvv8fsQsPxPH0C8nOxOclf8eWpL5lR43b7AqxWQ6qr7yR6zM4w1QJDCatAF2C4R2UpOs9rMzSV0nsZv2kcPbTOGbvuAuee7apUiqG9vE6CjrO/tzKjaywIuim64XSsnBH+nYau3Pu6V5ec2gMe9DBpijyhcL9nkxk96tUb2HOvulgUD6xx6shHveO06WxdxSVC64/ovHHtZ3i25sQ839vjrZJX5s7dFr1kNCCDVhEatz7+urMMyHE040zpeBEE50x0RkCb5ndwh0io9Xi9zxnEQFHXkyMndl1czEOQShq6SkppelaM+SCEdd2iiw1bskpMK4F1QIqDYLbjfnI6e47Wkqz+znHJBU+2DAWT/qjbPz0eobXwZTQP0ss+zZh7kCFCnC7mBryq+4UoUaD8EhKNe2peqdVmFdmJ16N/bP7b1ZKcD1+qD/T56LkKoev9hr1dQg7cW3SISsgvwppOmXMmGdIDm8/exXgLyZv9OuvWFhbFJC/LzBLA4UmQ/i5cQ5yTudLQRvnTovWRJTRSbUGPWC3FX1Krc+JYAmgHpTb5V6nsa94MLoBsCzHHogtFuVPo7lwtDOUr4sHsOXysy/R8RZWwn2ecpYd5Jqrs/HQLZYTM4mOhdZfb0ZWlhq5ueKy1bBmbpIT1X+GTUSQDoTka43Q3dV012VxF1bGazvsNsQ8+Mvnle3Q+GgDH/Ke5iHgm2n8csQ8k8HexwAwGZA5kC0CppiZXS/YRkNv12t10cnIcscT947xet4zzsD74=';

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
