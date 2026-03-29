import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { isTokenValid, TOKEN_KEY } from '@/utils/auth';

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    // Initialize token from localStorage
    const storedToken = localStorage.getItem(TOKEN_KEY);
    console.log('=== AUTH CONTEXT INIT ===');
    console.log('Stored token:', storedToken ? 'EXISTS' : 'NULL');
    
    if (storedToken) {
      const valid = isTokenValid(storedToken);
      console.log('Token valid:', valid);
      
      if (valid) {
        return storedToken;
      }
      // Clear invalid token
      console.log('Clearing invalid token');
      localStorage.removeItem(TOKEN_KEY);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurrentUser = useCallback(async () => {
    console.log('=== FETCH CURRENT USER ===');
    console.log('Token:', token ? 'EXISTS' : 'NULL');
    
    if (!token) {
      console.log('No token, skipping user fetch');
      setLoading(false);
      return;
    }

    // Validate token before making request
    if (!isTokenValid(token)) {
      console.log('Token expired, logging out');
      logout();
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching user from /api/auth/me...');
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('User fetched:', response.data?.username || response.data?.email);
      setUser(response.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Only logout if it's an auth error
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('Auth error, logging out');
        logout();
      } else {
        setError('Failed to load user data');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch user on mount and when token changes
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const refreshUser = useCallback(async () => {
    if (token) {
      setLoading(true);
      await fetchCurrentUser();
    }
  }, [token, fetchCurrentUser]);

  const login = useCallback((newToken, userData) => {
    console.log('=== AUTH CONTEXT LOGIN ===');
    console.log('New token:', newToken ? 'PROVIDED' : 'MISSING');
    console.log('User data:', userData?.username || userData?.email);
    
    // Save to localStorage
    localStorage.setItem(TOKEN_KEY, newToken);
    
    // Verify it was saved
    const saved = localStorage.getItem(TOKEN_KEY);
    console.log('Token saved to localStorage:', saved ? 'SUCCESS' : 'FAILED');
    
    // Update state
    setToken(newToken);
    setUser(userData);
    setError(null);
    
    console.log('Auth state updated');
  }, []);

  const loginAsGuest = useCallback(async (gender = 'male') => {
    try {
      console.log('=== GUEST LOGIN ===');
      const browserLocale = navigator.language || navigator.userLanguage || 'en-US';
      
      const response = await axios.post(`${API_URL}/auth/guest`, { 
        gender,
        browser_locale: browserLocale
      });
      
      const { token: newToken, user: userData } = response.data;
      console.log('Guest token received:', newToken ? 'YES' : 'NO');
      
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

  const logout = useCallback(() => {
    console.log('=== LOGOUT ===');
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const isGuest = useCallback(() => {
    return user && user.guest_id;
  }, [user]);

  const isAuthenticated = useCallback(() => {
    const authenticated = !!user && !!token && isTokenValid(token);
    return authenticated;
  }, [user, token]);

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
    refreshUser
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
