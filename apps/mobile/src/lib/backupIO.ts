import { File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

/**
 * Android / iOS: the backup is written to the cache and handed to the share
 * sheet (save to Files / Drive, send to yourself in a messenger or by mail).
 */
export async function saveBackupFile(name: string, json: string): Promise<'shared' | 'unavailable'> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: name, UTI: 'public.json' });
  return 'shared';
}

/** Pick a backup file; null when the user cancelled. */
export async function pickBackupFile(): Promise<string | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', 'application/octet-stream', '*/*'], copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets[0]) return null;
  return new File(res.assets[0].uri).text();
}
