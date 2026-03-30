import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ICE_SERVERS, getMediaConstraints, CONNECTION_TIMEOUT } from '@/config/webrtcConfig';
import { getFilter, FaceFilterProcessor } from '@/utils/faceFilters';
import { 
  getAutoPerformanceMode, 
  PERFORMANCE_MODES, 
  applyBitrateConstraints,
  cleanupStream,
  getCSSFilter,
  canUseCSSFilter,
  throttle
} from '@/config/performanceConfig';

/**
 * OPTIMIZED WebRTC Hook with Performance Mode Support
 * 
 * Optimizations:
 * - Auto performance mode detection
 * - Bitrate control based on device capabilities
 * - CSS filters for GPU acceleration when possible
 * - Reduced canvas processing in performance mode
 * - Memory leak prevention
 * - Throttled state updates
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
  const [currentFilter, setCurrentFilter] = useState('none');
  const [useCSSFilter, setUseCSSFilter] = useState(true);
  
  // Refs
  const peerConnection = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const filterCanvasRef = useRef(null);
  const filterProcessor = useRef(null);
  const filteredStream = useRef(null);
  
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
  const hiddenVideoRef = useRef(null); // Hidden video for filter processing

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
      peerConnection.current.close();
      peerConnection.current = null;
    }
    
    makingOffer.current = false;
    ignoreOffer.current = false;
    isSettingRemoteAnswerPending.current = false;
    pendingCandidates.current = [];
  }, []);

  // Clean up filter processor
  const cleanupFilterProcessor = useCallback(() => {
    if (filterProcessor.current) {
      filterProcessor.current.destroy();
      filterProcessor.current = null;
    }
    if (filteredStream.current) {
      cleanupStream(filteredStream.current);
      filteredStream.current = null;
    }
    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.srcObject = null;
      hiddenVideoRef.current = null;
    }
  }, []);

  // Initialize filter processor with face tracking (or CSS-only mode)
  const initFilterProcessor = useCallback(async (video, originalStream) => {
    const mode = performanceModeRef.current;
    const settings = PERFORMANCE_MODES[mode] || PERFORMANCE_MODES.balanced;
    
    // Check if we can use CSS-only filter (GPU accelerated)
    const shouldUseCSSOnly = canUseCSSFilter(currentFilter, mode);
    setUseCSSFilter(shouldUseCSSOnly);
    
    // In CSS-only mode, just return the original stream
    if (shouldUseCSSOnly || currentFilter === 'none') {
      filteredStream.current = originalStream;
      return originalStream;
    }
    
    // Face tracking mode (canvas processing)
    if (!filterCanvasRef.current) {
      filterCanvasRef.current = document.createElement('canvas');
    }
    
    if (!filterProcessor.current) {
      filterProcessor.current = new FaceFilterProcessor();
    }
    
    // Initialize with performance-optimized FPS
    await filterProcessor.current.init(filterCanvasRef.current);
    filterProcessor.current.setFilter(currentFilter);
    filterProcessor.current.targetFPS = settings.filterFPS;
    
    // Start processing
    filterProcessor.current.startProcessing(video, () => {});
    
    // Get canvas stream with optimized FPS
    const canvasStream = filterProcessor.current.getCanvasStream(settings.filterFPS);
    
    // Combine with audio
    const audioTracks = originalStream.getAudioTracks();
    const newStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks
    ]);
    
    filteredStream.current = newStream;
    return newStream;
  }, [currentFilter]);

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
        if (connectionTimeout.current) {
          clearTimeout(connectionTimeout.current);
          connectionTimeout.current = null;
        }
        setError(null);
      } else if (pc.connectionState === 'failed') {
        setError('Connection failed. Please try again.');
      } else if (pc.connectionState === 'disconnected') {
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
        console.log('ICE failed, attempting restart...');
        pc.restartIce();
      }
    };

    // Handle negotiation needed
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

    peerConnection.current = pc;
    return pc;
  }, [socket, sessionId, cleanupPeerConnection]);

  // Get user media with OPTIMIZED constraints
  const startLocalStream = useCallback(async (video = true, audio = true) => {
    try {
      // Stop any existing stream first
      if (localStreamRef.current) {
        cleanupStream(localStreamRef.current);
        localStreamRef.current = null;
      }
      cleanupFilterProcessor();

      // Use performance-optimized constraints
      const mode = performanceModeRef.current;
      const settings = PERFORMANCE_MODES[mode] || PERFORMANCE_MODES.balanced;
      
      const constraints = {
        video: video ? {
          ...settings.video,
          facingMode: 'user'
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (mountedRef.current) {
        setLocalStream(stream);
        setIsVideoEnabled(video && stream.getVideoTracks().length > 0);
        setIsAudioEnabled(audio && stream.getAudioTracks().length > 0);
      }

      // Display stream locally for preview
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      
      if (!mountedRef.current) return null;
      
      if (err.name === 'NotAllowedError') {
        setError('Camera/microphone access denied.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera/microphone is already in use.');
      } else {
        setError('Could not access camera/microphone.');
      }
      throw err;
    }
  }, [cleanupFilterProcessor]);

  // Start the call with OPTIMIZED video
  const startCall = useCallback(async () => {
    try {
      setError(null);
      setConnectionState('connecting');
      
      const stream = await startLocalStream(true, true);
      if (!stream) return;
      
      // Get video track
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // Create hidden video element for filter processing
        if (!hiddenVideoRef.current) {
          hiddenVideoRef.current = document.createElement('video');
          hiddenVideoRef.current.muted = true;
          hiddenVideoRef.current.playsInline = true;
        }
        hiddenVideoRef.current.srcObject = stream;
        await hiddenVideoRef.current.play();
        
        // Initialize filter processor (may use CSS-only in performance mode)
        const processedStream = await initFilterProcessor(hiddenVideoRef.current, stream);
        
        const pc = createPeerConnection();

        // Add tracks to peer connection
        processedStream.getTracks().forEach(track => {
          pc.addTrack(track, processedStream);
        });

        // Apply bitrate constraints for performance
        await applyBitrateConstraints(pc, performanceModeRef.current);

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
      }

    } catch (err) {
      console.error('Error starting call:', err);
      if (!error) {
        setError('Failed to start video call');
      }
      setConnectionState('failed');
    } finally {
      makingOffer.current = false;
    }
  }, [socket, sessionId, startLocalStream, createPeerConnection, initFilterProcessor, error]);

  // Handle incoming offer
  const handleOffer = useCallback(async (offer) => {
    try {
      const pc = peerConnection.current;
      
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

      // Process video with face filter
      const videoEl = document.createElement('video');
      videoEl.srcObject = stream;
      videoEl.muted = true;
      await videoEl.play();
      
      const processedStream = await initFilterProcessor(videoEl, stream);

      // Create or get peer connection
      let connection = pc;
      if (!connection) {
        connection = createPeerConnection();
        processedStream.getTracks().forEach(track => {
          connection.addTrack(track, processedStream);
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
  }, [socket, sessionId, localStream, startLocalStream, createPeerConnection, initFilterProcessor, isPolite]);

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

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate) => {
    try {
      const pc = peerConnection.current;
      
      if (!pc || !candidate) return;

      if (!pc.remoteDescription || isSettingRemoteAnswerPending.current) {
        console.log('Queuing ICE candidate');
        pendingCandidates.current.push(candidate);
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
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
    // Stop filter processor
    cleanupFilterProcessor();
    
    // Stop local media tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
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

    cleanupPeerConnection();

    if (mountedRef.current) {
      setRemoteStream(null);
      setConnectionState('disconnected');
      setIsVideoEnabled(false);
      setIsAudioEnabled(false);
      setError(null);
    }
    
    autoStarted.current = false;
    
    socket?.emit('webrtc_end_call', { session_id: sessionId });
  }, [socket, sessionId, cleanupPeerConnection, cleanupFilterProcessor]);

  // Change filter - update processor and notify partner
  const changeFilter = useCallback((filterId) => {
    setCurrentFilter(filterId);
    
    // Update the filter processor
    if (filterProcessor.current) {
      filterProcessor.current.setFilter(filterId);
    }
    
    // Notify partner of filter change (optional - for UI indicator)
    socket?.emit('filter_changed', { 
      filter: filterId,
      session_id: sessionId 
    });
  }, [socket, sessionId]);

  // Get CSS filter style for local preview overlay
  const getFilterStyle = useCallback((filter) => {
    const f = getFilter(filter);
    return f.css;
  }, []);

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

  // Reset autoStarted when sessionId changes
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
      cleanupFilterProcessor();
      
      // Clean up local stream
      if (localStreamRef.current) {
        cleanupStream(localStreamRef.current);
        localStreamRef.current = null;
      }
      
      // Clean up hidden video
      if (hiddenVideoRef.current) {
        hiddenVideoRef.current.srcObject = null;
        hiddenVideoRef.current = null;
      }
      
      // Clean up peer connection
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      
      // Clear timeout
      if (connectionTimeout.current) {
        clearTimeout(connectionTimeout.current);
        connectionTimeout.current = null;
      }
    };
  }, [cleanupFilterProcessor]);

  // Auto-start camera and initiate call when matched
  useEffect(() => {
    if (autoStart && sessionId && partnerId && !autoStarted.current && !localStream) {
      autoStarted.current = true;
      
      const timer = setTimeout(() => {
        startCall().catch(err => {
          console.log('Auto-start video failed:', err.message);
        });
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [autoStart, sessionId, partnerId, localStream, startCall]);

  return {
    // Stream refs
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    
    // State
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    error,
    currentFilter,
    
    // Performance mode
    performanceMode,
    setPerformanceMode,
    useCSSFilter,
    perfSettings,
    
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
