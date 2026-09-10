import axios from 'axios';

export const httpClient = axios.create({
  timeout: 60000,
});

const GENERATED_SSO_SDK_VERSION = 2;

export const createGeneratedSsoUrl = ({
  baseUrl,
  magicCode,
  moduleName,
  responseReferenceId,
  otherValues,
}) => {
  let url = `${baseUrl}=${magicCode}&sdkVersion=${GENERATED_SSO_SDK_VERSION}`;

  if ((moduleName?.trim()?.length || 0) > 0) {
    url += `&tab=${moduleName}`;
  }

  if (
    typeof responseReferenceId === 'string' &&
    responseReferenceId.trim().length > 0
  ) {
    url += `&responseReferenceId=${responseReferenceId}`;
  }

  if (typeof otherValues === 'string' && otherValues.trim().length > 0) {
    url += `&otherValues=${otherValues}`;
  }

  return url;
};

export const getWebViewLink = (
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
    .post(`${baseUrl}/partners/v3/generate-magic-link-star-health`, data)
    .then((res) => {
      console.log('getWebViewLink res', { res });
      return res;
    })
    .catch((err) => {
      console.log('getWebViewLink err', { err });
      return err;
    });
};
