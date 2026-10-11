import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem('cc_token'));

  // Restore the session on page load
  useEffect(() => {
    if (!localStorage.getItem('cc_token')) return;
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem('cc_token'))
      .finally(() => setLoading(false));
  }, []);

  const finish = (data) => {
    localStorage.setItem('cc_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const login = useCallback(async (email, password) => finish((await api.post('/auth/login', { email, password })).data), []);
  const register = useCallback(async (payload) => finish((await api.post('/auth/register', payload)).data), []);

  const logout = useCallback(() => {
    localStorage.removeItem('cc_token');
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
