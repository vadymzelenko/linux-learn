import { useEffect, useRef } from 'react';
import { useDialog } from './Dialog';
import { Platform, StyleSheet, TextInput, type TextInputInstance } from 'react-native';

export interface KeyEvent {
  key: string;
  ctrl: boolean;
}

const isTyping = (el: Element | null) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || (el as HTMLElement).isContentEditable);

/**
 * Keyboard shortcuts for screens without a text field (quiz, theory, finish):
 * digits pick an answer, Enter continues, Esc leaves. On the web it listens to
 * the document; on Android an invisible input that never opens the on-screen
 * keyboard receives the keys of a connected hardware keyboard.
 * `inInputs` lists keys handled even while a text field has focus.
 */
export function KeyCatcher({ onKey, enabled = true, inInputs = ['Escape'], webOnly }: { onKey: (e: KeyEvent) => boolean | void; enabled?: boolean; inInputs?: string[]; webOnly?: boolean }) {
  const cb = useRef(onKey);
  cb.current = onKey;
  const passKeys = useRef(inInputs);
  passKeys.current = inInputs;
  const inputRef = useRef<TextInputInstance>(null);

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

  if (Platform.OS !== 'android' || !enabled || webOnly) return null;
  return (
    <TextInput
      ref={inputRef}
      autoFocus
      showSoftInputOnFocus={false}
      value=""
      onChangeText={(text) => {
        for (const ch of text) cb.current({ key: ch, ctrl: false });
      }}
      onKeyPress={(e) => {
        const k = e.nativeEvent.key;
        if (k.length > 1) cb.current({ key: k, ctrl: false });
      }}
      onSubmitEditing={() => cb.current({ key: 'Enter', ctrl: false })}
      submitBehavior="submit"
      caretHidden
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.hidden}
    />
  );
}

const styles = StyleSheet.create({ hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, left: -10 } });
