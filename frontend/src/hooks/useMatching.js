import { useState, useEffect } from 'react';

export const useMatching = (socket) => {
  const [state, setState] = useState('idle'); // idle, searching, matched
  const [partner, setPartner] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('queue_joined', (data) => {
      setState('searching');
      console.log('Joined queue:', data);
    });

    socket.on('match_found', (data) => {
      setState('matched');
      setPartner(data.partner);
      setSessionId(data.session_id);
      console.log('Match found:', data);
    });

    socket.on('match_ended', (data) => {
      setState('idle');
      setPartner(null);
      setSessionId(null);
      console.log('Match ended:', data);
    });

    socket.on('partner_disconnected', () => {
      setState('idle');
      setPartner(null);
      setSessionId(null);
      console.log('Partner disconnected');
    });

    return () => {
      socket.off('queue_joined');
      socket.off('match_found');
      socket.off('match_ended');
      socket.off('partner_disconnected');
    };
  }, [socket]);

  const startMatching = (genderFilter = 'any', countryFilter = 'ANY') => {
    if (socket) {
      socket.emit('join_queue', { 
        gender_filter: genderFilter,
        country_filter: countryFilter 
      });
      setState('searching');
    }
  };

  const stopMatching = () => {
    if (socket) {
      socket.emit('leave_queue');
      setState('idle');
    }
  };

  const skipMatch = () => {
    if (socket) {
      socket.emit('skip_match');
    }
  };

  const blockUser = () => {
    if (socket && partner) {
      socket.emit('block_user', { blocked_id: partner.user_id });
    }
  };

  return {
    state,
    partner,
    sessionId,
    startMatching,
    stopMatching,
    skipMatch,
    blockUser
  };
};
