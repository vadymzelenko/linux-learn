import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { commandList } from '@linux-learn/engine';
import { dailyChallenge, tr } from '@linux-learn/content';
import { useStore } from '../../state/store';
import { useTheme, space } from '../../theme';
import { Body, Card, H1, H2, Icon, Pill, Row, Screen } from '../../components/ui';
import { dayKey, dueCards } from '../../lib/progress';

function Tile({ icon, title, text, onPress, accent, badge }: { icon: string; title: string; text: string; onPress: () => void; accent?: string; badge?: string }) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} accessibilityLabel={title}>
      <Row style={{ alignItems: 'flex-start' }} gap={14}>
        <View style={[styles.icon, { backgroundColor: theme.surface2 }]}>
          <Icon name={icon} size={26} color={accent ?? theme.accent} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <H2 style={{ flexShrink: 1 }}>{title}</H2>
            {badge ? <Pill text={badge} color={theme.onAccent} bg={theme.accent} /> : null}
          </Row>
          <Body dim>{text}</Body>
        </View>
        <Icon name="chevron-right" color={theme.textDim} />
      </Row>
    </Card>
  );
}

export default function PracticeScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const progress = useStore((s) => s.progress);
  const today = dayKey(new Date());
  const challenge = dailyChallenge(new Date());
  const due = dueCards(progress.srs, today);
  const doneToday = progress.daily.last === today;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <H1 style={{ marginBottom: space.lg }}>{t('practice.title')}</H1>
        <View style={{ gap: space.md }}>
          <Tile
            icon={doneToday ? 'check-circle' : 'target'}
            accent={doneToday ? theme.success : theme.warning}
            title={`${t('practice.daily')}: ${tr(challenge.title, i18n.language)}`}
            text={doneToday ? t('practice.dailyDone') : t('practice.dailyHint')}
            badge={doneToday ? undefined : t('common.xp', { count: challenge.xp ?? 30 })}
            onPress={() => router.push('/challenge')}
          />
          <Tile
            icon="repeat"
            title={t('practice.review')}
            text={due.length ? t('practice.reviewHint', { count: due.length }) : t('practice.reviewEmpty')}
            badge={due.length ? String(due.length) : undefined}
            onPress={() => router.push('/review')}
          />
          <Tile icon="explain" title={t('practice.explain')} text={t('practice.explainHint')} onPress={() => router.push('/explain')} />
          <Tile icon="reference" title={t('practice.reference')} text={t('practice.referenceHint', { count: commandList().length })} onPress={() => router.push('/reference')} />
        </View>
        <Text style={{ color: theme.textDim, textAlign: 'center', marginTop: space.xl, fontSize: 13 }}>{t('streak.kept', { n: progress.streak.current })}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, maxWidth: 820, width: '100%', alignSelf: 'center' },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
