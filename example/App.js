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
  'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAtMjU2In0.AePC0Sj99PczUyZ9KzaB6dYkZGe3zieKxaSx6JlujyZ8d5pFKLEhp0Oo6xjpm_oYc2aO7QQMmS_2LoKn3pEgjLi6ZcPbRypxx5Hz6gCDt3wi_pDClCyWFmhI-u5HfmviMj_PdYtJ2djQZzh9mNUijtHcENoQAkXVIB3NbZysJ6LDXWUk441sqLm1YY2KNcMGKgkxvPdL2_gM0jpzMq5sOib1hGkT8GqX1vpHiPPs5b0ppua7YI1cyC5Cyus2PvOOwO-NYRNnBe7pzIj9Z2hOiqaqdZkWPByWGxGEFS90mfHOfDmVihsQXwCYX-NdbwjKinBPacwyWUVIsD8Gp9QY8Q.-F6vrPtDYI_snGxL.RywxN6z7txm4rcLcDWTxGj2e2JRmQAQs8h2hI-X-6qHJMKW-Oyk6FzmEOiPtgSFM3-ZUAetA2QRInaGqUigIN2IXcT17iXBtzDg-eL3nPozNnr9drqbQY0YJu2nqBR8l9zGkoiGv10dlmkLQy1fuPWeH-VKU-_Di-4TdUn4DqGYyFm_NH_GBHL4kEnmGwpyx0oA2aYLSa_G_gd2ctqRLi8FOBCOPGZzJxJjze0COhMjxUlt2KGZuOGlRQExPPg9yYy8C1J781hctgPv6B9c_lXqfd-ajQx4jbDYwhgf5oLQvYZt0QmM0hIhTOk3VEfTOp2cKdiS4eEMDdQOxd_qsc-VozNB413B9bCeRje04KOKcPjMm_U0SDusnDkouapEX39XGdCYtQSpfqHtHaXWHghLa9moi_ZGyZQTJSt8fGW0LXXKsrlWTbAmDfTidg-BUbHc32Q1SbR3lDFT2_hhGZvvCwoDL8CTDWAlqmKCGVKnkEBjY88PiAJ7rkwuA_312_X3A2pjH1xwYOLFXWtCLiRg4415G2jrckyWR-5MXFWtjgF3ZjriY3KQNRZaTCNN14tx9RDuE2sNNn2Y36Hw-gl1vRLdaroj7UNtA_sT5aqJWXwagiLEST48J-KVCRrF4AaqRiuxoeA-5h2RcPcVJO4DinRmU2_u1O0eG8uPBtYShzIVfJ8D6mrzJo6EiR0nHeN7ripm8yCv4bDSgLBaf-ItHaCaObF34mhClnQkruk9ObLBL2iIVQnucqhWf3fnRv7d2eQFw4b6ANZobplX5v2Yw7wfIk3N81xDmARb4dV-KkMZ1rYFjtvsV0WHrVl1-Q0gXCmAtP_tqy4bRoKaHX1kjL_prR8lkKSspV_lrRsdk8n5DKmmY0z2FS_Dn0nrWKm2P2Sid9oWtYb8IS7HVhhkPSqE9zgSB6b27lTKnw8eMtvQ7iBBPNYDbK6qu-Y_51CldRxmi7I_MZRtURbgx47djBshIQIm17NxuMnJhVmlsQemZDFDB4eYeb3-h8Vk6QUJo_8wTyMEdAughoYCCSaVOl2WrjR5ly__JPJLBOazuseR48vbKZaqQoAUNZlsbjkPTvOVqb1anFq4zoFekX8A7tt8f3PQvZC74yCUsfXtRGtMENH6yE_jG-qKPMSdfgr_W1Jq53yguEWeH0m8Io_xSmziJl7bdUrLp3JkUyqiz9aUWaM5qtVlRZ2p-ZyKSNV-1emEwHnd5OenXRYTqn7oiRGUo7OFaLtQUrzi0LDHkFGbdlRXetyvh88PEQO4yufCI3_T6TqZKJGeFi5qjumEJocmbWCXFJHx4grocvkekRArt99UaN8DXg2oM-mjMcrWL0yTDzFD_yLEhc_h9l9zWnHqiLRF0mM1kEn4Qg_QS1FKzqYR3TgcTCSNVAmLf4Xkzk9xFBFbV-wtuJozmfEm8c4Xy7rBTwgQn1sIO3ZuVnR_ijJ9qM1D3UNh1mN9HZmhqpE4Fev1UJimX0MkIoCjWdXsLkA1uNb245oOJqQ1KmvofshH9LinHQFjiVBqhKH7-ThgsA9sQfzis53-mbLqz7Bj8sWp9F6Qp-wmbgxkwEp6JxzWJh2KVLKOdP7YbmjG_c7IAKryIChAPCJVVI3ycbl7vNlJzNAxBfrDybPTKiuvCItldcvkqNB1uwYboVTg_DmhPTIYEK4S1zCk27TfCw7zcjNk6jgjdIUtp_juIQl6S3Fl3rGFuFtuAdCdXiFgqEvrlZc_gSGRZ5mA9Y7RQCHsvZSJYwxQHwQmw3Q4vYulDCzgIVbIRUjatRLUw7Pn_cSvkKtq7aTbzJS2udibS1zAK9N5pUIcerPqcNc0je5iuAdcHm3pHr0jdtUVFpoKxEnTnIVdZ-n5-htx2GcpOIlOSx6okAaWTsnFsobpNPZuWYWHLzEABRBdrDdQHo1CBV_6E-oV6czfB_mQ5BSzi5W2_6_f6DdNjRnNBDZFZGVggJ9DK7-l2Bk3rxENzTZVHHy036VsQ5ks3maSD3tCA6CtrtD3O6IAtaNKI0Ei5VZZEkFExIdoZM2yEuYI1Fo0hpj2XRChP8fKxLyPt_izDwQw-e_l2KpYd6yqqy_QsDRfPbyWwSiGPC-qMx532Dt3Fj6DzTSN0pCY0HLv3bOTgzXSFHPl7w6kiNZqmaHdA9JA0Tuf5VIgv_3fFo5W_6m9ZnAGY3Exa5dSkEsz1-vOfipEHjKwgPQRAh7UR2cISlIpJxE3_OOLaswnwQwK1QKkzxPLHKXlIMgCFfZueCPdZokw2d-lSd8gcN2JgJ_tgDBBIs5UIY_ZtnFTJcRIwL1FMkgZ9tulwpS167RHDBOKc9VgBN9nI4BIONjdwLmNav67Z8S1GuzKUmGq3bMBv80NURUUCLWurrOsuKJoh1OgyKIzshxwEOwD7wLE-n7fMZPB9U7sg2zdO8ds74K7eY8bK-BfsDymBjBZsiE64QunjuX8XuGo7DiYtojyGKyWOStYbr8Cu1oqwl3_eVsPn-H3ad-Nic4kW0bzBVcTzGLDP1E6wv9mIYUeDFLTSQq_6ex81z2vbxto28pI0F5CBLZawzV0uvp2queOGrKWP-bt5Nj-XgrdVCbnHt18cBbtz5Ioe4-uA4d_5sCof2PX4hq40EhnRrWPJI72C8PNqzfvoZT3TcZ0wqOBBgDgDlx_6tubr7ZPVT8_DlGyEDBgmzu-soWtF2w78a3EgM6bp6WZfOJF6lZM715YnxENQOZ3l2mWMRFExXFygXnJ1Eg2qofFwm0vu5VH9Uifzh6lgv6nbbicaKYj2aLRxKMeFbs9gCcyV1nSDcR7IDP3YMqvakkVguTXq-sYeKZuUQsLyHRn9cCLOo84_BxEtxyh5xVq9KgZ80mrGwftGl32rQeUKzgvgTMvtcPepIjbJ0QslPUxjv1tCgl3d1nm1TOo6JS33PMda5r2L_EEcCG6ZvzaUsp1t8sxOEalLnuRvYBfU1fZRtOC4nGEKDXRu5V5OMVbj1EGZ1CbSq8WGNJz39V5ZmYPPT1Lv2k1OwVrjuzWb6Q62pNKlc1qeAQI3ERpvi4r3CYeUMELRRZLahaaZFZxHFYyPx5E5RDoSCcxKiCBJViNxeFLFNNO036f2-CBSlInep3UYHtY5cF65Zm7SjL78-fOHqycO5knb-wooNtkOcWTYXnYzbAavhnBajjxDwRi2yMCU3sZPe5cTvqCtTsTCx4XJrbEFiQc1hPDEO7uemvzipYDuAXM_-rY9z2cxaFrJAP4TIv8zUD8oNvTlBTVe0HvAHT12rc_3nLbE1dtNbdZZe0W-paBpDW5RsX4ZLnZGriBZw6ReAyY25NjPaYhBDIPmcGdDX8SQsz2YwcytUIZd-y4YEit0vMl3R4xScZDOpt26TjWWrVBA-RIjylyyfK3ShJhJkSxgbnURHltLbiiRwCJZiAxB2xC0FJk2U__czacc-R0OmzrBYNf5N5oQp67JWoZEMhwlfQgm2uDBNVkSm-BjJeK0m2G6JF3gL2v2bcN56UAEHgt2sJ-xOj1aIwcCjX6WJQCrhbUKKFQxsjso98qlWoecCA4ffw__Pc2Fq3Eya9_lBCBLfhgRUVCD_-GTK2B6wnLJCIdYUuU6_yUQt5nO0npewqWEIP8W1pXokaCpRBejatUV5GWZBNACpWYU7b_M0REqqH3RhgWWMbEkhKF41gU7w89VnT0z_6tP7rOspf_YPVZjeVJDFZ2KBrMxyDofPB5ZY4OJM3ukVTp5CvVvaEYDtnPI5UqgRJ-N7pNwpr-ideHTD20J_4o9It8ZX3e96nD_airrn_B3dq4wEtuMr3IMvvmEB3viuegN5dBJPSAqKUdrJ6JEqU_tVMqX7LqhUOXCWbVKN1t-tdDpPUZPfa7mXjquoEP0zK84kY-OlctF8ZTkjrL2gdJQ-b9J_fCHaPEpCDnRWlO7rytF8bHskTooLKw5Skc5r90GyGIjUyLwf0eJfJrF9Uqyao9835mO0p5YBSvFwLzqt6irPckeT_H4Ea9ewBQq2siNWQfKPudDBtSdivbC2XYQWNVOIrz24zHhU1vVt0bmiy1C6Vzu5J_GEYX3JAdC0HC76ci9y5VvOo8a8_Asyfb6GwnDOxlieucT2sIoWLmiFb0bsSl2CABNCnw_OtYeupzWQSju02CTS1KJJA9DdpQSAyxXq5eeIfRF4UKVbL3bWe8MdGh6YAksEBf5qUI8vK9Aw2t3gDRRKWVJL_Ib_uASuE2Ctz0__eNnj8xBTzZnCQvtYlNmQ7zxvz0gybEyFPFOpduKBdeexpujHwGZfnFK8CbBFwbui46MOgIMmJKi-Uo0gpbP6wsqptms1_I3Dn3ML1j2ca_dy_YHXeEtSHNFsgf2d-naSY8om11mlxh4tOlFBu-MiIBmYGHaWIUvj8mpWnFWbOoqk0T59i4nElkVKCuk6B5JR4WKxo-HYrm7s7a4NRdQRBwa1Hvt4WVWxQMHqB5miJxRwwD4ynmL682iJTjsDf5LXxM-AIT-M7jpl6Mx_P_aVcBV_wnuuTuMMPaMZc543XzulI1KNY_GoH_fP9qW7VKsS93mdHYinU09PCwR-x0upJ4NSXwLywiOXLjWUBDcOGIsg485kv7MByyKJ6yGDJbWfav1EtXgue11-1wI7T676JJ4Kii4rd9U9FoSF_xuYWESyv7_Wu7grI2FaP8-4dlePx4dI63KcDiKoTElwZNKwQ1_RvtIISiJaRYaczSOdO3fMQvMEBhNzIVsty5zl5iiqsCt_BGN-qKoXFWjhy9SOfuUCUwzv1TqU1eN-aP55kktXvYECrYY6YJKHBua3xe6Vtkx7ndvizM7Fgia3PN2NDRNH4nPFEjLH-7T_Ok7rZVq_mlH30i1HnK_MwJZ5DT7zxKGvNpdLbuuTfCRSny1xSAukRKZ3OXCYpsMSOf3kg2esDN-dzLrWHLMLmZxto-qKAYwuyXv6GdFJACRTh1ML6LNiju6fSDIqfhNlgA9R7Dat05HHBFAM3hmM0cPqR_merQbWWGP93ypU_JXIlwMdgb9QFGbngT1edfJysTqZWN-5p6nWrtC9hYF9GMrwY_lIDIKUujowWlkgZ07r0Y1Y0ayP3nVIGVUy63Ikt-S0u76nLtJ7LInu_MQ47-NyZriVUSwgFBUuw6GuuvI5sdkPSW66Trz82tZFnkre1INWSZpn_p7lLXBAgHL7LlDrEz92kQNazsbJHw0PAsM8jteTDctEa11ZecnOQ66Du06THuWnFAy06B7BtNFscUKVsDdKiEvbQWgWMDBZTbMhW03FPuaJD7jBMII4DVuRvJI9VIXycVp5JcahZJ6AEeXs_45KOilk5yO_UVTqasVPl7bzg5ll_ZezmuCigX7cW9zrsTxQXokcP_Mgrbk3yhGvTBqpVqVaJmUTaAJAri5CdwQ4qK1m3SyyYijnyrdRTFd_U-06orF54H9sH1SceJdpuVV98tRhDtyAIjSabF6KgLtqdfSoTE79rI4vLBv3hcdFyJlHfBsUGjg3uLo3IJuX7UtBjM19OCnCGCK9BekGbUtvcF4cqMM0EJeyAxoiAYvGNI88Nhm-jpFoA4KIS6feaQt8leCXkIKIYwDIEHXoGWA_SGSB3uJvMC8-QJD6cqHv0SKoZBWb2aEGOYu5hOBKY4ChtzktxOHKqsK8IFcrmPYZImCrUfKINt-3mPMuuhXqUGK-kdiqeHnitYBNq2kHvbom0QytWN5EOhkyskI9v161tAO7eH4dPxN9s68ceiY1RXG4qZrDkXk7zdTRFX2s6yob_rF58OVjhKGo22vJoNT7xpCBfBVhySFan3SioFSvcFAqrcBMbzSFMLZNQx9rSemOeYeCpUzRaU3wGsqGfEQ47ZltXz-fKb0ufmmlsG8l7dD8CFsTaTbdSX-sEcUGKP12QNDe7p166fJeahS5sf58lTiQMKTq2wZYvuNLDEdlsrBaJWLUPoJ-0f5EDGQAKHUiF6eNwwcK-uN4HYeSqyAgmjpFJwtNSU-xZfAsV4cGr7RRh2wQgjcpGMJzU57iJlVgvt9qBOJDahS3pbSJcwV8mwkziHd0sIjB4t328DZPMo.2eFQ-Byvu0aXPGF5FGis5w';

const id = '13677';

const phone = '9597299278';
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
        // baseUrl={visitBaseUrl}
        // errorBaseUrl={'https://star-health.getvisitapp.xyz/'}
        // token={token}
        // id={id}
        // phone={phone}
        // // moduleName={null}
        // environment={'dev'}
        // isLoggingEnabled={true}
        magicLink={magicLink}
      />
    </SafeAreaView>
  );
}

export default App;
