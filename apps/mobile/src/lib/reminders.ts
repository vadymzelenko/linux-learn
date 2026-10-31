import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const ID = 'daily-reminder';

/**
 * Local daily reminder, only after explicit consent (settings switch).
 * Returns false when the permission is denied.
 */
export async function syncReminder(enabled: boolean, hour: number, title: string, body: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    await Notifications.cancelScheduledNotificationAsync(ID).catch(() => undefined);
    if (!enabled) return true;
    const perm = await Notifications.getPermissionsAsync();
    let granted = perm.granted;
    if (!granted && perm.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return false;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0, channelId: 'reminders' },
    });
    return true;
  } catch {
    return false;
  }
}
