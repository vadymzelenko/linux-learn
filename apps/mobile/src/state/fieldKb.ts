import { create } from 'zustand';
import type { KeyboardActions } from '../components/terminal/TermKeyboard';

/** The text field (outside a terminal) that our keyboard is typing into right now. */
export const useFieldKb = create<{ owner: string | null; actions: KeyboardActions | null; open(owner: string, a: KeyboardActions): void; close(owner?: string): void }>((set, get) => ({
  owner: null,
  actions: null,
  open: (owner, actions) => set({ owner, actions }),
  close: (owner) => {
    if (!owner || get().owner === owner) set({ owner: null, actions: null });
  },
}));
