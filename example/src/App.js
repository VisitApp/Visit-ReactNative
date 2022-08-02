import * as React from 'react';

import VisitHealthView from 'Visit-ReactNative';


export default function App() {
  return <VisitHealthView
    baseUrl='https://star-health.getvisitapp.xyz/star-health'
    token='eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAtMjU2In0.n8QV2DlwS3b9FVwWt27GTrK8Pxm6y0AePbcwPCgyPadQ7KYHNor5b6LlX-BNLqowIaroNd_DFched8aeCMnZTrGZg6PkYvOAvvfUVtTMvdi-tH-7aWsjfpH8tFGaKdZqPkrpUPrywx6C9HYlxQwxkYi20OJLeP0885z3nqXWDOqb7dq56MSLdmlg5xxqR43GAE29RNaHFbOjmsxjPvHtjnBG_eUuAGvAzfOjBvLDNFgmLE74QVQ8v8f3I2xLw-EmZjq10aymes_DsiY7Ag9_YWMriG1tFwj6yYIAwqquRPz9JWcMCMPXYLePdQiic6J58Q-7t0X6h-ASv7x7SUnIpQ.L-KNAa5O-MtqmXKl.juPhazF-Dh2kI6FkhpUn7EwlA2FutNb8VXtgdieCr_hs6JyREzQZjorgdlwGaRCmSDuNLtvjTjjZ2Ga35521jhbD8CN7QKmGtNsCFKDABtMKf571CJsk4CmZExJGCsJ8y8TLu5eLlTh61TNhXFJ1pI6x21z-b8V_61I76-Pd76_TcOF75MUxAqpK2oxULd8kZ2KmjIOZhqg8IxMoz6O5ce-pnSgN6KT_3kpiOWmZS9cfu3t_xP7GBcevWeC4hqt7PGbkHuetc1X2G18rMipO-GRnTYSipixXrRnNrs8HBbQXH12mx7AYMjefHfd8X4gU7ic0wYjoNcSlY3mTs5j61EueAyqX4hd00VXvYuzovayXvVLogjPE2BE0_cvJ0leYl93KkbsiZ-gohR5hJgU6GFOvTGsE-8C7p4sNBNuOHZ2b_QyrawoQfhoXPnIuq1uEjBvlcRsAQdBpvebMMQHBa7ikAwprq4cAqHNDbR-3fXtPn4MKSJq3i-E1AaSGVT6yBGwkJx0eQX07rMS0D8tz8QetZ4rH3cAB6OhFJY7rmsdQ3-lZiD1zGHSXEzDLO8CAqCHUM8HIeeOSStVmv4DfszQo16MbW5ecweWP9O8m4byViTMevknZm6dt5Co7vLdRWbrGM23gVOU8iMWoMLBwiywNe0zrNp2aX3Yd1gzKisxqGyzPk4MEWb34RVtKX_gJFmOnGkTGdsRDX1WyuVOho4Doewx9CI-QqRWeIeMaE0FZF5jkopwSrmInfbebLX1a8XVIwopp0yxBUDxMEMF9Qx2IlCjwsWVqadvWc02g_Hmw10bX740QRVOiHj3MQjY7d3u8NGZlbiNiUNaS0IiWp8FzCwbD7lU659HqiZytkUHZbcxqw4UWUnJBPda6v6pmN8jJ-YOZJlOtwYQLRCa61ubbepv4QlIGo6UItGSKBpTmPfUXxuZfaaxGwcV8TO4CJEFr9morWpm7PO3h_I7-1S7PjZSakUuNAlbI4IaWu3u65rnOoBP0ElUfOA6XPEDoQKiD0nEBfYUlWCNskqwygqvjdbA4P91QWMh4pYJzWAMu7IbvGQDekdPSeUGXtK9Q_TGEawOsjzVropRfEUp_M1OpHHUOBmox00DB_Qe8XtuE44aXhvlFQLdZtqrBEdcZUBiPCLpeO4dz5duXWnN7ZLxlFb-sh8umcK2aom6de3lSRYv1vWi4GfKKW-SBzRQWfL3cBuOD93JiTRgvZ0cOLFe3igT2RHA63saapMRMms7IYeW2Nf4UyZPGimWeFJwc6uQucZ6zqShAAsqNW6ld6s9SXlUdDKg1N_0xvghmr_gr50UIbbWBXlkXfsNfIy-fU_oJpZ2a6DCgcS7fBMPM46XD5B1YotJnqS2R_KKzE95I8eO3v4fi6vDxglAQEdkCO6pSkNq6Lxfx1u_ghbd2pIcc-z-OZmiTrEoJBGv3h5XdnlapnkOcBqmAjJJQ4HbjkkSY-x-y8BvEw5uchuyOxAw3ZtKw0jr-mNs3OeDePBOVgmbiYlh0S1ZAgXm5PARQhAW5zkUlWTUdem8ZSqET1YrpffgVxVNropyk5y97rJVCqXRZMDK1DKbUK3AGj33zrMhoE5vQCpUYPXy5maUMaF5zMdL18OkODnGTQLkrgIZAubG7TRyZ70HLw3NJta9EQV64KjUtjz2ZW3l0bDi_KbkGOxUyARz3D-tCCQlOawrjLSAuSo2DsaCpu4evA9HKTcYTevBQN-KxTJTJQ-rSmCboaiME5R0kep6km9FETQ1_nmch3OuqAQfV3r1V1sXvjlBjFnA5a-W3eXU2hDSa1aFi-nE-8tDfyY0CSwMx6I3FX4Suigo8Ls65RIDPoGDuCjIXx-pOc-lDTWrN68l4baNQnslBxlo1QRsMLdcrG6A0Bh-zk5JZmzjx34dCcoTrOiFvVb6bHjQQIstghIJvVXPxcN_IPfWnJNFyqeH-SVjLID5hmAzJ5l6ihdW7h1h0GyNf1Ew7Kvv417WRH7GxP7iKkd3GcTkU0v1RkEk2bW7Bf3YC91ZfV3YAn1t_xBKqCbeu_I6DFpezw1oX2w34IxSbCclnQ3qykG0Ymcc0ZWgCNilJvS30QaShInHINdZhVzWv70hozpXw-uFXNKKmWf3r_xI3ey0biWWRlJfuuDXBdd7TPlctZVZp_xbBp_e79vtCdolhbwCL-_18guog0-_n9p38WDoZQHKczWuHGfbR-44qizRN9HpupaZ6jYI73dH3avnoFEwDK73g9m2vbCbOhJYjEtSPNL4PuOAHBcy3KzB-5IpfsamWoQcX9S2RBBd11AqQzZpff2BIWoU1EDRvAAHCmGl959b-Sm0NJyXp4qBLPkDJHaAq2rGSUQ0e1pIhjZuUPvkViCwlp5tgj-2qy2S0XeaNyUophwP1zLopztL4mR_IPaFt5xeOebjbBi_NO8se1HXUPCCgKq4_8U6O_4V5rBUwOPBhBldBrZr6WOyBJaggiJ_pXxrH4xi6ix8-ftCRp4YbjvQOE-g3fg2DPd3Zt6vudjh1MtiijMgH3EpTFIyvkKrRwUEERweSQZHD03uT_ykxpcQdcQGJj3aVXA7UK8t4EMy3LsQu6wYeO6R6RO6Izo_1hgpL5SpuHFRqe2eANbIOvfUkp4PoqP1xOQpeslI1xRWERfqsJrNozmZSBAJ6ytO7tAWM1ofm-bfqOOJpL88PmkNwZdwZyOxCF3cIyArALpPRdX61EtSHGEbKxHmkFnn-mVTWVfSs2CQcJKuLMhFcCVPnIHQhafGrIhGHF9-LLqqlkN5lb6tW-m6EGc3sjOME0IoZl-YRjxn5s_jzq2n7LH-Lp61QYSYyM1zHvdREWrnQlpY7UZALmYCfKrGKX3_uhJfolAb4uFBIiFicik_pdTuJk1YN3BpjZ-YxAZfbfUqa5BcBR7pZfRBCXm2IOGf98l2j7borspKormOPtdB33EyFzwcAs00To5iJX4QVsRR0uMevqGHudOVg6Nc1u7P2IxhydcbpJzL06Jx7Ck8ryj63MDt--51FFSX5dSlxnwEATJ9z92ItFcpEBnN1DfpYGuDqgjBY0yG6RLcXOY5DyWyjyBmbTr7GYp-K7NuDQe6KOQWXaD5OYIj8oED6gLqqg2bRaXjt8KIaNdqWyRCqlb4ozK-fVvsB_Gzzie-CG7_an7UUS1gE030Asguq6XH29s3_--cGweRF8naX67gtwlS7AYu_fHsXBhRPH7-EWmlZD4F-6lzFr__SOf6TJniEBIUBgcwn9JVwqcnwofpi5XJPeAkOouQtBu5GZ3GvRzvIGNFAqo81LGnqBE_P-p1TK6rlWFN0fxM_e9hkcv4dMZYHRSGP7VZs0hYZHVpiVXs1vJcIQnGPKoo6RQMIJX881z_KJbaODlRkU0wJ5-cVy5IMaoEmRn_yzRZmxCYLc0_qpbz0_0dS5e3RnU6UlVvKTUVNgB2FeJXOGH5qHkgzeGDAKVcsg7pOExNzzCckJu0SukzW-x4URqWtRz62rHWbw-kFJEVDsPSV2vqrkgYPXnSpt90nZd7W0EEMeBYqYNSE6DY9FWwv_qRfzcj3B46o8-6BPE2vFFNgV9aTxCQWEovtnepIni0KOfwdFx8hox1z6ZbhRARN-N-B1jQLDJt1_c6ON-u6JNMPYkrjiajzw4PAFWi8k1Sw5qWC32hlgXsgTgsl9YaEATleiow9AXIkKWcFvZnVirxRk4aYNtkdUlLpWBHGgC6HhlK9f0-2A_3mqd9kJAQmjM2P36HjoOxOY1gOdgaLBxYrlXONvRCf9P-sH9xDN0-hCx7iv1H7tJKg27AGbfzCfz0ZLwW9dVRcQFEC6gk-6PUPkKkv5wf1ARJZzPaxjCFsRkq02ZMjWkZLGB6UigDnE8ZYvBA0qD2RlBO560WxryG9r6Cxcj3lDM8qmg1II6BSlTRzdbmVXUKVuHlJ9HTU1Jqwi6in97uYF43fh1Zj8U9LjHdYEQY4r88-OETi60jDvTK5WA0qlF1jQr3Wa5GphkA2DUVJISp_r3SDQhmbytVBwLO4CoCsW-z2_zPsTyiNaKj8Y3G0ngxWOszaJ79RycePYkNZFm5E9xqseLXWEIzs-NCB6l-nhCLNahbVkHXpIFiglDJEISgpzV8Ag3-J3nP8JrKK9vdExp8axTpRLSAWC5DGIseevxg8n5yIBYJ9zZOmno5R4ZytOi_EOm6rdsCtS3E3Op3vg7fSylHdKPc2388CGEwmivxkByA2Jv8wpmhUi9AzE4mAVQrprZkyKklk9N21yJyCiTxAkFHT8Lrl2XGzBzhZgemO00jOOUMH9aARKLzaUMCfEA04QlXXRg0gSH_D04Xdk5mX1wEF1q6AyBfNHyLaSqQGt5LNNNWMZYfxubMvpcwKn4Ze-kMqwmtAFZECyMBwoFdnUAYeprg6scQv-3XVrceUSDrhQ0p1Jl0Z1InF0H_wPWaFRtUF4uneVAwS75NieR1KGedjqohbA97Tixpj-891iPaBAdytvmfEnb-u396BOorEIuG8OViAcXDmiQhtJC7jgr83aQB6H0E03jtSlj7YJAADXh9oa6WXl178D47vOFmMAxuW7zrph--S6eHgIdUmwep1_iI2FpGdjuZL4NoF8lwhewi5vMDXl8DSRDX45HjLYteVdLVqkhaTFrz_YPtfAQMk0tBayi4NZTu5X1gYSE-Mwpb2xDUxTk3S16JJOyHbsYF2UR-GB-Y9TlXOiN25hu5eghqHiwojioEPbKqUBmrnFR_1p4OA3T3j27ZeSw4DE42gnNKWJvijs8bu2cUtVTJ8xNNBM8VP-KiYEGiaQbvYQ3UUjiGHoFkJDjWfxWySvChkmjriqVwpyCJfjYItBP-BiUiZqooQLFTS0wyeonYv-qCqVY3SxWaH2deOy3R8KaN8RkbFJ-ot7WkPMT9raPiTv4JZQJDVTLGVkMqPN70ZKr0JswT2cjvpYkGHPwBxg8RHreQ7oWg20iWDOLbPXX7A2N8mvkOpYP-FLaxok4hyYeSD7HYwj9o7G_fA147RaTvzfod9il9A5uHBQjZAYhTbD8LnClFRJSqQ1Pfzg60KIxEYl-x1j8_Rfev-VpZt6691-dfh-q4Hdz4H6-I4N9rJ6yuN_wCjyo61erhPv2UT8Z1O6fGG1Vm1AzhGz3AHkT2Bd7sCJN6OcaJV_zH3B6FG6kI54tJGOrsbzTdAohWdxk7Z6T9RuaVT5CweDkF2tHrr4tpu9gNarMOWm7CZ3aR0SZ_xDbu1cAl8wVszo6wV7Q9fbJc3lnnB4-Tj9d7b0_qyVcY2IiVgwQBGy_mv1RHKttF0IeLq8QQgit512nRctfJ4iw9XdsTGmqCnW-OUJJZZ892rOQ07pKaeNmtLP1yTkup_NCchUpqPX_lgTxC8evkBlXUD8UD8H9nC4Xpm_po2fnd4uhVIHhseFbjx7xA_ij3E703q85QeXxo65OMO_vE0PjZQG3eGDjMbVaTZLetFiIByGS5wODjKMC1fsZt_F-jxbXDOePWzO2JMeoxb23IvBP8g6FnULeaGDujT9zEZaD4Fj4mLtjlT3SW4x7IS2zQLPsjGb_7EXqTKgpIwDGzmjbGBB0yY_zP_VzKvvF-IgCrE20FnS_2MAsjm4ypvqO3BIash3RkkmUeSHPa-c7V4feSQ0hUYh8CsnRhVYMCVbEAbO7k5Fw4wyKhEsD-PSMOsa1ukdnvGveF4LIFpZaWtdI1SkM0Fr7BUJSX9xfEXjZI8cciKxMbUe360r8_5pYDaUuMTUuj_lzUPW8XC3A610nUoBtjSipuxfMF9r3KOe4zIDqYnFwutF59DjFT4rLqHk-4EEasTa6unNiLXji0NnX3x05_kDqr-_PxruQJFh1nUtAb1xMU2bVAmaJQRcq7B9bDcP3Ezat97RA5im8Akyz9exIj3SwHfjM_QFV8-IFYDDi1ow3CKoJTg2Fm_tuY8ZJf0SaE0WQaCTjCzyEUuucKyGiOOXw-oepoTy10rbsTYjuO0SdzC2hn1W8rRsnjcUmlR.cGCshUJKT8NRujFjgXjwdg'
    id='12795'
    phone='7382271170'
    moduleName='phc'
  />
}
