import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('decostone_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('decostone_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      if (token) {
        try {
          const res = await api.getProfile();
          if (res.success) {
            setUser(res.user);
            localStorage.setItem('decostone_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.error('Session expired or invalid:', err);
          logout();
        }
      }
      setLoading(false);
    }
    verifyAuth();
  }, [token]);

  const login = async (username, password, role) => {
    const res = await api.login({ username, password, role });
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('decostone_token', res.token);
      localStorage.setItem('decostone_user', JSON.stringify(res.user));
      return res.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('decostone_token');
    localStorage.removeItem('decostone_user');
  };

  const hasRole = (...roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const hasPermission = (perm) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return Boolean(user[perm]);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
