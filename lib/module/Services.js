import axios from 'axios';
export const getWebViewLink = (baseUrl, token, phone, sId, srcClientId, deviceId, appVersion, deviceVersion, userEnv) => {
  const data = {
    token,
    phone,
    sId,
    srcClientId,
    deviceId,
    appVersion,
    deviceVersion,
    userEnv
  };
  console.log('getWebViewLink data', {
    data
  });
  return axios.post(`${baseUrl}/partners/v2/generate-magic-link-star-health`, data).then(res => res).catch(err => err);
};
//# sourceMappingURL=Services.js.map