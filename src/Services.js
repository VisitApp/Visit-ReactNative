import axios from 'axios';

export const getWebViewLink = (
  baseUrl,
  token,
  phone,
  sId,
  srcClientId,
  deviceId,
  appVersion,
  deviceVersion,
  userEnv
) => {
  const data = {
    token,
    phone,
    sId,
    srcClientId,
    deviceId,
    appVersion,
    deviceVersion,
    userEnv,
  };
  console.log(
    'getWebViewLink req',
    `${baseUrl}/partners/v2/generate-magic-link-star-health`,
    data
  );
  return axios
    .post(`${baseUrl}/partners/v2/generate-magic-link-star-health`, data)
    .then((res) => {
      console.log('getWebViewLink err', { res });
      return res;
    })
    .catch((err) => {
      console.log('getWebViewLink err', { err });
      return err;
    });
};
