/**
 * @format
 */

import React from 'react';
import {NativeModules, Platform} from 'react-native';
import renderer, {act} from 'react-test-renderer';
import {beforeEach, expect, it, jest} from '@jest/globals';

jest.mock('react-native-visit-rn-sdk', () => () => null);

jest.mock('react-native-event-listeners', () => ({
  EventRegister: {
    addEventListener: jest.fn(() => 'listener'),
    removeEventListener: jest.fn(),
  },
}));

jest.mock('@react-navigation/native', () => {
  const ReactModule = require('react');

  return {
    NavigationContainer: ({children}: {children: React.ReactNode}) => children,
    useFocusEffect: (callback: React.EffectCallback) => {
      ReactModule.useEffect(callback, [callback]);
    },
    useNavigation: () => ({navigate: jest.fn()}),
  };
});

jest.mock('@react-navigation/native-stack', () => {
  const ReactModule = require('react');

  return {
    createNativeStackNavigator: () => ({
      Navigator: ({children}: {children: React.ReactNode}) => {
        const homeScreen = ReactModule.Children.toArray(children).find(
          (child: any) => child.props.name === 'Home',
        );

        return ReactModule.createElement(homeScreen.props.component);
      },
      Screen: () => null,
    }),
  };
});

// @ts-expect-error App is the JavaScript example entry point.
import App from '../App';

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
});

it('initializes, checks connection, fetches steps, then syncs once', async () => {
  const initiateSDK = jest.fn();
  const getHealthConnectStatus = jest.fn(async () => 'CONNECTED');
  const getTodayStepCount = jest.fn(async () => 1234);
  const getTodaySleepMinutes = jest.fn(async () => 0);
  const getTodayCalorieCount = jest.fn(async () => 0);
  const triggerManualSync = jest.fn(async () => 'Health data sync completed');

  NativeModules.VisitFitnessModule = {
    initiateSDK,
    getHealthConnectStatus,
    getTodayStepCount,
    getTodaySleepMinutes,
    getTodayCalorieCount,
    triggerManualSync,
  };

  let component: renderer.ReactTestRenderer;

  await act(async () => {
    component = renderer.create(<App />);
    await flushPromises();
    await flushPromises();
  });

  expect(initiateSDK).toHaveBeenCalledTimes(1);
  expect(getHealthConnectStatus).toHaveBeenCalledTimes(1);
  expect(getTodayStepCount).toHaveBeenCalledTimes(1);
  expect(triggerManualSync).toHaveBeenCalledTimes(1);

  expect(initiateSDK.mock.invocationCallOrder[0]!).toBeLessThan(
    getHealthConnectStatus.mock.invocationCallOrder[0]!,
  );
  expect(getHealthConnectStatus.mock.invocationCallOrder[0]!).toBeLessThan(
    getTodayStepCount.mock.invocationCallOrder[0]!,
  );
  expect(getTodayStepCount.mock.invocationCallOrder[0]!).toBeLessThan(
    triggerManualSync.mock.invocationCallOrder[0]!,
  );

  component!.unmount();
});

it('does not fetch metrics or sync when Health Connect is not connected', async () => {
  const getTodayStepCount = jest.fn();
  const triggerManualSync = jest.fn();

  NativeModules.VisitFitnessModule = {
    initiateSDK: jest.fn(),
    getHealthConnectStatus: jest.fn(async () => 'INSTALLED'),
    getTodayStepCount,
    getTodaySleepMinutes: jest.fn(),
    getTodayCalorieCount: jest.fn(),
    triggerManualSync,
  };

  let component: renderer.ReactTestRenderer;

  await act(async () => {
    component = renderer.create(<App />);
    await flushPromises();
  });

  expect(getTodayStepCount).not.toHaveBeenCalled();
  expect(triggerManualSync).not.toHaveBeenCalled();

  component!.unmount();
});

it("does not sync when today's step count cannot be fetched", async () => {
  const stepError = new Error('Step query failed');
  const triggerManualSync = jest.fn();
  const consoleError = jest
    .spyOn(console, 'error')
    .mockImplementation(() => {});

  NativeModules.VisitFitnessModule = {
    initiateSDK: jest.fn(),
    getHealthConnectStatus: jest.fn(async () => 'CONNECTED'),
    getTodayStepCount: jest.fn(async () => {
      throw stepError;
    }),
    getTodaySleepMinutes: jest.fn(async () => 0),
    getTodayCalorieCount: jest.fn(async () => 0),
    triggerManualSync,
  };

  let component: renderer.ReactTestRenderer;

  await act(async () => {
    component = renderer.create(<App />);
    await flushPromises();
    await flushPromises();
  });

  expect(triggerManualSync).not.toHaveBeenCalled();
  expect(JSON.stringify(component!.toJSON())).toContain(
    "Today's step count could not be fetched. Sync was not started.",
  );

  consoleError.mockRestore();
  component!.unmount();
});

it('shows a native preflight error without retrying automatic sync', async () => {
  const syncError = Object.assign(
    new Error('Visit sync base URL or auth token is missing'),
    {code: 'MISSING_SYNC_CREDENTIALS'},
  );
  const triggerManualSync = jest.fn(async () => {
    throw syncError;
  });
  const consoleError = jest
    .spyOn(console, 'error')
    .mockImplementation(() => {});

  NativeModules.VisitFitnessModule = {
    initiateSDK: jest.fn(),
    getHealthConnectStatus: jest.fn(async () => 'CONNECTED'),
    getTodayStepCount: jest.fn(async () => 1234),
    getTodaySleepMinutes: jest.fn(async () => 0),
    getTodayCalorieCount: jest.fn(async () => 0),
    triggerManualSync,
  };

  let component: renderer.ReactTestRenderer;

  await act(async () => {
    component = renderer.create(<App />);
    await flushPromises();
    await flushPromises();
  });

  expect(triggerManualSync).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(component!.toJSON())).toContain(syncError.message);

  consoleError.mockRestore();
  component!.unmount();
});

it('checks HealthKit and automatically syncs on iOS without Android initialization', async () => {
  Platform.OS = 'ios';

  const getHealthKitConnectStatus = jest.fn(async () => 'CONNECTED');
  const getTodayStepCount = jest.fn(async () => 5678);
  const triggerManualSync = jest.fn(async () => 'Health Data Sync Completed');

  NativeModules.VisitRnSdkViewManager = {
    getHealthKitConnectStatus,
    getTodayStepCount,
    getTodaySleepMinutes: jest.fn(async () => 0),
    getTodayCalorieCount: jest.fn(async () => 0),
    triggerManualSync,
  };

  let component: renderer.ReactTestRenderer;

  await act(async () => {
    component = renderer.create(<App />);
    await flushPromises();
    await flushPromises();
  });

  expect(getHealthKitConnectStatus).toHaveBeenCalledTimes(1);
  expect(getTodayStepCount).toHaveBeenCalledTimes(1);
  expect(triggerManualSync).toHaveBeenCalledTimes(1);
  expect(getHealthKitConnectStatus.mock.invocationCallOrder[0]!).toBeLessThan(
    getTodayStepCount.mock.invocationCallOrder[0]!,
  );
  expect(getTodayStepCount.mock.invocationCallOrder[0]!).toBeLessThan(
    triggerManualSync.mock.invocationCallOrder[0]!,
  );

  component!.unmount();
});
