import { StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Row, Screen } from '../components/ui';
import { BackButton } from '../components/BackButton';
import { Text } from '../theme/Text';
import { MONO, space, useTheme } from '../theme';

/** Who made the app: just the studio name and the build. */
export default function DeveloperScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const name = Constants.expoConfig?.name ?? 'Linux Terminal Trainer';
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <BackButton />
      </Row>
      <View style={styles.center}>
        <Text style={{ color: theme.textDim, fontSize: 12, letterSpacing: 2 }}>{t('settings.developer').toUpperCase()}</Text>
        <Text style={[styles.mark, { color: theme.text }]} accessibilityRole="header">
          VZstudio
        </Text>
        <View style={[styles.line, { backgroundColor: theme.accent }]} />
        <Text style={{ color: theme.textDim, fontSize: 13 }}>
          {name} · {version}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 80 },
  mark: { fontFamily: MONO, fontSize: 30, fontWeight: '700', letterSpacing: 4 },
  line: { width: 24, height: 2, borderRadius: 1 },
});
