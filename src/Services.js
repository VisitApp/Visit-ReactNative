import axios from 'axios';

export const httpClient = axios.create({
  timeout: 60000,
});

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



export function parseDeepLink(deeplinkUrl) {
  try {

    //check if url is null or empty
   if (!deeplinkUrl || deeplinkUrl.trim() === '') {
    console.log('URL is null or empty');
    return null;
  }
    
    const parsedUrl = new URL(deeplinkUrl);

    // Get the first path segment (e.g., "labs" from /labs)
    const path = parsedUrl.pathname.split('/').filter(Boolean)[0] || null;

    // Get query params as an object
    const queryParams = {};
    parsedUrl.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    return {
      host: parsedUrl.hostname,  // e.g., "star.test-app.link"
      feature: path,                      // e.g., "labs"
      queryParams,               // e.g., { dId: "123" }
    };
  } catch (error) {
    console.error('Invalid URL:', error.message);
    return null;
  }
}

