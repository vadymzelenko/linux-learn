import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme, MONO, MONO_BOLD } from '../../theme';
import { useStore } from '../../state/store';
import { useLayout } from '../../lib/layout';
import { haptic } from '../../lib/haptics';
import { sound } from '../../lib/sound';
import { Icon } from '../ui/Icon';
import { Text } from '../../theme/Text';

/** What the keyboard asks the terminal to do. */
export interface KeyboardActions {
  insert(text: string): void;
  backspace(): void;
  enter(): void;
  /** Tab, arrows, Home/End, Esc. */
  special(k: 'tab' | 'up' | 'down' | 'left' | 'right' | 'home' | 'end' | 'esc'): void;
  /** Ctrl+letter. */
  control(ch: string): void;
  /** Alt+letter (word moves, last argument). */
  alt(ch: string): void;
  hide(): void;
}

type Layer = 'abc' | 'sym' | 'sym2';

const LETTERS = [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], ['z', 'x', 'c', 'v', 'b', 'n', 'm']];
const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const SYM = [
  ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
  ['.', ',', '?', '!', "'", '*', '=', '+', '#'],
  ['|', '~', '<', '>', '_', '\\', '%'],
];
const SYM2 = [
  ['[', ']', '{', '}', '^', '`', '€', '£', '¥', '•'],
  ['<', '>', '«', '»', '…', '§', '°', '±', '¶'],
  ['&&', '||', '2>', '>>', '$(', '${', '!!'],
];
/** Long-press alternatives (number row on letters, like phone keyboards). */
const ALT: Record<string, string> = { q: '1', w: '2', e: '3', r: '4', t: '5', y: '6', u: '7', i: '8', o: '9', p: '0', a: '@', s: '#', d: '$', f: '_', g: '&', h: '-', j: '+', k: '(', l: ')', z: '*', x: '"', c: "'", v: ':', b: ';', n: '!', m: '?' };

const HEIGHT = { S: 38, M: 44, L: 52 } as const;

/**
 * A keyboard made for the terminal: every symbol a shell needs one tap away,
 * sticky Shift / Ctrl / Alt, Tab and arrows, quick commands, configurable size
 * and transparency. Replaces the phone keyboard, so it never covers half the
 * screen with autocorrect suggestions.
 */
export function TermKeyboard({ actions }: { actions: KeyboardActions }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const kb = useStore((s) => s.settings.keyboard);
  const layout = useLayout();
  const [layer, setLayer] = useState<Layer>('abc');
  const [shift, setShift] = useState<0 | 1 | 2>(0); // 0 off, 1 once, 2 caps lock
  const [ctrl, setCtrl] = useState(false);
  const [alt, setAlt] = useState(false);
  const lastShift = useRef(0);
  const repeat = useRef<ReturnType<typeof setInterval> | null>(null);
  const keyH = Math.round(HEIGHT[kb.size] * (layout.compact ? 0.88 : 1) * (layout.tablet ? 1.1 : 1));

  useEffect(() => () => {
    if (repeat.current) clearInterval(repeat.current);
  }, []);

  const feedback = () => {
    haptic.key();
    if (kb.keySound) sound.play('tap');
  };

  const type = (ch: string) => {
    feedback();
    if (ctrl && ch.length === 1) {
      setCtrl(false);
      return actions.control(ch.toLowerCase());
    }
    if (alt && ch.length === 1) {
      setAlt(false);
      return actions.alt(ch.toLowerCase());
    }
    const out = shift && ch.length === 1 ? ch.toUpperCase() : ch;
    actions.insert(out);
    if (shift === 1) setShift(0);
  };

  const pressShift = () => {
    feedback();
    const now = Date.now();
    if (now - lastShift.current < 320) setShift(2);
    else setShift(shift ? 0 : 1);
    lastShift.current = now;
  };

  const startRepeat = () => {
    actions.backspace();
    repeat.current = setInterval(() => actions.backspace(), 70);
  };
  const stopRepeat = () => {
    if (repeat.current) clearInterval(repeat.current);
    repeat.current = null;
  };

  const bg = theme.dark ? '#0E141B' : '#D9DEE5';
  const keyBg = theme.dark ? '#222C38' : '#FFFFFF';
  const modBg = theme.dark ? '#16202B' : '#BCC4CF';

  const Key = ({ label, onPress, flex = 1, mod, active, long, mono = true, a11y, children, onPressIn, onPressOut }: { label?: string; onPress?: () => void; flex?: number; mod?: boolean; active?: boolean; long?: string; mono?: boolean; a11y?: string; children?: React.ReactNode; onPressIn?: () => void; onPressOut?: () => void }) => (
    <Pressable
      onPress={onPress}
      onLongPress={long ? () => type(long) : undefined}
      delayLongPress={300}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="keyboardkey"
      accessibilityLabel={a11y ?? label}
      accessibilityState={active !== undefined ? { selected: active } : undefined}
      style={({ pressed }) => [
        styles.key,
        { flex, height: keyH, backgroundColor: active ? theme.accent : pressed ? theme.border : mod ? modBg : keyBg },
      ]}
    >
      {children ?? (
        <Text style={{ fontFamily: mono ? MONO : undefined, fontSize: label && label.length > 2 ? 13 : keyH > 46 ? 21 : 18, color: active ? theme.onAccent : theme.text }}>{label}</Text>
      )}
      {long && kb.size !== 'S' ? <Text style={[styles.hint, { color: theme.textDim }]}>{long}</Text> : null}
    </Pressable>
  );

  const rows = layer === 'abc' ? LETTERS : layer === 'sym' ? SYM : SYM2;
  const show = (c: string) => (layer === 'abc' && shift ? c.toUpperCase() : c);

  return (
    <View style={[styles.wrap, { backgroundColor: bg, opacity: kb.opacity, borderTopColor: theme.border, paddingBottom: Platform.OS === 'ios' ? 6 : 4 }]}>
      <View style={{ width: '100%', maxWidth: layout.tablet ? 820 : undefined, alignSelf: 'center', gap: 5 }}>
      {/* quick commands + navigation */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always" contentContainerStyle={styles.quick}>
        {(['tab', 'up', 'down', 'left', 'right'] as const).map((k) => (
          <Pressable
            key={k}
            onPress={() => {
              feedback();
              actions.special(k);
            }}
            accessibilityRole="keyboardkey"
            accessibilityLabel={k}
            style={({ pressed }) => [styles.chip, { backgroundColor: pressed ? theme.border : modBg }]}
          >
            <Text style={{ fontFamily: MONO_BOLD, color: theme.text, fontSize: 14 }}>{{ tab: 'Tab', up: '↑', down: '↓', left: '←', right: '→' }[k]}</Text>
          </Pressable>
        ))}
        {kb.quick.map((q) => (
          <Pressable
            key={q}
            onPress={() => {
              feedback();
              if (q === 'clear') actions.control('l');
              else actions.insert(q);
            }}
            accessibilityRole="keyboardkey"
            style={({ pressed }) => [styles.chip, { backgroundColor: pressed ? theme.border : keyBg, borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth }]}
          >
            <Text style={{ fontFamily: MONO, color: theme.accent, fontSize: 14 }}>{q.trimEnd() || '␣'}</Text>
          </Pressable>
        ))}
        <Pressable onPress={actions.hide} accessibilityRole="button" accessibilityLabel={t('keyboard.hide')} style={({ pressed }) => [styles.chip, { backgroundColor: pressed ? theme.border : modBg }]}>
          <Icon name="keyboard-close" size={18} color={theme.text} />
        </Pressable>
      </ScrollView>

      {kb.numberRow && layer === 'abc' ? (
        <View style={styles.row}>
          {NUMBERS.map((n) => (
            <Key key={n} label={n} onPress={() => type(n)} />
          ))}
        </View>
      ) : null}
      {layer !== 'abc' ? (
        <View style={styles.row}>
          {NUMBERS.map((n) => (
            <Key key={n} label={n} onPress={() => type(n)} />
          ))}
        </View>
      ) : null}

      {rows.map((row, ri) => (
        <View key={ri} style={[styles.row, ri === 1 && layer === 'abc' && { paddingHorizontal: '4.5%' }]}>
          {ri === 2 ? (
            layer === 'abc' ? (
              <Key mod flex={1.5} active={shift > 0} onPress={pressShift} a11y="shift">
                <Icon name={shift === 2 ? 'apple-keyboard-caps' : 'apple-keyboard-shift'} size={20} color={shift ? theme.onAccent : theme.text} />
              </Key>
            ) : (
              <Key mod flex={1.5} label={layer === 'sym' ? '#+=' : '?123'} onPress={() => setLayer(layer === 'sym' ? 'sym2' : 'sym')} mono={false} />
            )
          ) : null}
          {row.map((c) => (
            <Key key={c} label={show(c)} long={layer === 'abc' ? ALT[c] : undefined} onPress={() => type(c)} />
          ))}
          {ri === 2 ? (
            <Key mod flex={1.5} a11y="backspace" onPressIn={startRepeat} onPressOut={stopRepeat}>
              <Icon name="backspace-outline" size={20} color={theme.text} />
            </Key>
          ) : null}
        </View>
      ))}

      <View style={styles.row}>
        <Key mod flex={1.3} label="Ctrl" active={ctrl} mono={false} onPress={() => { feedback(); setCtrl(!ctrl); setAlt(false); }} />
        <Key mod flex={1.1} label="Alt" active={alt} mono={false} onPress={() => { feedback(); setAlt(!alt); setCtrl(false); }} />
        <Key mod flex={1.3} label={layer === 'abc' ? '?123' : 'ABC'} mono={false} onPress={() => { feedback(); setLayer(layer === 'abc' ? 'sym' : 'abc'); }} />
        <Key flex={3.6} label="space" mono={false} a11y="space" onPress={() => type(' ')} />
        <Key mod flex={1} label="/" onPress={() => type('/')} />
        <Key mod flex={1} label="Esc" mono={false} onPress={() => { feedback(); setCtrl(false); setAlt(false); actions.special('esc'); }} />
        <Pressable
          onPress={() => {
            feedback();
            actions.enter();
          }}
          accessibilityRole="keyboardkey"
          accessibilityLabel="Enter"
          style={({ pressed }) => [styles.key, { flex: 1.6, height: keyH, backgroundColor: pressed ? theme.border : theme.accent }]}
        >
          <Icon name="keyboard-return" size={22} color={theme.onAccent} />
        </Pressable>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 3, paddingTop: 4, gap: 5 },
  quick: { gap: 6, paddingHorizontal: 3, paddingBottom: 2 },
  chip: { height: 34, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 4 },
  key: { borderRadius: 7, alignItems: 'center', justifyContent: 'center', minWidth: 0, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 0, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  hint: { position: 'absolute', top: 2, right: 4, fontSize: 9, fontFamily: MONO },
});
