import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { getCurrentUser } from '../api/auth';

const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  error: null,
  login: () => {},
  logout: () => {},
  refresh: () => Promise.resolve()
});

function loadStoredToken() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem('cc_token');
  } catch (err) {
    return null;
  }
}

function loadStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('cc_user');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => loadStoredToken());
  const [user, setUser] = useState(() => loadStoredUser());
  const [loading, setLoading] = useState(Boolean(loadStoredToken()));
  const [error, setError] = useState(null);

  const persist = useCallback((nextToken, nextUser) => {
    if (typeof window === 'undefined') return;
    try {
      if (nextToken) {
        window.localStorage.setItem('cc_token', nextToken);
      } else {
        window.localStorage.removeItem('cc_token');
      }
      if (nextUser) {
        window.localStorage.setItem('cc_user', JSON.stringify(nextUser));
      } else {
        window.localStorage.removeItem('cc_user');
      }
    } catch (err) {
      // ignore storage errors
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await getCurrentUser();
      const nextUser = res.data?.user || null;
      setUser(nextUser);
      persist(token, nextUser);
    } catch (err) {
      setError(err.response?.data?.msg || err.message);
      setUser(null);
      persist(null, null);
    } finally {
      setLoading(false);
    }
  }, [token, persist]);

  useEffect(() => {
    if (token) {
      refresh();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storageListener = () => {
      setToken(loadStoredToken());
      setUser(loadStoredUser());
    };
    const logoutListener = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('storage', storageListener);
    window.addEventListener('cc-auth-logout', logoutListener);
    return () => {
      window.removeEventListener('storage', storageListener);
      window.removeEventListener('cc-auth-logout', logoutListener);
    };
  }, []);

  const login = useCallback((nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    persist(nextToken, nextUser);
  }, [persist]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    persist(null, null);
  }, [persist]);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    error,
    login,
    logout,
    refresh
  }), [user, token, loading, error, login, logout, refresh]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
