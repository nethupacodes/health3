import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) });

export async function ensurePermission() {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}
async function cancelGroup(group) {
  const ids = JSON.parse((await AsyncStorage.getItem('hm.notif.' + group)) || '[]');
  await Promise.all(ids.map((i) => Notifications.cancelScheduledNotificationAsync(i)));
  await AsyncStorage.removeItem('hm.notif.' + group);
}
export async function setReminder(group, on, times, title, body) {
  await cancelGroup(group);
  await AsyncStorage.setItem('hm.pref.' + group, on ? '1' : '0');
  if (!on) return true;
  if (!(await ensurePermission())) { await AsyncStorage.setItem('hm.pref.' + group, '0'); return false; }
  const ids = [];
  for (const [hour, minute] of times) {
    ids.push(await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute } }));
  }
  await AsyncStorage.setItem('hm.notif.' + group, JSON.stringify(ids));
  return true;
}
export const reminderOn = async (group) => (await AsyncStorage.getItem('hm.pref.' + group)) === '1';
