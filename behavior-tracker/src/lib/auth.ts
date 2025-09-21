import { AuthContext } from '../data/types';

const AUTH_KEY = 'behavior_tracker_auth';

export const authUtils = {
  saveAuth: (auth: AuthContext) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  },

  getAuth: (): AuthContext | null => {
    const stored = localStorage.getItem(AUTH_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  clearAuth: () => {
    localStorage.removeItem(AUTH_KEY);
  },

  isAuthenticated: (): boolean => {
    return !!authUtils.getAuth()?.token;
  },

  hasRole: (role: 'staff' | 'supervisor'): boolean => {
    const auth = authUtils.getAuth();
    return auth?.user?.role === role || auth?.user?.role === 'supervisor';
  }
};