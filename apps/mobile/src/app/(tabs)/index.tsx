import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { activeCourses, challenges, courseHours, courseLessons, glossary, levelFor, soonCourses, tr } from '@linux-learn/content';
import { showSoon } from '../../lib/soon';
import { Text } from '../../theme/Text';
import { useStore } from '../../state/store';
import { useTheme, MONO, space } from '../../theme';
import { Body, Card, FadeIn, H1, H2, Icon, ProgressBar, Row, Screen } from '../../components/ui';
import { dayKey, liveStreak } from '../../lib/progress';

function Quick({ icon, label, onPress, color }: { icon: string; label: string; onPress: () => void; color: string }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.quick, { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.quickIcon, { backgroundColor: theme.surface2 }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14, textAlign: 'center' }} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const progress = useStore((s) => s.progress);
  const name = useStore((s) => s.settings.certName) || 'student';
  const level = levelFor(progress.xp);
  const streak = liveStreak(progress.streak, dayKey(new Date()));
  const today = new Date();
  const dayIndex = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86_400_000);
  const term = glossary.length ? glossary[dayIndex % glossary.length] : undefined;
  const nextTask = challenges.find((c) => !progress.practice?.[c.id]);

  // the most recently touched unfinished lesson, else the first unfinished lesson of the first course
  const all = activeCourses.flatMap((c) => courseLessons(c).map((l) => ({ ...l, course: c })));
  const started = all.find((l) => progress.lessons[l.lesson.id] && !progress.lessons[l.lesson.id]!.completedAt);
  const next = started ?? all.find((l) => !progress.lessons[l.lesson.id]?.completedAt);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <H1>{t('home.hello', { name })}</H1>
            <Body dim>{t('home.subtitle')}</Body>
          </View>
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
            style={({ pressed }) => [styles.hero, { backgroundColor: next.course.color, opacity: pressed ? 0.92 : 1 }]}
          >
            <Text style={{ color: '#06240F', fontWeight: '700', fontSize: 13, opacity: 0.8 }}>{t('home.continue').toUpperCase()}</Text>
            <Text style={{ color: '#06240F', fontWeight: '800', fontSize: 24 }}>{tr(next.lesson.title, i18n.language)}</Text>
            <Text style={{ color: '#06240F', fontSize: 14 }}>
              {tr(next.course.title, i18n.language)} · {tr(next.module.title, i18n.language)}
            </Text>
            <View style={[styles.play, { backgroundColor: '#06240F' }]}>
              <Icon name="play" size={22} color={next.course.color} />
            </View>
          </Pressable>
          </FadeIn>
        ) : null}

        <H2 style={styles.section}>{t('home.courses')}</H2>
        <View style={{ gap: space.md }}>
          {activeCourses.map((c, ci) => {
            const ls = courseLessons(c);
            const done = ls.filter((l) => progress.lessons[l.lesson.id]?.completedAt).length;
            return (
              <FadeIn key={c.id} index={ci + 1}>
              <Card onPress={() => router.push({ pathname: '/courses', params: { course: c.id } })} accessibilityLabel={tr(c.title, i18n.language)}>
                <Row gap={14} style={{ alignItems: 'flex-start' }}>
                  <View style={[styles.courseIcon, { backgroundColor: c.color }]}>
                    <Icon name={c.icon} size={28} color="#06240F" />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: theme.text, fontWeight: '800', fontSize: 18 }}>{tr(c.title, i18n.language)}</Text>
                    <Body dim>{tr(c.subtitle, i18n.language)}</Body>
                    <Row gap={10} style={{ marginTop: 4 }}>
                      <Text style={{ color: theme.textDim, fontSize: 12, fontFamily: MONO }}>{t('home.lessonsCount', { n: ls.length })}</Text>
                      <Text style={{ color: theme.textDim, fontSize: 12, fontFamily: MONO }}>{t('home.hours', { h: courseHours(c) })}</Text>
                    </Row>
                    <ProgressBar value={ls.length ? done / ls.length : 0} color={c.color} style={{ marginTop: 6 }} />
                  </View>
                </Row>
              </Card>
              </FadeIn>
            );
          })}
        </View>

        {soonCourses.length ? (
          <>
            <Text style={[styles.soonHead, { color: theme.textDim }]}>{t('home.soon').toUpperCase()}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: space.md }}>
              {soonCourses.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => showSoon(c, i18n.language, t)}
                  accessibilityRole="button"
                  accessibilityLabel={`${tr(c.title, i18n.language)}, ${t('courses.soon')}`}
                  style={({ pressed }) => [styles.soon, { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.8 : 1 }]}
                >
                  <View style={[styles.soonIcon, { backgroundColor: theme.surface2 }]}>
                    <Icon name={c.icon} size={22} color={c.color} />
                  </View>
                  <View style={{ flex: 1, gap: 2, paddingTop: 14 }}>
                    <Text style={{ color: theme.text, fontWeight: '800' }} numberOfLines={1}>
                      {tr(c.title, i18n.language)}
                    </Text>
                    <Text style={{ color: theme.textDim, fontSize: 12 }} numberOfLines={2}>
                      {tr(c.subtitle, i18n.language)}
                    </Text>
                  </View>
                  <View style={[styles.soonPill, { backgroundColor: theme.surface2 }]}>
                    <Icon name="clock-outline" size={12} color={theme.textDim} />
                    <Text style={{ color: theme.textDim, fontSize: 11, fontWeight: '800' }}>{t('courses.soon')}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        <H2 style={styles.section}>{t('home.quick')}</H2>
        <View style={styles.grid}>
          <Quick icon="target" color={theme.warning} label={t('practice.tasks')} onPress={() => router.push('/tasks')} />
          <Quick icon="book-open" color={theme.accent} label={t('glossary.title')} onPress={() => router.push('/glossary')} />
          <Quick icon="reference" color={theme.term.path} label={t('library.title')} onPress={() => router.push('/library')} />
          <Quick icon="sandbox" color={theme.accent} label={t('sandbox.title')} onPress={() => router.push('/sandbox')} />
          <Quick icon="explain" color={theme.term.ansi[5]!} label={t('practice.explain')} onPress={() => router.push('/explain')} />
          <Quick icon="terminal" color={theme.term.ansi[6]!} label={t('practice.reference')} onPress={() => router.push('/reference')} />
        </View>

        {nextTask ? (
          <Card style={{ marginTop: space.lg, gap: 6 }} onPress={() => router.push({ pathname: '/challenge', params: { id: nextTask.id } })}>
            <Row>
              <Icon name="target" color={theme.warning} />
              <Text style={{ color: theme.textDim, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>{t('practice.nextTask').toUpperCase()}</Text>
            </Row>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 17 }}>{tr(nextTask.title, i18n.language)}</Text>
            <Body dim numberOfLines={2}>
              {tr(nextTask.goal, i18n.language)}
            </Body>
          </Card>
        ) : null}

        {term ? (
          <Card style={{ marginTop: space.md, marginBottom: space.xxl, gap: 6 }} onPress={() => router.push({ pathname: '/glossary', params: { q: tr(term.term, i18n.language) } })}>
            <Row>
              <Icon name="book-open" color={theme.accent} />
              <Text style={{ color: theme.textDim, fontWeight: '700', fontSize: 12, letterSpacing: 1 }}>{t('home.termOfDay').toUpperCase()}</Text>
            </Row>
            <Text style={{ color: theme.text, fontWeight: '800', fontSize: 20 }}>{tr(term.term, i18n.language)}</Text>
            <Body>{tr(term.definition, i18n.language)}</Body>
          </Card>
        ) : null}
        <Text style={{ color: theme.textDim, textAlign: 'center', fontSize: 12, marginBottom: space.lg }}>
          {t('profile.level')}: {t(`profile.levels.${level.id}` as 'profile.levels.root')}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, maxWidth: 860, width: '100%', alignSelf: 'center' },
  badge: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  hero: { marginTop: space.lg, borderRadius: 24, padding: space.xl, gap: 6, minHeight: 150 },
  play: { position: 'absolute', right: 20, bottom: 20, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: space.xl, marginBottom: space.md },
  courseIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quick: { width: '31.5%', flexGrow: 1, minWidth: 100, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: space.md, alignItems: 'center', gap: 8 },
  soonHead: { fontWeight: '800', fontSize: 12, letterSpacing: 1, marginTop: space.lg, marginBottom: space.sm },
  soon: { width: 260, flexDirection: 'row', alignItems: 'center', gap: 10, padding: space.md, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  soonIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', opacity: 0.85 },
  soonPill: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  quickIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
