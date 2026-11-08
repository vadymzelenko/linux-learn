import { Row } from '../../components/ui';
import { missionLocked } from '../../lib/edition';
import { ProGate } from '../../components/ProGate';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { findMission, tr } from '@linux-learn/content';
import { useStore } from '../../state/store';
import { useTheme, space } from '../../theme';
import { Button, Collapsible, Icon, IconButton, Screen } from '../../components/ui';
import { useUi } from '../../state/ui';
import { useLayout } from '../../lib/layout';
import { TaskRunner } from '../../components/steps/TaskRunner';
import { rewardAfterHints } from '../../lib/progress';
import { Text } from '../../theme/Text';
import { goBack } from '../../lib/nav';
import { BackButton } from '../../components/BackButton';
import { feedback } from '../../lib/haptics';

function MissionInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mission = findMission(id ?? '');
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [reward, setReward] = useState<number | null>(null);
  const focus = useUi((u) => u.focus);
  const layout = useLayout();
  /** Terminal keyboard open on a phone, or a phone on its side: a slim header. */
  const slim = focus || (layout.landscape && !layout.tablet);
  if (!mission) return null;
  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Collapsible open={!slim}>
        <View style={styles.header}>
          <BackButton />
          <Text style={{ color: theme.text, fontWeight: '800', fontSize: 17, flex: 1 }} numberOfLines={1}>
            {tr(mission.title, i18n.language)}
          </Text>
          <Text style={{ color: theme.warning, letterSpacing: 2 }}>{'★'.repeat(mission.difficulty)}</Text>
        </View>
        </Collapsible>
        <Collapsible open={slim}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 28, paddingHorizontal: space.md }}>
            <Pressable onPress={() => goBack('/courses')} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.back')}>
              <Icon name="chevron-left" size={20} color={theme.textDim} />
            </Pressable>
            <Text style={{ color: theme.textDim, fontWeight: '700', fontSize: 13, flex: 1 }} numberOfLines={1}>
              {tr(mission.title, i18n.language)}
            </Text>
          </View>
        </Collapsible>
        <View style={styles.body}>
          <TaskRunner
            task={{
              key: mission.id,
              title: t('mission.briefing'),
              story: mission.story,
              setup: mission.setup,
              ...(mission.prepare ? { prepare: mission.prepare } : {}),
              checks: mission.checks,
              hints: mission.hints,
              solution: mission.solution,
              ...(mission.instructions ? { instructions: mission.instructions } : {}),
            }}
            {...(mission.topics?.length ? { onTheory: () => router.push({ pathname: '/read/[id]', params: { id: mission.topics!.join(',') } }) } : {})}
            onSolved={({ hints }) => {
              const xp = rewardAfterHints(mission.xp, hints);
              useStore.getState().completeMission(mission.id, xp, hints);
              setReward(xp);
              setTimeout(() => feedback.complete(), 350);
            }}
            onContinue={reward !== null ? () => goBack('/courses') : undefined}
            continueLabel={t('lesson.backToMap')}
            solvedFooter={
              reward !== null ? (
                <View style={{ gap: space.sm }}>
                  <Text style={{ color: theme.accent, fontWeight: '900', fontSize: 20 }}>
                    {t('mission.accomplished')} {t('lesson.earned', { xp: reward })}
                  </Text>
                  <Button title={t('lesson.backToMap')} onPress={() => goBack()} />
                </View>
              ) : null
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm },
  body: { flex: 1, paddingHorizontal: space.md, paddingBottom: space.sm, maxWidth: 1200, width: '100%', alignSelf: 'center' },
});

/** Free edition: locked content shows what Pro adds instead. */
function LockedScreen() {
  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <BackButton />
      </Row>
      <ProGate locked />
    </Screen>
  );
}

export default function MissionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (id && missionLocked(id)) return <LockedScreen />;
  return <MissionInner />;
}
