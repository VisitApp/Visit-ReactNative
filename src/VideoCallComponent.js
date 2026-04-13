import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Dimensions,
  Image,
  LayoutAnimation,
  PermissionsAndroid,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import {
  TwilioVideo,
  TwilioVideoLocalView,
  TwilioVideoParticipantView,
} from '@twilio/video-react-native-sdk';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
const ICONS = {
  mute: require('./assets/video-call/mic-off.png'),
  videoOff: require('./assets/video-call/video-off.png'),
  flip: require('./assets/video-call/switch-camera.png'),
  end: require('./assets/video-call/end-call.png'),
  connecting: require('./assets/video-call/connecting-lottie.gif'),
  reconnecting: require('./assets/video-call/reconnecting.gif'),
};

const initialCallState = {
  isVisible: false,
  loading: false,
  status: 'idle',
  roomName: '',
  accessToken: '',
  remoteTrackSid: '',
  remoteTrackIdentifier: null,
  participantVideoEnabled: false,
  participantAudioEnabled: true,
  isMuted: false,
  isVideoEnabled: true,
  isFrontCameraEnabled: true,
  signalStrength: null,
  participantSignalStrength: null,
  showLowSignalStrengthMessage: false,
  showParticipantReconnectingScreen: false,
  showUserReconnectingScreen: false,
  showBottomBar: true,
  durationMins: '00',
  durationSecs: '00',
  doctorName: '',
  userName: '',
};

const VideoCallComponent = forwardRef(
  (
    {
      onCallConnected,
      onCallEnded,
      onError,
      onLowNetworkQuality,
      onStateChange,
      style,
    },
    ref
  ) => {
    const twilioVideoRef = useRef(null);
    const durationTimerRef = useRef(null);
    const timerRunningRef = useRef(false);
    const reconnectingTimerRef = useRef(null);
    const retriedWithoutVideoRef = useRef(false);
    const retriedWithBackCameraRef = useRef(false);
    const cameraTypeRef = useRef('front');
    const [state, setState] = useState(initialCallState);

    useEffect(() => {
      if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }, []);

    const clearDurationTimer = useCallback(() => {
      timerRunningRef.current = false;
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }, []);

    const clearReconnectTimer = useCallback(() => {
      if (reconnectingTimerRef.current) {
        clearInterval(reconnectingTimerRef.current);
        reconnectingTimerRef.current = null;
      }
    }, []);

    const emitState = useCallback(
      (nextState) => {
        if (onStateChange) {
          onStateChange(nextState);
        }
      },
      [onStateChange]
    );

    const updateState = useCallback(
      (updater) => {
        setState((prev) => {
          const next =
            typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
          emitState(next);
          return next;
        });
      },
      [emitState]
    );

    const resetToInitial = useCallback(() => {
      clearDurationTimer();
      clearReconnectTimer();
      setState(initialCallState);
      emitState(initialCallState);
    }, [clearDurationTimer, clearReconnectTimer, emitState]);

    const leaveVideo = useCallback(
      (reason, error) => {
        retriedWithoutVideoRef.current = false;
        clearDurationTimer();
        clearReconnectTimer();
        setState((prev) => {
          const finalState = { ...initialCallState };
          emitState(finalState);
          return finalState;
        });
        if (onCallEnded) {
          onCallEnded({ reason, error });
        }
      },
      [clearDurationTimer, clearReconnectTimer, emitState, onCallEnded]
    );

    const startDurationTimer = useCallback(() => {
      timerRunningRef.current = true;
      if (durationTimerRef.current) {
        return;
      }
      durationTimerRef.current = setInterval(() => {
        if (!timerRunningRef.current) {
          return;
        }
        updateState((prev) => {
          let secs = parseInt(prev.durationSecs, 10) + 1;
          let mins = parseInt(prev.durationMins, 10);
          if (secs >= 60) {
            mins += 1;
            secs = 0;
          }
          return {
            ...prev,
            durationMins: mins < 10 ? `0${mins}` : String(mins),
            durationSecs: secs < 10 ? `0${secs}` : String(secs),
          };
        });
      }, 1000);
    }, [updateState]);

    const requestAndroidVideoPermissions = useCallback(async () => {
      if (Platform.OS !== 'android') {
        return true;
      }

      try {
        const cameraPermission = PermissionsAndroid.PERMISSIONS.CAMERA;
        const micPermission = PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;

        const hasCamera = await PermissionsAndroid.check(cameraPermission);
        const hasMic = await PermissionsAndroid.check(micPermission);
        if (hasCamera && hasMic) {
          return true;
        }

        const permissionResult = await PermissionsAndroid.requestMultiple([
          cameraPermission,
          micPermission,
        ]);

        const cameraGranted =
          permissionResult[cameraPermission] === PermissionsAndroid.RESULTS.GRANTED;
        const micGranted =
          permissionResult[micPermission] === PermissionsAndroid.RESULTS.GRANTED;
        const granted = cameraGranted && micGranted;

        if (!granted) {
          Alert.alert(
            'Permissions required',
            'Camera and microphone permissions are required to start a video call.'
          );
        }
        return granted;
      } catch (error) {
        // if (onError) {
        //   onError(error);
        // }
        Alert.alert(
          'Permission error',
          'Unable to request camera and microphone permissions.'
        );
        return false;
      }
    }, [onError]);

    const connectToRoom = useCallback(
      async ({ roomName, accessToken, doctorName, userName }) => {
        if (!roomName || !accessToken) {
          const err = new Error('roomName and accessToken are required');
          if (onError) {
            onError(err);
          }
          Alert.alert('Missing call details', 'roomName and accessToken are required');
          return;
        }

        const canStartCall = await requestAndroidVideoPermissions();
        if (!canStartCall) {
          return;
        }

        retriedWithoutVideoRef.current = false;
        retriedWithBackCameraRef.current = false;
        cameraTypeRef.current = 'front';
        updateState((prev) => ({
          ...prev,
          isVisible: true,
          loading: true,
          status: 'connecting',
          roomName,
          accessToken,
          doctorName: doctorName || '',
          userName: userName || '',
          durationMins: '00',
          durationSecs: '00',
        }));
        setTimeout(() => {
          twilioVideoRef.current?.connect({
            accessToken,
            roomName,
            cameraType: cameraTypeRef.current,
            enableAudio: true,
            enableVideo: true,
            enableNetworkQualityReporting: true,
          });
        }, 600);
      },
      [onError, requestAndroidVideoPermissions, updateState]
    );

    const endCall = useCallback(() => {
      twilioVideoRef.current?.disconnect();
      leaveVideo('ended-by-user');
    }, [leaveVideo]);

    useImperativeHandle(
      ref,
      () => ({
        startVideoCall: ({ roomName, accessToken, doctorName, userName }) =>
          connectToRoom({ roomName, accessToken, doctorName, userName }),
        endCall,
        isConnected: () => state.isVisible,
      }),
      [connectToRoom, endCall, state.isVisible]
    );

    useEffect(() => {
      return () => {
        clearDurationTimer();
        clearReconnectTimer();
      };
    }, [clearDurationTimer, clearReconnectTimer]);

    const onRoomDidConnect = ({ roomName }) => {
      console.log('onRoomDidConnect', roomName);
      updateState((prev) => ({
        ...prev,
        loading: false,
        status: 'connected',
        showUserReconnectingScreen: false,
      }));
      clearReconnectTimer();
      if (onCallConnected) {
        onCallConnected({ roomName });
      }
    };

    const onRoomDidDisconnect = ({ error }) => {
      leaveVideo('room-disconnected', error);
    };

    const onRoomDidFailToConnect = (error) => {
      const errorMessage = String(error?.error || error?.message || '');
      const noCameraAvailable = errorMessage
        .toLowerCase()
        .includes('no camera is supported on this device');

      if (noCameraAvailable && !retriedWithBackCameraRef.current) {
        retriedWithBackCameraRef.current = true;
        cameraTypeRef.current = 'back';
        updateState((prev) => ({
          ...prev,
          loading: true,
          status: 'connecting',
        }));
        setTimeout(() => {
          twilioVideoRef.current?.connect({
            accessToken: state.accessToken,
            roomName: state.roomName,
            cameraType: cameraTypeRef.current,
            enableAudio: true,
            enableVideo: true,
            enableNetworkQualityReporting: true,
          });
        }, 300);
        return;
      }

      if (noCameraAvailable && !retriedWithoutVideoRef.current) {
        retriedWithoutVideoRef.current = true;
        updateState((prev) => ({
          ...prev,
          isVideoEnabled: false,
          loading: true,
          status: 'connecting',
        }));
        Alert.alert(
          'Camera unavailable',
          'Starting audio-only call because no camera is available on this device.'
        );
        setTimeout(() => {
          twilioVideoRef.current?.connect({
            accessToken: state.accessToken,
            roomName: state.roomName,
            cameraType: cameraTypeRef.current,
            enableAudio: true,
            enableVideo: false,
            enableNetworkQualityReporting: true,
          });
        }, 200);
        return;
      }

      if (onError) {
        onError(error);
      }
      const hasTokenError = errorMessage.toLowerCase().includes('token');
      if (hasTokenError) {
        Alert.alert('Unable to connect', 'The video room token is invalid or expired.');
      }
      // leaveVideo('connect-failed', error);
    };

    const onParticipantAddedVideoTrack = ({ participant, track }) => {
      updateState((prev) => {
        if (prev.remoteTrackSid) {
          return prev;
        }
        return {
          ...prev,
          remoteTrackSid: track.trackSid,
          remoteTrackIdentifier: {
            participantSid: participant.sid,
            videoTrackSid: track.trackSid,
          },
          participantVideoEnabled: !!track.enabled,
          loading: false,
          status: 'connected',
        };
      });
      startDurationTimer();
    };

    const onParticipantRemovedVideoTrack = ({ track }) => {
      updateState((prev) => {
        if (track.trackSid !== prev.remoteTrackSid) {
          return prev;
        }
        timerRunningRef.current = false;
        return {
          ...prev,
          remoteTrackSid: '',
          remoteTrackIdentifier: null,
          status: 'participantDisconnected',
        };
      });
    };

    const onParticipantDisabledVideoTrack = (event) => {
      updateState((prev) => ({
        ...prev,
        participantVideoEnabled: !!event.track?.enabled,
      }));
    };

    const onParticipantEnabledVideoTrack = (event) => {
      updateState((prev) => ({
        ...prev,
        participantVideoEnabled: !!event.track?.enabled,
      }));
    };

    const onParticipantAudioToggled = (event) => {
      updateState((prev) => ({
        ...prev,
        participantAudioEnabled: !!event.track?.enabled,
      }));
    };

    const onNetworkQualityLevelsChanged = (payload) => {
      if (payload.isLocalUser) {
        const isLow = payload.quality > 0 && payload.quality < 3;
        updateState((prev) => ({
          ...prev,
          signalStrength: payload.quality,
          // showLowSignalStrengthMessage: isLow,
          showUserReconnectingScreen: false,
        }));
        if (isLow && onLowNetworkQuality) {
          onLowNetworkQuality({ quality: payload.quality, participant: 'local' });
        }
      } else {
        updateState((prev) => ({
          ...prev,
          participantSignalStrength: payload.quality,
          showParticipantReconnectingScreen: payload.quality <= 1,
        }));
      }
    };

    const onMuteButtonPress = () => {
      twilioVideoRef.current?.setLocalAudioEnabled(state.isMuted).then((enabled) => {
        updateState((prev) => ({ ...prev, isMuted: !enabled }));
      });
    };

    const onVideoToggle = () => {
      twilioVideoRef.current
        ?.setLocalVideoEnabled(!state.isVideoEnabled)
        .then((enabled) => {
          console.log('onVideoToggle', enabled);
          updateState((prev) => ({ ...prev, isVideoEnabled: enabled }));
        })
        .catch((error) => {
          console.error('Error toggling video:', error);
        });
    };

    const onFlipButtonPress = () => {
      twilioVideoRef.current?.flipCamera();
      updateState((prev) => ({
        ...prev,
        isFrontCameraEnabled: !prev.isFrontCameraEnabled,
      }));
    };

    const onRoomReconnectingWithError = () => {
      updateState((prev) => ({
        ...prev,
        showUserReconnectingScreen: true,
      }));
      clearReconnectTimer();
      reconnectingTimerRef.current = setInterval(() => {
        const { accessToken, roomName, isMuted, isVideoEnabled } = state;
        if (!accessToken || !roomName) {
          return;
        }
        twilioVideoRef.current?.connect({
          accessToken,
          roomName,
          enableAudio: !isMuted,
          enableVideo: isVideoEnabled,
          enableNetworkQualityReporting: true,
        });
      }, 3000);
    };

    if (!state.isVisible) {
      return (
        <TwilioVideo
          ref={twilioVideoRef}
          onRoomDidConnect={onRoomDidConnect}
          onRoomDidDisconnect={onRoomDidDisconnect}
          onRoomDidFailToConnect={onRoomDidFailToConnect}
          onParticipantAddedVideoTrack={onParticipantAddedVideoTrack}
          onParticipantDisabledVideoTrack={onParticipantDisabledVideoTrack}
          onParticipantEnabledVideoTrack={onParticipantEnabledVideoTrack}
          onParticipantRemovedVideoTrack={onParticipantRemovedVideoTrack}
          onParticipantAddedAudioTrack={onParticipantAudioToggled}
          onParticipantEnabledAudioTrack={onParticipantAudioToggled}
          onParticipantDisabledAudioTrack={onParticipantAudioToggled}
          onNetworkQualityLevelsChanged={onNetworkQualityLevelsChanged}
          onRoomReconnectingWithError={onRoomReconnectingWithError}
          onRoomParticipantIsReconnecting={() =>
            updateState((prev) => ({
              ...prev,
              showParticipantReconnectingScreen: true,
            }))
          }
          onRoomParticipantReconnected={() =>
            updateState((prev) => ({
              ...prev,
              showParticipantReconnectingScreen: false,
            }))
          }
        />
      );
    }

    const isReconnecting =
      state.showParticipantReconnectingScreen || state.showUserReconnectingScreen;
    const isConnecting = state.loading || state.status === 'connecting';
    const showDoctorInitial = !isReconnecting && !isConnecting;

    return (
      <View style={[styles.container, style]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.topHeader}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.nameText}>
              {state.doctorName || 'Video consultation'}
            </Text>
            <Text style={styles.timerText}>
              {state.durationMins}:{state.durationSecs}
            </Text>
          </View>
          {(state.signalStrength !== null || state.participantSignalStrength !== null) && (
            <View style={styles.signalHeaderRow}>
              {state.participantSignalStrength !== null ? (
                <SignalStrengthIndicator
                  strength={state.participantSignalStrength}
                  participantLabel="Doctor"
                />
              ) : null}
              {state.signalStrength !== null ? (
                <View style={styles.signalItemSpacer}>
                  <SignalStrengthIndicator
                    strength={state.signalStrength}
                    participantLabel="Patient"
                  />
                </View>
              ) : null}
            </View>
          )}
        </View>

        {state.remoteTrackIdentifier &&
        state.participantVideoEnabled &&
        !state.showParticipantReconnectingScreen &&
        !state.showUserReconnectingScreen ? (
          <TwilioVideoParticipantView
            style={styles.remoteVideo}
            trackIdentifier={state.remoteTrackIdentifier}
          />
        ) : (
          <View style={styles.remotePlaceholder}>
            {isReconnecting || isConnecting ? (
              <View
                style={[
                  styles.connectingView,
                  { backgroundColor: 'rgba(164, 171, 180, 0.36)', },
                ]}
              >
                <Image
                  style={styles.connectingGif}
                  source={isReconnecting ? ICONS.reconnecting : ICONS.connecting}
                />
                <Text style={styles.connectingText}>
                  {isReconnecting ? 'Reconnecting...' : 'Connecting...'}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.placeholderText,
                  showDoctorInitial ? styles.placeholderInitialText : null,
                ]}
              >
                {(state.doctorName || 'Doctor').trim().charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
        )}

        {!isConnecting ? (
          <View
            style={[
              styles.localPreview,
              state.showLowSignalStrengthMessage
                ? state.showBottomBar
                  ? styles.localPreviewAboveLowSignalExpanded
                  : styles.localPreviewAboveLowSignalCollapsed
                : state.showBottomBar
                ? styles.localPreviewAboveControls
                : styles.localPreviewAboveCollapsedControls,
            ]}
          >
            <View style={styles.localPreviewInner}>
              {state.isVideoEnabled ? (
                <TwilioVideoLocalView enabled style={styles.localVideo} />
              ) : (
                <View style={[styles.localVideo, styles.localVideoOff]}>
                  <Text style={styles.localVideoOffText}>
                    {(state.userName || 'You').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {!state.participantAudioEnabled ? (
          <View
            style={[
              styles.participantMicOffBadge,
              state.showBottomBar
                ? styles.participantMicOffBadgeAboveControls
                : styles.participantMicOffBadgeAboveCollapsed,
            ]}
          >
            <Image source={ICONS.mute} style={styles.participantMicOffIcon} resizeMode="contain" />
          </View>
        ) : null}

        {state.showLowSignalStrengthMessage ? (
          <View
            style={[
              styles.lowSignalBanner,
              state.showBottomBar
                ? styles.lowSignalBannerAboveControls
                : styles.lowSignalBannerAboveCollapsed,
            ]}
          >
            <Text style={styles.lowSignalText}>
              Poor connection detected. Try moving for better signal.
            </Text>
            <Pressable
              onPress={() =>
                updateState((prev) => ({
                  ...prev,
                  showLowSignalStrengthMessage: false,
                }))
              }
            >
              <Text style={styles.lowSignalDismiss}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.bottomBarContainer}>
          <View
            style={[styles.controls, !state.showBottomBar ? styles.controlsCollapsed : null]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.controlsTopLineTouch}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                updateState((prev) => ({
                  ...prev,
                  showBottomBar: !prev.showBottomBar,
                }));
              }}
            >
              <View style={styles.controlsTopLine} />
            </TouchableOpacity>

            {state.showBottomBar ? (
              <>
              <ControlButton
                label="Mute"
                icon={ICONS.mute}
                onPress={onMuteButtonPress}
                active={state.isMuted}
              />
              <ControlButton
                label="Video on"
                icon={ICONS.videoOff}
                onPress={onVideoToggle}
                active={!state.isVideoEnabled}
              />
              <ControlButton
                label="Flip Camera"
                icon={ICONS.flip}
                onPress={onFlipButtonPress}
                useTouchableOpacity
              />
              <ControlButton
                label="End Call"
                icon={ICONS.end}
                onPress={endCall}
                danger
                iconSize={18}
                useTouchableOpacity
              />
              </>
            ) : null}
          </View>
        </View>

        <TwilioVideo
          ref={twilioVideoRef}
          onRoomDidConnect={onRoomDidConnect}
          onRoomDidDisconnect={onRoomDidDisconnect}
          onRoomDidFailToConnect={onRoomDidFailToConnect}
          onParticipantAddedVideoTrack={onParticipantAddedVideoTrack}
          onParticipantDisabledVideoTrack={onParticipantDisabledVideoTrack}
          onParticipantEnabledVideoTrack={onParticipantEnabledVideoTrack}
          onParticipantRemovedVideoTrack={onParticipantRemovedVideoTrack}
          onParticipantAddedAudioTrack={onParticipantAudioToggled}
          onParticipantEnabledAudioTrack={onParticipantAudioToggled}
          onParticipantDisabledAudioTrack={onParticipantAudioToggled}
          onNetworkQualityLevelsChanged={onNetworkQualityLevelsChanged}
          onRoomReconnectingWithError={onRoomReconnectingWithError}
          onRoomParticipantIsReconnecting={() =>
            updateState((prev) => ({
              ...prev,
              showParticipantReconnectingScreen: true,
            }))
          }
          onRoomParticipantReconnected={() =>
            updateState((prev) => ({
              ...prev,
              showParticipantReconnectingScreen: false,
            }))
          }
        />
      </View>
    );
  }
);

const SignalStrengthIndicator = ({ strength, participantLabel }) => {
  const bars = [1, 2, 3, 4, 5];
  const barColor =
    strength <= 1
      ? '#f04d5a'
      : strength === 2
      ? '#f48f31'
      : strength === 3
      ? '#f9ca24'
      : '#5dd670';

  return (
    <View style={styles.signalContainer}>
      <View style={styles.signalBars}>
        {bars.map((bar, idx) => (
          <View
            key={`bar-${bar}`}
            style={[
              styles.signalBar,
              {
                backgroundColor: strength >= bar ? barColor : '#6f6f6f',
                height: idx === 0 ? 2 : idx * 4,
                marginRight: idx === 4 ? 0 : 3,
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.signalLabel}>{participantLabel}</Text>
    </View>
  );
};

const ControlButton = ({
  label,
  onPress,
  danger,
  icon,
  customIconText,
  active,
  iconSize,
  useTouchableOpacity,
}) => {
  const content = (
    <View
      style={[
        styles.controlIconShell,
        active ? styles.controlIconShellActive : null,
        danger ? styles.controlButtonDanger : null,
      ]}
    >
      {icon ? (
        <Image
          source={icon}
          style={[
            styles.controlButtonIcon,
            iconSize ? { width: iconSize, height: iconSize } : null,
            active ? styles.controlButtonIconActive : null,
            danger ? styles.controlButtonIconDanger : null,
          ]}
          resizeMode="contain"
        />
      ) : (
        <Text
          style={[
            styles.controlFallbackIcon,
            active ? styles.controlFallbackIconActive : null,
          ]}
        >
          {customIconText || '?'}
        </Text>
      )}
    </View>
  );

  if (useTouchableOpacity) {
    return (
      <TouchableOpacity style={styles.controlButton} onPress={onPress} activeOpacity={0.65}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <Pressable style={styles.controlButton} onPress={onPress}>
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 56,
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  nameText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  timerText: {
    color: '#fff',
    marginTop: 4,
    fontSize: 13,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  remoteVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  remotePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  placeholderText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
  placeholderInitialText: {
    fontSize: 40,
    fontWeight: '700',
    width: 120,
    height: 120,
    lineHeight: 120,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    borderRadius: 60,
    backgroundColor: 'rgb(113, 79, 255)',
    overflow: 'hidden',
  },
  connectingView: {
    minHeight: 200,
    width: 271,
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    position: 'absolute',
    top: 0.35 * SCREEN_HEIGHT,
  },
  connectingGif: {
    width: 108,
    height: 108,
  },
  connectingText: {
    marginTop: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  localPreview: {
    position: 'absolute',
    top: 'auto',
    right: 16,
    width: 112,
    height: 164,
    zIndex: 15,
  },
  localPreviewInner: {
    flex: 1,
    backgroundColor: '#1b1b1b',
  },
  localPreviewAboveControls: {
    bottom: 140,
  },
  localPreviewAboveCollapsedControls: {
    bottom: 78,
  },
  localPreviewAboveLowSignalExpanded: {
    bottom: 224,
  },
  localPreviewAboveLowSignalCollapsed: {
    bottom: 162,
  },
  localVideo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1b1b1b',
  },
  localVideoOff: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  localVideoOffText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    width: 60,
    height: 60,
    lineHeight: 60,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    borderRadius: 40,
    backgroundColor: 'rgb(113, 79, 255)',
    overflow: 'hidden',
  },
  controls: {
    zIndex: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    width: SCREEN_WIDTH,
    paddingHorizontal: 10,
    paddingBottom: 20,
    paddingTop: 30,
    marginBottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0.5,
    borderColor: 'rgba(129, 186, 255, 0.18)',
    backgroundColor: 'rgba(164, 171, 180, 0.36)',
  },
  controlsCollapsed: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  bottomBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  controlsTopLineTouch: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    width: 72,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  controlsTopLine: {
    width: 56,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  controlButton: {
    alignItems: 'center',
    width: 72,
  },
  controlButtonDanger: {
    backgroundColor: '#f04d5a',
  },
  controlIconShell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  controlIconShellActive: {
    backgroundColor: '#ffffff',
  },
  controlButtonIcon: {
    width: 30,
    height: 30,
    tintColor: '#ffffff',
  },
  controlButtonIconActive: {
    tintColor: 'rgba(70,70,70,0.8)',
  },
  controlButtonIconDanger: {
    tintColor: '#ffffff',
  },
  controlFallbackIcon: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  controlFallbackIconActive: {
    color: 'rgba(70,70,70,0.8)',
  },
  signalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 0,
  },
  signalContainer: {
    alignItems: 'center',
  },
  signalItemSpacer: {
    marginLeft: 10,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  signalBar: {
    width: 3,
    borderRadius: 2,
  },
  signalLabel: {
    color: '#fff',
    fontSize: 10,
    marginTop: 3,
    textAlign: 'center',
    width: '100%',
  },
  participantMicOffBadge: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 21,
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantMicOffBadgeAboveControls: {
    bottom: 118,
  },
  participantMicOffBadgeAboveCollapsed: {
    bottom: 58,
  },
  participantMicOffIcon: {
    width: 22,
    height: 22,
    tintColor: '#fff',
  },
  lowSignalBanner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lowSignalBannerAboveControls: {
    bottom: 130,
  },
  lowSignalBannerAboveCollapsed: {
    bottom: 68,
  },
  lowSignalText: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
    paddingRight: 8,
  },
  lowSignalDismiss: {
    color: '#7ec8ff',
    fontWeight: '700',
    fontSize: 12,
  },
});

export default VideoCallComponent;
