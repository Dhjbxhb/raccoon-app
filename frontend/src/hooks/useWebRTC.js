import { useState, useEffect, useRef, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]
};

export const useWebRTC = (socket, sessionId, partnerId, autoStart = true) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState(null);
  const [currentFilter, setCurrentFilter] = useState('none');
  
  const peerConnection = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const autoStarted = useRef(false);

  // Initialize peer connection
  const createPeerConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc_ice_candidate', {
          candidate: event.candidate,
          session_id: sessionId
        });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    pc.onconnectionstatechange = () => {
      setConnectionState(pc.connectionState);
      if (pc.connectionState === 'failed') {
        setError('Connection failed. Please try again.');
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        setConnectionState('disconnected');
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [socket, sessionId]);

  // Get user media
  const startLocalStream = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false,
        audio: audio ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      });

      setLocalStream(stream);
      setIsVideoEnabled(video);
      setIsAudioEnabled(audio);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      setError('Could not access camera/microphone. Please check permissions.');
      throw err;
    }
  }, []);

  // Start video call
  const startCall = useCallback(async () => {
    try {
      setError(null);
      const stream = await startLocalStream(true, true);
      const pc = createPeerConnection();

      // Add tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit('webrtc_offer', {
        offer: offer,
        session_id: sessionId
      });

      setConnectionState('connecting');
    } catch (err) {
      console.error('Error starting call:', err);
      setError('Failed to start video call');
    }
  }, [socket, sessionId, startLocalStream, createPeerConnection]);

  // Handle incoming offer
  const handleOffer = useCallback(async (offer) => {
    try {
      setError(null);
      const stream = await startLocalStream(true, true);
      const pc = createPeerConnection();

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc_answer', {
        answer: answer,
        session_id: sessionId
      });

      setConnectionState('connecting');
    } catch (err) {
      console.error('Error handling offer:', err);
      setError('Failed to answer video call');
    }
  }, [socket, sessionId, startLocalStream, createPeerConnection]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (answer) => {
    try {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  }, []);

  // Handle ICE candidate
  const handleIceCandidate = useCallback(async (candidate) => {
    try {
      if (peerConnection.current && candidate) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  }, [localStream]);

  // End call
  const endCall = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    setRemoteStream(null);
    setConnectionState('disconnected');
    setIsVideoEnabled(false);
    
    socket?.emit('webrtc_end_call', { session_id: sessionId });
  }, [localStream, socket, sessionId]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('webrtc_offer', (data) => {
      handleOffer(data.offer);
    });

    socket.on('webrtc_answer', (data) => {
      handleAnswer(data.answer);
    });

    socket.on('webrtc_ice_candidate', (data) => {
      handleIceCandidate(data.candidate);
    });

    socket.on('webrtc_end_call', () => {
      endCall();
    });

    return () => {
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      socket.off('webrtc_end_call');
    };
  }, [socket, handleOffer, handleAnswer, handleIceCandidate, endCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [localStream]);

  // Auto-start camera and mic when match starts
  useEffect(() => {
    if (autoStart && sessionId && partnerId && !autoStarted.current && !localStream) {
      autoStarted.current = true;
      // Small delay to ensure socket is ready
      const timer = setTimeout(() => {
        startCall().catch(err => {
          console.log('Auto-start video failed, user may need to grant permissions:', err);
        });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, sessionId, partnerId, localStream, startCall]);

  // Get CSS filter style for video - matches useCameraFilters
  const getFilterStyle = useCallback((filter) => {
    switch (filter) {
      // Beauty filters
      case 'beauty':
        return 'brightness(1.08) contrast(1.05) saturate(1.15)';
      case 'smooth':
        return 'brightness(1.1) contrast(0.92) saturate(1.08) blur(0.4px)';
      case 'glow':
        return 'brightness(1.15) contrast(1.02) saturate(1.1)';
      
      // Mask filters
      case 'raccoon':
        return 'contrast(1.15) brightness(1.02) saturate(0.9)';
      case 'cat':
        return 'brightness(1.05) contrast(1.1) saturate(1.2)';
      case 'dog':
        return 'brightness(1.08) contrast(1.05) sepia(0.1)';
      
      // Color tone filters
      case 'warm':
        return 'brightness(1.08) sepia(0.25) saturate(1.4) contrast(1.02)';
      case 'cool':
        return 'brightness(1.05) saturate(0.85) hue-rotate(15deg) contrast(1.08)';
      case 'vintage':
        return 'sepia(0.45) contrast(1.15) brightness(0.92) saturate(0.75)';
      case 'bw':
        return 'grayscale(1) contrast(1.2) brightness(1.05)';
      
      // Fun effect filters
      case 'neon':
        return 'brightness(1.2) contrast(1.35) saturate(1.6)';
      case 'sparkle':
        return 'brightness(1.18) contrast(1.08) saturate(1.25)';
      case 'vhs':
        return 'brightness(1.05) contrast(1.25) saturate(1.3) hue-rotate(-5deg)';
      case 'comic':
        return 'contrast(1.5) brightness(1.1) saturate(1.4)';
      case 'dreamy':
        return 'brightness(1.12) contrast(0.9) saturate(1.15) blur(0.5px)';
      
      default:
        return 'none';
    }
  }, []);

  // Change filter
  const changeFilter = useCallback((filter) => {
    setCurrentFilter(filter);
  }, []);

  return {
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    canvasRef,
    isVideoEnabled,
    isAudioEnabled,
    connectionState,
    error,
    currentFilter,
    startCall,
    endCall,
    toggleVideo,
    toggleAudio,
    changeFilter,
    getFilterStyle
  };
};

export default useWebRTC;
