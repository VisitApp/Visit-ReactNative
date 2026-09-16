declare module '@twilio/video-react-native-sdk' {
  import type { ComponentType, Ref } from 'react';
  import type { StyleProp, ViewStyle } from 'react-native';

  export type TwilioVideoProps = {
    ref?: Ref<unknown>;
    onRoomDidConnect?: (event: any) => void;
    onRoomDidDisconnect?: (event: any) => void;
    onRoomDidFailToConnect?: (event: any) => void;
    onParticipantAddedVideoTrack?: (event: any) => void;
    onParticipantRemovedVideoTrack?: (event: any) => void;
    onParticipantDisabledVideoTrack?: (event: any) => void;
    onParticipantEnabledVideoTrack?: (event: any) => void;
    onParticipantAddedAudioTrack?: (event: any) => void;
    onParticipantEnabledAudioTrack?: (event: any) => void;
    onParticipantDisabledAudioTrack?: (event: any) => void;
    onNetworkQualityLevelsChanged?: (event: any) => void;
    onRoomReconnectingWithError?: (event?: any) => void;
    onRoomParticipantIsReconnecting?: () => void;
    onRoomParticipantReconnected?: () => void;
  };

  export const TwilioVideo: ComponentType<TwilioVideoProps>;

  export const TwilioVideoLocalView: ComponentType<{
    enabled?: boolean;
    style?: StyleProp<ViewStyle>;
  }>;

  export const TwilioVideoParticipantView: ComponentType<{
    style?: StyleProp<ViewStyle>;
    trackIdentifier?: {
      participantSid: string;
      videoTrackSid: string;
    } | null;
  }>;
}

declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';
  const value: ImageSourcePropType;
  export default value;
}

declare module '*.gif' {
  import type { ImageSourcePropType } from 'react-native';
  const value: ImageSourcePropType;
  export default value;
}
