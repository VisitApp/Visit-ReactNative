import React, { Component } from 'react';

import VisitHealthView from 'Visit-ReactNative';

import { Alert, SafeAreaView } from 'react-native';
import { EventRegister } from 'react-native-event-listeners';

const visitBaseUrl = 'https://api.samuraijack.xyz/edith';

const token =
  'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAtMjU2In0.d8JXs0PmfVDN4N0Jg7NwgtTU_G3uMUmVPLNIu5FBlgwttdM3yULghtopIknFhZPzaNjXRL7BmJtDLpRJxIaJGZwkHzFyXvhpSLh_nBsH5cin0JydCRGNC6vFM-lccdYfU0snAOtHFeRD1KdRYDMsCoKc2SmGBh15vDQIxgJs9MhA6UyGwrgQXA8diqLAg-ODAkWvsmUCmoRy6isYg-kIUysMbKYTfOh3pRSexBlKMRrDL0w5arbnc9bnQ8EOY3Z47omVPhbp6aJni0lah5ik8sd8WFYFRvC-lj82OnyTvmbrCavTRgByboUsrB3lBFIBgRv5gkiLU00W3jjtOz6kJA.uf1BsuYbxISI4qDO.X3Cg7HNFRcxSKZP7nrdFipREN2wNsCb4WMCF0OGBOqemILA6wnVakZp5y6SBXfN1VIzgq1ICh3tDrKhtJs147rRV1r2IMcBYkj6wmks0pS6O2DO93geUySOh7nQSBsGwLm_2TFT7l56VhT135e9zBBlEnkBaDo2HJ9DNXLcPPUeWKLwEKYVNhZ6dEAQNIzdfKe8WBf1Iu08bKfnoxRF1THJ9GF2pLweUB3u1Xz08LEDDNj_kokKBpi-OPGR2aV7JOxlowfuxynMxXiKiEFETrvlk3q_P876IMZ9KPT0NQLXAsGxHRv9ivWqGKTTYB5QNukKlKoVAsiAQLRfgNRKSBpycXoGJ_JwPrjCeASW_vUCK6vBfYQ1ajkUwtNnUhu2HJ5qm9nBCEFmshx0-u_yG7J6ah5K3qoHyQ-_cSmyYPO2MT_UZv4KC3kCyTctwaVEHyXJHYXt7nrfWg0cPF_GsC3gbaVP23FU9yyQhqEDqhVRyYxKbMPiNDPzV1s0esNgCBbhYBX85GcHTl0eyD1YHNVu9eV78_8Iw3c6MHft_e_7a4MuWcroSLL57gdMDFG56_hciYqT_jMAHch4H0tFoYIQP7cYds-bCc-SBCz6FiX5XlaSlOpwU5Zt5G6dYYH1QO971UvXffOmZspZQu8-wroq1NvQRNWdiqJ82vOO0WeSiBrm6ppBVJDbEkP8n3fEqeI3t4TIbzUigaqPKroAAdDdpcJuVWnXNVnofE5hf70mVoUh1vt9Vf5g1jV2hMsZooDm4upCTIhqUQGfyQfI8Ma0-oo4iz13uSNQgfXVOdIEr5rVVZK8v2AYQojLRBRuMfpyS8VaevXcrCs2cXKp0zky43KT_E0PzpPyGljZ_QqScQQKsRduMWKXUqFSpAJWTbuWvcll21EtDgKar5qwQuy2FdVHvbcnAsFxbfGTo9FUL9JD73sOGndGCGrwgJLVD0XzOMVgeEtN5YEPBWglpohM0Gjk-vtlmWg6zeAw6ggIi9P4KMvcCG-4E__dr0wfuA5NAJukeHiaJ3t_kmfGdgzbqcqpJv636lhGYpz0IKEpnewkcgLf6jbS0r2l9RROxaSrn-ZdCmE5A25Qe8FRijoxD-NfszWMsPXnILnUYBHc5q7Ti2E48D7ns-sOK5zktSIU0DBmjBnE4tHyNa5WCgfx0PE13bt_OU9enwEL_WDH1-4MHbvs6ybsm8rtPRVCvP97dj4fbJEUrmwtLxBuuf0AwGyne9yuNdjOCyAw6PsyOmvyZp8SAzSYa7HmatfWIlwL81fCxwnvnpoq_d3I1Bj1OCBEhSBDM6b_0KaUcnTjiUcUvqAoqzoRTA6GY4D_tnx94VlnHhsj_MeW2HKkeOPW2Lt0h7uWovVYBcPCix6TFuHKXHhYl1HXtFRKNpqoMXP06KSjj4DvCsjGxHKBcE4CaD8RVUscAPnjPtka8nkMFR62sEh4-eGn2sQxN2UkW0pb-9Ih6Xe-Cf2OKIdQoZO9Oiviwh-tJQ90l2WAjhO_4XJNcTCCPAZDPo1a_TRV-uhmYmsrDSqRSRo4RHl34xA9wXJKFbbf8qHOhlsAtHxRnR0HBzcV_ruihd_ApFdpWsh28W0IqS0d3adRBIqKEoG4H_MisnCs5Kedh6bo2cQsiAhqBWmQ5xqCfw3lIHzWLBAK54foVJlc1GIJ39jsF6ekL_9eO_1gkzo7zQwip5XLYWeHMgQpgvRb83pxJIevBAYY-KLky9yQLK9VlodcdRTcVggkYYFtUYIPIe8Z2SnJfS4lGwNA24dH4TbMh_1jSfk8kpVlnmoDa33m3y_cWy45TPYRSaMtJp5bvNbaVN2gsnWW9gZL7HzqLxiSYrfXrNGYlgCdyyfOiHosgkUSHDUu23qRTmYKojwgh9FGLMhnClaxo0i4f0BCtKSENDbQTbvxeiSNIPTFs92UnG5k9YJNW--JA6cNz5lGsVTbGu-GlPu22VnR9RhVYLVnzmCQWm9q_i79x2hO4s-uLqqj0G7tEGMQ1t5Hn7Xoe_F4-7g291LP9_StrDzWRyvHFR0qXcHAKzG7RTizdTUedJHd3f_ZJw-1OKbGUhk5rVU-CHYZZwe6alcIVVJw0ufTgBtQmmM76AY31xm9bD2as7Obllm6H4ZekIzJZBec9DSyvprseI1rJmcpJ-MX68c4xnpVlShf-EXB3FFr1OQn3Cjw9um3TV2VfJS3OkG6DTrMOrm20Pqf5p-LC6fZKl-8g39Z_EfVqMnvZ6Q2DJOTLqHhnRwCbX9Ls182T4lie00JvtCIWeuBOGqy2wk07vAZEbrrXjHBWUSocv6Jr-CrWRbdG7eYcNA36FwQuza9ymIevTqg41XKHsEWPrP_yzqZ-ybEPlCmU_KgOiHf9I68iPy9yZspqLGbg1dszAEE7fitZNB3hpbBMi1iw2QV_BYqO32Dy-o6jGHIYmY-HfPLRPMj9cSdT_UupsPQLx7JgtbE20yHUlR8QkUsOvzTuD9rWRzaczVdlTECiiTIRMZfRbfeCBKVRi5b7yAdgSkzoIkhL19oaN0cOXhI06FBf9oI7utvvDMeFp8vPNhuklhh2V8ISAtfaIZFBfxwR5MQBlqCKl7l0K2JH2YFmXL9THoGxRLMazKdUsANXzZVlFoaerr0tIcPZVaJxn-ah_uvm6BkGB-7S85_MeDgr0pDI3dW9YWOhfsP0TycmXWUsOWjc9lY1Sub0-RCMg-cCQwTlPhmRpzl-0b2QWmWecI9pAL3fDuYZzRZhJmcSgOszaneZBJTqRb1EasMGrFcq_hEuf9u8mW_IVWVstSrdT7qGlKerGO87qRVpOYXbvAXLReQ7TUN3hPC-CTzQfnwB0AAi6YBntQjKjOrfLo6HgN7AcJJProeKLOiXcnKmi1FTUflQYSEdU_QifRyDr3sJbM9z3uqMfjqq9f8vY_58-l0H8lpoZl11mVUO0YqZFjUOEuo4hhTYZxbAmAWIGXsSnPxF_Y4BZIuPS4XDeNUlAh85prJWNhFpsAdgY2Ilq9BkeH12Tq2FNv_dfQ52U9UDGWc2_cqCNs_fO_9C70QGJndSVm1EUshQ--j1KY6FGinb98wqGGtuC2bPqV_MobwP0-WcGnzhGm9uyFxHsjQPeeYSOWJjbhwqolh-jtMDSRg2W3hjkquYPnOXiAjl3n06yWPw559QEASip06g8Yy3X2R_fhwoA8UXeCJkp2LRNmjy2wSxcclQxd3mxYb0dzL2DLyNjYPwyDqQqUGtOeMTsSdFCtwF9T3damVv86hsD67R4FK9oKxdlRqvT5j4w1JOg-Nnbraq8YMbGOaLqEONWAFf-bKgRirNqRaAJjxqa730ZCpbH3hEBj_D7bm8wvb2J_eWUK3VL0A0YQPxGeLom0mVkDeA97ebB8c2RA_2onBaXhKb50E_UgThMTDPIYvVdGZUqnTlrfviUDuuH54b_Y4PfLiTlKonO86Af8C2prUEz98zPNjNFMn_giOtQ1nB96J-UUPv_Tp7NL9q5NkwbPA_YzVfL6gbaMJbaaQpJ71zXbe5UwR3lxyO3b2Ga7d_eYCcqs6-qDDB0trp1hW_WDH85_QW7KRWDvJfT-Z1LDZP5Qp4C9_T-wCj-YwLGx7P-LtUxHrcwcMugOk-EtA037gx5r4ctSvONEM176h0VdpIxQ5jaxKAirpebqtp9S5Xfl7AiQjOviIZWlAtWG287NIKkLxpVMZxdwhAgGVzcphzAw9Zc0LHcD30_agVJzCTnxikCzd_Rj2KJWRVAb8LsloftV1XcW20qqn_AIjhNuTntpPjmsKNhkmWyBVYd_YPE_0tG1WDQrlRBn3066IO_IewN5ZJynJMzXC4cVXzoYEj3fenQR1r6rbwRrA4wD23b-f032aghlIdL_JBmd4NuvnWHWIRUVORs29GBRcGeFgC96K21_AyvkeJbcSHI9H311377Gyza5Tr5KTc_0cRiQsokzLhWjjp03c-RHtURGiJ4T2ATFsJngkA7IOSx69QPxEgmXF0oI5EWia6tAFczfYSvmK_aupi_XgEL6ipI6wKVCpl2mP2K0zajgwv_9DEc5nzyE_E_uL5n1BHiDkLd1AtX0Mo1dTcD-MxS6zVTbtClr7J7GAZiDz5uUcNO9gnCGYieJJyrEN_8f2bJYCGgYrycVFmVw4WXZE1L7_1jj7WIK3_bqCNfiJpAe8NjuAUFI-Pek0d4JjFuBWylOuuhsd7DNCz0xKMMZqdx6kOdhEJftpNLGbAVBcL2X17gbq3mgut1FKO571Wczf-innGmjMOi1EJizSkKTDWz7hufukgks1Jmp0xHXoY_kr2F9JKZ0Dm-DgcAJ4muZ-VOzZOzQL_ghEIBttKHbcKQ3WQieKmrl9qOVgkqS_Ze6wgB35KX6iPdF-cennAs5YozU73dTes9SdrGSyh7BQopaGjdieMzt2FwHQZSvEaCi1QyvjtXMswyPMJXl3FT-Rls6wHhxvJuWQKZnB3-OxTROYm6agQxyaeD0iJITB9_9l-LBWEGF78nP7K61-dy9AEmfoE0z4H_mtyt_gPwscpPvB6GZFpqwtIR4nbpbH6OTHhgMlirxlP_bx9fOzfbYSi8v3SbBkHHhaoIo5Yy2AOtB3wnE_54GzLBlr-EnKHzAq8S8joXuJLmX44R8O6Eh481j-DnQR65XyCHeLrnHu4SackWKH2SehhGAvh6haYzngAVZ2i1gkcKOLUaU2na0fPWRt3feKDIsN68WwM2PbjToBKRB_Pll1MTAFF8GIf-FTm_89zZxJhtx057uPqNGCYP_0QByePrcNEzoQJsMUFPpUEFAz_iqi4UIs-CBG525cmE_dm1DOwxHaG3QGALlaKRZbGmNaqcL6ykQ8GybcY9wFjqU_gapH15EDHcJVrVYsH5Itif0dVfx-9AmThOwRCQVqPfOm38wdgWhmbJDlI5F4QgIPswVv5yzb6SUYKhppbzcyncWedc5oycS7_f5QrJ7zgr9IxyRYfNrYYYvfMehI4HO1IFazQOG2OogIkpGzghoMmhz6exj7lrS_rmDbP4hRSD2FG5FiO2fhRR8lc0XAx2JJcoAflMhRSzqFOZWatcAAECqEd0GGReQcDH4Pe1SrI4daRZ0sYB-Z0qSbSgyVzt2Gkyuh1kqBq22AS40381DRpfFhhukMMq5aZPPSeGXD2YhDwbb1gbjoNNoGAudnQF0dk5BNevibblB5ePhtIOJNo64vC6z5ORq1SB1EKAAwM4AcTVWBR86iS6wr9TBMxXcxbhWTfnQSu5Tq1tY-qpwGuFIlBHJoWrLx7yTEIWTqZFwpaE9FbDy9FG2PxSHV6v1k7-z1qOa4lePjYjHYPX5cogfhwH-EgijKOWsQkHYbU-8pk1qeHIDGX7p9CSVYYMWa_8twVAFRxWMfhoe45ViYKgHC8JQpnQQwQraTyRasvyhdDLZKjFxn0YObyl2HyIwxZ6L333sZFpjGmo9O0JbkhcRjFWqw6CMZqisFgHHKuK8duR8XfrMq28Vq4BA0ZxKUy2en6n9xcKVcBjt11US4xYOCWPHjoR9InM9fjtyiPQD5a5fJrMPkiTWgi6mB48MK10WVKxpda7hwv3jMScd8Yxy8_PKIypCDSrHZNnE5nTIhi-xFNlRaNLFEhOmmXN4KI67gHAp3iTcPn3Dpfx1NV6XNqjVB7h0IegqKT6cC-O9cKBqbhtBQ5dsS2ZNSsY5Yj2wo40mxGpWGdyhtUVjPiaVPRyw35tCZkk9VjzszxVFDtVUdWzsd65F7thiR0aosUGnoTp_iNCKTjvbvRX7VQ0aojY7Yq706UASaEFczUCK8P9vAOSPMWnP8CCM8Dt2wDF4kED0BjAhlkfg0Y2mVvBWzUs6gpAoMALFNP7ZnpquzrR38mr7YdmafxTtNdesb5FJfe-16gu2RzuKloUrBkGMsmPrCfra-KPfl6fiThM5oBvAcoEwEyp1H5mnzbPsHVBYB4z2Z9jpOU9JtRY_CAcdrF54XdtJWXpu2XJjmkSAr4hn2s4_zeKaqnTVpgOhoidRK94P3vqCbGYKFjGNecolp_CDWGuMhOo0GOuFBvZm4SeSHSC0S5q2DHRP8Yrd6ZAdn1xouL27HBaMxRWeI5fM_g199_J0nFFgwNemIbjFMzf8HYoid_SaHIC2v3nDhL2RQHf_g.-R88LTajJqvBLlLXIUs0ww';

const id = '12575887';

const phone = '6379220732';
const moduleName = null;

export default class App extends Component {
  componentDidMount() {
    this.listener = EventRegister.addEventListener(
      'unauthorized-wellness-access',
      () => {
        Alert.alert('unauthorized-wellness-access');
      }
    );
  }

  componentWillUnmount() {
    EventRegister.removeEventListener(this.listener);
  }

  render() {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        {/* <Button
      onPress={() =>
        fetchDailyFitnessData(1661843593000)
          .then((res) => console.log('fetchDailyFitnessData res', res))
          .catch((err) => console.log('fetchDailyFitnessData err',  err ))}
      title="Fetch Daily Fitness Data"
      color="#841584"
    />


    <Button
      onPress={() =>
        fetchHourlyFitnessData(1661843593000)
          .then((res) => console.log('fetchDailyFitnessData res', res))
          .catch((err) => console.log('fetchDailyFitnessData err',  err ))}
      title="Fetch Hourly Fitness Data"
      color="#841584"
    /> */}

        <VisitHealthView
          baseUrl={visitBaseUrl}
          token={token}
          id={id}
          phone={phone}
          moduleName={moduleName}
          isLoggingEnabled={false}
          environment="DEV"
          errorBaseUrl="https://star-health.getvisitapp.xyz/"
          magicLink="https://star-health.getvisitapp.xyz/?mluib7c=J2c4KpQr"
        />
      </SafeAreaView>
    );
  }
}
