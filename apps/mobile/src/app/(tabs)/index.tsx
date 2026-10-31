import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { allLessons, levelFor, missions, modules, tr, type Module } from '@linux-learn/content';
import { useStore } from '../../state/store';
import { useTheme, MONO, MONO_BOLD, space } from '../../theme';
import { Body, Button, Card, H1, H2, Icon, Pill, ProgressBar, Row, Screen } from '../../components/ui';
import { dayKey, lessonUnlocked, liveStreak, moduleCompleted, nextLesson } from '../../lib/progress';
import { haptic } from '../../lib/haptics';

function ModuleBranch({ module, last, open, onToggle }: { module: Module; last: boolean; open: boolean; onToggle: () => void }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const progress = useStore((s) => s.progress);
  const done = module.lessons.filter((l) => progress.lessons[l.id]?.completedAt).length;
  const complete = done === module.lessons.length;
  const unlocked = lessonUnlocked(progress, module.lessons[0]!.id);
  const branch = last ? '└── ' : '├── ';
  const pipe = last ? '    ' : '│   ';

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
        <Text style={[styles.tree, { color: theme.textDim }]}>{branch}</Text>
        <Icon name={module.icon} size={20} color={unlocked ? theme.term.path : theme.textDim} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.dirName, { color: unlocked ? theme.term.path : theme.textDim }]}>{module.path.split('/').pop()}/</Text>
          <Text style={{ color: theme.textDim, fontSize: 13 }} numberOfLines={1}>
            {tr(module.title, i18n.language)}
          </Text>
        </View>
        {complete ? (
          <Icon name="check-circle" size={20} color={theme.success} />
        ) : (
          <Text style={{ color: theme.textDim, fontFamily: MONO, fontSize: 12 }}>
            {done}/{module.lessons.length}
          </Text>
        )}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textDim} />
      </Pressable>
      {open
        ? module.lessons.map((l, i) => {
            const lp = progress.lessons[l.id];
            const ok = lessonUnlocked(progress, l.id);
            const isLast = i === module.lessons.length - 1;
            return (
              <Pressable
                key={l.id}
                disabled={!ok}
                onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: l.id } })}
                accessibilityRole="button"
                accessibilityLabel={tr(l.title, i18n.language)}
                accessibilityState={{ disabled: !ok }}
                style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.surface2 }]}
              >
                <Text style={[styles.tree, { color: theme.textDim }]}>
                  {pipe}
                  {isLast ? '└── ' : '├── '}
                </Text>
                <Icon
                  name={lp?.completedAt ? 'check-circle' : ok ? (lp ? 'play' : 'circle') : 'lockClosed'}
                  size={18}
                  color={lp?.completedAt ? theme.success : ok ? theme.accent : theme.textDim}
                />
                <Text style={{ flex: 1, color: ok ? theme.text : theme.textDim, fontSize: 15 }} numberOfLines={2}>
                  {tr(l.title, i18n.language)}
                </Text>
                {lp?.completedAt ? <Text style={{ color: theme.textDim, fontFamily: MONO, fontSize: 12 }}>+{lp.xp}</Text> : null}
              </Pressable>
            );
          })
        : null}
    </View>
  );
}

export default function LearnScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const progress = useStore((s) => s.progress);
  const next = nextLesson(progress);
  const [open, setOpen] = useState<string | null>(next?.module.id ?? modules[0]!.id);
  const level = levelFor(progress.xp);
  const streak = liveStreak(progress.streak, dayKey(new Date()));
  const total = allLessons.length;
  const doneCount = allLessons.filter((l) => progress.lessons[l.lesson.id]?.completedAt).length;
  const allDone = doneCount === total;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Row style={{ justifyContent: 'space-between' }}>
          <H1>{t('learn.title')}</H1>
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
        <Body dim style={{ marginBottom: space.lg }}>
          {t('profile.level')}: {t(`profile.levels.${level.id}` as 'profile.levels.root')} · {t('learn.subtitle')}
        </Body>

        {next ? (
          <Card style={[styles.hero, { backgroundColor: theme.surface2 }]}>
            <Text style={{ color: theme.textDim, fontFamily: MONO, fontSize: 12 }}>
              {next.module.path}/{next.lesson.id}
            </Text>
            <H2>{tr(next.lesson.title, i18n.language)}</H2>
            <ProgressBar value={doneCount / total} />
            <Text style={{ color: theme.textDim, fontSize: 13 }}>{t('learn.lessons', { done: doneCount, total })}</Text>
            <Button
              title={doneCount === 0 ? t('learn.startCourse') : t('common.continue')}
              icon="play"
              onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: next.lesson.id } })}
            />
          </Card>
        ) : null}

        <Card style={{ marginTop: space.lg, paddingHorizontal: space.sm }}>
          <Text style={[styles.dirName, { color: theme.term.path, paddingHorizontal: space.sm }]}>/learn</Text>
          {modules.map((m, i) => (
            <ModuleBranch key={m.id} module={m} last={i === modules.length - 1} open={open === m.id} onToggle={() => setOpen(open === m.id ? null : m.id)} />
          ))}
        </Card>

        <H2 style={{ marginTop: space.xl }}>{t('learn.missions')}</H2>
        <Body dim style={{ marginBottom: space.md }}>
          {t('learn.missionsHint')}
        </Body>
        <View style={{ gap: space.md }}>
          {missions.map((m) => {
            const done = !!progress.missions[m.id];
            const req = m.requires ? modules.find((x) => x.id === m.requires) : undefined;
            const unlocked = !req || moduleCompleted(progress, req.id);
            return (
              <Card
                key={m.id}
                onPress={unlocked ? () => router.push({ pathname: '/mission/[id]', params: { id: m.id } }) : undefined}
                accessibilityLabel={tr(m.title, i18n.language)}
                style={!unlocked && { opacity: 0.6 }}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row style={{ flex: 1 }}>
                    <Icon name={done ? 'check-circle' : unlocked ? 'flag' : 'lockClosed'} color={done ? theme.success : unlocked ? theme.warning : theme.textDim} />
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16, flexShrink: 1 }}>{tr(m.title, i18n.language)}</Text>
                  </Row>
                  <Text style={{ color: theme.warning, letterSpacing: 2 }}>{'★'.repeat(m.difficulty)}</Text>
                </Row>
                <Body dim numberOfLines={2} style={{ marginTop: 6 }}>
                  {unlocked ? tr(m.story, i18n.language) : t('learn.requires', { module: req ? tr(req.title, i18n.language) : '' })}
                </Body>
                <View style={{ marginTop: 8 }}>
                  <Pill text={t('common.xp', { count: m.xp })} />
                </View>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: space.sm, borderRadius: 10, minHeight: 44 },
  tree: { fontFamily: MONO, fontSize: 14 },
  dirName: { fontFamily: MONO_BOLD, fontSize: 15 },
});
