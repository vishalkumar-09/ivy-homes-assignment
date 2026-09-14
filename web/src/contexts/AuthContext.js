'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initTokens } from '@/lib/apiFetch';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loginOpen, setLoginOpen]     = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const at = localStorage.getItem('ivy_access_token');
    const rt = localStorage.getItem('ivy_refresh_token');
    const u  = localStorage.getItem('ivy_user');
    if (at && rt && u) {
      setAccessToken(at);
      setRefreshToken(rt);
      setUser(JSON.parse(u));
      initTokens(at, rt);
    }
  }, []);

  const setSession = useCallback((data) => {
    setAccessToken(data.access_token);
    setRefreshToken(data.refresh_token);
    setUser(data.user);
    initTokens(data.access_token, data.refresh_token);
    localStorage.setItem('ivy_access_token',  data.access_token);
    localStorage.setItem('ivy_refresh_token', data.refresh_token);
    localStorage.setItem('ivy_user', JSON.stringify(data.user));
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    initTokens(null, null);
    localStorage.removeItem('ivy_access_token');
    localStorage.removeItem('ivy_refresh_token');
    localStorage.removeItem('ivy_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, refreshToken, loginOpen, setLoginOpen, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
