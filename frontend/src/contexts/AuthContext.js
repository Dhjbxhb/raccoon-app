import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { isTokenValid, TOKEN_KEY } from '@/utils/auth';

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Check if Google auth redirect is pending
const isGoogleAuthPending = () => {
  const pending = localStorage.getItem('googleAuthPending') === 'true';
  const timestamp = localStorage.getItem('googleAuthTimestamp');
  
  // Stale if older than 5 minutes
  if (pending && timestamp && Date.now() - parseInt(timestamp) > 5 * 60 * 1000) {
    localStorage.removeItem('googleAuthPending');
    localStorage.removeItem('googleAuthTimestamp');
    return false;
  }
  
  return pending;
};

export const AuthProvider = ({ children }) => {
  // Initialize token from localStorage immediately
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    console.log('=== AUTH CONTEXT INIT ===');
    console.log('Token in localStorage:', storedToken ? 'YES' : 'NO');
    
    if (storedToken && isTokenValid(storedToken)) {
      console.log('Token is valid');
      return storedToken;
    }
    
    if (storedToken) {
      console.log('Token is invalid/expired, removing');
      localStorage.removeItem(TOKEN_KEY);
    }
    
    return null;
  });
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchInProgress = useRef(false);

  // Fetch user data from backend using JWT token
  const fetchCurrentUser = useCallback(async () => {
    // Prevent duplicate fetches
    if (fetchInProgress.current) return;
    fetchInProgress.current = true;
    
    console.log('=== FETCH CURRENT USER ===');
    
    // Get token from localStorage (source of truth)
    const currentToken = localStorage.getItem(TOKEN_KEY);
    console.log('Token:', currentToken ? 'EXISTS' : 'NULL');
    
    // If Google auth is pending, DON'T finalize loading yet
    // Login.js will handle the redirect and call finishAuthCheck
    if (!currentToken && isGoogleAuthPending()) {
      console.log('No token but Google auth pending - waiting for Login.js');
      fetchInProgress.current = false;
      // DON'T set loading=false here, let Login.js handle it
      return;
    }
    
    if (!currentToken) {
      console.log('No token, user is not logged in');
      setUser(null);
      setLoading(false);
      fetchInProgress.current = false;
      return;
    }

    // Validate token expiration
    if (!isTokenValid(currentToken)) {
      console.log('Token expired, clearing auth state');
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setLoading(false);
      fetchInProgress.current = false;
      return;
    }

    try {
      console.log('Fetching user from /api/auth/me...');
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      
      console.log('User fetched:', response.data?.username);
      setUser(response.data);
      setToken(currentToken);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch user:', err.response?.status);
      
      // Only clear auth if it's an auth error (401/403)
      if (err.response?.status === 401 || err.response?.status === 403) {
        console.log('Auth error, clearing token');
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } else {
        // Network or other error - keep token, just note the error
        setError('Failed to load user data');
      }
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, []);

  // Fetch user on mount
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (currentToken) {
      fetchInProgress.current = false; // Allow new fetch
      setLoading(true);
      await fetchCurrentUser();
    }
  }, [fetchCurrentUser]);

  // Called by Login.js when Google auth redirect handling is complete
  const finishAuthCheck = useCallback(() => {
    console.log('=== AUTH CHECK FINISHED (called by Login.js) ===');
    setLoading(false);
  }, []);

  // Login - save token and user data
  const login = useCallback((newToken, userData) => {
    console.log('=== AUTH CONTEXT: LOGIN ===');
    console.log('Token:', newToken ? 'PROVIDED' : 'MISSING');
    console.log('User:', userData?.username || userData?.email);
    
    if (!newToken) {
      console.error('Cannot login without token!');
      return;
    }
    
    // Save to localStorage FIRST
    localStorage.setItem(TOKEN_KEY, newToken);
    
    // Update React state
    setToken(newToken);
    setUser(userData);
    setError(null);
    setLoading(false);
    
    console.log('Login complete');
  }, []);

  // Guest login via backend
  const loginAsGuest = useCallback(async (gender = 'male') => {
    try {
      console.log('=== GUEST LOGIN ===');
      const browserLocale = navigator.language || navigator.userLanguage || 'en-US';
      
      const response = await axios.post(`${API_URL}/auth/guest`, { 
        gender,
        browser_locale: browserLocale
      });
      
      const { token: newToken, user: userData } = response.data;
      
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
      setUser(userData);
      setError(null);
      
      return userData;
    } catch (err) {
      console.error('Guest login failed:', err);
      throw err;
    }
  }, []);

  // Logout - clear everything
  const logout = useCallback(async () => {
    console.log('=== LOGOUT ===');
    const currentToken = localStorage.getItem(TOKEN_KEY);

    // Best-effort server-side session invalidation - local logout must still
    // succeed even if this fails (offline, network error, etc.)
    if (currentToken) {
      try {
        await axios.post(`${API_URL}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${currentToken}` }
        });
      } catch (err) {
        console.warn('[LOGOUT] Server-side logout call failed (continuing with local logout):', err.message);
      }
    }

    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  // Helper functions
  const isGuest = useCallback(() => {
    return user && (user.guest_id || user.is_guest);
  }, [user]);

  const isAuthenticated = useCallback(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    return !!storedToken && !!user && isTokenValid(storedToken);
  }, [user]);

  const value = {
    user,
    token,
    login,
    loginAsGuest,
    logout,
    loading,
    error,
    isGuest,
    isAuthenticated,
    refreshUser,
    finishAuthCheck
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
