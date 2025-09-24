import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, AuthState } from '../types';
import { login as apiLogin, logout as apiLogout, getProfile } from '../api';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const user = await getProfile();
          setAuthState({
            user,
            token,
            isAuthenticated: true,
          });
        } catch (error) {
          // Token invalid, clear it
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const { token, refresh_token, user } = await apiLogin(username, password);
    localStorage.setItem('auth_token', token);
    localStorage.setItem('refresh_token', refresh_token);
    setAuthState({
      user,
      token,
      isAuthenticated: true,
    });
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      // If logout API fails (e.g., CORS), still clear local state
      console.error('Logout API failed:', error);
    } finally {
      // Always clear localStorage and state regardless of API call result
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
      });
      // Refresh the page to clear any cached authenticated content
      window.location.reload();
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};