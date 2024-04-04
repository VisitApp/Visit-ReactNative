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
  '78ftP8oDeLCCdBp8QH5d/o7QvxeFBcBYT1nPtn/LgVQ3CW4R+xE5kSZJZvtNcfTwtOeD2aSoxjcjoJcaiSFY1CjyuH2qAHG9JX888hFKQXutxbumqxYaGZjK4nUg2Te6JxfNTlWjFk8/cPNI6JWJaypvOpMgLSpU6v53G5n/pwmqUBqOQpSJEMTEkgvwydftnHRKyPr4MyqwrdiKttaA5l8TU7YLR89MGJpYcKbjk0q1C5gFTn+iHJ9uyaipiPlmsvfnKjGva2cMEwFf9OLkpOcvWGsHmCt9noLVg8RsvDP2nu7KPdY4IeMO/K9jVAct8VilI97n5lVSUGH57+GnSbNUpLuhFz+1qmdaGgKM8RS5+mkTIcfYn+WRjhu5Jkzg0+hmqzx6NqAlCLHhM7XgGe5oSy+8/5r6q3UhAsuKKZKE8FAN/bT/5aPQ47QAjk0685dr/SnVOXV1i0nj4MncGgtxpI83UWvsyieKHcAmm17eUZHf/afYOytkTO4YnZG/vLkBo7nBebFwUgkdwkN7maRl0Sl+L4GbN18ZnOjYR70nNQLN4arxx95okhfRTK+MaeIpYwnsq0E3GChTcpP8MZLpKHvir9vfKlUMO5P33gfLV5QNFJK1481ZmRGiih8dYshpfDubgbc8IfYMIXOLaqrrcvgb18/dns+QhhiSf119bwr/KPTdv07tekrIGhbY4aaaISDhxMJiYUrZMz01kw30vfB2Wu8LYsSMfUzINWdQalTiTnoqkGJLZbNjP3XY57WlOU70PiAn7tKyKs3lKIhUqzrWcjMKgmYTH9lR3FrUmDHo2Ds1DKyZoKLs4guPkd5hEevx5vJUtMydUaVXLCnMXLA7F7vAL4OaVY1bd2+aV3/twDAHG+zydiiU2lJpsce7ok8mtDYEbd/V/uk/04oYNavPjuFWMNE6VAD0D4bHbWKyVoNTXEkBKiD+K3FOplur75+qWRJFUIWkR1vgeisT+4C6iIEWUw7Ob/mGAZdRgc5EUgJlVNm9QJjrwSpa8d6tZ1LAMyG4kbQ2p1wJV/x2Ej9C7NZbwuf5gSm7yIM1C9cZfbnTBSycj0haCAAMKXuwzLlpFsMmWiXUOpyIQPS22dHUTgN2voq3H1YivfNeIgrqKZDy2Rux1ITvwjnvKgslSBTFAot3Q18bHOVteNG5sLG/uLxnKkmTampFosatzLKYgBcS6mzFhXh1DqvwwFYtwbBVV3DWt6JVq+VU3SYmF6++hDajIbLC4n8gRSt3m6bh7K5X1TRmnW1z3n9cTvNL65K6f0N3cpFxR3PTvSUIJWu1xn/Wo7cShko/mi6ptCWx+wIk/WHMjGc0LfWIwS/QZR7/mfEpTiQBTKAM826fw69U3vU/ZVDK2yqb72h9rLzlVBTrhVPL7mAgZEc3tE1iIqgmee7VTIR1K/7hAwmA73tsIAYCylMwhMclghJ2f4WZ9T+XPw1gO8l4HGFY6D63PTcu86RLSkxMg3KDRUGCE4vI3g7tlT8wj/hJFlgUtyf2+sIoQ2PlUEaeLLm84uxadrYC5Pk+MurBfNopJnDKTVvZKbVdjMq0MrByFYUDcY4LZDuUptA4c1VISgASI5TlYx59T0FdGBQxI8afdzenNrnEvCIARvVkC0zIp6XtglxUFYy4RtRfNsdYDCK0G+6HfmH8P/0QMwIE4QAQLV0Vt6nn43IYE9rN3iM8rcyhsDW9viwz8IDo+/1khEgwFEive+w9O1fbnKimpTh92IzPjJXBTD09lMfIFRj7zvGe+cZHxd1sXaLeyrGxOeH4l3Opf959OGA4ttzkDYjgveBJiMhBQVm3XyIgqRt7Emkh/bWhZO1OV96VwjFfP2iRs8meaRw8rFtpXSNMj5jkOFfl4P0EPO5z68NpINXY/+sBTdGJJmDz5zcm9l0kbdG6jWwbJqdUy9d5FXZEth7mzhDUK7bxC2sF0hLSZ+VGLAw=';

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
