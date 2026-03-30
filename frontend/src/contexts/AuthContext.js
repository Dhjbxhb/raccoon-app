import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { isTokenValid, TOKEN_KEY } from '@/utils/auth';

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Check if Google auth is pending (redirect in progress)
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
  // Initialize state from localStorage immediately
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    console.log('=== AUTH CONTEXT INIT ===');
    console.log('Stored token:', storedToken ? 'EXISTS (' + storedToken.substring(0, 20) + '...)' : 'NULL');
    console.log('Google auth pending:', isGoogleAuthPending());
    
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
  // CRITICAL: If Google auth is pending, keep loading=true until Login.js handles it
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const authCheckDone = useRef(false);

  // Fetch user data from backend using JWT token
  const fetchCurrentUser = useCallback(async () => {
    console.log('=== FETCH CURRENT USER ===');
    
    // Get token from localStorage (source of truth)
    const currentToken = localStorage.getItem(TOKEN_KEY);
    console.log('Token from localStorage:', currentToken ? 'EXISTS' : 'NULL');
    
    // CRITICAL: If Google auth is pending, DON'T set loading=false yet
    // Let Login.js handle the redirect result first
    if (!currentToken && isGoogleAuthPending()) {
      console.log('No token but Google auth pending - waiting for redirect handler');
      // Keep loading=true, Login.js will handle auth
      return;
    }
    
    if (!currentToken) {
      console.log('No token, user is not logged in');
      setUser(null);
      setLoading(false);
      return;
    }

    // Validate token expiration
    if (!isTokenValid(currentToken)) {
      console.log('Token expired, clearing auth state');
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching user from /api/auth/me...');
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      
      console.log('User fetched successfully:', response.data?.username || response.data?.email);
      setUser(response.data);
      setToken(currentToken);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch user:', error.response?.status, error.response?.data);
      
      // Only clear auth if it's an auth error (401/403)
      if (error.response?.status === 401 || error.response?.status === 403) {
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
    }
  }, []);

  // Fetch user on mount
  useEffect(() => {
    if (authCheckDone.current) return;
    authCheckDone.current = true;
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (currentToken) {
      setLoading(true);
      await fetchCurrentUser();
    }
  }, [fetchCurrentUser]);

  // Called by Login.js when Google auth redirect is handled (success or fail)
  const finishAuthCheck = useCallback(() => {
    console.log('=== AUTH CHECK FINISHED ===');
    setLoading(false);
  }, []);

  // Login - save token and user data
  const login = useCallback((newToken, userData) => {
    console.log('=== AUTH CONTEXT LOGIN ===');
    console.log('New token:', newToken ? 'PROVIDED' : 'MISSING');
    console.log('User data:', userData?.username || userData?.email);
    
    if (!newToken) {
      console.error('Cannot login without token!');
      return;
    }
    
    // Save to localStorage FIRST (source of truth)
    localStorage.setItem(TOKEN_KEY, newToken);
    
    // Verify it was saved
    const savedToken = localStorage.getItem(TOKEN_KEY);
    console.log('Token saved to localStorage:', savedToken ? 'SUCCESS' : 'FAILED');
    
    // Update React state
    setToken(newToken);
    setUser(userData);
    setError(null);
    setLoading(false);
    
    console.log('Login complete - user state updated');
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
      console.log('Guest token received');
      
      // Save token
      localStorage.setItem(TOKEN_KEY, newToken);
      setToken(newToken);
      setUser(userData);
      setError(null);
      
      return userData;
    } catch (error) {
      console.error('Guest login failed:', error);
      throw error;
    }
  }, []);

  // Logout - clear everything
  const logout = useCallback(() => {
    console.log('=== LOGOUT ===');
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
