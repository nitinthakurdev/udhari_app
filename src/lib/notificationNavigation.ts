import type { NotificationType } from "@/types/notifications";
import type { Href } from "expo-router";

export function getNotificationHref(
  type: NotificationType,
  role?: string,
): Href {
  const rolePath = role === "business" ? "(business)" : "(user)";

  if (type.startsWith("transition.")) {
    return `/(app)/${rolePath}/(tabs)/transitions` as Href;
  }
  if (type.startsWith("billing.")) {
    return `/(app)/${rolePath}/configuration/billing` as Href;
  }
  return `/(app)/${rolePath}/(tabs)/requests` as Href;
}
