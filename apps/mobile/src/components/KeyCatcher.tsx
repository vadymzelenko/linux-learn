import { useEffect, useRef } from 'react';
import { useDialog } from './Dialog';
import { Platform } from 'react-native';

export interface KeyEvent {
  key: string;
  ctrl: boolean;
}

const isTyping = (el: Element | null) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);

/**
 * Keyboard shortcuts for screens without a text field (quiz, theory, finish):
 * digits pick an answer, Enter continues, Esc leaves. Web only: on Android a
 * hidden focused input for hardware keys made the phone keyboard pop up.
 * `inInputs` lists keys handled even while a text field has focus.
 */
export function KeyCatcher({ onKey, enabled = true, inInputs = ['Escape'], webOnly }: { onKey: (e: KeyEvent) => boolean | void; enabled?: boolean; inInputs?: string[]; webOnly?: boolean }) {
  const cb = useRef(onKey);
  cb.current = onKey;
  const passKeys = useRef(inInputs);
  passKeys.current = inInputs;

  useEffect(() => {
    if (Platform.OS !== 'web' || !enabled || typeof document === 'undefined') return;
    const h = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey) return;
      // an open dialog owns the keyboard
      if (useDialog.getState().current) return;
      if (isTyping(document.activeElement) && !passKeys.current.includes(e.key)) return;
      if (cb.current({ key: e.key, ctrl: e.ctrlKey }) === true) e.preventDefault();
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [enabled]);

  return null;
}

