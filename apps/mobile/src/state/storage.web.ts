import type { StateStorage } from 'zustand/middleware';
import { debounced } from './storage.shared';

/** On the web (portfolio demo) progress is kept in localStorage. */
export const storage: StateStorage = debounced({
  getItem: (k) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(k)),
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* quota exceeded: ignore */
    }
  },
  removeItem: (k) => localStorage.removeItem(k),
});
