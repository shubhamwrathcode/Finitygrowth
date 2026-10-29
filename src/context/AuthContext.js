import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';

/**
 * AuthProvider – waits for Zustand persist hydration, then exposes useAuth().
 * Screens keep using useAuth(); storage is Zustand + AsyncStorage.
 * Boot UI (Lottie splash) lives in App.js — do not block children here.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const hydrated = useAuthStore(s => s.hydrated);
  const token = useAuthStore(s => s.token);
  const user = useAuthStore(s => s.user);
  const setSession = useAuthStore(s => s.setSession);
  const signOut = useAuthStore(s => s.signOut);

  useEffect(() => {
    const finish = () => useAuthStore.setState({ hydrated: true });
    if (useAuthStore.persist.hasHydrated()) {
      finish();
      return undefined;
    }
    return useAuthStore.persist.onFinishHydration(finish);
  }, []);

  const value = useMemo(
    () => ({
      token: token || '',
      user: user || null,
      isSignedIn: Boolean(token),
      setSession,
      signOut,
      hydrated,
    }),
    [token, user, setSession, signOut, hydrated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
