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
  '78ftP8oDeLCCdBp8QH5d/o7QvxeFBcBYT1nPtn/LgVQ3CW4R+xE5kSZJZvtNcfTwtOeD2aSoxjcjoJcaiSFY1CjyuH2qAHG9JX888hFKQXutxbumqxYaGZjK4nUg2Te6JxfNTlWjFk8/cPNI6JWJa2ngUZ0LMIHj1bdDu5cfdATB4hYetpxR09PxD9Qpf5DJM8Oz+ymyjiuNxLtlGovU+gT/U1tBOC9ALHRVxzAL2ag4YeaSigtsQaLZHsg3ee2oHVvV4dNBwZg4B+0Nk2qpa+weI63P0Wt+Lpm5OzVtxQCHuffUE+9m5Qf2IZYXOBwBxTxgPHrokKy5eCELNPDbYwWwYQ72rnu+cS+W2OBafEEfnLXnaIqmZhMI9e9kKWV3KOmwtEUCA9ifAjXDEFZGxniZEzn5JOmz+qFFBAKIqKhSivoHgRjStD2XKCTMmvcjNecgQ1TZH17EZKXAb5KXSY9tSet5MMoXmhFXB1t0jr8dwY5ZopNcnmWlZX9I+CUPtYSPP3rRlgyms9U76QVY61MiIL4J9QzAr3q9aPC5uDrNuJG+rHSDsSrrR+DLGv95C7NhbQIU6Lcqi8P9iUzimB0mlyvBe1PGUglilKMksDWBXKSjiW6ziZZRjZqfHzllZ1Ei13xhDJqSCPdvu481tDer/0JZtSkQGVMEjGdmM7oXpZ1q3/ZBwVja1udItbY7kFlwj53SZHoikvSxP/zZvORAgfHZr1olUfDikFLYnJFui1IjSXSHl9Co5qKQrqfZldBXQt7uJ5ElZWhZ/Xo1qgLDWq8YDd0CBc93lLBljgCMUiy7sEM4WIynspOxKUGLKqV883+iAqP0CtnDOXC4hTeAJ4UyectwGmnMirUm2cJ9TllAOjeFTBPF5GOY6I0yP/4ClST4AfOFNx9N+hG6VmgHoYFC0RW2dDVEDz4L/7xFtRUfH7Z64BoMbdy7lo0IErX3Fi8sW2H2JD6G1GAFW/BWX1oXP+ghVvuhwliRiH8ukG4aPYYIdrS9kPrmi2UznG7y5wkMv07BQoXDxq3xURcQUtnvgcpPkw/VWWqh5Hzr7caXdCqt6kGEfSDYyQPDIJKEsPygSmN85INEcfzv5QmA4jnGAQMSGcOXGIQuH4zksEGh09Bjsd+hjBc/q1S/aWvdcf6jCOD3iV5ib1NJzfigdf60hgH8dJBtEv7hsSPicl7Pr2+wocnk425A+jM73AE+X/42mcQZyrVFd4VDf8llyrdEC3zBB188mvAlQ8L4DIUOVBBkjmO4Tcfr7ISSdtcxezOb6s/LzHk6GPC+F28eO7y0luvhVyRlaYBchdc7wB83n8mh/MC/dfHL+4ifaoLbF95xVPnjbW53LoRqf5L18ALzIigrgUhTNxFBwdKmNIK5iUVOGl+KIS6uqTOVoFcVE5Y9Z56w5twhapMH5Tj69p20ObcvcLnMTgoD2JPTaD75mlTIOrPSZPmONEpjlLCzs88UtP0CUvk9n2fp0LEBXLu1XLNIWzHle9J/d8ctVDD9B+8/BB90kZl2bNYf6Gihe3atg9Gn0bFPh8QCwH8zKSi3BXBU8Xs2WcSRGgNFYq2hwFZYBHwEQnRaPJ0aOqYDZf82LNCS20gizilqXo9I/R+oP/rjmNWaqRyd9ZKmmDmzHGta6RKVgszkgxGn9O7UY0Hi4iBE6p1qKEQdjUIKtt7uBWMbpGVEJLjInDipLX9TfCUEVHQhvnCX+XlOdPASA3CCEzoryKcpoHst7YmWop3VtyZ/obAlNYthVHM8dHb3vQcZFrr9bt+XjrHNQFOSRXbpGv+I9z+jOaUHnD5XOorn2j9aHW4+yS57mDErwaNG2cx6qrfQ9Oi82ICaUqirW2EIoR9BKTmASa0PK0SyuEny6OKO1uIWmOhfzJf3PcYv5APHKmVBQHNT6aexDf42JMkvg8aeS5kHMX2Z/AKfZnanOSO2K0RrG7pMRNg=';

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
        cpsid={'CPS1414555824431761526'}
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
