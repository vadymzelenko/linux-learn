import { useRef } from 'react';
import { Platform, StyleSheet, View, type ViewInstance } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { useStore } from '../state/store';
import { MONO, MONO_BOLD } from '../theme';
import { Button } from './ui';
import { Text } from '../theme/Text';

/** A shareable certificate image (rendered view → PNG → share sheet). */
export function Certificate({ name }: { name: string }) {
  const { t, i18n } = useTranslation();
  const ref = useRef<ViewInstance>(null);
  const passedAt = useStore((s) => s.progress.exam.passedAt);
  const best = useStore((s) => s.progress.exam.best);
  const date = new Date(passedAt ?? Date.now()).toLocaleDateString(i18n.language);

  const share = async () => {
    try {
      const uri = await captureRef(ref as never, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png' });
    } catch {
      /* sharing cancelled or unavailable */
    }
  };

  return (
    <View style={{ alignSelf: 'stretch', gap: 12 }}>
      <View ref={ref} collapsable={false} style={styles.cert}>
        <Text style={styles.prompt}>student@trainer:~$ ./certificate</Text>
        <Text style={styles.title}>{t('exam.certTitle')}</Text>
        <Text style={styles.name}>{name.trim() || 'student'}</Text>
        <Text style={styles.text}>{t('exam.certText')}</Text>
        <Text style={styles.meta}>
          {date} · {best}%
        </Text>
        <Text style={styles.root}>uid=0(root) gid=0(root)</Text>
      </View>
      {Platform.OS !== 'web' ? <Button icon="share" title={t('exam.share')} onPress={() => void share()} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cert: { backgroundColor: '#050805', borderRadius: 18, borderWidth: 2, borderColor: '#3DDC84', padding: 24, gap: 10, aspectRatio: 1.5, justifyContent: 'center' },
  prompt: { color: '#3DDC84', fontFamily: MONO, fontSize: 12 },
  title: { color: '#B8F5C8', fontFamily: MONO_BOLD, fontSize: 18, textTransform: 'uppercase', letterSpacing: 1 },
  name: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  text: { color: '#B8F5C8', fontSize: 15 },
  meta: { color: '#5EA9FF', fontFamily: MONO, fontSize: 13 },
  root: { color: '#3DDC84', fontFamily: MONO, fontSize: 12, alignSelf: 'flex-end' },
});
