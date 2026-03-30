import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ICE_SERVERS, getMediaConstraints, CONNECTION_TIMEOUT } from '@/config/webrtcConfig';
import { 
  getAutoPerformanceMode, 
  PERFORMANCE_MODES, 
  applyBitrateConstraints,
  cleanupStream,
  throttle
} from '@/config/performanceConfig';

/**
 * Simplified WebRTC Hook - Direct Camera Stream
 * 
 * Features:
 * - Direct camera stream (no filter processing)
 * - Auto performance mode detection
 * - Bitrate control based on device capabilities
 * - Memory leak prevention
 */
export const useWebRTC = (socket, sessionId, partnerId, autoStart = true) => {
  // Performance mode state
  const [performanceMode, setPerformanceMode] = useState(() => getAutoPerformanceMode());
  const performanceModeRef = useRef(performanceMode);
  
  // State
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState(null);
  
  // Refs
  const peerConnection = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  // WebRTC negotiation state
  const makingOffer = useRef(false);
  const ignoreOffer = useRef(false);
  const isSettingRemoteAnswerPending = useRef(false);
  const pendingCandidates = useRef([]);
  const autoStarted = useRef(false);
  const currentSessionId = useRef(null);
  const connectionTimeout = useRef(null);
  
  // Track mount state for cleanup
  const mountedRef = useRef(true);
  const socketIdRef = useRef(null);
  const localStreamRef = useRef(null);

  // Get current performance settings
  const perfSettings = useMemo(() => {
    return PERFORMANCE_MODES[performanceMode] || PERFORMANCE_MODES.balanced;
  }, [performanceMode]);

  // Update performance mode ref
  useEffect(() => {
    performanceModeRef.current = performanceMode;
  }, [performanceMode]);

  // Determine if this peer is "polite" (receiver) or "impolite" (offerer)
  const isPolite = useCallback(() => {
    if (!partnerId || !socket?.id) return true;
    return partnerId < (socket.id || '');
  }, [partnerId, socket?.id]);

  // Clean up peer connection
  const cleanupPeerConnection = useCallback(() => {
    if (connectionTimeout.current) {
      clearTimeout(connectionTimeout.current);
      connectionTimeout.current = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.oniceconnectionstatechange = null;
      peerConnection.current.onnegotiationneeded = null;
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    makingOffer.current = false;
    ignoreOffer.current = false;
    isSettingRemoteAnswerPending.current = false;
    pendingCandidates.current = [];
    
    if (mountedRef.current) {
      setConnectionState('disconnected');
      setRemoteStream(null);
    }
  }, []);

  // Initialize peer connection with proper event handlers
  const createPeerConnection = useCallback(() => {
    cleanupPeerConnection();

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket && sessionId) {
        socket.emit('webrtc_ice_candidate', {
          candidate: event.candidate,
          session_id: sessionId
        });
      }
    };

    // Handle remote tracks
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        if (mountedRef.current) {
          setRemoteStream(event.streams[0]);
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    // Handle connection state changes
    pc.oniceconnectionstatechange = () => {
      if (!mountedRef.current) return;
      
      const state = pc.iceConnectionState;
      
      if (state === 'connected' || state === 'completed') {
        setConnectionState('connected');
        setError(null);
        if (connectionTimeout.current) {
          clearTimeout(connectionTimeout.current);
          connectionTimeout.current = null;
        }
      } else if (state === 'failed') {
        setConnectionState('failed');
        setError('Connection failed');
      } else if (state === 'disconnected') {
        setConnectionState('reconnecting');
      } else if (state === 'checking') {
        setConnectionState('connecting');
      }
    };

    // Handle negotiation needed
    pc.onnegotiationneeded = async () => {
      if (makingOffer.current) return;
      
      try {
        makingOffer.current = true;
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        
        if (pc.signalingState !== 'stable') {
          return;
        }
        
        await pc.setLocalDescription(offer);
        
        if (socket && sessionId) {
          socket.emit('webrtc_offer', {
            offer: pc.localDescription,
            session_id: sessionId
          });
        }
      } catch (err) {
        console.error('Negotiation error:', err);
      } finally {
        makingOffer.current = false;
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [socket, sessionId, cleanupPeerConnection]);

  // Get camera stream - direct, no filter processing
  const getLocalStream = useCallback(async () => {
    try {
      const mode = performanceModeRef.current;
      const settings = PERFORMANCE_MODES[mode] || PERFORMANCE_MODES.balanced;
      const constraints = getMediaConstraints(settings);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Store ref for cleanup
      localStreamRef.current = stream;
      
      if (mountedRef.current) {
        setLocalStream(stream);
      }
      
      // Set local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access failed');
      throw err;
    }
  }, []);

  // Start the call
  const startCall = useCallback(async () => {
    if (!socket || !sessionId) {
      console.warn('Cannot start call: missing socket or sessionId');
      return;
    }

    try {
      setConnectionState('connecting');
      setError(null);

      // Get camera stream
      const stream = await getLocalStream();
      
      // Create peer connection
      const pc = createPeerConnection();
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Apply bitrate constraints
      const settings = PERFORMANCE_MODES[performanceModeRef.current] || PERFORMANCE_MODES.balanced;
      await applyBitrateConstraints(pc, settings.bitrate);

      // Set connection timeout
      connectionTimeout.current = setTimeout(() => {
        if (mountedRef.current && connectionState !== 'connected') {
          setError('Connection timeout');
          setConnectionState('failed');
        }
      }, CONNECTION_TIMEOUT);

    } catch (err) {
      console.error('Start call error:', err);
      setError(err.message || 'Failed to start call');
      setConnectionState('failed');
    }
  }, [socket, sessionId, getLocalStream, createPeerConnection, connectionState]);

  // Handle incoming offer
  const handleOffer = useCallback(async (offer) => {
    if (!peerConnection.current) {
      const pc = createPeerConnection();
      
      // Get local stream if not already present
      if (!localStreamRef.current) {
        const stream = await getLocalStream();
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      }
    }

    const pc = peerConnection.current;
    if (!pc) return;

    try {
      const offerCollision = makingOffer.current || 
        (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer');

      ignoreOffer.current = !isPolite() && offerCollision;
      
      if (ignoreOffer.current) {
        return;
      }

      isSettingRemoteAnswerPending.current = true;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      isSettingRemoteAnswerPending.current = false;

      // Process pending ICE candidates
      for (const candidate of pendingCandidates.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          // Ignore
        }
      }
      pendingCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socket && sessionId) {
        socket.emit('webrtc_answer', {
          answer: pc.localDescription,
          session_id: sessionId
        });
      }
    } catch (err) {
      console.error('Handle offer error:', err);
    }
  }, [socket, sessionId, isPolite, createPeerConnection, getLocalStream]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (answer) => {
    const pc = peerConnection.current;
    if (!pc) return;

    try {
      if (pc.signalingState === 'stable') {
        return;
      }

      isSettingRemoteAnswerPending.current = true;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      isSettingRemoteAnswerPending.current = false;

      // Process pending ICE candidates
      for (const candidate of pendingCandidates.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          // Ignore
        }
      }
      pendingCandidates.current = [];
    } catch (err) {
      console.error('Handle answer error:', err);
    }
  }, []);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (candidate) => {
    const pc = peerConnection.current;
    
    if (!pc || !pc.remoteDescription) {
      pendingCandidates.current.push(candidate);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      // Silently ignore
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(prev => !prev);
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(prev => !prev);
    }
  }, []);

  // End call
  const endCall = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      cleanupStream(localStreamRef.current);
      localStreamRef.current = null;
    }
    
    // Clean video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    cleanupPeerConnection();
    
    if (mountedRef.current) {
      setLocalStream(null);
      setRemoteStream(null);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
      setError(null);
    }
    
    autoStarted.current = false;
    
    socket?.emit('webrtc_end_call', { session_id: sessionId });
  }, [socket, sessionId, cleanupPeerConnection]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    if (socketIdRef.current === socket.id) return;
    socketIdRef.current = socket.id;

    const onOffer = (data) => handleOffer(data.offer);
    const onAnswer = (data) => handleAnswer(data.answer);
    const onIceCandidate = (data) => handleIceCandidate(data.candidate);
    const onEndCall = () => endCall();

    socket.on('webrtc_offer', onOffer);
    socket.on('webrtc_answer', onAnswer);
    socket.on('webrtc_ice_candidate', onIceCandidate);
    socket.on('webrtc_end_call', onEndCall);

    return () => {
      socket.off('webrtc_offer', onOffer);
      socket.off('webrtc_answer', onAnswer);
      socket.off('webrtc_ice_candidate', onIceCandidate);
      socket.off('webrtc_end_call', onEndCall);
      socketIdRef.current = null;
    };
  }, [socket, handleOffer, handleAnswer, handleIceCandidate, endCall]);

  // Auto-start call when sessionId changes
  useEffect(() => {
    if (!autoStart || !sessionId || !socket?.connected) return;
    
    // Detect session change
    if (sessionId !== currentSessionId.current) {
      currentSessionId.current = sessionId;
      autoStarted.current = false;
      
      // Clean up previous call
      if (peerConnection.current) {
        endCall();
      }
    }
    
    if (!autoStarted.current && partnerId) {
      autoStarted.current = true;
      
      // Delay slightly to ensure socket is ready
      const timer = setTimeout(() => {
        startCall();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [autoStart, sessionId, partnerId, socket?.connected, startCall, endCall]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      endCall();
    };
  }, [endCall]);

  return {
    localVideoRef,
    remoteVideoRef,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    error,
    startCall,
    endCall,
    toggleVideo,
    toggleAudio,
    performanceMode,
    setPerformanceMode,
    perfSettings
  };
};

export default useWebRTC;
