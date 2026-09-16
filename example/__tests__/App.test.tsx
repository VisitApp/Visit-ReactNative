/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-webview', () => {
  const MockReact = require('react');
  const { View } = require('react-native');
  const WebView = MockReact.forwardRef(
    (props: Record<string, unknown>, ref: unknown) => (
      <View {...props} ref={ref} testID="webview" />
    )
  );

  return {
    __esModule: true,
    default: WebView,
    WebView,
  };
});

jest.mock('@twilio/video-react-native-sdk', () => {
  const MockReact = require('react');
  const { View } = require('react-native');

  const TwilioVideo = MockReact.forwardRef(
    (props: Record<string, unknown>, ref: unknown) => {
      MockReact.useImperativeHandle(ref, () => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        flipCamera: jest.fn(),
        setLocalAudioEnabled: jest.fn(() => Promise.resolve(true)),
        setLocalVideoEnabled: jest.fn(() => Promise.resolve(true)),
      }));

      return <View {...props} testID="twilio-video" />;
    }
  );

  const TwilioVideoLocalView = (props: Record<string, unknown>) => (
    <View {...props} testID="twilio-video-local" />
  );

  const TwilioVideoParticipantView = (props: Record<string, unknown>) => (
    <View {...props} testID="twilio-video-participant" />
  );

  return {
    TwilioVideo,
    TwilioVideoLocalView,
    TwilioVideoParticipantView,
  };
});

jest.mock('@react-navigation/native', () => {
  const MockReact = require('react');

  return {
    NavigationContainer: ({ children }: { children?: React.ReactNode }) => (
      <MockReact.Fragment>{children}</MockReact.Fragment>
    ),
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    Screen: () => null,
  }),
}));

jest.mock('react-native-visit-rn-sdk', () => {
  const MockReact = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => (
      <View {...props} testID="visit-rn-sdk" />
    ),
  };
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
