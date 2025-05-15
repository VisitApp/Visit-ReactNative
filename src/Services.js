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



export function parseDeepLink(deeplinkUrl,isLoggingEnabled = false) {
  try {
    if (!deeplinkUrl || deeplinkUrl.trim() === '') {
      console.log('URL is null or empty');
      return null;
    }

    if(isLoggingEnabled){
      console.log('====================================');  
      console.log('Deeplink URL:', deeplinkUrl);
      console.log('====================================');
    }
    

    // Remove any leading/trailing spaces
    const trimmedUrl = deeplinkUrl.trim();

    // Extract protocol, host, and the rest
    const urlMatch = trimmedUrl.match(/^(https?:\/\/)?([^\/?#]+)([\/]?[^?#]*)(\?[^#]*)?/);
    if (!urlMatch) {
      throw new Error("Invalid URL structure");
    }

    const [, , host, pathname = '', queryString = ''] = urlMatch;

    const pathSegments = pathname.split('/').filter(Boolean);
    const feature = pathSegments[0] || null;

    const queryParams = {};
    if (queryString.startsWith('?')) {
      const pairs = queryString.substring(1).split('&');
      pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) {
          queryParams[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
      });
    }

     if(isLoggingEnabled){
        console.log('parsed host:', host);
        console.log('parsed feature (path):', feature);
        console.log('parsed queryParams:', queryParams);
     }
    
    return {
      host,
      feature,
      queryParams,
    };
  } catch (error) {
    console.error('Failed to parse URL:', error.message);
    return null;
  }
}

