import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AuthContext } from '../../data/types';
import { authUtils } from '../../lib/auth';
import { apiAdapter } from '../../data/adapters/api';

const AuthContextProvider = createContext<{
  auth: AuthContext | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}>({
  auth: null,
  login: async () => {},
  logout: async () => {},
  isLoading: true
});

export const useAuth = () => useContext(AuthContextProvider);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1
    }
  }
});

export function AppProvider({ children }: { children: ReactNode }) {
  console.log('AppProvider rendering...');
  const [auth, setAuth] = useState<AuthContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('AppProvider useEffect running...');
    try {
      const stored = authUtils.getAuth();
      if (stored) {
        setAuth(stored);
        console.log('Found stored auth');
      } else {
        console.log('No stored auth found');
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const result = await apiAdapter.auth.login(email, password);
    const authContext: AuthContext = {
      user: result.user,
      org: result.org,
      token: result.token
    };
    authUtils.saveAuth(authContext);
    setAuth(authContext);
  };

  const logout = async () => {
    await apiAdapter.auth.logout();
    authUtils.clearAuth();
    setAuth(null);
  };

  return (
    <AuthContextProvider.Provider value={{ auth, login, logout, isLoading }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AuthContextProvider.Provider>
  );
}