import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('raccoon_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    if (token) {
      await fetchCurrentUser();
    }
  };

  const login = (token, userData) => {
    localStorage.setItem('raccoon_token', token);
    setToken(token);
    setUser(userData);
  };

  const loginAsGuest = async (gender = 'any') => {
    try {
      // Get browser locale for country detection fallback
      const browserLocale = navigator.language || navigator.userLanguage || 'en-US';
      
      const response = await axios.post(`${API_URL}/auth/guest`, { 
        gender,
        browser_locale: browserLocale
      });
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('raccoon_token', newToken);
      setToken(newToken);
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Guest login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('raccoon_token');
    setToken(null);
    setUser(null);
  };

  const isGuest = () => {
    return user && user.guest_id;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, loginAsGuest, logout, loading, isGuest, refreshUser }}>
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
