import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { persistStorage } from './persistStorage';

/**
 * Auth store – token + user persisted (AsyncStorage on Android).
 */
export const useAuthStore = create(
  persist(
    set => ({
      token: '',
      user: null,
      hydrated: false,

      /** Same as web setSession(token, user) */
      setSession: (token, user) => {
        if (token) set({ token, user: user || null });
        else set({ token: '', user: null });
      },

      setUser: user => set({ user: user || null }),

      signOut: () => set({ token: '', user: null }),

      setHydrated: value => set({ hydrated: Boolean(value) }),
    }),
    {
      name: 'finitygrowth-auth',
      storage: createJSONStorage(() => persistStorage),
      partialize: state => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          // Native module missing until Android rebuild — still boot the app.
          console.warn('[authStore] rehydrate failed:', error?.message || error);
        }
        useAuthStore.setState({ hydrated: true });
      },
    },
  ),
);
