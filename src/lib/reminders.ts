// Local "drink water" reminders. They're scheduled on the phone, so no server or push setup is needed.
import * as Notifications from 'expo-notifications';

import type { Settings } from './model';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const MESSAGES = [
  'Time for some water.',
  'Quick sip? Your glass is waiting.',
  'Stay quenched: log a drink.',
  'A glass of water now keeps you on track.',
];

export function reminderHours(r: Settings['reminders']): number[] {
  const hours: number[] = [];
  const every = Math.max(1, Math.round(r.everyHours));
  for (let h = r.startHour; h <= r.endHour && hours.length < 24; h += every) hours.push(h);
  return hours;
}

/** Replaces all scheduled reminders. Returns false if notifications aren't allowed. */
export async function applyReminders(r: Settings['reminders']): Promise<boolean> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!r.enabled) return true;
  let perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) perm = await Notifications.requestPermissionsAsync();
  if (!perm.granted) return false;
  const hours = reminderHours(r);
  for (let i = 0; i < hours.length; i++) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Quenchie', body: MESSAGES[i % MESSAGES.length] },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: hours[i], minute: 0 },
    });
  }
  return true;
}
