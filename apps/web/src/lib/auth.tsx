'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api, type User } from './api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organization?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      // Fetch user profile
      api.getProfile().then((response) => {
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          // Token invalid, clear it
          localStorage.removeItem('token');
          setToken(null);
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login({ email, password });

    if (response.success && response.data) {
      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(newUser);
      return { success: true };
    }

    return { success: false, error: response.error || 'Login failed' };
  }, []);

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      organization?: string;
    }) => {
      const response = await api.register(data);

      if (response.success && response.data) {
        const { token: newToken, user: newUser } = response.data;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);
        return { success: true };
      }

      return { success: false, error: response.error || 'Registration failed' };
    },
    [],
  );

  const logout = useCallback(async () => {
    await api.logout();
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) return;

    const response = await api.getProfile();
    if (response.success && response.data) {
      setUser(response.data);
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
