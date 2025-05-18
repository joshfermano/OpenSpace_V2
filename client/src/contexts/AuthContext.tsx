import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from 'react';
import { authApi } from '../services/api';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'user' | 'host' | 'admin';
  profileImage?: string;
  verificationLevel: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  phoneNumber?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<any>;
  checkAuth: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  isVerified: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [lastAuthCheck, setLastAuthCheck] = useState(0);

  const clearError = () => setError(null);

  const isVerified = () => {
    if (!user) return false;
    return (
      user.verificationLevel === 'verified' ||
      user.verificationLevel === 'basic' ||
      user.role === 'admin'
    );
  };

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('Checking authentication status...');
      console.log('Current timestamp:', new Date().toISOString());

      // Call the API which will check cookies
      const response = await authApi.getCurrentUser();
      console.log('Auth check response:', response);

      if (response.success && response.data) {
        setUser(response.data);
        console.log('Successfully authenticated as:', response.data.role);
        return true;
      } else {
        console.log('Auth check failed with response:', response);
        // Only clear user if it's a genuine authentication failure
        if (response.status === 401) {
          console.log('Clearing user due to auth failure');
          setUser(null);
        }
        return false;
      }
    } catch (err) {
      console.error('Auth check failed with exception:', err);
      // Don't clear user on network errors as it might be temporary
      return false;
    } finally {
      setIsLoading(false);
      setAuthChecked(true);
      setLastAuthCheck(Date.now());
    }
  }, []);

  // Initial authentication check when the component mounts
  useEffect(() => {
    const checkAuthOnMount = async () => {
      console.log('Checking authentication on component mount');
      console.log('Current document.cookie:', document.cookie);

      // Add debug information for production debugging
      console.log('Current environment:', process.env.NODE_ENV);
      console.log('Current API URL:', import.meta.env.VITE_API_URL);
      console.log('Current client origin:', window.location.origin);

      await checkAuth();
      console.log('Initial auth check completed');
    };

    checkAuthOnMount();
  }, [checkAuth]);

  // Periodic refresh to keep session alive
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      if (user) {
        console.log('Refreshing authentication state...');
        checkAuth();
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [user, checkAuth]);

  // Refresh auth when tab becomes visible, but not too frequently
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only check auth if it's been at least 2 minutes since last check
        const timeSinceLastCheck = Date.now() - lastAuthCheck;
        const minimumInterval = 2 * 60 * 1000; // 2 minutes in milliseconds

        if (timeSinceLastCheck > minimumInterval) {
          console.log('Tab became visible, checking auth after interval...');
          checkAuth();
        } else {
          console.log('Tab became visible, skipping auth check (too soon)');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkAuth, lastAuthCheck]);

  const refreshUser = async () => {
    try {
      setIsLoading(true);
      const response = await authApi.getCurrentUser();

      if (!response.success) {
        throw new Error(response.message || 'Failed to refresh user data');
      }

      setUser(response.data);
      return response;
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      clearError();
      setIsLoading(true);
      const response = await authApi.login(email, password);

      if (response.success) {
        setUser(response.data);
        return response.data;
      } else {
        setError(response.message || 'Login failed');
        return null;
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during login');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await authApi.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      clearError();
      setIsLoading(true);

      console.log('AuthContext - Registering user with data:', userData);

      const response = await authApi.register(userData);

      if (response.success) {
        setUser(response.data);
        console.log('User data set in context:', response.data);
      } else {
        setError(response.message || 'Registration failed');
        console.error('Registration failed:', response.message);
      }

      return response;
    } catch (error: any) {
      console.error('Registration error in AuthContext:', error);
      setError(error.message || 'An error occurred during registration');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    logout,
    register,
    checkAuth,
    refreshUser,
    clearError,
    isVerified,
  };

  // Don't show loading indicator for subsequent auth checks
  if (isLoading && !authChecked) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading authentication state...</div>
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#666' }}>
          If this persists, try refreshing the page or clearing your cookies.
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
