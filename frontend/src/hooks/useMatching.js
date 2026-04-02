import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useMatching Hook - Handles matching queue and session state
 * 
 * Features:
 * - Queue management (join, leave)
 * - Match state tracking (idle, searching, matched)
 * - Skip with clean state reset and retry
 * - Auto-rejoin queue after skip (3 sec timeout with retry)
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
  const matchRetryTimeoutRef = useRef(null);
  const lastFiltersRef = useRef({ gender: 'any', country: 'ANY' });
  const autoRejoinRef = useRef(true);
  const autoRejoinInFlightRef = useRef(false);
  const skipRetryCountRef = useRef(0);
  const MAX_SKIP_RETRIES = 2;
  
  // Track if component is mounted to prevent state updates after unmount
  const mountedRef = useRef(true);
  // Track current socket to prevent stale listeners
  const socketIdRef = useRef(null);
  const stateRef = useRef('idle');

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearTimers = useCallback(() => {
    if (skipTimeoutRef.current) {
      clearTimeout(skipTimeoutRef.current);
      skipTimeoutRef.current = null;
    }
    if (matchRetryTimeoutRef.current) {
      clearTimeout(matchRetryTimeoutRef.current);
      matchRetryTimeoutRef.current = null;
    }
  }, []);

  const attemptAutoRejoin = useCallback((reason) => {
    const shouldAutoRejoin = [
      'skipped',
      'no_session',
      'partner_skipped',
      'stale_cleanup',
      'partner_stale_cleanup',
      'partner_disconnected'
    ].includes(reason);

    if (!shouldAutoRejoin) {
      autoRejoinInFlightRef.current = false;
      setState('idle');
      return false;
    }

    if (!autoRejoinRef.current || !socket?.connected) {
      autoRejoinInFlightRef.current = false;
      setState('idle');
      return false;
    }

    if (autoRejoinInFlightRef.current) {
      return false;
    }

    autoRejoinInFlightRef.current = true;
    setState('searching');
    socket.emit('join_queue', {
      gender_filter: lastFiltersRef.current.gender,
      country_filter: lastFiltersRef.current.country
    });

    matchRetryTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current || !socket?.connected || !autoRejoinRef.current) {
        return;
      }

      if (stateRef.current === 'searching') {
        console.log('[Matching] Rejoin retry after:', reason);
        socket.emit('join_queue', {
          gender_filter: lastFiltersRef.current.gender,
          country_filter: lastFiltersRef.current.country
        });
      }
    }, 3000);

    return true;
  }, [socket]);

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
    autoRejoinInFlightRef.current = false;
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
    
    console.log('[Matching] Match found:', data.session_id);
    
    setState('matched');
    setPartner(data.partner);
    setSessionId(data.session_id);
    setQueuePosition(null);
    setIsSkipping(false);
    skipRetryCountRef.current = 0;
    autoRejoinInFlightRef.current = false;
    clearTimers();
  }, [clearTimers]);

  const handleMatchEnded = useCallback((data) => {
    if (!mountedRef.current) return;
    
    console.log('[Matching] Match ended:', data.reason);
    
    // Clean up state
    resetMatchState();
    skipRetryCountRef.current = 0;

    clearTimers();
    attemptAutoRejoin(data.reason);
  }, [resetMatchState, clearTimers, attemptAutoRejoin]);
  
  // CRITICAL: Handle session_ended event - triggers WebRTC cleanup
  const handleSessionEnded = useCallback((data) => {
    if (!mountedRef.current) return;
    
    console.log('[Matching] Session ended (cleanup signal):', data.reason);
    
    // Reset all state
    resetMatchState();
    skipRetryCountRef.current = 0;
    setIsSkipping(false);

    clearTimers();
    attemptAutoRejoin(data.reason);
  }, [resetMatchState, clearTimers, attemptAutoRejoin]);

  const handlePartnerDisconnected = useCallback((data) => {
    if (!mountedRef.current) return;
    
    console.log('[Matching] Partner disconnected');
    
    resetMatchState();
    skipRetryCountRef.current = 0;

    clearTimers();
    attemptAutoRejoin('partner_disconnected');
  }, [resetMatchState, clearTimers, attemptAutoRejoin]);

  // Handle session restored (for reconnection)
  const handleSessionRestored = useCallback((data) => {
    if (!mountedRef.current) return;
    
    setState('matched');
    setPartner(data.partner);
    setSessionId(data.session_id);
    setQueuePosition(null);
    setIsSkipping(false);
    autoRejoinInFlightRef.current = false;
    
    console.log('Session restored:', data.session_id);
  }, []);

  // Handle partner reconnected
  const handlePartnerReconnected = useCallback((data) => {
    if (!mountedRef.current) return;
    console.log('Partner reconnected:', data.user_id);
    // Could show a toast or indicator here
  }, []);

  const handleError = useCallback((data) => {
    console.error('[Matching] Socket error:', data);
    if (!mountedRef.current) return;
    setIsSkipping(false);
    skipRetryCountRef.current = 0;
    autoRejoinInFlightRef.current = false;
  }, []);
  
  // Handle skip failure - retry automatically
  const handleSkipFailed = useCallback((data) => {
    console.error('[Matching] Skip failed:', data);
    if (!mountedRef.current) return;
    
    // Retry skip if under limit
    if (skipRetryCountRef.current < MAX_SKIP_RETRIES && socket?.connected) {
      skipRetryCountRef.current++;
      console.log('[Matching] Retrying skip, attempt:', skipRetryCountRef.current);
      socket.emit('skip_match');
    } else {
      // Max retries reached - force reset state
      console.warn('[Matching] Max skip retries reached, forcing reset');
      setIsSkipping(false);
      resetMatchState();
      setState('idle');
      skipRetryCountRef.current = 0;
      autoRejoinInFlightRef.current = false;
    }
  }, [socket, resetMatchState]);

  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      // Clear any pending timeouts on unmount
      clearTimers();
      skipRetryCountRef.current = 0;
      autoRejoinInFlightRef.current = false;
    };
  }, [clearTimers]);

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
    socket.on('session_ended', handleSessionEnded);
    socket.on('partner_disconnected', handlePartnerDisconnected);
    socket.on('session_restored', handleSessionRestored);
    socket.on('partner_reconnected', handlePartnerReconnected);
    socket.on('error', handleError);
    socket.on('skip_failed', handleSkipFailed);

    return () => {
      socket.off('queue_joined', handleQueueJoined);
      socket.off('queue_left', handleQueueLeft);
      socket.off('match_found', handleMatchFound);
      socket.off('match_ended', handleMatchEnded);
      socket.off('session_ended', handleSessionEnded);
      socket.off('partner_disconnected', handlePartnerDisconnected);
      socket.off('session_restored', handleSessionRestored);
      socket.off('partner_reconnected', handlePartnerReconnected);
      socket.off('error', handleError);
      socket.off('skip_failed', handleSkipFailed);
      socketIdRef.current = null;
    };
  }, [socket, handleQueueJoined, handleQueueLeft, handleMatchFound, handleMatchEnded, handleSessionEnded, handlePartnerDisconnected, handleSessionRestored, handlePartnerReconnected, handleError, handleSkipFailed]);

  // Start matching
  const startMatching = useCallback((genderFilter = 'any', countryFilter = 'ANY') => {
    if (!socket) return;
    
    // Store filters for auto-rejoin
    lastFiltersRef.current = { gender: genderFilter, country: countryFilter };
    autoRejoinRef.current = true;
    autoRejoinInFlightRef.current = false;
    
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
    autoRejoinInFlightRef.current = false;
    clearTimers();
    socket.emit('leave_queue');
    setState('idle');
    setQueuePosition(null);
  }, [socket, clearTimers]);

  // Skip current match - MAIN SKIP LOGIC with retry
  const skipMatch = useCallback(() => {
    if (!socket || state !== 'matched' || isSkipping) {
      console.log('[Matching] Skip blocked:', { hasSocket: !!socket, state, isSkipping });
      return;
    }
    
    console.log('[Matching] Skip match requested');
    setIsSkipping(true);
    skipRetryCountRef.current = 0;
    
    // Emit skip event
    socket.emit('skip_match');
    
    // Safety timeout - if no response in 3 seconds, retry or force reset
    skipTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      
      // Check if still skipping (no match_ended received)
      setIsSkipping((currentlySkipping) => {
        if (currentlySkipping) {
          if (skipRetryCountRef.current < MAX_SKIP_RETRIES && socket?.connected) {
            skipRetryCountRef.current++;
            console.log('[Matching] Skip timeout, retrying:', skipRetryCountRef.current);
            socket.emit('skip_match');
            
            // Set another timeout
            skipTimeoutRef.current = setTimeout(() => {
              setIsSkipping((stillSkipping) => {
                if (stillSkipping) {
                  console.warn('[Matching] Skip failed after retries, forcing reset');
                  resetMatchState();
                  setState('searching');
                  skipRetryCountRef.current = 0;
                  autoRejoinInFlightRef.current = true;
                  
                  if (socket?.connected) {
                    socket.emit('join_queue', {
                      gender_filter: lastFiltersRef.current.gender,
                      country_filter: lastFiltersRef.current.country
                    });
                  }
                  return false;
                }
                return stillSkipping;
              });
            }, 3000);
            
            return true; // Keep skipping
          } else {
            console.warn('[Matching] Skip timeout - forcing state reset');
            resetMatchState();
            setState('searching');
            skipRetryCountRef.current = 0;
            autoRejoinInFlightRef.current = true;
            
            if (socket?.connected) {
              socket.emit('join_queue', {
                gender_filter: lastFiltersRef.current.gender,
                country_filter: lastFiltersRef.current.country
              });
            }
            return false;
          }
        }
        return currentlySkipping;
      });
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
    autoRejoinInFlightRef.current = false;
    clearTimers();
    
    if (state === 'matched') {
      socket.emit('skip_match');
    } else if (state === 'searching') {
      socket.emit('leave_queue');
    }
    
    resetMatchState();
    setState('idle');
  }, [socket, state, resetMatchState, clearTimers]);

  // Set auto-rejoin behavior
  const setAutoRejoin = useCallback((value) => {
    autoRejoinRef.current = value;
  }, []);

  // Attempt to rejoin existing session (for page refresh)
  const rejoinSession = useCallback(() => {
    if (!socket?.connected) return;
    
    socket.emit('rejoin_session', {});
  }, [socket]);

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
    rejoinSession,
    
    // Helpers
    isMatched: state === 'matched',
    isSearching: state === 'searching',
    isIdle: state === 'idle'
  };
};

export default useMatching;
