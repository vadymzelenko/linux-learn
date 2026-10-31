import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type TextStyle } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { glossary, tr, type GlossaryTerm } from '@linux-learn/content';
import { Text } from '../../theme/Text';
import { useTheme, MONO, MONO_BOLD, space } from '../../theme';
import { Icon } from './Icon';

/*
 * Lesson text format (a small markdown subset):
 *   ## Heading          starts a new card
 *   - item / 1. item    lists
 *   > tip               tip box        !> warning   warning box
 *   ```                 command block (each line tappable)
 *   | a | b |           table
 *   **bold**  ==mark==  *italic*  `code`
 * Glossary terms are underlined automatically; tapping shows the definition.
 */

type Block =
  | { kind: 'h'; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'tip' | 'warn'; text: string }
  | { kind: 'code'; lines: string[] }
  | { kind: 'table'; rows: string[][] };

export function parseBlocks(src: string): Block[] {
  const out: Block[] = [];
  const lines = src.replace(/\r/g, '').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const t = line.trim();
    if (!t) {
      i++;
      continue;
    }
    if (t.startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith('```')) code.push(lines[i++]!);
      i++;
      out.push({ kind: 'code', lines: code });
      continue;
    }
    if (t.startsWith('## ') || t.startsWith('# ')) {
      out.push({ kind: 'h', text: t.replace(/^#+\s*/, '') });
      i++;
      continue;
    }
    if (t.startsWith('!>') || t.startsWith('>')) {
      const warn = t.startsWith('!>');
      const buf: string[] = [];
      while (i < lines.length && /^\s*!?>/.test(lines[i]!)) buf.push(lines[i++]!.trim().replace(/^!?>\s?/, ''));
      out.push({ kind: warn ? 'warn' : 'tip', text: buf.join(' ') });
      continue;
    }
    if (/^[-•]\s/.test(t) || /^\d+[.)]\s/.test(t)) {
      const ordered = /^\d/.test(t);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s/ : /^\s*[-•]\s/).test(lines[i]!)) items.push(lines[i++]!.trim().replace(/^([-•]|\d+[.)])\s+/, ''));
      out.push({ kind: ordered ? 'ol' : 'ul', items });
      continue;
    }
    if (t.startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.trim().startsWith('|')) {
        const r = lines[i++]!.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        if (!r.every((c) => /^:?-+:?$/.test(c))) rows.push(r);
      }
      out.push({ kind: 'table', rows });
      continue;
    }
    const buf: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#|>|!>|```|[-•]\s|\d+[.)]\s|\|)/.test(lines[i]!.trim())) buf.push(lines[i++]!.trim());
    out.push({ kind: 'p', text: buf.join(' ') });
  }
  return out;
}

// ---------------------------------------------------------------- glossary popup

const GlossaryCtx = createContext<(t: GlossaryTerm) => void>(() => undefined);

export function GlossaryProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [term, setTerm] = useState<GlossaryTerm | null>(null);
  return (
    <GlossaryCtx.Provider value={setTerm}>
      {children}
      <Modal visible={!!term} transparent animationType="fade" onRequestClose={() => setTerm(null)}>
        <Pressable style={styles.backdrop} onPress={() => setTerm(null)}>
          {term ? (
            <Pressable style={[styles.popup, { backgroundColor: theme.surface, borderColor: theme.accent }]} onPress={() => undefined}>
              <View style={[styles.popupTag, { backgroundColor: theme.surface2 }]}>
                <Icon name="book-open" size={14} color={theme.accent} />
                <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>{t('glossary.title')}</Text>
              </View>
              <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>{tr(term.term, i18n.language)}</Text>
              <Text style={{ color: theme.text, fontSize: 16, lineHeight: 24 }}>{tr(term.definition, i18n.language)}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                {term.command ? (
                  <Pressable
                    onPress={() => {
                      setTerm(null);
                      router.push({ pathname: '/reference', params: { cmd: term.command } });
                    }}
                    style={[styles.popupBtn, { backgroundColor: theme.surface2 }]}
                  >
                    <Text style={{ color: theme.text, fontFamily: MONO }}>man {term.command}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => {
                    setTerm(null);
                    router.push({ pathname: '/glossary', params: { q: tr(term.term, i18n.language) } });
                  }}
                  style={[styles.popupBtn, { backgroundColor: theme.surface2 }]}
                >
                  <Text style={{ color: theme.text, fontWeight: '600' }}>{t('glossary.open')}</Text>
                </Pressable>
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </GlossaryCtx.Provider>
  );
}

const WORD = /[A-Za-zА-Яа-яЁёІіЇїЄєҐґ0-9_]/;

function matcherFor(lang: string) {
  const forms: { form: string; term: GlossaryTerm }[] = [];
  for (const g of glossary) {
    const list = new Set<string>([...(g.match?.[lang] ?? []), ...(g.match?.['en'] ?? []), tr(g.term, lang).toLowerCase()]);
    for (const f of list) if (f.length >= 3) forms.push({ form: f.toLowerCase(), term: g });
  }
  return forms.sort((a, b) => b.form.length - a.form.length);
}

// ---------------------------------------------------------------- inline

interface InlineOpts {
  onCode?: ((code: string) => void) | undefined;
  terms?: { forms: { form: string; term: GlossaryTerm }[]; used: Set<string>; show: (t: GlossaryTerm) => void };
}

function Inline({ text, opts }: { text: string; opts: InlineOpts }) {
  const t = useTheme();
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|==[^=]+==|\*[^*\s][^*]*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('`') && part.endsWith('`') && part.length > 1) {
          const code = part.slice(1, -1);
          return (
            <Text
              key={i}
              onPress={opts.onCode ? () => opts.onCode!(code) : undefined}
              accessibilityRole={opts.onCode ? 'button' : undefined}
              style={{ fontFamily: MONO, color: t.accent, backgroundColor: t.surface2, fontSize: 15 }}
            >
              {` ${code} `}
            </Text>
          );
        }
        if (part.startsWith('**') && part.endsWith('**'))
          return (
            <Text key={i} style={{ fontWeight: '700', textDecorationLine: 'underline', textDecorationColor: t.accent }}>
              {part.slice(2, -2)}
            </Text>
          );
        if (part.startsWith('==') && part.endsWith('=='))
          return (
            <Text key={i} style={{ backgroundColor: t.dark ? '#3A3520' : '#FFF2B3', fontWeight: '600' }}>
              {part.slice(2, -2)}
            </Text>
          );
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <Text key={i} style={{ fontStyle: 'italic' }}>{part.slice(1, -1)}</Text>;
        return <Terms key={i} text={part} opts={opts} />;
      })}
    </>
  );
}

/** Plain text with glossary terms underlined (first occurrence of each term). */
function Terms({ text, opts }: { text: string; opts: InlineOpts }) {
  const theme = useTheme();
  if (!opts.terms || !text) return <>{text}</>;
  const lower = text.toLowerCase();
  const hits: { start: number; end: number; term: GlossaryTerm }[] = [];
  for (const { form, term } of opts.terms.forms) {
    if (opts.terms.used.has(term.id)) continue;
    let from = 0;
    while (from <= lower.length) {
      const idx = lower.indexOf(form, from);
      if (idx === -1) break;
      const before = lower[idx - 1];
      const after = lower[idx + form.length];
      const free = !hits.some((h) => idx < h.end && idx + form.length > h.start);
      // allow word endings (Russian/Ukrainian inflections): only the start must be a boundary
      if ((!before || !WORD.test(before)) && free && (!after || !WORD.test(after) || form.length >= 5)) {
        let end = idx + form.length;
        while (end < lower.length && WORD.test(lower[end]!) && end - idx - form.length < 3) end++;
        hits.push({ start: idx, end, term });
        opts.terms.used.add(term.id);
        break;
      }
      from = idx + 1;
    }
  }
  if (!hits.length) return <>{text}</>;
  hits.sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let pos = 0;
  hits.forEach((h, k) => {
    out.push(text.slice(pos, h.start));
    out.push(
      <Text
        key={k}
        onPress={() => opts.terms!.show(h.term)}
        accessibilityRole="button"
        accessibilityHint="glossary"
        style={{ textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: theme.accent, color: theme.text }}
      >
        {text.slice(h.start, h.end)}
      </Text>,
    );
    pos = h.end;
  });
  out.push(text.slice(pos));
  return <>{out}</>;
}

// ---------------------------------------------------------------- simple rich text (goals, quiz questions)

export function RichText({ text, onCode, style }: { text: string; onCode?: (code: string) => void; style?: TextStyle }) {
  const t = useTheme();
  return (
    <>
      {text.split(/\n\n+/).map((p, pi) => (
        <Text key={pi} style={[{ color: t.text, fontSize: 16, lineHeight: 24, marginBottom: 8 }, style]}>
          <Inline text={p} opts={{ onCode }} />
        </Text>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- theory cards

export function TheoryCards({ text, title, onCode, compact }: { text: string; title?: string; onCode?: (code: string) => void; compact?: boolean }) {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const show = useContext(GlossaryCtx);
  const forms = useMemo(() => matcherFor(i18n.language), [i18n.language]);
  const used = useMemo(() => new Set<string>(), [text]); // eslint-disable-line react-hooks/exhaustive-deps
  const opts: InlineOpts = { onCode, terms: { forms, used, show } };
  const blocks = parseBlocks(text);

  // group blocks into cards: a heading starts a new card
  const cards: { title?: string; blocks: Block[] }[] = [];
  for (const b of blocks) {
    if (b.kind === 'h') cards.push({ title: b.text, blocks: [] });
    else {
      if (!cards.length) cards.push({ ...(title ? { title } : {}), blocks: [] });
      cards[cards.length - 1]!.blocks.push(b);
    }
  }
  const body: TextStyle = { color: theme.text, fontSize: compact ? 15 : 16.5, lineHeight: compact ? 23 : 26 };

  return (
    <View style={{ gap: space.md }}>
      {cards.map((c, ci) => (
        <View key={ci} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {c.title ? (
            <View style={styles.cardHead}>
              <View style={[styles.bar, { backgroundColor: theme.accent }]} />
              <Text style={{ color: theme.text, fontSize: compact ? 17 : 19, fontWeight: '800', flex: 1 }}>{c.title}</Text>
            </View>
          ) : null}
          {c.blocks.map((b, bi) => {
            switch (b.kind) {
              case 'p':
                return (
                  <Text key={bi} style={body}>
                    <Inline text={b.text} opts={opts} />
                  </Text>
                );
              case 'ul':
              case 'ol':
                return (
                  <View key={bi} style={{ gap: 8 }}>
                    {b.items.map((it, k) => (
                      <View key={k} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                        {b.kind === 'ul' ? (
                          <View style={[styles.dot, { backgroundColor: theme.accent, marginTop: (body.lineHeight as number) / 2 - 3 }]} />
                        ) : (
                          <View style={[styles.num, { backgroundColor: theme.surface2, borderColor: theme.accent }]}>
                            <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '800' }}>{k + 1}</Text>
                          </View>
                        )}
                        <Text style={[body, { flex: 1 }]}>
                          <Inline text={it} opts={opts} />
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              case 'tip':
              case 'warn': {
                const color = b.kind === 'tip' ? theme.accent : theme.warning;
                return (
                  <View key={bi} style={[styles.callout, { backgroundColor: theme.surface2, borderLeftColor: color }]}>
                    <Icon name={b.kind === 'tip' ? 'bulb' : 'alert-triangle'} size={20} color={color} />
                    <Text style={[body, { flex: 1, fontSize: (body.fontSize as number) - 0.5 }]}>
                      <Inline text={b.text} opts={opts} />
                    </Text>
                  </View>
                );
              }
              case 'code':
                return (
                  <View key={bi} style={[styles.code, { backgroundColor: theme.term.bg, borderColor: theme.border }]}>
                    {b.lines.map((l, k) => {
                      const isCmd = l.startsWith('$ ');
                      const cmd = l.slice(2);
                      return (
                        <Pressable key={k} disabled={!isCmd || !onCode} onPress={() => onCode?.(cmd)} accessibilityRole={isCmd ? 'button' : 'text'}>
                          <Text style={{ fontFamily: isCmd ? MONO_BOLD : MONO, fontSize: 14, lineHeight: 21, color: isCmd ? theme.term.fg : theme.textDim }}>
                            {isCmd ? <Text style={{ color: theme.term.user, fontFamily: MONO_BOLD }}>$ </Text> : null}
                            {isCmd ? cmd : l}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                );
              case 'table':
                return (
                  <View key={bi} style={[styles.table, { borderColor: theme.border }]}>
                    {b.rows.map((r, k) => (
                      <View key={k} style={[styles.tr, { backgroundColor: k === 0 ? theme.surface2 : 'transparent', borderColor: theme.border }]}>
                        {r.map((cell, ci2) => (
                          <Text key={ci2} style={[{ flex: ci2 === 0 ? 0.8 : 1.2, color: theme.text, fontSize: 14, lineHeight: 20, padding: 8 }, k === 0 && { fontWeight: '700' }]}>
                            <Inline text={cell} opts={{ onCode }} />
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                );
              default:
                return null;
            }
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 2, minHeight: 22 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  num: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  callout: { flexDirection: 'row', gap: 10, padding: space.md, borderRadius: 12, borderLeftWidth: 4, alignItems: 'flex-start' },
  code: { borderRadius: 12, borderWidth: 1, padding: space.md, gap: 4 },
  table: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  tr: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: space.lg },
  popup: { borderRadius: 20, borderWidth: 1, padding: space.lg, gap: 10, maxWidth: 520, width: '100%', alignSelf: 'center' },
  popupTag: { flexDirection: 'row', gap: 6, alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  popupBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
});
