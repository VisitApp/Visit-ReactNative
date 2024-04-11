import axios from 'axios';

export const httpClient = axios.create({
  timeout: 60000,
});

export const getWebViewLink = async (
  baseUrl,
  token,
  cpsid,
  srcClientId,
  deviceId,
  appVersion,
  deviceVersion,
  userEnv
) => {
  const data = {
    cpsid,
    token,
    srcClientId,
    deviceId,
    appVersion,
    deviceVersion,
    userEnv,
  };

  return httpClient
    .post(`${baseUrl}/partners/v2/generate-magic-link-star-health`, data)
    .then((res) => {
      console.log('getWebViewLink res', { res });
      return res;
    })
    .catch((err) => {
      console.log('getWebViewLink err', { err });
      return err;
    });
};
