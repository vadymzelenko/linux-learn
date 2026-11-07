import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { challenges, tr } from '@linux-learn/content';
import { useStore } from '../state/store';
import { useTheme, space } from '../theme';
import { Body, Card, FadeIn, H1, Icon, IconButton, Pill, ProgressBar, Row, Screen } from '../components/ui';
import { Text } from '../theme/Text';
import { BackButton } from '../components/BackButton';

/** The practice set: standalone tasks, each solved once for XP (replaces the old repeating "daily challenge"). */
export default function TasksScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const solved = useStore((s) => s.progress.practice ?? {});
  const done = challenges.filter((c) => solved[c.id]).length;
  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <BackButton />
        <H1 style={{ fontSize: 22 }}>{t('practice.tasks')}</H1>
      </Row>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ gap: 6, marginVertical: space.md }}>
          <ProgressBar value={challenges.length ? done / challenges.length : 0} />
          <Text style={{ color: theme.textDim, fontSize: 13 }}>{t('practice.tasksDone', { done, total: challenges.length })}</Text>
        </View>
        <View style={{ gap: space.sm }}>
          {challenges.map((c, i) => {
            const ok = !!solved[c.id];
            return (
              <FadeIn key={c.id} index={i}>
              <Card onPress={() => router.push({ pathname: '/challenge', params: { id: c.id } })} accessibilityLabel={tr(c.title, i18n.language)} style={{ padding: space.md }}>
                <Row gap={12} style={{ alignItems: 'flex-start' }}>
                  <View style={[styles.num, { backgroundColor: ok ? theme.success : theme.surface2 }]}>
                    {ok ? <Icon name="check" size={18} color={theme.onAccent} /> : <Text style={{ color: theme.text, fontWeight: '800' }}>{i + 1}</Text>}
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{tr(c.title, i18n.language)}</Text>
                    <Body dim numberOfLines={2}>
                      {tr(c.goal, i18n.language)}
                    </Body>
                  </View>
                  {ok ? null : <Pill text={t('common.xp', { count: c.xp ?? 30 })} />}
                </Row>
              </Card>
              </FadeIn>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingTop: 0, maxWidth: 820, width: '100%', alignSelf: 'center', paddingBottom: space.xxl },
  num: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
