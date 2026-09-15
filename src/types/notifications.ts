export type NotificationType =
  | "connection.requested"
  | "connection.responded"
  | "transition.created"
  | "transition.updated"
  | "transition.cancelled"
  | "transition.payment_received";

export interface RealtimeNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  created_at: string;
  data?: Record<string, string | number | boolean | null>;
}
