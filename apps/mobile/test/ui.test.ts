import { describe, expect, it } from 'vitest';
import { contrast, themes } from '../src/theme/themes';
import en from '../src/i18n/locales/en';
import uk from '../src/i18n/locales/uk';
import ru from '../src/i18n/locales/ru';
import pl from '../src/i18n/locales/pl';

function entries(o: object, prefix = ''): [string, string][] {
  return Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? entries(v, `${prefix}${k}/`) : [[`${prefix}${k}`, v as string] as [string, string]]));
}
const keys = (o: object) => entries(o).map(([k]) => k);

describe('themes meet WCAG AA', () => {
  for (const th of Object.values(themes)) {
    it(th.id, () => {
      expect(contrast(th.text, th.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(th.text, th.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(th.textDim, th.surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(th.onAccent, th.accent)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(th.term.fg, th.term.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(th.term.user, th.term.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(th.term.path, th.term.bg)).toBeGreaterThanOrEqual(4.5);
      // ls colours: directories (bright blue), executables (bright green)
      expect(contrast(th.term.ansi[12]!, th.term.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(th.term.ansi[10]!, th.term.bg)).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe('translations', () => {
  const base = keys(en).sort();
  for (const [name, dict] of Object.entries({ uk, ru, pl })) {
    it(`${name} has every key and keeps placeholders`, () => {
      expect(keys(dict).sort()).toEqual(base);
      const fe = Object.fromEntries(entries(en));
      const fd = Object.fromEntries(entries(dict));
      for (const k of base) {
        const ph = (s: string) => (s.match(/\{\{\w+\}\}/g) ?? []).sort();
        expect(ph(fd[k]!), k).toEqual(ph(fe[k]!));
      }
    });
  }
});
