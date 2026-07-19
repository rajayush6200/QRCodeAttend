import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi } from '@/api/auth.api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      // Set tokens after login/refresh
      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },

      // Full login: set user + tokens
      loginSuccess: (user, tokens) => {
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        });
      },

      // Update user profile
      setUser: (user) => set({ user }),

      // Logout: clear all state
      logout: async () => {
        const { refreshToken } = get();
        try {
          if (refreshToken) {
            await authApi.logout(refreshToken);
          }
        } catch {
          // Ignore logout API errors
        } finally {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      // Reload profile from server
      refreshProfile: async () => {
        try {
          const res = await authApi.getMe();
          set({ user: res.data.data.user });
        } catch {
          // Ignore
        }
      },
    }),
    {
      name: 'qrcodeattend-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist tokens and user (not functions)
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export { useAuthStore };
