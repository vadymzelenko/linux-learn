import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { ND } from '../ui/Motion';
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

/** Web: keys are buttons, not text — no selection, no copy callout, no double-tap zoom delay. */
const NO_SELECT = (Platform.OS === 'web' ? { userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'manipulation', cursor: 'default' } : {}) as unknown as ViewStyle;

interface KeyColors {
  key: string;
  mod: string;
  pressed: string;
  active: string;
  text: string;
  onActive: string;
  dim: string;
  border: string;
}

interface KeyProps {
  /** What the key sends to `onKey` (a character or a command id). */
  id: string;
  label?: string;
  flex?: number;
  mod?: boolean;
  active?: boolean;
  /** Long-press alternative character. */
  long?: string | undefined;
  mono?: boolean;
  a11y?: string;
  height: number;
  colors: KeyColors;
  showHint: boolean;
  children?: ReactNode;
  /** Stable dispatcher: (id, long press?) */
  onKey: (id: string, long?: boolean) => void;
  /** Hold-to-repeat keys (backspace) start on press-in. */
  repeat?: boolean;
  onRepeatStart?: () => void;
  onRepeatStop?: () => void;
}

/**
 * One key. Memoized with stable callbacks: pressing a key re-renders only that
 * key (its own pressed state and preview bubble), not the whole keyboard.
 */
const Key = memo(function Key({ id, label, flex = 1, mod, active, long, mono = true, a11y, height, colors, showHint, children, onKey, repeat, onRepeatStart, onRepeatStop }: KeyProps) {
  const [down, setDown] = useState(false);
  const preview = down && !mod && !!label && label.length <= 2;
  return (
    <Pressable
      onPress={repeat ? undefined : () => onKey(id)}
      onLongPress={long ? () => onKey(long, true) : undefined}
      delayLongPress={320}
      onPressIn={() => {
        setDown(true);
        if (repeat) onRepeatStart?.();
      }}
      onPressOut={() => {
        setDown(false);
        if (repeat) onRepeatStop?.();
      }}
      accessibilityRole="keyboardkey"
      accessibilityLabel={a11y ?? label}
      accessibilityState={active !== undefined ? { selected: active } : undefined}
      style={[styles.key, NO_SELECT, { flex, height, backgroundColor: active ? colors.active : down ? colors.pressed : mod ? colors.mod : colors.key }]}
    >
      {children ?? (
        <Text selectable={false} style={{ fontFamily: mono ? MONO : undefined, fontSize: label && label.length > 2 ? 13 : height > 46 ? 21 : height < 36 ? 16 : 18, color: active ? colors.onActive : colors.text }}>
          {label}
        </Text>
      )}
      {long && showHint ? (
        <Text selectable={false} style={[styles.hint, { color: colors.dim }]}>
          {long}
        </Text>
      ) : null}
      {preview ? (
        <View pointerEvents="none" style={[styles.bubble, { backgroundColor: colors.key, borderColor: colors.border, bottom: height + 4 }]}>
          <Text selectable={false} style={{ fontFamily: MONO, fontSize: 24, color: colors.text }}>
            {label}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
});

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
  const repeatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The keyboard takes at most a share of the window: on small phones and in
  // landscape the keys get lower and the number row folds into long presses,
  // so the terminal output stays visible.
  const budget = layout.height * (layout.landscape ? 0.5 : layout.height < 700 ? 0.47 : 0.42);
  const rowsWith = (numbers: boolean) => 4 + (numbers ? 1 : 0);
  const chipH = layout.landscape && !layout.tablet ? 30 : 34;
  const maxKey = (numbers: boolean) => (budget - chipH - 10 - rowsWith(numbers) * 5) / rowsWith(numbers);
  const showNumbers = kb.numberRow && layer === 'abc' && maxKey(true) >= 34;
  const base = HEIGHT[kb.size] * (layout.tablet ? 1.1 : 1);
  const keyH = Math.round(Math.max(30, Math.min(base, maxKey(showNumbers || layer !== 'abc'))));
  const showHint = kb.size !== 'S' && keyH >= 38;

  // latest values for the stable callbacks below
  const st = useRef({ actions, kb, ctrl, alt, shift, layer });
  st.current = { actions, kb, ctrl, alt, shift, layer };

  useEffect(() => () => {
    if (repeatTimer.current) clearTimeout(repeatTimer.current);
  }, []);

  // slide in when shown
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [enter]);

  const feedback = useCallback(() => {
    haptic.key();
    if (st.current.kb.keySound) sound.play('tap');
  }, []);

  /** Every key goes through here; ids that are not commands are typed. */
  const onKey = useCallback(
    (id: string, long?: boolean) => {
      const s = st.current;
      feedback();
      switch (id) {
        case '⇧': {
          const now = Date.now();
          setShift(now - lastShift.current < 320 ? 2 : s.shift ? 0 : 1);
          lastShift.current = now;
          return;
        }
        case 'Ctrl':
          setCtrl(!s.ctrl);
          setAlt(false);
          return;
        case 'Alt':
          setAlt(!s.alt);
          setCtrl(false);
          return;
        case 'Esc':
          setCtrl(false);
          setAlt(false);
          return s.actions.special('esc');
        case '⏎':
          return s.actions.enter();
        case '?123':
          return setLayer(s.layer === 'abc' ? 'sym' : 'abc');
        case 'ABC':
          return setLayer('abc');
        case '#+=':
          return setLayer(s.layer === 'sym' ? 'sym2' : 'sym');
      }
      if (s.ctrl && id.length === 1) {
        setCtrl(false);
        return s.actions.control(id.toLowerCase());
      }
      if (s.alt && id.length === 1) {
        setAlt(false);
        return s.actions.alt(id.toLowerCase());
      }
      const out = s.shift && id.length === 1 && !long ? id.toUpperCase() : id;
      s.actions.insert(out);
      if (s.shift === 1) setShift(0);
    },
    [feedback],
  );

  /** Hold backspace: one delete, a pause, then repeats that speed up. */
  const repeatStart = useCallback(() => {
    feedback();
    st.current.actions.backspace();
    let n = 0;
    const tick = () => {
      st.current.actions.backspace();
      n++;
      repeatTimer.current = setTimeout(tick, n < 6 ? 90 : n < 20 ? 55 : 30);
    };
    repeatTimer.current = setTimeout(tick, 380);
  }, [feedback]);
  const repeatStop = useCallback(() => {
    if (repeatTimer.current) clearTimeout(repeatTimer.current);
    repeatTimer.current = null;
  }, []);

  // swipe down on the keyboard hides it
  const swipeDown = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dy > 14 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
        onPanResponderRelease: (_, g) => {
          if (g.dy > 50) st.current.actions.hide();
        },
      }),
    [],
  );

  // drag along the space bar to move the cursor (like on phone keyboards)
  const spaceDrag = useRef({ moved: 0, active: false });
  const [spaceDown, setSpaceDown] = useState(false);
  const spacePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          spaceDrag.current = { moved: 0, active: false };
          setSpaceDown(true);
        },
        onPanResponderMove: (_, g) => {
          const steps = Math.trunc(g.dx / 14);
          const d = steps - spaceDrag.current.moved;
          if (Math.abs(g.dx) > 10) spaceDrag.current.active = true;
          for (let i = 0; i < Math.abs(d); i++) st.current.actions.special(d > 0 ? 'right' : 'left');
          if (d) haptic.key();
          spaceDrag.current.moved = steps;
        },
        onPanResponderRelease: () => {
          setSpaceDown(false);
          if (!spaceDrag.current.active) onKey(' ');
        },
        onPanResponderTerminate: () => setSpaceDown(false),
        onPanResponderTerminationRequest: () => false,
      }),
    [onKey],
  );

  const colors: KeyColors = useMemo(
    () => ({
      key: theme.dark ? '#222C38' : '#FFFFFF',
      mod: theme.dark ? '#16202B' : '#BCC4CF',
      pressed: theme.border,
      active: theme.accent,
      text: theme.text,
      onActive: theme.onAccent,
      dim: theme.textDim,
      border: theme.border,
    }),
    [theme],
  );
  const bg = theme.dark ? '#0E141B' : '#D9DEE5';
  const common = { height: keyH, colors, showHint, onKey };

  const rows = layer === 'abc' ? LETTERS : layer === 'sym' ? SYM : SYM2;
  const show = (c: string) => (layer === 'abc' && shift ? c.toUpperCase() : c);

  return (
    <Animated.View
      {...swipeDown.panHandlers}
      style={[
        styles.wrap,
        NO_SELECT,
        { backgroundColor: bg, opacity: Animated.multiply(enter, kb.opacity), borderTopColor: theme.border, paddingBottom: Platform.OS === 'ios' ? 6 : 4, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) }] },
      ]}
    >
      {layout.landscape && !layout.tablet ? null : <View style={[styles.grabber, { backgroundColor: theme.border }]} />}
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
              style={({ pressed }) => [styles.chip, NO_SELECT, { height: chipH, backgroundColor: pressed ? theme.border : colors.mod }]}
            >
              <Text selectable={false} style={{ fontFamily: MONO_BOLD, color: theme.text, fontSize: 14 }}>
                {{ tab: 'Tab', up: '↑', down: '↓', left: '←', right: '→' }[k]}
              </Text>
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
              style={({ pressed }) => [styles.chip, NO_SELECT, { height: chipH, backgroundColor: pressed ? theme.border : colors.key, borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth }]}
            >
              <Text selectable={false} style={{ fontFamily: MONO, color: theme.accent, fontSize: 14 }}>
                {q.trimEnd() || '␣'}
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={actions.hide} accessibilityRole="button" accessibilityLabel={t('keyboard.hide')} style={({ pressed }) => [styles.chip, NO_SELECT, { height: chipH, backgroundColor: pressed ? theme.border : colors.mod }]}>
            <Icon name="keyboard-close" size={18} color={theme.text} />
          </Pressable>
        </ScrollView>

        {showNumbers || layer !== 'abc' ? (
          <View style={styles.row}>
            {NUMBERS.map((n) => (
              <Key key={n} id={n} label={n} {...common} />
            ))}
          </View>
        ) : null}

        {rows.map((row, ri) => (
          <View key={`${layer}${ri}`} style={[styles.row, ri === 1 && layer === 'abc' && { paddingHorizontal: '4.5%' }]}>
            {ri === 2 ? (
              layer === 'abc' ? (
                <Key id="⇧" mod flex={1.5} active={shift > 0} a11y="shift" {...common}>
                  <Icon name={shift === 2 ? 'apple-keyboard-caps' : 'apple-keyboard-shift'} size={20} color={shift ? theme.onAccent : theme.text} />
                </Key>
              ) : (
                <Key id="#+=" mod flex={1.5} label={layer === 'sym' ? '#+=' : '?123'} mono={false} {...common} />
              )
            ) : null}
            {row.map((c) => (
              <Key key={c} id={c} label={show(c)} long={layer === 'abc' ? ALT[c] : undefined} {...common} />
            ))}
            {ri === 2 ? (
              <Key id="⌫" mod flex={1.5} a11y="backspace" repeat onRepeatStart={repeatStart} onRepeatStop={repeatStop} {...common}>
                <Icon name="backspace-outline" size={20} color={theme.text} />
              </Key>
            ) : null}
          </View>
        ))}

        <View style={styles.row}>
          <Key id="Ctrl" mod flex={1.3} label="Ctrl" active={ctrl} mono={false} {...common} />
          <Key id="Alt" mod flex={1.1} label="Alt" active={alt} mono={false} {...common} />
          <Key id={layer === 'abc' ? '?123' : 'ABC'} mod flex={1.3} label={layer === 'abc' ? '?123' : 'ABC'} mono={false} {...common} />
          <View
            {...spacePan.panHandlers}
            accessible
            accessibilityRole="keyboardkey"
            accessibilityLabel="space"
            accessibilityHint={t('keyboard.spaceHint')}
            style={[styles.key, NO_SELECT, { flex: 3.6, height: keyH, backgroundColor: spaceDown ? colors.pressed : colors.key }]}
          >
            <Text selectable={false} style={{ fontSize: 13, color: theme.textDim }}>
              ‹ space ›
            </Text>
          </View>
          <Key id="/" mod flex={1} label="/" {...common} />
          <Key id="Esc" mod flex={1} label="Esc" mono={false} {...common} />
          <Key id="⏎" flex={1.6} a11y="Enter" active {...common}>
            <Icon name="keyboard-return" size={22} color={theme.onAccent} />
          </Key>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 3, paddingTop: 4, gap: 5 },
  quick: { gap: 6, paddingHorizontal: 3, paddingBottom: 2 },
  chip: { height: 34, paddingHorizontal: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 4 },
  key: { borderRadius: 8, alignItems: 'center', justifyContent: 'center', minWidth: 0, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 0, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  hint: { position: 'absolute', top: 2, right: 4, fontSize: 9, fontFamily: MONO },
  bubble: { position: 'absolute', minWidth: 44, height: 52, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, elevation: 6, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, zIndex: 10 },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 2, opacity: 0.8 },
});
