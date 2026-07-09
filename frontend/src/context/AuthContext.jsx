import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize and check if user session exists
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (accessToken) {
        try {
          // Fetch current user details
          const res = await api.get('/api/auth/me');
          setUser(res.data);
        } catch (err) {
          console.error('Failed to load user profile on startup', err);
          // Token expired or invalid, interceptor will clear and redirect if needed
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      const { access_token, refresh_token, role, name, employee_id } = res.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      const userMeta = { email, role, name, employee_id };
      localStorage.setItem('user', JSON.stringify(userMeta));

      // Fetch full details
      const profileRes = await api.get('/api/auth/me');
      setUser(profileRes.data);
      setLoading(false);
      return profileRes.data;
    } catch (err) {
      setLoading(false);
      throw err.response?.data?.detail || 'Invalid credentials. Please try again.';
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateProfile = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateProfile, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
