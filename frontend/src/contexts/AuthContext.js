import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { isTokenValid, TOKEN_KEY } from '@/utils/auth';

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    // Initialize token from localStorage, but validate it
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken && isTokenValid(storedToken)) {
      return storedToken;
    }
    // Clear invalid token
    if (storedToken) {
      localStorage.removeItem(TOKEN_KEY);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurrentUser = useCallback(async () => {
    if (!token) {
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
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      setError(null);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Only logout if it's an auth error
      if (error.response?.status === 401 || error.response?.status === 403) {
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
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(userData);
    setError(null);
  }, []);

  const loginAsGuest = useCallback(async (gender = 'male') => {
    try {
      // Get browser locale for country detection fallback
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
    } catch (error) {
      console.error('Guest login failed:', error);
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const isGuest = useCallback(() => {
    return user && user.guest_id;
  }, [user]);

  const isAuthenticated = useCallback(() => {
    return !!user && !!token && isTokenValid(token);
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
