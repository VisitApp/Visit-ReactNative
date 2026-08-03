/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-event-listeners', () => ({
  EventRegister: {
    addEventListener: jest.fn(() => 'listener-id'),
    emitEvent: jest.fn(),
    removeEventListener: jest.fn(),
  },
}));

jest.mock('react-native-webview', () => {
  const MockReact = require('react');
  const { View } = require('react-native');
  const WebView = MockReact.forwardRef((props, ref) => (
    <View {...props} ref={ref} testID="webview" />
  ));

  return {
    __esModule: true,
    default: WebView,
    WebView,
  };
});

jest.mock('@twilio/video-react-native-sdk', () => {
  const MockReact = require('react');
  const { View } = require('react-native');

  const TwilioVideo = MockReact.forwardRef((props, ref) => {
    MockReact.useImperativeHandle(ref, () => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      flipCamera: jest.fn(),
      setLocalAudioEnabled: jest.fn(() => Promise.resolve(true)),
      setLocalVideoEnabled: jest.fn(() => Promise.resolve(true)),
    }));

    return <View {...props} testID="twilio-video" />;
  });

  const TwilioVideoLocalView = (props) => (
    <View {...props} testID="twilio-video-local" />
  );

  const TwilioVideoParticipantView = (props) => (
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
    NavigationContainer: ({ children }) => <MockReact.Fragment>{children}</MockReact.Fragment>,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => <>{children}</>,
    Screen: () => null,
  }),
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
