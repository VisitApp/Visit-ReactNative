import axios from "axios";

export const getWebViewLink = (
  baseUrl,
  token,
  phone,
  sId,
  srcClientId,
  deviceId,
  appVersion,
  deviceVersion,
  moduleName
) => {
  const data = {
    token,
    phone,
    sId,
    srcClientId,
    deviceId,
    appVersion,
    deviceVersion, 
    moduleName,
  };
  return axios
    .post(`${baseUrl}/users/data-sync`, data, {
      headers: {
        Authorization: authToken,
      },
    })
    .then((res) => console.log("callSyncData response,", res))
    .catch((err) => console.log("callSyncData err,", { err }));
};
