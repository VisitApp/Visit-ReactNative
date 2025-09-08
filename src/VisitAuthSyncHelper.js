import axios from 'axios';
import { useCallback } from 'react';
import { NativeModules } from 'react-native';

async function callKgiSsoApi(encrypted, clientId) {
  const url = 'https://insurance-uat.getvisitapp.net/tsunami/new-auth/kgi/sso';

  const data = {
    encrypted,
    clientId,
  };
  try {
    const response = await axios.post(url, data);
    const { message, screen } = response.data;
    if (message === 'success') {
    }
  } catch (error) {
    throw error;
  }
}

const checkAndroidHealthConnectStatus = useCallback(async () => {
  try {
    const status =
      await NativeModules.VisitFitnessModule.getHealthConnectStatus();

    console.log('getHealthConnectStatus: ' + status);

    if (status === 'NOT_SUPPORTED') {
    } else if (status === 'NOT_INSTALLED') {
    } else if (status === 'INSTALLED') {
    } else if (status === 'CONNECTED') {
      await NativeModules.VisitFitnessModule.triggerManualSync();
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
}, []);
