// client/src/AuthContext.tsx

import { createContext, useState, useContext } from 'react';
import type { ReactNode } from 'react';
import api from './api'; // We need to import the api service

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!document.cookie.includes('token='));

  const login = () => setIsAuthenticated(true);

  const logout = async () => {
    // This function will now handle everything
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error("Logout failed, but proceeding to clear state.", error);
    } finally {
      // Clear the cookie and update the state regardless of API success
      document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      setIsAuthenticated(false);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};