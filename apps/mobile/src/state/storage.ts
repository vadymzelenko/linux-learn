import Storage from 'expo-sqlite/kv-store';
import type { StateStorage } from 'zustand/middleware';
import { debounced } from './storage.shared';

/** expo-sqlite key-value store on device. Writes are debounced (the state can be large). */
export const storage: StateStorage = debounced({
  getItem: (k) => Storage.getItem(k),
  setItem: (k, v) => Storage.setItem(k, v),
  removeItem: (k) => Storage.removeItem(k),
});

