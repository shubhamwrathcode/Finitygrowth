/**
 * Session helpers for non-React callers (http.js, api.js).
 * Backed by the Zustand auth store (persisted).
 */
import { useAuthStore } from '../store/authStore';

export function getToken() {
  return useAuthStore.getState().token || '';
}

export function getUser() {
  return useAuthStore.getState().user;
}

export function setSession(token, user) {
  useAuthStore.getState().setSession(token, user);
}

export function clearSession() {
  useAuthStore.getState().signOut();
}
