import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { achievements, allLessons, LEVELS, levelFor, missions, tr } from '@linux-learn/content';
import { useStore } from '../../state/store';
import { useTheme, MONO, space } from '../../theme';
import { Body, Button, Card, H1, H2, Icon, IconButton, ProgressBar, Row, Screen } from '../../components/ui';
import { dayKey, liveStreak } from '../../lib/progress';
import { Text } from '../../theme/Text';

function Stat({ value, label }: { value: string | number; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={{ color: theme.text, fontSize: 24, fontWeight: '900' }}>{value}</Text>
      <Text style={{ color: theme.textDim, fontSize: 12, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const p = useStore((s) => s.progress);
  const level = levelFor(p.xp);
  const nextLevel = LEVELS[level.index + 1];
  const streak = liveStreak(p.streak, dayKey(new Date()));
  const lessonsDone = allLessons.filter((l) => p.lessons[l.lesson.id]?.completedAt).length;
  const levelName = (id: string) => t(`profile.levels.${id}` as 'profile.levels.root');

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Row style={{ justifyContent: 'space-between' }}>
          <H1>{t('profile.title')}</H1>
          <IconButton icon="settings" label={t('profile.settings')} onPress={() => router.push('/settings')} />
        </Row>

        <Card style={{ gap: space.md, marginTop: space.md }}>
          <Row>
            <View style={[styles.avatar, { backgroundColor: theme.term.bg, borderColor: theme.accent }]}>
              <Text style={{ fontFamily: MONO, color: theme.term.user, fontSize: 22 }}>{level.id === 'root' ? '#' : '$'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.textDim, fontSize: 13 }}>{t('profile.level')} {level.index + 1}</Text>
              <H2>{levelName(level.id)}</H2>
              <Text style={{ fontFamily: MONO, color: theme.textDim, fontSize: 12 }}>{t('common.xp', { count: p.xp })}</Text>
            </View>
          </Row>
          {nextLevel ? (
            <>
              <ProgressBar value={(p.xp - level.current) / (nextLevel.xp - level.current)} />
              <Body dim>{t('profile.toNext', { xp: nextLevel.xp - p.xp, level: levelName(nextLevel.id) })}</Body>
            </>
          ) : (
            <Body dim>{t('profile.maxLevel')}</Body>
          )}
        </Card>

        <Card style={{ marginTop: space.md }}>
          <Row style={{ justifyContent: 'space-around' }}>
            <View style={styles.stat}>
              <Row gap={4}>
                <Icon name="flame" color={streak ? theme.warning : theme.textDim} />
                <Text style={{ color: theme.text, fontSize: 24, fontWeight: '900' }}>{streak}</Text>
              </Row>
              <Text style={{ color: theme.textDim, fontSize: 12 }}>{t('profile.streak')}</Text>
            </View>
            <Stat value={p.streak.best} label={t('profile.best', { n: '' }).replace(/[:\s]+$/, '')} />
            <Stat value={p.streak.freezes} label={t('profile.freezes', { n: '' }).replace(/[:\s]+$/, '')} />
          </Row>
        </Card>

        <H2 style={{ marginTop: space.xl, marginBottom: space.sm }}>{t('profile.stats')}</H2>
        <Card>
          <Row style={{ justifyContent: 'space-around' }}>
            <Stat value={p.stats.commands} label={t('profile.commandsRun')} />
            <Stat value={`${lessonsDone}/${allLessons.length}`} label={t('profile.lessonsDone')} />
            <Stat value={`${Object.keys(p.missions).length}/${missions.length}`} label={t('profile.missionsDone')} />
          </Row>
        </Card>

        {p.exam.passedAt ? (
          <Button variant="secondary" icon="graduation-cap" title={t('profile.certificate')} onPress={() => router.push('/exam')} style={{ marginTop: space.md }} />
        ) : null}

        <H2 style={{ marginTop: space.xl, marginBottom: space.sm }}>
          {t('profile.achievements')} · {Object.keys(p.achievements).length}/{achievements.length}
        </H2>
        <View style={styles.grid}>
          {achievements.map((a) => {
            const got = a.id in p.achievements;
            const hidden = a.secret && !got;
            return (
              <View
                key={a.id}
                accessible
                accessibilityLabel={hidden ? t('profile.secret') : `${tr(a.title, i18n.language)}. ${tr(a.description, i18n.language)}`}
                style={[styles.ach, { backgroundColor: theme.surface, borderColor: got ? theme.accent : theme.border, opacity: got ? 1 : 0.55 }]}
              >
                <Icon name={hidden ? 'lockClosed' : a.icon} size={28} color={got ? theme.accent : theme.textDim} />
                <Text style={{ color: theme.text, fontWeight: '800', textAlign: 'center', fontSize: 13 }} numberOfLines={2}>
                  {hidden ? '???' : tr(a.title, i18n.language)}
                </Text>
                <Text style={{ color: theme.textDim, textAlign: 'center', fontSize: 11 }} numberOfLines={3}>
                  {hidden ? t('profile.secret') : tr(a.description, i18n.language)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl, maxWidth: 820, width: '100%', alignSelf: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stat: { alignItems: 'center', gap: 2, flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  ach: { width: '31.5%', minWidth: 100, flexGrow: 1, borderWidth: 1, borderRadius: 16, padding: space.md, alignItems: 'center', gap: 6 },
});
