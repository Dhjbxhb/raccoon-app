import { useState, useEffect, useRef, useCallback } from 'react';
import { ICE_SERVERS, getMediaConstraints, CONNECTION_TIMEOUT } from '@/config/webrtcConfig';

/**
 * Production-ready WebRTC Hook for Raccoon App
 * 
 * Features:
 * - Polite peer pattern to prevent race conditions
 * - ICE candidate queuing for reliable connections
 * - Auto-start on match with proper cleanup
 * - Connection state monitoring and reconnection handling
 * - Camera filter support (CSS-based)
 * - Optimized cleanup to prevent memory leaks
 */
export const useWebRTC = (socket, sessionId, partnerId, autoStart = true) => {
  // State
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState(null);
  const [currentFilter, setCurrentFilter] = useState('none');
  
  // Refs
  const peerConnection = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  
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
  // Track socket ID to prevent duplicate listeners
  const socketIdRef = useRef(null);
  // Track local stream for cleanup
  const localStreamRef = useRef(null);

  // Determine if this peer is "polite" (receiver) or "impolite" (offerer)
  // Use a stable comparison - the peer with the "smaller" partnerId is the offerer
  const isPolite = useCallback(() => {
    if (!partnerId || !socket?.id) return true;
    // If we receive an offer, we're the polite peer (we yield)
    return partnerId < (socket.id || '');
  }, [partnerId, socket?.id]);

  // Clean up peer connection
  const cleanupPeerConnection = useCallback(() => {
    if (connectionTimeout.current) {
      clearTimeout(connectionTimeout.current);
      connectionTimeout.current = null;
    }
    
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    makingOffer.current = false;
    ignoreOffer.current = false;
    isSettingRemoteAnswerPending.current = false;
    pendingCandidates.current = [];
  }, []);

  // Initialize peer connection with proper event handlers
  const createPeerConnection = useCallback(() => {
    cleanupPeerConnection();

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc_ice_candidate', {
          candidate: event.candidate.toJSON(),
          session_id: sessionId
        });
      }
    };

    // Handle incoming tracks (remote video/audio)
    pc.ontrack = (event) => {
      console.log('Received remote track:', event.track.kind);
      const [stream] = event.streams;
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      setConnectionState(pc.connectionState);
      
      if (pc.connectionState === 'connected') {
        // Clear connection timeout on success
        if (connectionTimeout.current) {
          clearTimeout(connectionTimeout.current);
          connectionTimeout.current = null;
        }
        setError(null);
      } else if (pc.connectionState === 'failed') {
        setError('Connection failed. Please try again.');
      } else if (pc.connectionState === 'disconnected') {
        // Give some time for reconnection before showing error
        setTimeout(() => {
          if (peerConnection.current?.connectionState === 'disconnected') {
            setError('Connection lost. Reconnecting...');
          }
        }, 3000);
      }
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected') {
        setConnectionState('disconnected');
      } else if (pc.iceConnectionState === 'failed') {
        // Attempt ICE restart
        console.log('ICE failed, attempting restart...');
        pc.restartIce();
      }
    };

    // Handle negotiation needed (for renegotiation)
    pc.onnegotiationneeded = async () => {
      try {
        makingOffer.current = true;
        await pc.setLocalDescription();
        socket?.emit('webrtc_offer', {
          offer: pc.localDescription,
          session_id: sessionId
        });
      } catch (err) {
        console.error('Negotiation error:', err);
      } finally {
        makingOffer.current = false;
      }
    };

    // Handle ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', pc.iceGatheringState);
    };

    peerConnection.current = pc;
    return pc;
  }, [socket, sessionId, cleanupPeerConnection]);

  // Get user media with proper constraints
  const startLocalStream = useCallback(async (video = true, audio = true) => {
    try {
      // Stop any existing stream first
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        localStreamRef.current = null;
      }

      const constraints = getMediaConstraints();
      if (!video) constraints.video = false;
      if (!audio) constraints.audio = false;

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Store in ref for cleanup
      localStreamRef.current = stream;

      if (mountedRef.current) {
        setLocalStream(stream);
        setIsVideoEnabled(video && stream.getVideoTracks().length > 0);
        setIsAudioEnabled(audio && stream.getAudioTracks().length > 0);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      
      if (!mountedRef.current) return null;
      
      // Provide more specific error messages
      if (err.name === 'NotAllowedError') {
        setError('Camera/microphone access denied. Please grant permissions and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found. Please connect a device.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera/microphone is already in use by another application.');
      } else {
        setError('Could not access camera/microphone. Please check permissions.');
      }
      throw err;
    }
  }, []);

  // Start the call (as the offerer)
  const startCall = useCallback(async () => {
    try {
      setError(null);
      setConnectionState('connecting');
      
      const stream = await startLocalStream(true, true);
      const pc = createPeerConnection();

      // Add all tracks to the peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create and send offer
      makingOffer.current = true;
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      socket?.emit('webrtc_offer', {
        offer: pc.localDescription.toJSON(),
        session_id: sessionId
      });

      // Set connection timeout
      connectionTimeout.current = setTimeout(() => {
        if (peerConnection.current?.connectionState !== 'connected') {
          setError('Connection timeout. Please try again.');
          setConnectionState('failed');
        }
      }, CONNECTION_TIMEOUT);

    } catch (err) {
      console.error('Error starting call:', err);
      if (!error) { // Don't override more specific errors
        setError('Failed to start video call');
      }
      setConnectionState('failed');
    } finally {
      makingOffer.current = false;
    }
  }, [socket, sessionId, startLocalStream, createPeerConnection, error]);

  // Handle incoming offer (with polite peer pattern)
  const handleOffer = useCallback(async (offer) => {
    try {
      const pc = peerConnection.current;
      
      // Check for collision
      const offerCollision = makingOffer.current || 
        (pc?.signalingState !== 'stable' && pc?.signalingState !== 'have-local-offer');
      
      const polite = isPolite();
      ignoreOffer.current = !polite && offerCollision;
      
      if (ignoreOffer.current) {
        console.log('Ignoring colliding offer (impolite peer)');
        return;
      }

      setError(null);
      setConnectionState('connecting');

      // Ensure we have local stream
      let stream = localStream;
      if (!stream) {
        stream = await startLocalStream(true, true);
      }

      // Create or get peer connection
      let connection = pc;
      if (!connection) {
        connection = createPeerConnection();
        stream.getTracks().forEach(track => {
          connection.addTrack(track, stream);
        });
      }

      // Handle rollback if needed
      if (connection.signalingState !== 'stable') {
        await Promise.all([
          connection.setLocalDescription({ type: 'rollback' }),
          connection.setRemoteDescription(new RTCSessionDescription(offer))
        ]);
      } else {
        await connection.setRemoteDescription(new RTCSessionDescription(offer));
      }

      // Process any queued ICE candidates
      while (pendingCandidates.current.length > 0) {
        const candidate = pendingCandidates.current.shift();
        try {
          await connection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Error adding queued ICE candidate:', e);
        }
      }
      
      // Create and send answer
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);

      socket?.emit('webrtc_answer', {
        answer: connection.localDescription.toJSON(),
        session_id: sessionId
      });

    } catch (err) {
      console.error('Error handling offer:', err);
      setError('Failed to answer video call');
      setConnectionState('failed');
    }
  }, [socket, sessionId, localStream, startLocalStream, createPeerConnection, isPolite]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (answer) => {
    try {
      const pc = peerConnection.current;
      if (!pc) {
        console.warn('No peer connection for answer');
        return;
      }

      if (pc.signalingState === 'stable') {
        console.log('Connection already stable, ignoring answer');
        return;
      }

      isSettingRemoteAnswerPending.current = true;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      isSettingRemoteAnswerPending.current = false;

      // Process any queued ICE candidates
      while (pendingCandidates.current.length > 0) {
        const candidate = pendingCandidates.current.shift();
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Error adding queued ICE candidate:', e);
        }
      }
    } catch (err) {
      console.error('Error handling answer:', err);
      isSettingRemoteAnswerPending.current = false;
    }
  }, []);

  // Handle ICE candidate with queuing
  const handleIceCandidate = useCallback(async (candidate) => {
    try {
      const pc = peerConnection.current;
      
      if (!pc || !candidate) {
        return;
      }

      // Queue candidates if remote description not set yet
      if (!pc.remoteDescription || isSettingRemoteAnswerPending.current) {
        console.log('Queuing ICE candidate');
        pendingCandidates.current.push(candidate);
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      // Ignore errors for candidates that arrive after connection is established
      if (err.name !== 'InvalidStateError') {
        console.warn('Error adding ICE candidate:', err);
      }
    }
  }, []);

  // Toggle video track
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle audio track
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  // End call and cleanup
  const endCall = useCallback(() => {
    // Stop local media tracks using ref
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    if (mountedRef.current) {
      setLocalStream(null);
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Cleanup peer connection
    cleanupPeerConnection();

    // Reset state only if mounted
    if (mountedRef.current) {
      setRemoteStream(null);
      setConnectionState('disconnected');
      setIsVideoEnabled(false);
      setIsAudioEnabled(false);
      setError(null);
    }
    
    autoStarted.current = false;
    
    // Notify partner
    socket?.emit('webrtc_end_call', { session_id: sessionId });
  }, [socket, sessionId, cleanupPeerConnection]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;
    
    // Prevent duplicate listeners
    if (socketIdRef.current === socket.id) return;
    socketIdRef.current = socket.id;

    const onOffer = (data) => {
      handleOffer(data.offer);
    };

    const onAnswer = (data) => {
      handleAnswer(data.answer);
    };

    const onIceCandidate = (data) => {
      handleIceCandidate(data.candidate);
    };

    const onEndCall = () => {
      endCall();
    };

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

  // Reset autoStarted when sessionId changes (new match)
  useEffect(() => {
    if (sessionId !== currentSessionId.current) {
      autoStarted.current = false;
      currentSessionId.current = sessionId;
    }
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      
      // Cleanup animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Cleanup local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      
      // Cleanup peer connection
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      
      // Clear timeouts
      if (connectionTimeout.current) {
        clearTimeout(connectionTimeout.current);
        connectionTimeout.current = null;
      }
    };
  }, []);

  // Auto-start camera and initiate call when matched
  useEffect(() => {
    if (autoStart && sessionId && partnerId && !autoStarted.current && !localStream) {
      autoStarted.current = true;
      
      // Small delay to ensure socket is ready and both peers are synchronized
      const timer = setTimeout(() => {
        startCall().catch(err => {
          console.log('Auto-start video failed:', err.message);
          // Don't reset autoStarted here - user can manually retry
        });
      }, 800); // Slightly longer delay for better synchronization
      
      return () => clearTimeout(timer);
    }
  }, [autoStart, sessionId, partnerId, localStream, startCall]);

  // Get CSS filter style for video
  const getFilterStyle = useCallback((filter) => {
    const filterStyles = {
      // Beauty filters
      beauty: 'brightness(1.08) contrast(1.05) saturate(1.15)',
      smooth: 'brightness(1.1) contrast(0.92) saturate(1.08) blur(0.4px)',
      glow: 'brightness(1.15) contrast(1.02) saturate(1.1)',
      
      // Mask filters (color overlay effect)
      raccoon: 'contrast(1.15) brightness(1.02) saturate(0.9)',
      cat: 'brightness(1.05) contrast(1.1) saturate(1.2)',
      dog: 'brightness(1.08) contrast(1.05) sepia(0.1)',
      
      // Color tone filters
      warm: 'brightness(1.08) sepia(0.25) saturate(1.4) contrast(1.02)',
      cool: 'brightness(1.05) saturate(0.85) hue-rotate(15deg) contrast(1.08)',
      vintage: 'sepia(0.45) contrast(1.15) brightness(0.92) saturate(0.75)',
      bw: 'grayscale(1) contrast(1.2) brightness(1.05)',
      
      // Fun effect filters
      neon: 'brightness(1.2) contrast(1.35) saturate(1.6)',
      sparkle: 'brightness(1.18) contrast(1.08) saturate(1.25)',
      vhs: 'brightness(1.05) contrast(1.25) saturate(1.3) hue-rotate(-5deg)',
      comic: 'contrast(1.5) brightness(1.1) saturate(1.4)',
      dreamy: 'brightness(1.12) contrast(0.9) saturate(1.15) blur(0.5px)',
      
      // Default
      none: 'none'
    };
    
    return filterStyles[filter] || 'none';
  }, []);

  // Change filter
  const changeFilter = useCallback((filter) => {
    setCurrentFilter(filter);
  }, []);

  return {
    // Stream refs
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    canvasRef,
    
    // State
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    error,
    currentFilter,
    
    // Actions
    startCall,
    endCall,
    toggleVideo,
    toggleAudio,
    changeFilter,
    getFilterStyle
  };
};

export default useWebRTC;
