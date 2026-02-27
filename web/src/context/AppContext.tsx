import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

// ========================================
// TYPES
// ========================================
interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: 'CREATOR' | 'EVENTEE';
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: 'CREATOR' | 'EVENTEE';
}

type Theme = 'light' | 'dark';

interface AppContextType {
  // Auth
  user: User | null;
  token: string | null;
  login: (emailOrUsername: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  updateUser: (user: User) => void;
  
  // Theme
  theme: Theme;
  toggleTheme: () => void;
}

// ========================================
// CONTEXT
// ========================================
const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

// ========================================
// PROVIDER
// ========================================
export const AppProvider = ({ children }: { children: ReactNode }) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Theme state
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return (stored as Theme) || 'light';
  });

  // Initialize auth
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          // Verify token and fetch profile
          const response = await api.get('/auth/profile');
          setUser(response.data.data);
          setToken(storedToken);
        } catch (error) {
          console.error("Auth initialization failed:", error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Update theme on document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auth functions
  const login = async (emailOrUsername: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { emailOrUsername, password });
      const { user: userData, token: authToken } = response.data.data;

      setUser(userData);
      setToken(authToken);
      localStorage.setItem('token', authToken);
      
      toast.success(`Welcome back, ${userData.username}!`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', data);
      const { user: userData, token: authToken } = response.data.data;

      setUser(userData);
      setToken(authToken);
      localStorage.setItem('token', authToken);
      
      toast.success('Registration successful! Welcome to Groove.');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    toast.success('Logged out successfully');
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        loading,
        updateUser,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};