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

  // Clean reset of all match-related state
  const resetMatchState = useCallback(() => {
    setPartner(null);
    setSessionId(null);
    setIsSkipping(false);
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Queue events
    const onQueueJoined = (data) => {
      setState('searching');
      setQueuePosition(data.position);
      setQueueStats({ totalWaiting: data.total_waiting });
      console.log('Joined queue:', data);
    };

    const onQueueLeft = (data) => {
      if (!isSkipping) {
        setState('idle');
        setQueuePosition(null);
      }
      console.log('Left queue:', data);
    };

    // Match events
    const onMatchFound = (data) => {
      setState('matched');
      setPartner(data.partner);
      setSessionId(data.session_id);
      setQueuePosition(null);
      setIsSkipping(false);
      console.log('Match found:', data);
    };

    const onMatchEnded = (data) => {
      console.log('Match ended:', data.reason);
      
      // Clean up state
      resetMatchState();
      
      // Auto-rejoin queue if we were the one who skipped
      if (data.reason === 'skipped' && autoRejoinRef.current) {
        // Small delay to ensure clean state transition
        setTimeout(() => {
          if (socket?.connected) {
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
    };

    const onPartnerDisconnected = (data) => {
      console.log('Partner disconnected:', data);
      resetMatchState();
      
      // Auto-rejoin queue
      if (autoRejoinRef.current && socket?.connected) {
        setTimeout(() => {
          setState('searching');
          socket.emit('join_queue', {
            gender_filter: lastFiltersRef.current.gender,
            country_filter: lastFiltersRef.current.country
          });
        }, 100);
      } else {
        setState('idle');
      }
    };

    // Error handling
    const onError = (data) => {
      console.error('Socket error:', data);
      setIsSkipping(false);
    };

    // Register event listeners
    socket.on('queue_joined', onQueueJoined);
    socket.on('queue_left', onQueueLeft);
    socket.on('match_found', onMatchFound);
    socket.on('match_ended', onMatchEnded);
    socket.on('partner_disconnected', onPartnerDisconnected);
    socket.on('error', onError);

    return () => {
      socket.off('queue_joined', onQueueJoined);
      socket.off('queue_left', onQueueLeft);
      socket.off('match_found', onMatchFound);
      socket.off('match_ended', onMatchEnded);
      socket.off('partner_disconnected', onPartnerDisconnected);
      socket.off('error', onError);
      
      // Clear any pending timeouts
      if (skipTimeoutRef.current) {
        clearTimeout(skipTimeoutRef.current);
      }
    };
  }, [socket, isSkipping, resetMatchState]);

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
    
    console.log('Skipping match...');
    setIsSkipping(true);
    
    // Emit skip event
    socket.emit('skip_match');
    
    // Safety timeout - if no response in 3 seconds, force reset
    skipTimeoutRef.current = setTimeout(() => {
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
