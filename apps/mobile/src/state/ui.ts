import { create } from 'zustand';

/**
 * Transient UI state shared between screens (not persisted).
 * `focus`: a task's terminal keyboard is open on a phone in portrait — the
 * lesson header and labels fold away so terminal, goal and keyboard fit.
 */
export const useUi = create<{ focus: boolean; setFocus(v: boolean): void }>((set) => ({
  focus: false,
  setFocus: (focus) => set({ focus }),
}));
