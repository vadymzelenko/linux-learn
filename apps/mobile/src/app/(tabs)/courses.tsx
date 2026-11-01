import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { courseLessons, courseModules, courses, levelFor, lessonMinutes, missions, modules, tr, type Module } from '@linux-learn/content';
import { useStore } from '../../state/store';
import { useTheme, MONO, MONO_BOLD, space } from '../../theme';
import { Body, Button, Card, H1, H2, Icon, Pill, ProgressBar, Row, Screen } from '../../components/ui';
import { dayKey, liveStreak } from '../../lib/progress';
import { useLocalSearchParams } from 'expo-router';
import { haptic } from '../../lib/haptics';
import { Text } from '../../theme/Text';

const RAIL = 26;
const LINE = 2;

/**
 * One connector of the tree, drawn with views (box-drawing glyphs do not line
 * up across fonts): `├─` for a middle child, a rounded `╰─` for the last one.
 */
function Rail({ last, color, width = RAIL }: { last: boolean; color: string; width?: number }) {
  return (
    <View style={{ width, alignSelf: 'stretch' }}>
      {last ? (
        <View style={{ position: 'absolute', left: width / 2 - LINE / 2, top: 0, height: '50%', width: width / 2 + LINE / 2, borderLeftWidth: LINE, borderBottomWidth: LINE, borderBottomLeftRadius: 9, borderColor: color }} />
      ) : (
        <>
          <View style={{ position: 'absolute', left: width / 2 - LINE / 2, top: 0, bottom: 0, width: LINE, backgroundColor: color }} />
          <View style={{ position: 'absolute', left: width / 2, top: '50%', marginTop: -LINE / 2, width: width / 2, height: LINE, backgroundColor: color }} />
        </>
      )}
    </View>
  );
}

/** A vertical line that continues the parent's branch past nested rows. */
function Pipe({ show, color, width = RAIL }: { show: boolean; color: string; width?: number }) {
  return <View style={{ width, alignSelf: 'stretch' }}>{show ? <View style={{ position: 'absolute', left: width / 2 - LINE / 2, top: 0, bottom: 0, width: LINE, backgroundColor: color }} /> : null}</View>;
}

function ModuleBranch({ module, last, open, onToggle, nextId, color }: { module: Module; last: boolean; open: boolean; onToggle: () => void; nextId?: string; color: string }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const progress = useStore((s) => s.progress);
  const done = module.lessons.filter((l) => progress.lessons[l.id]?.completedAt).length;
  const complete = done === module.lessons.length;
  const active = module.lessons.some((l) => l.id === nextId);
  const lineColor = theme.border;
  const tint = complete ? theme.success : active ? color : theme.term.path;

  return (
    <View>
      <Pressable
        onPress={() => {
          haptic.tap();
          onToggle();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${tr(module.title, i18n.language)}, ${t('learn.lessons', { done, total: module.lessons.length })}`}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.surface2 }]}
      >
        <Rail last={last && !open} color={lineColor} />
        <View style={[styles.node, { backgroundColor: theme.surface2, borderColor: complete ? theme.success : active ? color : theme.border }]}>
          <Icon name={module.icon} size={20} color={tint} />
        </View>
        <View style={{ flex: 1, gap: 3, paddingVertical: 2 }}>
          <Text style={[styles.dirName, { color: theme.term.path }]} numberOfLines={1}>
            {module.path.split('/').pop()}/
          </Text>
          <Text style={{ color: theme.text, fontSize: 14 }} numberOfLines={2}>
            {tr(module.title, i18n.language)}
          </Text>
          <ProgressBar value={done / module.lessons.length} height={4} color={complete ? theme.success : color} style={{ marginTop: 3, maxWidth: 180 }} />
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {complete ? (
            <Icon name="check-circle" size={20} color={theme.success} />
          ) : (
            <Text style={{ color: theme.textDim, fontFamily: MONO, fontSize: 12 }}>
              {done}/{module.lessons.length}
            </Text>
          )}
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textDim} />
        </View>
      </Pressable>
      {open
        ? module.lessons.map((l, i) => {
            const lp = progress.lessons[l.id];
            const isNext = l.id === nextId;
            const isLast = i === module.lessons.length - 1;
            const status = lp?.completedAt ? 'done' : isNext ? 'next' : lp ? 'started' : 'todo';
            return (
              <Pressable
                key={l.id}
                onPress={() => {
                  haptic.tap();
                  router.push({ pathname: '/lesson/[id]', params: { id: l.id } });
                }}
                accessibilityRole="button"
                accessibilityLabel={tr(l.title, i18n.language)}
                style={({ pressed }) => [styles.row, styles.lessonRow, pressed && { backgroundColor: theme.surface2 }, isNext && { backgroundColor: theme.surface2 }]}
              >
                <Pipe show={!last} color={lineColor} />
                <Rail last={isLast} color={lineColor} width={22} />
                <View
                  style={[
                    styles.dot,
                    status === 'done' && { backgroundColor: theme.success, borderColor: theme.success },
                    status === 'next' && { backgroundColor: color, borderColor: color },
                    status === 'started' && { borderColor: color },
                    status === 'todo' && { borderColor: theme.border },
                  ]}
                >
                  {status === 'done' ? <Icon name="check" size={13} color={theme.onAccent} /> : status === 'next' ? <Icon name="play" size={12} color={theme.onAccent} /> : null}
                </View>
                <Text style={{ flex: 1, color: status === 'todo' ? theme.textDim : theme.text, fontSize: 15, fontWeight: isNext ? '700' : '400' }} numberOfLines={2}>
                  {tr(l.title, i18n.language)}
                </Text>
                {lp?.completedAt ? (
                  <Text style={{ color: theme.success, fontFamily: MONO, fontSize: 12 }}>+{lp.xp}</Text>
                ) : (
                  <Text style={{ color: theme.textDim, fontSize: 12 }}>{t('courses.minutes', { n: lessonMinutes(l) })}</Text>
                )}
              </Pressable>
            );
          })
        : null}
    </View>
  );
}

export default function CoursesScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ course?: string }>();
  const progress = useStore((s) => s.progress);
  const [courseId, setCourseId] = useState(params.course ?? courses[0]!.id);
  const course = courses.find((c) => c.id === (params.course ?? courseId)) ?? courses[0]!;
  const lessons = courseLessons(course);
  const next = lessons.find((l) => !progress.lessons[l.lesson.id]?.completedAt);
  const [open, setOpen] = useState<string | null>(next?.module.id ?? course.modules[0]!);
  const level = levelFor(progress.xp);
  const streak = liveStreak(progress.streak, dayKey(new Date()));
  const doneCount = lessons.filter((l) => progress.lessons[l.lesson.id]?.completedAt).length;
  const allDone = courses.every((c) => courseLessons(c).every((l) => progress.lessons[l.lesson.id]?.completedAt));
  const mods = courseModules(course);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Row style={{ justifyContent: 'space-between' }}>
          <H1>{t('courses.title')}</H1>
          <Row gap={12}>
            <Row gap={4} style={styles.chip}>
              <Icon name="flame" size={18} color={streak > 0 ? theme.warning : theme.textDim} />
              <Text style={{ color: theme.text, fontWeight: '800' }}>{streak}</Text>
            </Row>
            <Row gap={4} style={styles.chip}>
              <Icon name="star" size={18} color={theme.accent} />
              <Text style={{ color: theme.text, fontWeight: '800' }}>{progress.xp}</Text>
            </Row>
          </Row>
        </Row>
        <Body dim style={{ marginBottom: space.md }}>
          {t('profile.level')}: {t(`profile.levels.${level.id}` as 'profile.levels.root')}
        </Body>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: space.md }}>
          {courses.map((c) => {
            const active = c.id === course.id;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  setCourseId(c.id);
                  router.setParams({ course: c.id });
                  setOpen(courseLessons(c).find((l) => !progress.lessons[l.lesson.id]?.completedAt)?.module.id ?? c.modules[0]!);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[styles.courseTab, { backgroundColor: active ? c.color : theme.surface2 }]}
              >
                <Icon name={c.icon} size={18} color={active ? '#06240F' : theme.text} />
                <Text style={{ color: active ? '#06240F' : theme.text, fontWeight: '700' }}>{tr(c.title, i18n.language)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {next ? (
          <Card style={[styles.hero, { backgroundColor: theme.surface2 }]}>
            <Text style={{ color: theme.textDim, fontFamily: MONO, fontSize: 12 }}>
              {next.module.path}/{next.lesson.id}
            </Text>
            <H2>{tr(next.lesson.title, i18n.language)}</H2>
            <ProgressBar value={doneCount / lessons.length} color={course.color} />
            <Text style={{ color: theme.textDim, fontSize: 13 }}>{t('learn.lessons', { done: doneCount, total: lessons.length })}</Text>
            <Button
              title={doneCount === 0 ? t('learn.startCourse') : t('common.continue')}
              icon="play"
              onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: next.lesson.id } })}
            />
          </Card>
        ) : null}

        <Card style={{ marginTop: space.lg, paddingHorizontal: space.sm, paddingVertical: space.md }}>
          <Row gap={8} style={{ paddingBottom: 2 }}>
            <View style={[styles.rootNode, { backgroundColor: course.color }]}>
              <Icon name={course.icon} size={16} color="#06240F" />
            </View>
            <Text style={[styles.dirName, { color: theme.term.path }]}>/{course.id}</Text>
          </Row>
          {mods.map((m, i) => (
            <ModuleBranch key={m.id} color={course.color} module={m} last={i === mods.length - 1} open={open === m.id} onToggle={() => setOpen(open === m.id ? null : m.id)} {...(next ? { nextId: next.lesson.id } : {})} />
          ))}
        </Card>

        <H2 style={{ marginTop: space.xl }}>{t('learn.missions')}</H2>
        <Body dim style={{ marginBottom: space.md }}>
          {t('learn.missionsHint')}
        </Body>
        <View style={{ gap: space.md }}>
          {missions
            .filter((m) => (m.course ?? 'linux') === course.id)
            .map((m) => {
              const done = !!progress.missions[m.id];
              const req = m.requires ? modules.find((x) => x.id === m.requires) : undefined;
              return (
                <Card key={m.id} onPress={() => router.push({ pathname: '/mission/[id]', params: { id: m.id } })} accessibilityLabel={tr(m.title, i18n.language)}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row style={{ flex: 1 }}>
                      <Icon name={done ? 'check-circle' : 'flag'} color={done ? theme.success : theme.warning} />
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, flexShrink: 1 }}>{tr(m.title, i18n.language)}</Text>
                    </Row>
                    <Text style={{ color: theme.warning, letterSpacing: 2 }}>{'★'.repeat(m.difficulty)}</Text>
                  </Row>
                  <Body dim numberOfLines={2} style={{ marginTop: 6 }}>
                    {tr(m.story, i18n.language)}
                  </Body>
                  <Row style={{ marginTop: 8 }}>
                    <Pill text={t('common.xp', { count: m.xp })} />
                    {req && !done ? <Pill text={`↳ ${tr(req.title, i18n.language)}`} /> : null}
                  </Row>
                </Card>
              );
            })}
        </View>

        <Card
          style={{ marginTop: space.xl, marginBottom: space.xxl, opacity: allDone ? 1 : 0.6 }}
          onPress={allDone ? () => router.push('/exam') : undefined}
          accessibilityLabel={t('learn.exam')}
        >
          <Row>
            <Icon name="graduation-cap" size={28} color={allDone ? theme.accent : theme.textDim} />
            <View style={{ flex: 1 }}>
              <H2>{t('learn.exam')}</H2>
              <Body dim>{allDone ? t('learn.examHint') : t('learn.examLocked')}</Body>
            </View>
            {progress.exam.passedAt ? <Icon name="check-circle" color={theme.success} /> : null}
          </Row>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, maxWidth: 820, width: '100%', alignSelf: 'center' },
  chip: { paddingHorizontal: 4 },
  hero: { gap: space.md },
  courseTab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, minHeight: 42 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: space.sm, borderRadius: 10, minHeight: 64 },
  lessonRow: { minHeight: 48, gap: 6 },
  node: { width: 38, height: 38, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  dirName: { fontFamily: MONO_BOLD, fontSize: 15 },
  rootNode: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 0 },
});
