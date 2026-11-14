import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, LayoutAnimation, Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { activeCourses, courseLessons, courseModules, courses, lessonMinutes, missions, modules, tr, type Course, type Module } from '@linux-learn/content';
import { useStore } from '../../state/store';
import { useTheme, MONO, MONO_BOLD, radius, space } from '../../theme';
import { Body, Button, Card, FadeIn, H1, H2, Icon, Pill, ProgressBar, Row, Screen } from '../../components/ui';
import { ND } from '../../components/ui/Motion';
import { haptic } from '../../lib/haptics';
import { showSoon } from '../../lib/soon';
import { useLayout } from '../../lib/layout';
import { Text } from '../../theme/Text';

const NODE = 40;
const RAIL_W = 48;
const LINE = 3;

/** Smooth height/opacity change for the next layout pass. */
function animateLayout() {
  LayoutAnimation.configureNext({
    duration: 260,
    create: { type: 'easeInEaseOut', property: 'opacity' },
    update: { type: 'spring', springDamping: 0.86 },
    delete: { type: 'easeInEaseOut', property: 'opacity' },
  });
}

/** A chevron that turns smoothly when a branch opens. */
function Chevron({ open, color }: { open: boolean; color: string }) {
  const v = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: open ? 1 : 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start();
  }, [open, v]);
  return (
    <Animated.View style={{ transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
      <Icon name="chevron-down" size={20} color={color} />
    </Animated.View>
  );
}

/** The node of the current module breathes softly to show "you are here". */
function Pulse({ color, active }: { color: string; active: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
        Animated.timing(v, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: ND }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, v]);
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulse,
        { backgroundColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.22] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }] },
      ]}
    />
  );
}

function ModuleBranch({
  module,
  index,
  first,
  last,
  open,
  onToggle,
  nextId,
  color,
  prevDone,
}: {
  module: Module;
  index: number;
  first: boolean;
  last: boolean;
  open: boolean;
  onToggle: () => void;
  nextId?: string;
  color: string;
  prevDone: boolean;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const progress = useStore((s) => s.progress);
  const done = module.lessons.filter((l) => progress.lessons[l.id]?.completedAt).length;
  const total = module.lessons.length;
  const complete = done === total;
  const active = module.lessons.some((l) => l.id === nextId);
  const started = done > 0 || module.lessons.some((l) => progress.lessons[l.id]);
  const tint = complete ? theme.success : active ? color : theme.textDim;
  // the path is "lit" up to where you are
  const lineTop = prevDone ? (complete || active ? tint : theme.border) : theme.border;
  const lineBottom = complete ? theme.success : theme.border;

  return (
    <View style={styles.branch}>
      {/* rail: two segments around the node so the path is continuous whatever the height */}
      <View style={styles.rail}>
        {!first ? <View style={[styles.lineTop, { backgroundColor: lineTop }]} /> : null}
        {!last ? <View style={[styles.lineBottom, { backgroundColor: lineBottom }]} /> : null}
        <View style={styles.nodeWrap}>
          <Pulse color={color} active={active} />
          <View
            style={[
              styles.node,
              complete
                ? { backgroundColor: theme.success, borderColor: theme.success }
                : active
                  ? { backgroundColor: theme.surface, borderColor: color }
                  : { backgroundColor: theme.surface, borderColor: started ? color : theme.border },
            ]}
          >
            {complete ? <Icon name="check" size={20} color={theme.onAccent} /> : <Icon name={module.icon} size={19} color={tint} />}
          </View>
        </View>
      </View>

      <View style={[styles.moduleCard, { backgroundColor: active ? theme.surface2 : theme.surface, borderColor: active ? color : theme.border }]}>
        <Pressable
          onPress={() => {
            haptic.tap();
            animateLayout();
            onToggle();
          }}
          accessibilityRole="button"
          accessibilityLabel={`${tr(module.title, i18n.language)}, ${t('learn.lessons', { done, total })}`}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => [styles.moduleHead, pressed && { opacity: 0.75 }]}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: theme.textDim, fontFamily: MONO, fontSize: 11 }} numberOfLines={1}>
              {String(index + 1).padStart(2, '0')} · {module.path.split('/').pop()}/
            </Text>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700' }} numberOfLines={2}>
              {tr(module.title, i18n.language)}
            </Text>
            <Row gap={8} style={{ marginTop: 4 }}>
              <ProgressBar value={done / total} height={5} color={complete ? theme.success : color} track={theme.border} style={{ flex: 1, maxWidth: 200 }} />
              <Text style={{ color: complete ? theme.success : theme.textDim, fontFamily: MONO, fontSize: 12 }}>
                {done}/{total}
              </Text>
            </Row>
          </View>
          <Chevron open={open} color={theme.textDim} />
        </Pressable>

        {open ? (
          <View style={styles.lessons}>
            <View style={[styles.lessonLine, { backgroundColor: theme.border }]} />
            {module.lessons.map((l) => {
              const lp = progress.lessons[l.id];
              const isNext = l.id === nextId;
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
                  style={({ pressed }) => [styles.lessonRow, { backgroundColor: pressed ? theme.border : isNext ? theme.bg : 'transparent' }]}
                >
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: theme.surface, borderColor: theme.border },
                      status === 'done' && { backgroundColor: theme.success, borderColor: theme.success },
                      status === 'next' && { backgroundColor: color, borderColor: color },
                      status === 'started' && { borderColor: color },
                    ]}
                  >
                    {status === 'done' ? <Icon name="check" size={12} color={theme.onAccent} /> : status === 'next' ? <Icon name="play" size={11} color={theme.onAccent} /> : null}
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
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function CourseTab({ c, active, onPress, onLayout }: { c: Course; active: boolean; onPress: () => void; onLayout: (x: number) => void }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => onLayout(e.nativeEvent.layout.x)}
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled: !!c.soon }}
      style={({ pressed }) => [
        styles.courseTab,
        { backgroundColor: active ? c.color : theme.surface2, opacity: c.soon ? 0.6 : pressed ? 0.85 : 1, borderColor: active ? c.color : theme.border },
      ]}
    >
      <Icon name={c.icon} size={18} color={active ? '#06240F' : c.soon ? theme.textDim : c.color} />
      <Text style={{ color: active ? '#06240F' : theme.text, fontWeight: '700' }}>{tr(c.title, i18n.language)}</Text>
      {c.soon ? (
        <View style={[styles.soonBadge, { backgroundColor: theme.border }]}>
          <Text style={{ color: theme.textDim, fontSize: 10, fontWeight: '800' }}>{t('courses.soon').toUpperCase()}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function CoursesScreen() {
  const theme = useTheme();
  const layout = useLayout();
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ course?: string }>();
  const progress = useStore((s) => s.progress);
  const [courseId, setCourseId] = useState(params.course ?? activeCourses[0]!.id);
  const course = activeCourses.find((c) => c.id === (params.course ?? courseId)) ?? activeCourses[0]!;
  const lessons = courseLessons(course);
  const next = lessons.find((l) => !progress.lessons[l.lesson.id]?.completedAt);
  const [open, setOpen] = useState<string | null>(next?.module.id ?? course.modules[0] ?? null);
  const doneCount = lessons.filter((l) => progress.lessons[l.lesson.id]?.completedAt).length;
  const allDone = activeCourses.every((c) => courseLessons(c).every((l) => progress.lessons[l.lesson.id]?.completedAt));
  const mods = courseModules(course);
  const tabsRef = useRef<ScrollViewInstance>(null);
  const tabX = useRef<Record<string, number>>({});
  // keep the selected course tab in view (it may be off-screen on a phone)
  useEffect(() => {
    const x = tabX.current[course.id];
    if (x !== undefined) tabsRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  }, [course.id]);

  // a course opened from the home screen: unfold its current module
  useEffect(() => {
    if (!params.course) return;
    const c = activeCourses.find((x) => x.id === params.course);
    if (c) setOpen(courseLessons(c).find((l) => !progress.lessons[l.lesson.id]?.completedAt)?.module.id ?? c.modules[0] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.course]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.content, { padding: layout.pad, maxWidth: layout.tablet ? 860 : undefined }]}>
        <H1 style={{ fontSize: 26, marginBottom: space.md }}>{t('courses.title')}</H1>

        <ScrollView ref={tabsRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: space.md, paddingRight: space.md }}>
          {courses.map((c) => (
            <CourseTab
              key={c.id}
              onLayout={(x) => {
                tabX.current[c.id] = x;
                if (c.id === course.id && x > 200) tabsRef.current?.scrollTo({ x: x - 16, animated: false });
              }}
              c={c}
              active={c.id === course.id}
              onPress={() => {
                if (c.soon) return showSoon(c, i18n.language, t);
                haptic.tap();
                animateLayout();
                setCourseId(c.id);
                router.setParams({ course: c.id });
                setOpen(courseLessons(c).find((l) => !progress.lessons[l.lesson.id]?.completedAt)?.module.id ?? c.modules[0] ?? null);
              }}
            />
          ))}
        </ScrollView>

        <FadeIn key={course.id}>
          {next ? (
            <Pressable
              onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: next.lesson.id } })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.hero, { backgroundColor: course.color, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <Text style={{ color: '#06240F', fontWeight: '700', fontSize: 12, opacity: 0.75 }}>{(doneCount === 0 ? t('learn.startCourse') : t('common.continue')).toUpperCase()}</Text>
              <Text style={{ color: '#06240F', fontWeight: '800', fontSize: 22, paddingRight: 56 }} numberOfLines={2}>
                {tr(next.lesson.title, i18n.language)}
              </Text>
              <View style={styles.heroTrack}>
                <View style={[styles.heroFill, { width: `${Math.max(3, (doneCount / lessons.length) * 100)}%` }]} />
              </View>
              <Text style={{ color: '#06240F', fontSize: 13, opacity: 0.8 }}>{t('learn.lessons', { done: doneCount, total: lessons.length })}</Text>
              <View style={styles.heroPlay}>
                <Icon name="play" size={22} color={course.color} />
              </View>
            </Pressable>
          ) : (
            <Card style={[styles.hero, { borderColor: theme.success }]}>
              <Row>
                <Icon name="check-circle" color={theme.success} size={28} />
                <H2 style={{ flex: 1 }}>{t('courses.courseDone')}</H2>
              </Row>
            </Card>
          )}

          <View style={styles.treeHead}>
            <View style={[styles.rootNode, { backgroundColor: course.color }]}>
              <Icon name={course.icon} size={18} color="#06240F" />
            </View>
            <Text style={[styles.rootName, { color: theme.text }]}>~/{course.id}</Text>
            <Pill text={t('learn.lessons', { done: doneCount, total: lessons.length })} />
          </View>
          <View style={styles.tree}>
            {mods.map((m, i) => {
              const prevDone = i === 0 || mods[i - 1]!.lessons.every((l) => progress.lessons[l.id]?.completedAt);
              return (
                <FadeIn key={m.id} index={i} from={10}>
                  <ModuleBranch
                    color={course.color}
                    module={m}
                    index={i}
                    first={i === 0}
                    last={i === mods.length - 1}
                    prevDone={prevDone}
                    open={open === m.id}
                    onToggle={() => setOpen(open === m.id ? null : m.id)}
                    {...(next ? { nextId: next.lesson.id } : {})}
                  />
                </FadeIn>
              );
            })}
          </View>
        </FadeIn>

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
                  <Row style={{ marginTop: 8, flexWrap: 'wrap' }}>
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
  content: { width: '100%', alignSelf: 'center' },
  chip: { paddingHorizontal: 4 },
  hero: { gap: 8, borderRadius: 26, padding: space.lg, paddingVertical: space.xl, borderWidth: 0 },
  heroTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(6,36,15,0.18)', overflow: 'hidden', marginTop: 6, marginRight: 64 },
  heroFill: { height: 6, borderRadius: 3, backgroundColor: '#06240F' },
  heroPlay: { position: 'absolute', right: 20, bottom: 20, width: 50, height: 50, borderRadius: 25, backgroundColor: '#06240F', alignItems: 'center', justifyContent: 'center' },
  courseTab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.pill, minHeight: 44, borderWidth: StyleSheet.hairlineWidth },
  soonBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  treeHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: space.xl, marginBottom: space.sm, paddingLeft: (RAIL_W - 30) / 2 },
  rootNode: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rootName: { fontFamily: MONO_BOLD, fontSize: 15, flex: 1 },
  tree: { paddingBottom: space.sm },
  branch: { flexDirection: 'row', alignItems: 'stretch' },
  rail: { width: RAIL_W, alignItems: 'center' },
  lineTop: { position: 'absolute', top: 0, height: 10 + NODE / 2, width: LINE, borderRadius: LINE, left: RAIL_W / 2 - LINE / 2 },
  lineBottom: { position: 'absolute', top: 10 + NODE / 2, bottom: 0, width: LINE, borderRadius: LINE, left: RAIL_W / 2 - LINE / 2 },
  nodeWrap: { marginTop: 10, width: NODE, height: NODE, alignItems: 'center', justifyContent: 'center' },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  pulse: { position: 'absolute', width: NODE + 14, height: NODE + 14, borderRadius: (NODE + 14) / 2 },
  moduleCard: { flex: 1, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, marginBottom: space.md, overflow: 'hidden' },
  moduleHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.md, paddingVertical: space.md, minHeight: 72 },
  lessons: { paddingHorizontal: 6, paddingBottom: 8 },
  lessonLine: { position: 'absolute', left: 6 + 14 + 10 - 1, top: 22, bottom: 22, width: 2, borderRadius: 1 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.md },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
