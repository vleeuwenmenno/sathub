import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, AuthState } from '../types';
import { login as apiLogin, logout as apiLogout, getProfile, verifyTwoFactorCode } from '../api';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  verifyTwoFactor: (code: string) => Promise<void>;
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
    const response = await apiLogin(username, password);

    // Check if 2FA is required
    if ('requires_two_factor' in response && response.requires_two_factor) {
      // Store temporary 2FA session info
      sessionStorage.setItem('two_factor_user_id', response.user_id.toString());
      sessionStorage.setItem('two_factor_username', response.username);
      throw new Error('REQUIRES_2FA');
    }

    // Normal login flow
    const { token, refresh_token, user } = response as { token: string; refresh_token: string; user: User };
    localStorage.setItem('auth_token', token);
    localStorage.setItem('refresh_token', refresh_token);
    setAuthState({
      user,
      token,
      isAuthenticated: true,
    });
  };

  const verifyTwoFactor = async (code: string) => {
    const userIdStr = sessionStorage.getItem('two_factor_user_id');
    if (!userIdStr) {
      throw new Error('No 2FA session found');
    }
    
    const userId = parseInt(userIdStr, 10);
    const { token, refresh_token, user } = await verifyTwoFactorCode(userId, code);
    
    // Clear 2FA session data
    sessionStorage.removeItem('two_factor_user_id');
    sessionStorage.removeItem('two_factor_username');
    
    // Complete authentication
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
    verifyTwoFactor,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};