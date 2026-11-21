import { useCallback, useEffect, useId, useRef, useState, type Ref } from 'react';
import { Platform, TextInput, type TextInputInstance, type TextInputProps } from 'react-native';
import { useStore } from '../../state/store';
import { useFieldKb } from '../../state/fieldKb';
import type { KeyboardActions } from './TermKeyboard';

type Props = Omit<TextInputProps, 'value' | 'onChangeText'> & { value: string; onChangeText: (v: string) => void; ref?: Ref<TextInputInstance> };

/**
 * A text field that types with the app's terminal keyboard (when it is the
 * chosen keyboard) instead of the phone's: the keyboard docks at the bottom of
 * the screen (see KeyboardDock) while the field has focus.
 */
export function KbTextInput({ value, onChangeText, onFocus, onSubmitEditing, onSelectionChange, multiline, ...rest }: Props) {
  const custom = useStore((s) => s.settings.keyboard.mode === 'custom');
  const id = useId();
  const input = useRef<TextInputInstance>(null);
  const val = useRef(value);
  val.current = value;
  const sel = useRef({ start: value.length, end: value.length });
  const [forced, setForced] = useState<{ start: number; end: number } | undefined>(undefined);
  const submit = useRef(onSubmitEditing);
  submit.current = onSubmitEditing;

  useEffect(() => {
    if (!forced) return;
    const f = requestAnimationFrame(() => setForced(undefined));
    return () => cancelAnimationFrame(f);
  }, [forced]);
  useEffect(() => () => useFieldKb.getState().close(id), [id]);

  const set = useCallback(
    (text: string, cursor: number) => {
      val.current = text;
      sel.current = { start: cursor, end: cursor };
      onChangeText(text);
      setForced({ start: cursor, end: cursor });
      input.current?.focus();
    },
    [onChangeText],
  );
  const move = (p: number) => {
    const c = Math.max(0, Math.min(val.current.length, p));
    sel.current = { start: c, end: c };
    setForced({ start: c, end: c });
    input.current?.focus();
  };

  const actions: KeyboardActions = {
    insert: (t) => {
      const v = val.current;
      const { start, end } = sel.current;
      const text = multiline ? t : t.replace(/\n/g, ' ');
      set(v.slice(0, start) + text + v.slice(end), start + text.length);
    },
    backspace: () => {
      const v = val.current;
      const { start, end } = sel.current;
      if (end > start) return set(v.slice(0, start) + v.slice(end), start);
      if (start > 0) set(v.slice(0, start - 1) + v.slice(start), start - 1);
    },
    enter: () => {
      if (submit.current) submit.current({ nativeEvent: { text: val.current } } as never);
      else actions.hide();
    },
    special: (k) => {
      if (k === 'left') move(sel.current.start - 1);
      else if (k === 'right') move(sel.current.end + 1);
      else if (k === 'home' || k === 'up') move(0);
      else if (k === 'end' || k === 'down') move(val.current.length);
      else if (k === 'esc') actions.hide();
    },
    control: (ch) => {
      if (ch === 'u' || ch === 'c') set('', 0);
      else if (ch === 'a') move(0);
      else if (ch === 'e') move(val.current.length);
      else if (ch === 'w') {
        const before = val.current.slice(0, sel.current.start).replace(/\S+\s*$/, '');
        set(before + val.current.slice(sel.current.start), before.length);
      }
    },
    alt: () => undefined,
    hide: () => {
      input.current?.blur();
      useFieldKb.getState().close(id);
    },
  };
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  // a stable facade: the dock keeps one object, calls go to the latest closure
  const facade = useRef<KeyboardActions>({
    insert: (t) => actionsRef.current.insert(t),
    backspace: () => actionsRef.current.backspace(),
    enter: () => actionsRef.current.enter(),
    special: (k) => actionsRef.current.special(k),
    control: (c) => actionsRef.current.control(c),
    alt: (c) => actionsRef.current.alt(c),
    hide: () => actionsRef.current.hide(),
  }).current;

  return (
    <TextInput
      ref={input}
      value={value}
      onChangeText={(v) => {
        val.current = v;
        onChangeText(v);
      }}
      {...(forced ? { selection: forced } : {})}
      onSelectionChange={(e) => {
        sel.current = e.nativeEvent.selection;
        onSelectionChange?.(e);
      }}
      onFocus={(e) => {
        if (custom) useFieldKb.getState().open(id, facade);
        onFocus?.(e);
      }}
      onSubmitEditing={onSubmitEditing}
      multiline={multiline}
      showSoftInputOnFocus={!custom}
      {...(Platform.OS === 'web' && custom ? { inputMode: 'none' as const } : {})}
      {...rest}
    />
  );
}
