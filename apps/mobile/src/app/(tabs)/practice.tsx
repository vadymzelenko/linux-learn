import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { commandList, COMMANDS } from '@linux-learn/engine';
import { challenges } from '@linux-learn/content';
import { useStore } from '../../state/store';
import { useTheme, space } from '../../theme';
import { FadeIn, H1, Icon, Row, Screen } from '../../components/ui';
import { dayKey, reviewDeck } from '../../lib/progress';
import { Text } from '../../theme/Text';

const INK = '#06240F';

/** A filled colour tile with a big number (what is waiting) in the corner. */
function Tile({ icon, title, text, onPress, color, badge }: { icon: string; title: string; text: string; onPress: () => void; color: string; badge?: string | undefined }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [styles.tile, { backgroundColor: color, transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 }]}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={styles.icon}>
          <Icon name={icon} size={26} color={INK} />
        </View>
        {badge ? <Text style={{ color: INK, fontSize: 26, fontWeight: '800' }}>{badge}</Text> : null}
      </Row>
      <View style={{ gap: 2 }}>
        <Text style={{ color: INK, fontSize: 17, fontWeight: '800' }} numberOfLines={2}>
          {title}
        </Text>
        <Text style={{ color: INK, fontSize: 13, opacity: 0.75 }} numberOfLines={2}>
          {text}
        </Text>
      </View>
    </Pressable>
  );
}

export default function PracticeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const progress = useStore((s) => s.progress);
  const today = dayKey(new Date());
  const due = reviewDeck(progress, today, (c) => COMMANDS.has(c));
  const solved = challenges.filter((c) => progress.practice?.[c.id]).length;
  const left = challenges.length - solved;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <H1 style={{ fontSize: 26, marginBottom: space.lg }}>{t('practice.title')}</H1>
        <View style={styles.grid}>
          {[
            { key: 'tasks', icon: left ? 'target' : 'check-circle', color: '#F5C451', title: t('practice.tasks'), text: t('practice.tasksDone', { done: solved, total: challenges.length }), badge: left ? String(left) : undefined, go: '/tasks' as const },
            { key: 'review', icon: 'repeat', color: '#B48EF5', title: t('practice.review'), text: due.length ? t('practice.reviewHint', { count: due.length }) : t('practice.reviewEmpty'), badge: due.length ? String(due.length) : undefined, go: '/review' as const },
            { key: 'explain', icon: 'explain', color: '#5EA9FF', title: t('practice.explain'), text: t('practice.explainHint'), badge: undefined, go: '/explain' as const },
            { key: 'reference', icon: 'reference', color: '#4DD0E1', title: t('practice.reference'), text: t('practice.referenceHint', { count: commandList().length }), badge: undefined, go: '/reference' as const },
          ].map((x, i) => (
            <FadeIn key={x.key} index={i} style={styles.cell}>
              <Tile icon={x.icon} color={x.color} title={x.title} text={x.text} badge={x.badge} onPress={() => router.push(x.go)} />
            </FadeIn>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, maxWidth: 820, width: '100%', alignSelf: 'center' },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47%', flexGrow: 1 },
  tile: { borderRadius: 24, padding: space.lg, minHeight: 170, justifyContent: 'space-between', gap: space.md },
});
