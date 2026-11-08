import { courseLocked, isPro, moduleLocked } from '../../lib/edition';
import { ProBadge, showPro } from '../../components/ProGate';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { activeCourses, courseLessons, soonCourses, tr, type Course } from '@linux-learn/content';
import { Text } from '../../theme/Text';
import { useStore } from '../../state/store';
import { useTheme, MONO, space } from '../../theme';
import { FadeIn, H2, Icon, Row, Screen } from '../../components/ui';
import { dayKey, liveStreak } from '../../lib/progress';
import { showSoon } from '../../lib/soon';
import { useLayout } from '../../lib/layout';

const INK = '#06240F';

/** A course as a filled colour tile: icon, name, progress. */
function CourseTile({ c }: { c: Course }) {
  const { t, i18n } = useTranslation();
  const progress = useStore((s) => s.progress);
  const ls = courseLessons(c);
  const done = ls.filter((l) => progress.lessons[l.lesson.id]?.completedAt).length;
  const soon = !!c.soon;
  return (
    <Pressable
      onPress={() => (soon ? showSoon(c, i18n.language, t) : router.push({ pathname: '/courses', params: { course: c.id } }))}
      accessibilityRole="button"
      accessibilityLabel={`${tr(c.title, i18n.language)}${soon ? `, ${t('courses.soon')}` : ''}`}
      style={({ pressed }) => [styles.tile, { backgroundColor: c.color, opacity: soon ? 0.55 : pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={styles.tileIcon}>
          <Icon name={c.icon} size={24} color={INK} />
        </View>
        {!soon && courseLocked(c.id) ? (
          <ProBadge />
        ) : soon ? (
          <View style={styles.soonPill}>
            <Text style={{ color: INK, fontSize: 11, fontWeight: '800' }}>{t('courses.soon')}</Text>
          </View>
        ) : done ? (
          <Text style={{ color: INK, fontFamily: MONO, fontSize: 12, opacity: 0.75 }}>
            {done}/{ls.length}
          </Text>
        ) : null}
      </Row>
      <Text style={{ color: INK, fontWeight: '800', fontSize: 17 }} numberOfLines={2}>
        {tr(c.title, i18n.language)}
      </Text>
      {soon ? null : (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${ls.length ? Math.max(4, (done / ls.length) * 100) : 0}%` }]} />
        </View>
      )}
    </Pressable>
  );
}

/** Small action with a tinted, filled icon. */
function Quick({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.quick, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.quickIcon, { backgroundColor: color }]}>
        <Icon name={icon} size={24} color={INK} />
      </View>
      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 12, textAlign: 'center' }} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const layout = useLayout();
  const { t, i18n } = useTranslation();
  const progress = useStore((s) => s.progress);
  const name = useStore((s) => s.settings.certName) || 'student';
  const streak = liveStreak(progress.streak, dayKey(new Date()));

  // the most recently touched unfinished lesson, else the first unfinished one
  const all = activeCourses.flatMap((c) => courseLessons(c).map((l) => ({ ...l, course: c })));
  const open = all.filter((l) => !moduleLocked(l.module.id));
  const started = open.find((l) => progress.lessons[l.lesson.id] && !progress.lessons[l.lesson.id]!.completedAt);
  const next = started ?? open.find((l) => !progress.lessons[l.lesson.id]?.completedAt);
  const cols = layout.width >= 700 ? 3 : 2;

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.content, { padding: layout.pad }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ color: theme.text, fontSize: 24, fontWeight: '800', flex: 1 }} numberOfLines={1}>
            {t('home.hello', { name })}
          </Text>
          <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel={t('profile.title')} style={[styles.badge, { backgroundColor: theme.surface2 }]}>
            <Row gap={4}>
              <Icon name="flame" size={18} color={streak ? theme.warning : theme.textDim} />
              <Text style={{ color: theme.text, fontWeight: '800' }}>{streak}</Text>
            </Row>
            <Row gap={4}>
              <Icon name="star" size={18} color={theme.accent} />
              <Text style={{ color: theme.text, fontWeight: '800' }}>{progress.xp}</Text>
            </Row>
          </Pressable>
        </Row>

        {next ? (
          <FadeIn scale>
            <Pressable
              onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: next.lesson.id } })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.hero, { backgroundColor: next.course.color, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <Text style={{ color: INK, fontWeight: '700', fontSize: 12, opacity: 0.75, letterSpacing: 0.5 }}>{t('home.continue').toUpperCase()}</Text>
              <Text style={{ color: INK, fontWeight: '800', fontSize: 24, paddingRight: 56 }} numberOfLines={2}>
                {tr(next.lesson.title, i18n.language)}
              </Text>
              <Text style={{ color: INK, fontSize: 14, opacity: 0.8, paddingRight: 56 }} numberOfLines={1}>
                {tr(next.course.title, i18n.language)} · {tr(next.module.title, i18n.language)}
              </Text>
              <View style={[styles.play, { backgroundColor: INK }]}>
                <Icon name="play" size={24} color={next.course.color} />
              </View>
            </Pressable>
          </FadeIn>
        ) : null}

        <H2 style={styles.section}>{t('home.courses')}</H2>
        <View style={styles.grid}>
          {[...activeCourses, ...soonCourses].map((c, i) => (
            <FadeIn key={c.id} index={i + 1} style={{ width: `${100 / cols - 2}%`, flexGrow: 1 }}>
              <CourseTile c={c} />
            </FadeIn>
          ))}
        </View>

        {isPro ? null : (
          <Pressable onPress={showPro} accessibilityRole="button" style={({ pressed }) => [styles.proBanner, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
            <Icon name="crown" size={26} color="#2A1E00" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#2A1E00', fontWeight: '800', fontSize: 16 }}>{t('pro.upgrade')}</Text>
              <Text style={{ color: '#2A1E00', opacity: 0.8, fontSize: 13 }} numberOfLines={2}>
                {t('pro.f1')}
              </Text>
            </View>
            <Icon name="chevron-right" color="#2A1E00" />
          </Pressable>
        )}

        <View style={styles.quickRow}>
          <Quick icon="target" color="#F5C451" label={t('practice.tasks')} onPress={() => router.push('/tasks')} />
          <Quick icon="explain" color="#B48EF5" label={t('practice.explain')} onPress={() => router.push('/explain')} />
          <Quick icon="book-open" color="#5EA9FF" label={t('glossary.title')} onPress={() => router.push('/glossary')} />
          <Quick icon="reference" color="#4DD0E1" label={t('library.title')} onPress={() => router.push('/library')} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { maxWidth: 860, width: '100%', alignSelf: 'center', paddingBottom: space.xxl },
  badge: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  hero: { marginTop: space.lg, borderRadius: 28, padding: space.xl, gap: 6, minHeight: 150 },
  play: { position: 'absolute', right: 20, bottom: 20, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: space.xl, marginBottom: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { borderRadius: 24, padding: space.lg, gap: 12, minHeight: 150, justifyContent: 'space-between' },
  tileIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  soonPill: { backgroundColor: 'rgba(255,255,255,0.45)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(6,36,15,0.18)', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: INK },
  proBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F5C451', borderRadius: 22, padding: space.lg, marginTop: space.xl },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xl, gap: 8 },
  quick: { flex: 1, alignItems: 'center', gap: 8 },
  quickIcon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
