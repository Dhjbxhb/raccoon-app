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
      console.log('[WebRTC] Remote track received:', event.track.kind);
      if (event.streams && event.streams[0]) {
        const remoteStr = event.streams[0];
        
        if (mountedRef.current) {
          setRemoteStream(remoteStr);
        }
        
        if (remoteVideoRef.current) {
          // Clear any stale srcObject first
          if (remoteVideoRef.current.srcObject !== remoteStr) {
            remoteVideoRef.current.srcObject = remoteStr;
          }
          
          // Force play - critical for avoiding black screens
          remoteVideoRef.current.play().catch(e => {
            console.warn('[WebRTC] Remote video play warning:', e);
          });
        }
      }
    };

    // Handle connection state changes
    pc.oniceconnectionstatechange = () => {
      if (!mountedRef.current) return;
      
      const state = pc.iceConnectionState;
      console.log('[WebRTC] ICE connection state:', state);
      
      if (state === 'connected' || state === 'completed') {
        setConnectionState('connected');
        setError(null);
        if (connectionTimeout.current) {
          clearTimeout(connectionTimeout.current);
          connectionTimeout.current = null;
        }
        
        // Ensure videos are playing after connection
        if (localVideoRef.current && localVideoRef.current.srcObject) {
          localVideoRef.current.play().catch(() => {});
        }
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
          remoteVideoRef.current.play().catch(() => {});
        }
      } else if (state === 'failed') {
        console.error('[WebRTC] Connection failed');
        setConnectionState('failed');
        setError('Connection failed');
      } else if (state === 'disconnected') {
        console.warn('[WebRTC] Connection disconnected, may recover');
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
    // IMPORTANT: Clean up any existing stream first
    if (localStreamRef.current) {
      console.log('[WebRTC] Cleaning up existing local stream before getting new one');
      cleanupStream(localStreamRef.current);
      localStreamRef.current = null;
      
      // Clear video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      
      if (mountedRef.current) {
        setLocalStream(null);
      }
    }
    
    try {
      const mode = performanceModeRef.current;
      const settings = PERFORMANCE_MODES[mode] || PERFORMANCE_MODES.balanced;
      const constraints = getMediaConstraints(settings);
      
      console.log('[WebRTC] Requesting camera with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[WebRTC] Got camera stream:', stream.id);
      
      // Store ref for cleanup
      localStreamRef.current = stream;
      
      if (mountedRef.current) {
        setLocalStream(stream);
      }
      
      // Set local video and ensure it plays
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Force play - important for some browsers
        try {
          await localVideoRef.current.play();
        } catch (playError) {
          console.warn('[WebRTC] Local video play warning:', playError);
        }
      }
      
      return stream;
    } catch (err) {
      console.error('[WebRTC] Camera error:', err);
      setError('Camera access failed');
      throw err;
    }
  }, []);

  // Start the call
  const startCall = useCallback(async () => {
    if (!socket || !sessionId) {
      console.warn('[WebRTC] Cannot start call: missing socket or sessionId');
      return;
    }

    console.log('[WebRTC] Starting call for session:', sessionId);

    try {
      setConnectionState('connecting');
      setError(null);

      // Get camera stream (this also cleans up any existing stream)
      const stream = await getLocalStream();
      
      if (!stream) {
        throw new Error('Failed to get camera stream');
      }
      
      // Create peer connection
      const pc = createPeerConnection();
      
      if (!pc) {
        throw new Error('Failed to create peer connection');
      }
      
      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log('[WebRTC] Adding track to PC:', track.kind);
        pc.addTrack(track, stream);
      });

      // Apply bitrate constraints
      const settings = PERFORMANCE_MODES[performanceModeRef.current] || PERFORMANCE_MODES.balanced;
      await applyBitrateConstraints(pc, settings.bitrate);

      // Set connection timeout
      if (connectionTimeout.current) {
        clearTimeout(connectionTimeout.current);
      }
      
      connectionTimeout.current = setTimeout(() => {
        if (mountedRef.current) {
          const currentState = peerConnection.current?.iceConnectionState;
          if (currentState !== 'connected' && currentState !== 'completed') {
            console.warn('[WebRTC] Connection timeout, state:', currentState);
            setError('Connection timeout - trying to reconnect');
            setConnectionState('failed');
          }
        }
      }, CONNECTION_TIMEOUT);

      console.log('[WebRTC] Call started successfully');
    } catch (err) {
      console.error('[WebRTC] Start call error:', err);
      setError(err.message || 'Failed to start call');
      setConnectionState('failed');
    }
  }, [socket, sessionId, getLocalStream, createPeerConnection]);

  // Handle incoming offer
  const handleOffer = useCallback(async (offer) => {
    console.log('[WebRTC] Received offer');
    
    if (!peerConnection.current) {
      console.log('[WebRTC] No peer connection, creating one');
      const pc = createPeerConnection();
      
      // Get local stream if not already present
      if (!localStreamRef.current) {
        console.log('[WebRTC] No local stream, getting one');
        const stream = await getLocalStream();
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
      } else {
        // Add existing stream tracks to new PC
        localStreamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, localStreamRef.current);
        });
      }
    }

    const pc = peerConnection.current;
    if (!pc) {
      console.error('[WebRTC] Still no peer connection after creation');
      return;
    }

    try {
      const offerCollision = makingOffer.current || 
        (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer');

      ignoreOffer.current = !isPolite() && offerCollision;
      
      if (ignoreOffer.current) {
        console.log('[WebRTC] Ignoring offer due to collision');
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
        console.log('[WebRTC] Sent answer');
      }
    } catch (err) {
      console.error('[WebRTC] Handle offer error:', err);
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

  // End call - THOROUGH CLEANUP
  const endCall = useCallback(() => {
    console.log('[WebRTC] endCall - Starting cleanup');
    
    // 1. Stop local stream tracks FIRST
    if (localStreamRef.current) {
      console.log('[WebRTC] Stopping local stream:', localStreamRef.current.id);
      localStreamRef.current.getTracks().forEach(track => {
        console.log('[WebRTC] Stopping track:', track.kind, track.id);
        track.stop();
        track.enabled = false;
      });
      localStreamRef.current = null;
    }
    
    // 2. Clear video elements BEFORE cleaning peer connection
    if (localVideoRef.current) {
      localVideoRef.current.pause();
      localVideoRef.current.srcObject = null;
      localVideoRef.current.load(); // Reset video element
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.pause();
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.load(); // Reset video element
    }
    
    // 3. Clean peer connection
    cleanupPeerConnection();
    
    // 4. Reset state
    if (mountedRef.current) {
      setLocalStream(null);
      setRemoteStream(null);
      setIsVideoEnabled(true);
      setIsAudioEnabled(true);
      setError(null);
    }
    
    // 5. Reset auto-start flag
    autoStarted.current = false;
    
    // 6. Notify server
    if (socket && sessionId) {
      socket.emit('webrtc_end_call', { session_id: sessionId });
    }
    
    console.log('[WebRTC] endCall - Cleanup complete');
  }, [socket, sessionId, cleanupPeerConnection]);

  // Restart camera - useful for recovery from black screen
  const restartCamera = useCallback(async () => {
    console.log('[WebRTC] Restarting camera...');
    
    // Clean up existing stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      localStreamRef.current = null;
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    setLocalStream(null);
    
    // Get new stream
    try {
      const stream = await getLocalStream();
      
      // If we have an active peer connection, replace the tracks
      if (peerConnection.current && stream) {
        const senders = peerConnection.current.getSenders();
        for (const sender of senders) {
          if (sender.track?.kind === 'video') {
            const newVideoTrack = stream.getVideoTracks()[0];
            if (newVideoTrack) {
              await sender.replaceTrack(newVideoTrack);
              console.log('[WebRTC] Replaced video track');
            }
          } else if (sender.track?.kind === 'audio') {
            const newAudioTrack = stream.getAudioTracks()[0];
            if (newAudioTrack) {
              await sender.replaceTrack(newAudioTrack);
              console.log('[WebRTC] Replaced audio track');
            }
          }
        }
      }
      
      console.log('[WebRTC] Camera restarted successfully');
      return true;
    } catch (err) {
      console.error('[WebRTC] Failed to restart camera:', err);
      setError('Failed to restart camera');
      return false;
    }
  }, [getLocalStream]);

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
    if (!autoStart || !socket?.connected) return;
    
    // No session - cleanup and wait
    if (!sessionId) {
      if (peerConnection.current || localStreamRef.current) {
        console.log('[WebRTC] No sessionId, cleaning up');
        endCall();
      }
      currentSessionId.current = null;
      return;
    }
    
    // Detect session change - means we matched with someone new (after skip)
    if (sessionId !== currentSessionId.current) {
      console.log('[WebRTC] Session changed:', currentSessionId.current, '->', sessionId);
      
      // Clean up previous call FIRST
      if (currentSessionId.current) {
        console.log('[WebRTC] Cleaning up previous session');
        // Synchronous cleanup
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
          });
          localStreamRef.current = null;
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        cleanupPeerConnection();
        setLocalStream(null);
        setRemoteStream(null);
      }
      
      currentSessionId.current = sessionId;
      autoStarted.current = false;
    }
    
    // Start call if we have a partner and haven't started yet
    if (!autoStarted.current && partnerId) {
      autoStarted.current = true;
      console.log('[WebRTC] Auto-starting call for session:', sessionId);
      
      // Small delay to ensure cleanup completed and socket is ready
      const timer = setTimeout(() => {
        if (mountedRef.current && sessionId === currentSessionId.current) {
          startCall();
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [autoStart, sessionId, partnerId, socket?.connected, startCall, endCall, cleanupPeerConnection]);

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
    restartCamera,
    toggleVideo,
    toggleAudio,
    performanceMode,
    setPerformanceMode,
    perfSettings
  };
};

export default useWebRTC;
