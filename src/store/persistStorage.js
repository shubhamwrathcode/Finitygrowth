import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Zustand storage backed by AsyncStorage (Android).
 * Falls back to memory if the native module is not linked yet
 * (e.g. JS reload without a native rebuild).
 */
const memory = new Map();

function isNativeMissing(error) {
  const message = String(error?.message || error || '');
  return (
    message.includes('Native module is null') ||
    message.includes('AsyncStorageError') ||
    message.includes('null is not an object')
  );
}

export const persistStorage = {
  getItem: async name => {
    try {
      return await AsyncStorage.getItem(name);
    } catch (error) {
      if (!isNativeMissing(error)) throw error;
      return memory.has(name) ? memory.get(name) : null;
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, value);
      memory.set(name, value);
    } catch (error) {
      if (!isNativeMissing(error)) throw error;
      memory.set(name, value);
    }
  },
  removeItem: async name => {
    try {
      await AsyncStorage.removeItem(name);
      memory.delete(name);
    } catch (error) {
      if (!isNativeMissing(error)) throw error;
      memory.delete(name);
    }
  },
};
