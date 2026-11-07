import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, TextInput, useWindowDimensions, View, type TextInputInstance, type TextInputKeyPressEvent, type ViewStyle } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { stripAnsi } from '@linux-learn/engine';
import { useTranslation } from 'react-i18next';
import { useTheme, MONO } from '../../theme';
import { useStore } from '../../state/store';
import { haptic } from '../../lib/haptics';
import { AnsiText, CommandText } from './AnsiText';
import { PromptText } from './Prompt';
import { KeyBar, type SpecialKey } from './KeyBar';
import { TermKeyboard, type KeyboardActions } from './TermKeyboard';
import { Icon } from '../ui/Icon';
import { Editor } from './Editor';
import type { Block, ShellController } from './useShell';
import { Text } from '../../theme/Text';

export interface TerminalHandle {
  insert(text: string): void;
  setInput(text: string): void;
  focus(): void;
}

interface Props {
  shell: ShellController;
  style?: ViewStyle;
  autoFocus?: boolean;
  /** Text initially in the input (fix-the-command steps). */
  prefill?: string;
  ref?: Ref<TerminalHandle>;
  /** Shown above the output when the buffer is empty. */
  welcome?: string;
  /** Enter on an empty line: return true when it was used (e.g. "continue"). */
  onEmptyEnter?: () => boolean;
  /** A line above the key bar, e.g. "Enter — continue". */
  banner?: string | null;
  /** Web: typing anywhere on the page goes into this terminal. */
  grabTyping?: boolean;
  /** The on-screen keyboard (ours) appeared / disappeared: parents make room. */
  onKeyboardChange?: (visible: boolean) => void;
}

/** Approximate number of monospace columns for a given width. */
export function columnsFor(width: number, fontSize: number) {
  return Math.max(20, Math.floor((width - 24) / (fontSize * 0.6)));
}

export function Terminal({ shell, style, autoFocus, prefill, ref, welcome, onEmptyEnter, banner, grabTyping, onKeyboardChange }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const fontSize = useStore((s) => s.settings.fontSize);
  const custom = useStore((s) => s.settings.keyboard.mode === 'custom');
  const [kbVisible, setKbVisibleState] = useState(!!autoFocus);
  const kbCb = useRef(onKeyboardChange);
  kbCb.current = onKeyboardChange;
  const setKbVisible = useCallback((v: boolean) => {
    setKbVisibleState(v);
    kbCb.current?.(v);
  }, []);
  useEffect(() => {
    if (custom) kbCb.current?.(kbVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [custom]);
  const [input, setInput] = useState(prefill ?? '');
  /**
   * The cursor position is NOT a controlled prop all the time: re-applying a
   * stale selection on every keystroke made the cursor jump to the start of the
   * line. We only push a selection for one render when we move the cursor
   * ourselves (history, Tab, paste of a hint) and track the real one in a ref.
   */
  const sel = useRef({ start: (prefill ?? '').length, end: (prefill ?? '').length });
  const [forcedSel, setForcedSel] = useState<{ start: number; end: number } | undefined>(undefined);
  const [ctrl, setCtrl] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<TextInputInstance>(null);
  const listRef = useRef<FlatList<Block>>(null);
  const lineHeight = Math.round(fontSize * 1.45);
  const inputValue = useRef(input);
  inputValue.current = input;

  useEffect(() => {
    if (!forcedSel) return;
    const id = requestAnimationFrame(() => setForcedSel(undefined));
    return () => cancelAnimationFrame(id);
  }, [forcedSel]);

  /** Selection events older than our own last edit are stale (fast typing). */
  const ownSelUntil = useRef(0);
  const setText = useCallback((text: string, cursor = text.length) => {
    // update the refs right away: the next key may arrive before React renders,
    // otherwise it would edit the old text and the previous character is lost
    inputValue.current = text;
    sel.current = { start: cursor, end: cursor };
    ownSelUntil.current = Date.now() + 250;
    setInput(text);
    setForcedSel({ start: cursor, end: cursor });
  }, []);

  useEffect(() => {
    if (prefill !== undefined) setText(prefill);
  }, [prefill, setText]);

  const insertAtCursor = useCallback(
    (text: string) => {
      const cur = inputValue.current;
      const s0 = Math.min(sel.current.start, cur.length);
      const e0 = Math.min(sel.current.end, cur.length);
      setText(cur.slice(0, s0) + text + cur.slice(e0), s0 + text.length);
      inputRef.current?.focus();
    },
    [setText],
  );

  const moveCursor = useCallback(
    (d: number) => {
      const p = Math.max(0, Math.min(inputValue.current.length, sel.current.start + d));
      sel.current = { start: p, end: p };
      setForcedSel({ start: p, end: p });
      inputRef.current?.focus();
    },
    [],
  );

  useImperativeHandle(ref, () => ({
    insert: (text) => {
      setText(text);
      inputRef.current?.focus();
    },
    setInput: (text) => setText(text),
    focus: () => inputRef.current?.focus(),
  }));

  const submit = useCallback(() => {
    const line = inputValue.current;
    if (!line.trim() && onEmptyEnter?.()) return;
    setText('');
    shell.execute(line);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [onEmptyEnter, setText, shell]);

  const submitRef = useRef(submit);
  submitRef.current = submit;

  const doTab = useCallback(() => {
    const r = shell.tab(inputValue.current, sel.current.start);
    setText(r.line, r.cursor);
  }, [setText, shell]);

  const history = useCallback(
    (dir: -1 | 1) => {
      const v = shell.historyStep(dir, input);
      if (v !== null) setText(v);
    },
    [input, setText, shell],
  );

  const onSpecial = useCallback(
    (k: SpecialKey) => {
      haptic.key();
      requestAnimationFrame(() => inputRef.current?.focus());
      switch (k) {
        case 'tab':
          return doTab();
        case 'up':
          return history(-1);
        case 'down':
          return history(1);
        case 'ctrl':
          return setCtrl((c) => !c);
        case 'esc':
          setCtrl(false);
          return;
        case 'left':
          return moveCursor(-1);
        case 'right':
          return moveCursor(1);
        case 'home':
          return moveCursor(-10000);
        case 'end':
          return moveCursor(10000);
        default:
          return insertAtCursor(k);
      }
    },
    [doTab, history, insertAtCursor, moveCursor],
  );

  /** Ctrl+letter shortcuts, from the on-screen Ctrl key or a hardware keyboard. */
  const control = useCallback(
    (ch: string): boolean => {
      const cur = inputValue.current;
      switch (ch) {
        case 'c':
          shell.interrupt(cur);
          setText('');
          return true;
        case 'l':
          shell.clearScreen();
          return true;
        case 'u':
          setText(cur.slice(sel.current.start), 0);
          return true;
        case 'a':
          moveCursor(-10000);
          return true;
        case 'e':
          moveCursor(10000);
          return true;
        case 'w': {
          const before = cur.slice(0, sel.current.start).replace(/\S+\s*$/, '');
          setText(before + cur.slice(sel.current.start), before.length);
          return true;
        }
        case 'd':
          if (cur === '') {
            shell.execute('exit');
            return true;
          }
          return false;
        default:
          return false;
      }
    },
    [moveCursor, setText, shell],
  );

  const backspace = useCallback(() => {
    const cur = inputValue.current;
    const { start, end } = sel.current;
    if (end > start) return setText(cur.slice(0, start) + cur.slice(end), start);
    if (start === 0) return;
    setText(cur.slice(0, start - 1) + cur.slice(start), start - 1);
  }, [setText]);

  /** Alt+b / Alt+f — word left / right; Alt+. — the last argument of the previous command. */
  const altKey = useCallback(
    (ch: string) => {
      const cur = inputValue.current;
      const p = sel.current.start;
      if (ch === 'b') {
        const m = cur.slice(0, p).match(/\S+\s*$/);
        moveCursor(m ? -m[0].length : -p);
      } else if (ch === 'f') {
        const m = cur.slice(p).match(/^\s*\S+/);
        moveCursor(m ? m[0].length : cur.length - p);
      } else if (ch === '.') {
        const last = shell.historyStep(-1, '') ?? '';
        shell.historyStep(1, '');
        const arg = last.trim().split(/\s+/).pop() ?? '';
        if (arg) insertAtCursor(arg);
      }
    },
    [insertAtCursor, moveCursor, shell],
  );

  const kbActions: KeyboardActions = {
    insert: insertAtCursor,
    backspace,
    enter: () => submitRef.current(),
    special: (k) => onSpecial(k),
    control: (ch) => {
      control(ch);
    },
    alt: altKey,
    hide: () => {
      setKbVisible(false);
      inputRef.current?.blur();
    },
  };

  /** With Ctrl armed, the next typed letter becomes a control key. */
  const onChangeText = useCallback(
    (text: string) => {
      const cur = inputValue.current;
      if (ctrl && text.length === cur.length + 1) {
        const ch = text[sel.current.start]?.toLowerCase() ?? '';
        setCtrl(false);
        if (control(ch)) return;
      }
      const clean = text.replace(/\n/g, '');
      inputValue.current = clean;
      setInput(clean);
    },
    [control, ctrl],
  );

  const onKeyPress = useCallback(
    (e: TextInputKeyPressEvent) => {
      const ne = e.nativeEvent as { key: string; ctrlKey?: boolean; metaKey?: boolean };
      const key = ne.key;
      const prevent = () => (e as unknown as { preventDefault?: () => void }).preventDefault?.();
      if (ne.ctrlKey && !ne.metaKey && key.length === 1) {
        // Ctrl+C copies when text is selected, like in a real terminal app
        if (key.toLowerCase() === 'c' && sel.current.end > sel.current.start) return;
        if (control(key.toLowerCase())) prevent();
        return;
      }
      if (key === 'Tab') {
        prevent();
        doTab();
      } else if (key === 'ArrowUp') {
        prevent();
        history(-1);
      } else if (key === 'ArrowDown') {
        prevent();
        history(1);
      }
    },
    [control, doTab, history],
  );

  // web: start typing anywhere and the characters land in the terminal
  useEffect(() => {
    if (Platform.OS !== 'web' || !grabTyping || typeof document === 'undefined') return;
    const h = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        inputRef.current?.focus();
        submitRef.current();
        return;
      }
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        inputRef.current?.focus();
        if (e.key.length === 1) {
          e.preventDefault();
          insertAtCursor(e.key);
        }
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [grabTyping, insertAtCursor]);

  const copyBlock = useCallback(
    async (b: Block) => {
      const text = stripAnsi(b.output || b.note?.text || '');
      if (!text) return;
      await Clipboard.setStringAsync(text);
      haptic.light();
      setToast(t('terminal.copied'));
      setTimeout(() => setToast(null), 1400);
    },
    [t],
  );

  const renderItem = useCallback(
    ({ item }: { item: Block }) => (
      <Pressable onLongPress={() => void copyBlock(item)} delayLongPress={350} accessibilityRole="text">
        {item.prompt ? (
          <Text style={{ fontFamily: MONO, fontSize, lineHeight, color: theme.term.fg }} selectable={Platform.OS === 'web'}>
            <PromptText prompt={item.prompt} fontSize={fontSize} />
            {item.command ? <CommandText line={item.command} /> : null}
          </Text>
        ) : null}
        {item.output ? (
          <AnsiText text={item.output.replace(/\n$/, '')} style={{ fontSize, lineHeight }} />
        ) : null}
        {item.note ? (
          <Text
            style={[
              styles.note,
              {
                fontSize: fontSize - 1,
                color: item.note.tone === 'warn' ? theme.warning : item.note.tone === 'success' ? theme.success : theme.term.path,
                borderLeftColor: item.note.tone === 'warn' ? theme.warning : theme.term.path,
              },
            ]}
          >
            {item.note.text}
          </Text>
        ) : null}
      </Pressable>
    ),
    [copyBlock, fontSize, lineHeight, theme],
  );

  const header = useMemo(
    () =>
      welcome ? (
        <Text style={{ fontFamily: MONO, fontSize: fontSize - 1, color: theme.textDim, marginBottom: 8 }}>{welcome}</Text>
      ) : null,
    [welcome, fontSize, theme.textDim],
  );

  return (
    <View style={[styles.wrap, { backgroundColor: theme.term.bg, borderColor: theme.border }, style]}>
      <Pressable
        style={styles.flex}
        onPress={() => {
          inputRef.current?.focus();
          if (custom) setKbVisible(true);
        }}
        accessible={false}
      >
        <FlatList
          ref={listRef}
          data={shell.blocks}
          keyExtractor={(b) => String(b.id)}
          renderItem={renderItem}
          ListHeaderComponent={header ?? undefined}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={30}
          windowSize={9}
          removeClippedSubviews={Platform.OS === 'android'}
          ListFooterComponent={
            <View style={styles.inputRow}>
              <PromptText prompt={shell.prompt} fontSize={fontSize} />
              <TextInput
                ref={inputRef}
                value={input}
                onChangeText={onChangeText}
                {...(forcedSel ? { selection: forcedSel } : {})}
                onSelectionChange={(e) => {
                  const next = e.nativeEvent.selection;
                  // ignore late echoes of an older cursor position right after our own edit
                  if (Date.now() < ownSelUntil.current && (next.start !== sel.current.start || next.end !== sel.current.end)) return;
                  sel.current = next;
                }}
                onSubmitEditing={submit}
                onKeyPress={onKeyPress}
                autoFocus={autoFocus}
                showSoftInputOnFocus={!custom}
                onFocus={() => {
                  if (custom && !kbVisible) setKbVisible(true);
                }}
                autoCorrect={false}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                importantForAutofill="no"
                keyboardType={Platform.OS === 'android' ? 'visible-password' : 'ascii-capable'}
                textContentType="none"
                returnKeyType="go"
                submitBehavior="submit"
                blurOnSubmit={false}
                underlineColorAndroid="transparent"
                placeholder={shell.blocks.length === 0 ? t('terminal.placeholder') : undefined}
                placeholderTextColor={theme.textDim}
                accessibilityLabel={t('terminal.placeholder')}
                cursorColor={theme.term.cursor}
                selectionColor={theme.term.selection}
                style={[styles.input, { color: theme.term.fg, fontSize, lineHeight, fontFamily: MONO }]}
              />
            </View>
          }
        />
      </Pressable>
      {toast ? (
        <View style={[styles.toast, { backgroundColor: theme.surface2 }]}>
          <Text style={{ color: theme.text, fontSize: 13 }}>{toast}</Text>
        </View>
      ) : null}
      {banner ? (
        <Pressable onPress={submit} accessibilityRole="button" style={[styles.banner, { backgroundColor: theme.accent }]}>
          <Text style={{ color: theme.onAccent, fontWeight: '800', fontSize: 15 }}>{banner}</Text>
          <View style={[styles.kbd, { borderColor: theme.onAccent }]}>
            <Text style={{ color: theme.onAccent, fontFamily: MONO, fontSize: 12 }}>Enter ⏎</Text>
          </View>
        </Pressable>
      ) : null}
      {custom ? (
        kbVisible ? (
          <TermKeyboard actions={kbActions} />
        ) : (
          <Pressable
            onPress={() => {
              inputRef.current?.focus();
              setKbVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('keyboard.show')}
            style={({ pressed }) => [styles.showKb, { backgroundColor: pressed ? theme.border : theme.surface, borderTopColor: theme.border }]}
          >
            <Icon name="keyboard-outline" size={20} color={theme.accent} />
            <Text style={{ color: theme.text, fontWeight: '700' }}>{t('keyboard.show')}</Text>
          </Pressable>
        )
      ) : (
        <KeyBar onKey={onSpecial} ctrl={ctrl} onRun={submit} />
      )}
      {shell.editor ? <Editor state={shell.editor} onSave={shell.saveEditor} onClose={shell.closeEditor} /> : null}
    </View>
  );
}

export function useColumns() {
  const { width } = useWindowDimensions();
  const fontSize = useStore((s) => s.settings.fontSize);
  return columnsFor(width > 900 ? width * 0.55 : width, fontSize);
}

const styles = StyleSheet.create({
  wrap: { flex: 1, borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
  content: { padding: 12, paddingBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', overflow: 'hidden' },
  input: { flex: 1, minWidth: 80, padding: 0, margin: 0, minHeight: 24, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}) },
  note: { marginVertical: 4, paddingLeft: 8, borderLeftWidth: 2 },
  showKb: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 10 },
  kbd: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  toast: { position: 'absolute', alignSelf: 'center', bottom: 56, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
});
