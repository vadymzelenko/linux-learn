import type { StateStorage } from 'zustand/middleware';

/** Debounce writes: the persisted state contains whole sandbox machines. */
export function debounced(inner: StateStorage, ms = 400): StateStorage {
  const pending = new Map<string, ReturnType<typeof setTimeout>>();
  return {
    getItem: inner.getItem,
    removeItem: inner.removeItem,
    setItem(key, value) {
      const t = pending.get(key);
      if (t) clearTimeout(t);
      pending.set(
        key,
        setTimeout(() => {
          pending.delete(key);
          void Promise.resolve(inner.setItem(key, value)).catch(() => undefined);
        }, ms),
      );
    },
  };
}
