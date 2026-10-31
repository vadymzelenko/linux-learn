import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type TextInputInstance,
  type TextInputKeyPressEvent,
  type ViewStyle,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { stripAnsi } from '@linux-learn/engine';
import { useTranslation } from 'react-i18next';
import { useTheme, MONO } from '../../theme';
import { useStore } from '../../state/store';
import { haptic } from '../../lib/haptics';
import { AnsiText } from './AnsiText';
import { PromptText } from './Prompt';
import { KeyBar, type SpecialKey } from './KeyBar';
import { Editor } from './Editor';
import type { Block, ShellController } from './useShell';

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
}

/** Approximate number of monospace columns for a given width. */
export function columnsFor(width: number, fontSize: number) {
  return Math.max(20, Math.floor((width - 24) / (fontSize * 0.6)));
}

export function Terminal({ shell, style, autoFocus, prefill, ref, welcome }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const fontSize = useStore((s) => s.settings.fontSize);
  const [input, setInput] = useState(prefill ?? '');
  const [selection, setSelection] = useState({ start: (prefill ?? '').length, end: (prefill ?? '').length });
  const [ctrl, setCtrl] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const inputRef = useRef<TextInputInstance>(null);
  const listRef = useRef<FlatList<Block>>(null);
  const lineHeight = Math.round(fontSize * 1.45);

  useEffect(() => {
    if (prefill !== undefined) {
      setInput(prefill);
      setSelection({ start: prefill.length, end: prefill.length });
    }
  }, [prefill]);

  const setText = useCallback((text: string, cursor = text.length) => {
    setInput(text);
    setSelection({ start: cursor, end: cursor });
  }, []);

  const insertAtCursor = useCallback(
    (text: string) => {
      setInput((cur) => {
        const s = Math.min(selection.start, cur.length);
        const e = Math.min(selection.end, cur.length);
        const next = cur.slice(0, s) + text + cur.slice(e);
        setSelection({ start: s + text.length, end: s + text.length });
        return next;
      });
    },
    [selection],
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
    const line = input;
    setText('');
    shell.execute(line);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [input, setText, shell]);

  const doTab = useCallback(() => {
    const r = shell.tab(input, selection.start);
    setText(r.line, r.cursor);
  }, [input, selection.start, setText, shell]);

  const history = useCallback(
    (dir: -1 | 1) => {
      const v = shell.historyStep(dir, input);
      if (v !== null) setText(v);
    },
    [input, setText, shell],
  );

  const onSpecial = useCallback(
    (k: SpecialKey) => {
      haptic.tap();
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
        default:
          return insertAtCursor(k);
      }
    },
    [doTab, history, insertAtCursor],
  );

  /** With Ctrl armed, the next typed letter becomes a control key. */
  const onChangeText = useCallback(
    (text: string) => {
      if (ctrl && text.length === input.length + 1) {
        const ch = text[selection.start]?.toLowerCase();
        setCtrl(false);
        if (ch === 'c') {
          shell.interrupt(input);
          setText('');
          return;
        }
        if (ch === 'l') {
          shell.clearScreen();
          return;
        }
        if (ch === 'u') {
          setText(input.slice(selection.start), 0);
          return;
        }
        if (ch === 'a') {
          setSelection({ start: 0, end: 0 });
          return;
        }
        if (ch === 'e') {
          setSelection({ start: input.length, end: input.length });
          return;
        }
        if (ch === 'd' && input === '') {
          shell.execute('exit');
          return;
        }
      }
      setInput(text.replace(/\n/g, ''));
    },
    [ctrl, input, selection.start, setText, shell],
  );

  const onKeyPress = useCallback(
    (e: TextInputKeyPressEvent) => {
      const key = e.nativeEvent.key;
      if (key === 'Tab') {
        (e as unknown as { preventDefault?: () => void }).preventDefault?.();
        doTab();
      } else if (key === 'ArrowUp') history(-1);
      else if (key === 'ArrowDown') history(1);
    },
    [doTab, history],
  );

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
            {item.command}
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
      <Pressable style={styles.flex} onPress={() => inputRef.current?.focus()} accessible={false}>
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
                selection={selection}
                onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
                onSubmitEditing={submit}
                onKeyPress={onKeyPress}
                autoFocus={autoFocus}
                autoCorrect={false}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                importantForAutofill="no"
                keyboardType={Platform.OS === 'android' ? 'visible-password' : 'ascii-capable'}
                textContentType="none"
                returnKeyType="go"
                submitBehavior="submit"
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
      <KeyBar onKey={onSpecial} ctrl={ctrl} onRun={submit} />
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
  inputRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' },
  input: { flex: 1, padding: 0, margin: 0, minHeight: 24, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}) },
  note: { marginVertical: 4, paddingLeft: 8, borderLeftWidth: 2 },
  toast: { position: 'absolute', alignSelf: 'center', bottom: 56, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
});
