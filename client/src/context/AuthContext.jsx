import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('taskforge_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('taskforge_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.success && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('taskforge_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error('Session validation failed:', err.message);
          setUser(null);
          localStorage.removeItem('taskforge_token');
          localStorage.removeItem('taskforge_user');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.success && res.data) {
      const { user: userData, tokens } = res.data;
      setUser(userData);
      localStorage.setItem('taskforge_token', tokens.accessToken);
      localStorage.setItem('taskforge_user', JSON.stringify(userData));
      return userData;
    }
  };

  const register = async (name, email, password, role = 'USER') => {
    const res = await api.post('/auth/register', { name, email, password, role });
    if (res.success && res.data) {
      const { user: userData, tokens } = res.data;
      setUser(userData);
      localStorage.setItem('taskforge_token', tokens.accessToken);
      localStorage.setItem('taskforge_user', JSON.stringify(userData));
      return userData;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ignore logout API error if network fails
    } finally {
      setUser(null);
      localStorage.removeItem('taskforge_token');
      localStorage.removeItem('taskforge_user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
