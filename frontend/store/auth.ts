import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  drivingLicenseUrl?: string;
}

interface AuthStore {
  // State
  user: User | null;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      isLoading: false,

      // Actions
      setUser: (user) => set({ user }),
      setLoading: (loading) => set({ isLoading: loading }),
      clearAuth: () => set({ user: null, isLoading: false }),
      logout: () => set({ user: null, isLoading: false }),
    }),
    {
      name: 'auth-store', // localStorage key
      partialize: (state) => ({ user: state.user }), // Only persist user data, NOT tokens
    }
  )
);