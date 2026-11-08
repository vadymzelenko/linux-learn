import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, radius, space } from '../theme';
import { Button, FadeIn, Icon, Row } from './ui';
import { Text } from '../theme/Text';
import { openProInStore } from '../lib/edition';
import { goBack } from '../lib/nav';

const GOLD = '#F5C451';
const INK = '#2A1E00';

/** Small "PRO" lock badge for locked content in the free app. */
export function ProBadge({ small }: { small?: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.badge, small && { paddingHorizontal: 6, paddingVertical: 1 }]}>
      <Icon name="lock" size={small ? 10 : 12} color={INK} />
      <Text style={{ color: INK, fontWeight: '800', fontSize: small ? 10 : 11, letterSpacing: 0.5 }}>{t('pro.badge')}</Text>
    </View>
  );
}

/** What Pro adds, with the store button. Used as a screen and inside locked lessons / missions. */
export function ProGate({ locked }: { locked?: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const features = ['pro.f1', 'pro.f2', 'pro.f3', 'pro.f4', 'pro.f5'] as const;
  return (
    <ScrollView contentContainerStyle={styles.wrap}>
      <FadeIn scale>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon name="crown" size={34} color={INK} />
          </View>
          {locked ? <Text style={{ color: INK, fontWeight: '700', opacity: 0.75 }}>{t('pro.lockedTitle')}</Text> : null}
          <Text style={{ color: INK, fontWeight: '800', fontSize: 26 }}>{t('pro.title')}</Text>
          <Text style={{ color: INK, fontSize: 15, opacity: 0.85, lineHeight: 21 }}>{t('pro.subtitle')}</Text>
        </View>
      </FadeIn>
      <View style={{ gap: 14, marginTop: space.lg }}>
        {features.map((k, i) => (
          <FadeIn key={k} index={i + 1}>
            <Row gap={12} style={{ alignItems: 'flex-start' }}>
              <View style={[styles.check, { backgroundColor: GOLD }]}>
                <Icon name="check" size={14} color={INK} />
              </View>
              <Text style={{ color: theme.text, fontSize: 15, flex: 1, lineHeight: 21 }}>{t(k)}</Text>
            </Row>
          </FadeIn>
        ))}
      </View>
      <Pressable
        onPress={() => void openProInStore()}
        accessibilityRole="button"
        accessibilityLabel={t('pro.get')}
        style={({ pressed }) => [styles.cta, { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.9 : 1 }]}
      >
        <Icon name="google-play" size={22} color={INK} />
        <Text style={{ color: INK, fontWeight: '800', fontSize: 17 }}>{t('pro.get')}</Text>
      </Pressable>
      <Button variant="ghost" title={t('pro.later')} onPress={() => goBack('/')} style={{ marginTop: space.sm }} />
      <Row gap={10} style={{ alignItems: 'flex-start', marginTop: space.lg }}>
        <Icon name="swap-horizontal" size={18} color={theme.textDim} />
        <Text style={{ color: theme.textDim, fontSize: 13, flex: 1, lineHeight: 19 }}>{t('pro.transfer')}</Text>
      </Row>
      <Text style={{ color: theme.textDim, fontSize: 12, marginTop: space.md, lineHeight: 17 }}>{t('pro.freeIncludes')}</Text>
    </ScrollView>
  );
}

/** Opens the Pro screen. */
export function showPro() {
  router.push('/pro');
}

const styles = StyleSheet.create({
  wrap: { padding: space.lg, paddingBottom: space.xxl, maxWidth: 560, width: '100%', alignSelf: 'center' },
  hero: { backgroundColor: GOLD, borderRadius: 28, padding: space.xl, gap: 8 },
  heroIcon: { width: 60, height: 60, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  cta: { marginTop: space.xl, backgroundColor: GOLD, borderRadius: 18, minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: GOLD, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'center' },
});
