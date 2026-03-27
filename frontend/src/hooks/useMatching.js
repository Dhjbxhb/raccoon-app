import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useMatching Hook - Handles matching queue and session state
 * 
 * Features:
 * - Queue management (join, leave)
 * - Match state tracking (idle, searching, matched)
 * - Skip with clean state reset
 * - Auto-rejoin queue after skip
 * - Block user functionality
 * - Prevents stale state leaking between matches
 * - Optimized socket listener management
 */
export const useMatching = (socket) => {
  // Core state
  const [state, setState] = useState('idle'); // idle, searching, matched
  const [partner, setPartner] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [queuePosition, setQueuePosition] = useState(null);
  const [queueStats, setQueueStats] = useState(null);
  
  // Skip handling state
  const [isSkipping, setIsSkipping] = useState(false);
  const skipTimeoutRef = useRef(null);
  const lastFiltersRef = useRef({ gender: 'any', country: 'ANY' });
  const autoRejoinRef = useRef(true);
  
  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true);
  // Track current socket to prevent stale listeners
  const socketIdRef = useRef(null);

  // Clean reset of all match-related state
  const resetMatchState = useCallback(() => {
    if (!mountedRef.current) return;
    setPartner(null);
    setSessionId(null);
    setIsSkipping(false);
  }, []);

  // Socket event handlers defined outside useEffect for stable references
  const handleQueueJoined = useCallback((data) => {
    if (!mountedRef.current) return;
    setState('searching');
    setQueuePosition(data.position);
    setQueueStats({ totalWaiting: data.total_waiting });
  }, []);

  const handleQueueLeft = useCallback((data) => {
    if (!mountedRef.current) return;
    // Only reset to idle if not in skip flow
    setState(prev => {
      // Check the ref instead of state to avoid stale closure
      if (!skipTimeoutRef.current) {
        return 'idle';
      }
      return prev;
    });
    setQueuePosition(null);
  }, []);

  const handleMatchFound = useCallback((data) => {
    if (!mountedRef.current) return;
    setState('matched');
    setPartner(data.partner);
    setSessionId(data.session_id);
    setQueuePosition(null);
    setIsSkipping(false);
    
    // Clear any pending skip timeout
    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current);
      skipTimeoutRef.current = null;
    }
  }, []);

  const handleMatchEnded = useCallback((data) => {
    if (!mountedRef.current) return;
    
    // Clean up state
    resetMatchState();
    
    // Auto-rejoin queue if we were the one who skipped
    if (data.reason === 'skipped' && autoRejoinRef.current) {
      // Small delay to ensure clean state transition
      setTimeout(() => {
        if (mountedRef.current && socket?.connected) {
          setState('searching');
          socket.emit('join_queue', {
            gender_filter: lastFiltersRef.current.gender,
            country_filter: lastFiltersRef.current.country
          });
        }
      }, 100);
    } else {
      // Partner skipped or other reason - return to idle
      setState('idle');
    }
  }, [socket, resetMatchState]);

  const handlePartnerDisconnected = useCallback((data) => {
    if (!mountedRef.current) return;
    
    resetMatchState();
    
    // Auto-rejoin queue
    if (autoRejoinRef.current && socket?.connected) {
      setTimeout(() => {
        if (mountedRef.current) {
          setState('searching');
          socket.emit('join_queue', {
            gender_filter: lastFiltersRef.current.gender,
            country_filter: lastFiltersRef.current.country
          });
        }
      }, 100);
    } else {
      setState('idle');
    }
  }, [socket, resetMatchState]);

  const handleError = useCallback((data) => {
    console.error('Socket error:', data);
    if (!mountedRef.current) return;
    setIsSkipping(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      // Clear any pending timeouts on unmount
      if (skipTimeoutRef.current) {
        clearTimeout(skipTimeoutRef.current);
        skipTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    // Prevent duplicate listeners if socket hasn't changed
    if (socketIdRef.current === socket.id) return;
    socketIdRef.current = socket.id;

    // Register event listeners
    socket.on('queue_joined', handleQueueJoined);
    socket.on('queue_left', handleQueueLeft);
    socket.on('match_found', handleMatchFound);
    socket.on('match_ended', handleMatchEnded);
    socket.on('partner_disconnected', handlePartnerDisconnected);
    socket.on('error', handleError);

    return () => {
      socket.off('queue_joined', handleQueueJoined);
      socket.off('queue_left', handleQueueLeft);
      socket.off('match_found', handleMatchFound);
      socket.off('match_ended', handleMatchEnded);
      socket.off('partner_disconnected', handlePartnerDisconnected);
      socket.off('error', handleError);
      socketIdRef.current = null;
    };
  }, [socket, handleQueueJoined, handleQueueLeft, handleMatchFound, handleMatchEnded, handlePartnerDisconnected, handleError]);

  // Start matching
  const startMatching = useCallback((genderFilter = 'any', countryFilter = 'ANY') => {
    if (!socket) return;
    
    // Store filters for auto-rejoin
    lastFiltersRef.current = { gender: genderFilter, country: countryFilter };
    autoRejoinRef.current = true;
    
    socket.emit('join_queue', { 
      gender_filter: genderFilter,
      country_filter: countryFilter 
    });
    setState('searching');
  }, [socket]);

  // Stop matching (leave queue)
  const stopMatching = useCallback(() => {
    if (!socket) return;
    
    autoRejoinRef.current = false;
    socket.emit('leave_queue');
    setState('idle');
    setQueuePosition(null);
  }, [socket]);

  // Skip current match - MAIN SKIP LOGIC
  const skipMatch = useCallback(() => {
    if (!socket || state !== 'matched' || isSkipping) return;
    
    setIsSkipping(true);
    
    // Emit skip event
    socket.emit('skip_match');
    
    // Safety timeout - if no response in 3 seconds, force reset
    skipTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      console.warn('Skip timeout - forcing state reset');
      resetMatchState();
      setState('searching');
      
      if (socket?.connected) {
        socket.emit('join_queue', {
          gender_filter: lastFiltersRef.current.gender,
          country_filter: lastFiltersRef.current.country
        });
      }
    }, 3000);
    
  }, [socket, state, isSkipping, resetMatchState]);

  // Block user and end session
  const blockUser = useCallback(() => {
    if (!socket || !partner) return;
    
    autoRejoinRef.current = true;
    socket.emit('block_user', { 
      blocked_id: partner.user_id || partner.guest_id 
    });
    
    // Reset state after blocking
    resetMatchState();
  }, [socket, partner, resetMatchState]);

  // End session without auto-rejoin (for leaving match page)
  const endSession = useCallback(() => {
    if (!socket) return;
    
    autoRejoinRef.current = false;
    
    if (state === 'matched') {
      socket.emit('skip_match');
    } else if (state === 'searching') {
      socket.emit('leave_queue');
    }
    
    resetMatchState();
    setState('idle');
  }, [socket, state, resetMatchState]);

  // Set auto-rejoin behavior
  const setAutoRejoin = useCallback((value) => {
    autoRejoinRef.current = value;
  }, []);

  return {
    // State
    state,
    partner,
    sessionId,
    queuePosition,
    queueStats,
    isSkipping,
    
    // Actions
    startMatching,
    stopMatching,
    skipMatch,
    blockUser,
    endSession,
    setAutoRejoin,
    
    // Helpers
    isMatched: state === 'matched',
    isSearching: state === 'searching',
    isIdle: state === 'idle'
  };
};

export default useMatching;
