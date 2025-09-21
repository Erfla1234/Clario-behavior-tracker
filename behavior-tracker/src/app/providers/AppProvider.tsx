import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthContext, User, Organization } from '../../data/types';
import { authUtils } from '../../lib/auth';
import { mockAdapter } from '../../data/adapters/mock';

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
  const [auth, setAuth] = useState<AuthContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = authUtils.getAuth();
    if (stored) {
      setAuth(stored);
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const result = await mockAdapter.auth.login(email, password);
    const authContext: AuthContext = {
      user: result.user,
      org: result.org,
      token: result.token
    };
    authUtils.saveAuth(authContext);
    setAuth(authContext);
  };

  const logout = async () => {
    await mockAdapter.auth.logout();
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