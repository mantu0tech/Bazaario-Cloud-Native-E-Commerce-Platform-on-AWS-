import React, { createContext, useContext, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => window.localStorage?.getItem('bazaario-token') || null);
  const [user, setUser] = useState(() => {
    const stored = window.localStorage?.getItem('bazaario-user');
    return stored ? JSON.parse(stored) : null;
  });

  function persist(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
    window.localStorage?.setItem('bazaario-token', newToken);
    window.localStorage?.setItem('bazaario-user', JSON.stringify(newUser));
  }

  async function login(email, password) {
    const data = await api.login({ email, password });
    persist(data.token, data.user);
    return data.user;
  }

  async function register(name, email, password) {
    const data = await api.register({ name, email, password });
    persist(data.token, data.user);
    return data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
    window.localStorage?.removeItem('bazaario-token');
    window.localStorage?.removeItem('bazaario-user');
  }

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
