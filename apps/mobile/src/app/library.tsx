import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { activeCourses, courseModules, lessonMinutes, tr } from '@linux-learn/content';
import { Text } from '../theme/Text';
import { BackButton } from '../components/BackButton';
import { useStore } from '../state/store';
import { useTheme, space } from '../theme';
import { Body, Card, H1, Icon, IconButton, Row, Screen } from '../components/ui';

export default function LibraryScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const progress = useStore((s) => s.progress);
  return (
    <Screen edges={['top', 'bottom']}>
      <Row style={{ padding: space.sm }}>
        <BackButton />
        <View>
          <H1 style={{ fontSize: 24 }}>{t('library.title')}</H1>
        </View>
      </Row>
      <ScrollView contentContainerStyle={styles.content}>
        {activeCourses.map((c) => (
          <View key={c.id} style={{ marginBottom: space.xl, gap: space.md }}>
            <Row>
              <View style={[styles.icon, { backgroundColor: c.color }]}>
                <Icon name={c.icon} size={20} color="#06240F" />
              </View>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 20 }}>{tr(c.title, i18n.language)}</Text>
            </Row>
            {courseModules(c).map((m) => (
              <Card key={m.id} style={{ gap: 4 }}>
                <Row style={{ marginBottom: 4 }}>
                  <Icon name={m.icon} size={20} color={theme.term.path} />
                  <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16 }}>{tr(m.title, i18n.language)}</Text>
                </Row>
                {m.lessons.map((l) => (
                  <Text
                    key={l.id}
                    onPress={() => router.push({ pathname: '/read/[id]', params: { id: l.id } })}
                    accessibilityRole="link"
                    style={{ color: theme.text, fontSize: 15, paddingVertical: 8 }}
                  >
                    <Text style={{ color: progress.lessons[l.id]?.completedAt ? theme.success : theme.textDim }}>{progress.lessons[l.id]?.completedAt ? '✓ ' : '• '}</Text>
                    {tr(l.title, i18n.language)}
                    <Text style={{ color: theme.textDim, fontSize: 12 }}>{`  ·  ${t('courses.minutes', { n: lessonMinutes(l) })}`}</Text>
                  </Text>
                ))}
              </Card>
            ))}
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingTop: 0, maxWidth: 820, width: '100%', alignSelf: 'center' },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
