import { tr, type Course } from '@linux-learn/content';
import { infoDialog } from '../components/Dialog';
import { haptic } from './haptics';

/** A course announced for later: explain instead of opening it. */
export function showSoon(c: Course, lang: string, t: (k: string) => string) {
  haptic.light();
  infoDialog({ title: `${tr(c.title, lang)} · ${t('courses.soon')}`, message: `${tr(c.description, lang)}\n\n${t('courses.soonText')}`, ok: t('common.ok'), icon: 'clock-outline' });
}
