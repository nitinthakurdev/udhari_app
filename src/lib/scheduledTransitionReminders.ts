import type {
  RecurringConfig,
  RecurringConfigWeekday,
} from "@/types/models";
import { Platform } from "react-native";

const REMINDER_CHANNEL_ID = "udhari-reminders";
const REMINDER_TYPE = "scheduled.transition.reminder";
const REMINDER_LEAD_MINUTES = 30;

const weekdayNumbers: Record<RecurringConfigWeekday, number> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
};

type NotificationsModule = typeof import("expo-notifications");

let syncQueue: Promise<void> = Promise.resolve();

function reminderTime(weekday: RecurringConfigWeekday, endTime: string) {
  const [hours = 0, minutes = 0] = endTime.split(":").map(Number);
  let reminderMinutes = hours * 60 + minutes - REMINDER_LEAD_MINUTES;
  let reminderWeekday = weekdayNumbers[weekday];

  if (reminderMinutes < 0) {
    reminderMinutes += 24 * 60;
    reminderWeekday = reminderWeekday === 1 ? 7 : reminderWeekday - 1;
  }

  return {
    weekday: reminderWeekday,
    hour: Math.floor(reminderMinutes / 60),
    minute: reminderMinutes % 60,
  };
}

function counterpartyName(config: RecurringConfig) {
  if (config.is_creator) {
    return (
      config.customer_business?.name ??
      [config.customer?.first_name, config.customer?.last_name]
        .filter(Boolean)
        .join(" ")
    );
  }

  return (
    config.business?.name ??
    [config.creator?.first_name, config.creator?.last_name]
      .filter(Boolean)
      .join(" ")
  );
}

async function ensurePermission(notifications: NotificationsModule) {
  if (Platform.OS === "android") {
    await notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: "Scheduled transition reminders",
      description: "Alerts 30 minutes before a scheduled Udhari transition",
      importance: notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: "#155EEF",
      lockscreenVisibility:
        notifications.AndroidNotificationVisibility.PUBLIC,
      sound: "default",
    });
  }

  const existing = await notifications.getPermissionsAsync();
  const permission =
    existing.status === "granted"
      ? existing
      : await notifications.requestPermissionsAsync();
  return permission.status === "granted";
}

async function reconcileReminders(
  scope: string,
  configs: RecurringConfig[],
) {
  if (Platform.OS === "web") return;

  const notifications = await import("expo-notifications");
  const scheduled = await notifications.getAllScheduledNotificationsAsync();
  const existingForScope = scheduled.filter(
    (request) =>
      request.content.data?.["type"] === REMINDER_TYPE &&
      request.content.data?.["scope"] === scope,
  );

  await Promise.all(
    existingForScope.map((request) =>
      notifications.cancelScheduledNotificationAsync(request.identifier),
    ),
  );

  if (configs.length === 0 || !(await ensurePermission(notifications))) return;

  const reminders = configs.flatMap((config) => {
    const party = counterpartyName(config) || "your connected account";

    return config.week_days.flatMap((weekday) =>
      config.time_ranges.map((range) => {
        const trigger = reminderTime(weekday, range.end_time);
        const identifier = [
          "udhari-reminder",
          scope,
          config.uuid,
          weekday,
          range.end_time,
        ].join(":");

        return notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: "Scheduled transition ends in 30 minutes",
            body: `${config.name} with ${party} ends at ${range.end_time}.`,
            data: {
              type: REMINDER_TYPE,
              scope,
              configUuid: config.uuid,
            },
            sound: "default",
          },
          trigger: {
            type: notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: trigger.weekday,
            hour: trigger.hour,
            minute: trigger.minute,
            channelId: REMINDER_CHANNEL_ID,
          },
        });
      }),
    );
  });

  await Promise.all(reminders);
}

export function syncScheduledTransitionReminders(
  scope: string,
  configs: RecurringConfig[],
) {
  syncQueue = syncQueue
    .catch(() => undefined)
    .then(() => reconcileReminders(scope, configs));
  return syncQueue;
}
