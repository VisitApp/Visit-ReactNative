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

const visitBaseUrl = 'https://api.samuraijack.xyz/friday';

const errorBaseUrl = 'https://api.samuraijack.xyz';

const token =
  'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAtMjU2In0.smR_ZBf6l13ek3vtli8YaMuoONf_Pjs5Gx-AfqszNizeJ5bBxBS_VbTiWIkKqjmCIRpLQPGz8ZdksDquroopO_m7rQYemirT9KKn8Fk_rbqR-Xof_eHHLBB9TL5ISniMwJuy6K6dilgR9tJBVtB1FdX34WDhHUsEwjP9meYXN6464jJopnM6xsUM4VchGVIrBPHcMIBmi-BEDR4h7V8IkYS4bASuSfG76KsmLhNniJhjVfKUxddqBfM_-yRyQq2y0PTU9U3Tva98ToShoY68C5_2R7Es69vhgE9PfHLtzVCzkeTacgm3alZzNQ64r8akFfjXvjYTgTgC79BTwAeP_Q.z0j5FslWy8Mf1N_i.mgIs6-JvpjSc7HXVtDB2sAbBBOIY0dm2h3Q7kiA8bjr1VK-HS1BkoZI4IwKSNTXQVrlzZuDIi75dgTI_qjBJ--9bNRcAxkaARFitADiKI58hlmYxSfN-84WYCiLqNoxJmUGF7gIP6XzktkF_aOZIblfw3Mxx0yOBUCjkqPqQpfwoCiopCMYuNPtGTkmE4Pk-Pl8IVNk6UGPYAIjF7nl8zj0e6QkkalfLnJ5vhNr3PAa9SEUWkorSwFURyXmsQmwjErvL_H5izr_pblpE7RrIlyt-b66CwnHZQtNjBvWxuwVDxpkzbe2WvB24Z_WWvSeBn9zEo8Y4Z8dRbBMQCLEotVNagza1x7jK9a-yNSXNXn0C1V28O5SalnrN83z5_zlIrIYiWsigYKoQSeyvh2XJgzr7UHRWPlnIKOrsrblX1nnP4m5slrFGaZr-ONQWp_p8R7rQl2up2FhG4RCezp_4gXT5lvJnfmsve7iZ1Z7ImYXuSDkDPcyvxDnSrhHUbTn8pgSNCjs17v-wdIc9y1-Hi3BR3JToxfpA2jVnolwS-nlV8E9Lb_C3b1GLBOjzv-cbLD5vUt8aDgE8jP_lPT5ZCZmFtMN-lZI0EorTT1sa1YUI7WF7XHXHQg554x1RbuB_-pp-oNgCfHscprcV3zojy3eMDs5VHwf2AmHLQQEqETsrSWKo16yfLGbRSjWeItSwtEqTDkIA80otILZ-oEnxjnTqqSUlU7pURqRwvJH-9smarb25LT11GbZBWLW4oFRUAtBKuj5YbHJPyKuj632vMKnGcH0kcuQ87fwQqtaPTi42HuD_rR7rNXuac0HcAEcbn77qeeBRMSUn7XP7grGi1wjvf1pAlD7vp-9huDizNlQ9k5IE1_OrKkUhFGopnhQ6lmdeGAa5JictIIDBH2Pm67FyFhTErNXm-HtEE6FbbMjJrzXEUg2On4aCHN8HM6Dv6vSaaUm49Pye_QhglKoiukbaNOp0MTMqiVzZfigf9ZN5GcD12w4yZec4QRQawRnFwg9emk2omS7169AkuzgYBSxqnRkx5-uMOOG0RkP7yj9GHctxs0StB6-5HmirjmetB3oBPTvUzDW38wjROsWWiP6fCdWTryN7pYR9HNOnIyXJUIFkXrmsR99f0UF0yldWKC26RuQomXcBsN1EPHRB4vYb2y11xAGLH9jf3aKWnWl2a3JVecp7Q-LE5ZKeYfRbZJ10_wVK5f7A9GNfnZ_Hn-rfWSrNYeZvOr2tlT8KLvUpkEabMeMYNg4ynXedGiBDg4KI0CpIL8wkc-5Ee_kQYYRDjF-BuKwVt-dNax2ChPPqA9jiStPZ1ouTCDD9rrGFH9DF3Woq3AQmjJcvdYzFrOWkyTBUgykvS8RwBb_cjHfU8tWzEdnaWqmU91JrB59surcPhzH3EpouBBlwV1qudvCJF64W0GL24WAUmgumL6tU3zUIjqOeoH11PWK_urMk0qW1tqUWeimb2_7wSpeyOxN-1_KImWJaG2Pa7MzVUILurLyDY_mb6W9LFzsoeiZVWR_JqkpNUTqLKI8e7lCEM7ksG7CT3D8kLHtGriKUgvPE9-MOQ_6jQ1ovOcb8Nr1zk2xVHK5R1urey0TqmDWpjdwQYJJ6AuuiPh8NRPYhpiB1DblacunKL53ESLR1JC4Md00EI3u2s4tVDidoIjeciZG4k_ovR4Q0Rt5-lwwuwbcFybn7BpKdXBZyl_IC8NqiJ309P3qmTVk3j7sEItfxGUMRj0bVCF0jeD2LoTtD4Afb1omxNJXhvLHA9Y7tYDqaxiMFbsLxjBnmxb-ObYrnakWC3VH0oQ-Y8mWr1GEf9sY0Ve0dW8MK8Ou2Yyj6nmvgJax1jRmBg7yeLzOQZ6WJROOZmvfFvqK7oKTTdKNnzjeBlSDisnaNwlB-iiwL1gICRHZpft_Ym3jax4qnD3s3n-8C7V1dUBwP4uGEASavZPtCQzR3SnPleg5WluGdH_74azAUCC81zbaoZI_X25b--rNXI0Hj3BL8lurwmyUQG5_1PxPogXbecxY48FQiFPHluR9c04nhblUOlfW7w58mGgYsFiMUnPfc4klAbY2jESRsZ6hn5Nbav3Fhr61KxxlRRsEbUM47RCSvmsYT4u4TJJYHpHWUP2jWZbLZK4CW8Szc_wiCSoFAZc_AXyzXnQ3PxAFBSIfGw8EnYc2K4wZNRBPVFFvMvexEcEI1NjkzYwze3PvEcUujdmZdRVSFCyjuQN_F3j-1qO_fhYp0datc-snzQ63JMqO15Zjo6p-x94JHvc1kaoKrqo2NLz311Vek-RdliOfQkNH-L_JpGMt1xQJnth-3JwsbDwXWGilHn4hN2t2If_RsQzQDu9IROfHdJHrlYxR4RZYaD9RiTs90XEH5T3jzkunWCBazF8m6XRQASs_i88MoLwAspx5NZCjXuxSiU87C6GJYPa8kd22D01aTrvHC87TnxLxn_WZgYxz1uVChLcL8vzGiWhnkUZLfxrKJUpSTqju-WUc8P6gcyzZ7DGnjLLRPGDuBpdmokBZzJErxBSjcZ_LYkfYN44T7BNNlz8rII0abiw7HFjpYPAh4vpmvbqfUE2NEYwQKVyiAo3kTsDIFZh3B5Zk7IKTt9EHuRF0WaLMZ-VKUp5YP5fjPi28UUnt1KUsf8RLvyI5LNySc2KLh4wp6CoQkTrZhHk2xS7cCb9SaEJmNFYpfHH9cdGrkYMzm_rUqtskO4raXb7WXXlPbP_SUU-t0lBkYRiHBdGCq3FOHAUQ628Qz3el0p5ZTLGGg8qc82bDKN5O57241YTLVti4XgTpqcWqhV9Miw-OPj1_I3x9IygGTzA_EiHhn2Qc5eaSY6e1-y-4AgJH-eNd09P2vqzFS4s3BlE73fNmORivuJbheXYesFMrZ6EVfZBDvbG705hccozHz2tlxSl60F9bdVLQqp6UQhP3r4TZ3sb_HMqy-K7doryzQDbl1mKLyi5ta2IJJaG56pSNV4ESoa8Eq3qQXLKTR3La2QpEYBz8ffv2WuKTeTuC_KYynWJZyJ-n22rEalzH5rcZF8tZLpu83mdlfe6hE_N3NGjB6ngpHGcMgUrDswHBqnK_CCQstnexBiKrW0eDIt7eOfJgSzbcGuH0efYbYH_IRUo5dFzCMMUc_F0og6U7UbkC5uqjMgTATHLZQjvuELWtKwOr4eBmxygKc3c6vQMSpbNsmYEpM2QsbrnpFUbljJg6OPldWVu1TU48gI0C2xgPWRHL4FaqdLhetngzaOkuIVKYNyll-e_cH6WdsRURgYm8MrWDXZzKXFsp6YZfMZK-eNtzEql8NV65RvfsmCyVOj3OxDjIiOWvgHwbnd9ybnGbX6FLJafXXXewppVj5n3xHa2WcD0vyAPst6yRN_bBNf-Qv16gT9EystEG9vxKoMrYPmHD51lUsu_pMk8LBGRObTfxF_WxbNT6Kpqcwu_XGQf46cDvNd8WAWxBCGMzzbSpn82a0Ky9hNSWdbIjrS_OmoD_FPcnnTK84vjVIG-uUcgWsff6Ho5GEy2KbP8KivJMM3IILZYcJKqwAREsF5WOfIKjp_V6qsZHPqoC_LIOeb4-PcvDsI0dGnIEP26dMSuXVDZR782sxQxFLaXbyDQyCItHrSqfbQULc58U-E-KLR6GAlxSgtkh4xkLEVaTiUB8k41nXp4J5Kkj3V0Od7X3xr0hMtDvbY3_ioXxdEtZF2rb0BtqMTw3BiZfo5gs4N6XslAJ1wx0uY_SsMZTiVpEe412h6H7x2O5SB9wu1LmzTT9Avd0ZFtemPkRGlhJXKkzt6ltveZhNI3etg4Eo5FM7HkO8trV1FXKcBRmuU6bh-RoKOz1691Unuhkgtyn-vPzdM2ZbgP8-tKryF55k_j8b2vFLuASQHXd7BsT1RjLujMRSWi-a2ftVgslB1j31ZnxCmPMmpmYJx9Zfv0y41frV2o5elMPSrpGhmhbl4JRKyXiyIaN8X0Uul_KNazIbyCQ55pG7IKSazfTQH1A3sWnhJQNMvnuavXzVhdr5RPsg_IF0Jcqj_l5MDIAiMHcWRLAsZkYqlccytUY92muoy_E9KLzDlcFJKLBh0NvwgKPLg4eWX7P3kLa6IU-FqCMon-XK05uOMchB5T5G2f_7opggPoYLlhkIfnU_8JefdTnskMRfy2-vefwpc3IrCOuicVeVJoQgcLiHQtzAwrajoKk1JTsG5jKlH5aVoFN9G7RlP0ONsLuD4qAT44KVPJyI_0Gy2LmWGj4QbXPoRF4qq5QYeC2SoR6Rys8Ms-WcIsDFDFa_8atnymnHhYafqbFLtnydEi_heWWHKF762H7QvvZ8dTH9XQr7-c9v-80UTeZbJgQzUHXT0QFRtTC6vsnxda0SdFIY03bj9ltw3rNmBpG8e0a1xREoTfTe_ViBfGwA69WJ7YQAXHOZOk2uFXRa27-c5PxCJboddNrK9T9LHchMg8sIiR6Mqq1_ABKOulnANxrY9ARXfGsYjQLuUDr-elW0R0r7jHzwybOI2j0LwB45p6fYE4UstkoG7qtUFCEfoAm_ChhAliWq6Y2U2A6KgQ-gW63q6-HSLkwFOW8ZKdXfY6vKuWLZrvpRAMzLImPGd4sVXncIG4VCpR9KjPLCERDk-Q-pAsOAUJlQshQGLUk7KNXUuRe3kGCwPYJmFV5D0Dq33p0uCOwzbIfHezRFIko6raPguHClp4LjHOkkI6VSk2Q1vK6E_hm2D0_Ysrd8p97NHFKB-oTDyH1bT-tQ89MIXRwiUU_lS23eN5t-c1-5v3-mHW2HGwHFFjb1UfCR6FtXt2BR8VaIjhvtJASbiN6IuAC_EZc4czSjjg_lAK3M-51BwbwxY9R9ZABDrEVCP45mFj0TlBbbDn6J50mqDkGW07h5IRfMEShlVCsstkJYcAzDBIgB68eBRekrI9sEbR9n2GFpKJVBmDrID51eLF3qEDknwdJu2kgj4op1rB8OLJj_BjIriLrDE7cJpFTqLe36HcO7iQDhUJbM24RFHhiWApxULsSNycsYqWC2ORR9XWdR_dLd8SrewA_lXc2Rl_KUZI_nrQ7r0ChmClHFJ73z--_sOdF3VGSRLMzIN8JLfsyH2tzVf0mlJCujDxgCfRCAx1oTAZ99eJDpsoMkOZzX22rVWMAlE0xQC4Th-uMoUCivD4eSJWROJf75jvcbcE3gg4MzX2GEKkWQiKK3RP9xMLulDRMHbZLJVn1kqM2_Tx_p8ni5cKP8mrT42BsBooVFhxLAijEQIh7n-EWmCIiAhtHZe_Xl1eZpToAGqqQvsxY_upym4hSYFx_6COvJXrXCxoKN584p0s6WRe5vWRPsyYZHIadB6Lc_tzmnf-GDhxuH5y1i6TL-jyili8SK5RsiY4dpQTFOfUu4tfQzMwDafv4MkRFHTkOhfzUQ5sMyM3dS1sjFie4u7SCxGkK5NkmRGenv9LNxlTRgWrcNDmuTn0hk7pC_wmyUtcRtJ9dQ0GYCxLCXtTL607jm5wW8XuuTJ_YkafgEfn_yMoQGc6q1ZdMJGf8HMxAalQcBvr3Uk5mdb0_j6Zeh5vIPew-aYRTckK1Wqivu0XXI47k1RF7yOcMDpRXjeWK1_JekcEVJ_wYXRRGHyyzi0bTus6b7YWsdR2239PGm6iWm1stXyY10jDoEVl7q20GMb7i9MsykyQZWLDOl3CTuup75BNWSEN-A2e3WnqGaETWvkGA5zwfLI6eBcODh3jYJ01qTpJfFGts6qJBl1gOXrcyP4_gSx2kVCajHMOxS6nC8_mMrVqmSIkbrISXTSgdfLlU0xyjmeyHaMsFvtiqac9LGzka48MTzRUd7qkMOOi5by2oCuzxZkWzsCLCb7iU2vey4AG7hzzfsEmX-OTQb2armdoHqMa6onxGnL3YVx5OemT1oPk5BAd2LXVgC1dvLCbhnCZbn3ig1K0biYK0zR3Htmz0BTT4mJvreHgR8q_KEr259l5stVlG9WddhbCAVRwEzfpvH7j6ypah_bv4feccA_12N8sUcf7heB9ErgEBom2RJQwhk2WUE0z6LTGLg_7A8tVbLjOg.fApaVXDudaThSeTGNyluww';

const id = '14368';

const phone = '9080476159';
const moduleName = 'hra';

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
        id={id}
        phone={phone}
        moduleName={moduleName}
        environment={'qa'}
        isLoggingEnabled={true}
        magicLink={
          'https://star-health.getvisitapp.xyz/?mluib7c=XNES26N9&tab=book-lab'
        }
      />
    </SafeAreaView>
  );
}

export default App;
