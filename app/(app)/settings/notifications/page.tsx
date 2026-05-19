import { getNotificationPreferences } from "./actions";
import { NotificationSettings } from "./notification-settings";

export default async function NotificationsPage() {
  const prefs = await getNotificationPreferences();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure push notifications for expense alerts
        </p>
      </div>
      <NotificationSettings
        initialPrefs={prefs ?? {
          notify_large_expense: true,
          notify_large_expense_threshold_paise: 500000,
          notify_recurring_due: true,
        }}
      />
    </div>
  );
}
