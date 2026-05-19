"use client";

import { useState, useTransition, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  subscribePush,
  unsubscribePush,
  updateNotificationPreferences,
} from "./actions";

interface NotificationPrefs {
  notify_large_expense: boolean;
  notify_large_expense_threshold_paise: number;
  notify_recurring_due: boolean;
}

interface NotificationSettingsProps {
  initialPrefs: NotificationPrefs;
}

export function NotificationSettings({ initialPrefs }: NotificationSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const [subscribed, setSubscribed] = useState(false);
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [prefs, setPrefs] = useState(initialPrefs);
  const [thresholdRupees, setThresholdRupees] = useState(
    String(initialPrefs.notify_large_expense_threshold_paise / 100)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if push is supported
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }

    setPermission(Notification.permission);

    // Check if already subscribed
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setSubscribed(!!sub);
      });
    });
  }, []);

  async function handleSubscribe() {
    setError(null);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        setError("Notification permission denied");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      const json = sub.toJSON();
      const result = await subscribePush({
        endpoint: json.endpoint!,
        keys: {
          p256dh: json.keys!.p256dh!,
          auth: json.keys!.auth!,
        },
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setSubscribed(true);
    } catch (e) {
      setError("Failed to subscribe. Make sure notifications are allowed.");
      console.error(e);
    }
  }

  async function handleUnsubscribe() {
    setError(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }

      setSubscribed(false);
    } catch (e) {
      setError("Failed to unsubscribe");
      console.error(e);
    }
  }

  function savePreferences(updates: Partial<NotificationPrefs>) {
    const updated = { ...prefs, ...updates };
    setPrefs(updated);
    startTransition(async () => {
      await updateNotificationPreferences(updates);
    });
  }

  if (!supported) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <BellOff className="h-5 w-5" />
            <p className="text-sm">
              Push notifications are not supported in this browser.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Subscription status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {permission === "denied" ? (
            <p className="text-sm text-destructive">
              Notifications are blocked. Please enable them in your browser
              settings.
            </p>
          ) : subscribed ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-500">
                  Notifications enabled
                </p>
                <p className="text-xs text-muted-foreground">
                  You&apos;ll receive alerts for important expense events
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnsubscribe}
              >
                Disable
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Notifications disabled</p>
                <p className="text-xs text-muted-foreground">
                  Enable to get alerts for large expenses and recurring reminders
                </p>
              </div>
              <Button size="sm" onClick={handleSubscribe}>
                Enable
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Preferences */}
      {subscribed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alert Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Large expense alert */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">
                    Large expense alert
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Notify when an expense exceeds a threshold
                  </p>
                </div>
                <Switch
                  checked={prefs.notify_large_expense}
                  onCheckedChange={(checked) =>
                    savePreferences({ notify_large_expense: checked })
                  }
                />
              </div>

              {prefs.notify_large_expense && (
                <div className="flex items-center gap-2 pl-1">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">
                    Threshold: ₹
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={thresholdRupees}
                    onChange={(e) => setThresholdRupees(e.target.value)}
                    onBlur={() => {
                      const paise = Math.round(Number(thresholdRupees) * 100);
                      if (paise > 0) {
                        savePreferences({
                          notify_large_expense_threshold_paise: paise,
                        });
                      }
                    }}
                    className="w-28 font-mono"
                  />
                </div>
              )}
            </div>

            {/* Recurring expense reminder */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">
                  Recurring expense reminder
                </Label>
                <p className="text-xs text-muted-foreground">
                  Remind when a recurring expense is due
                </p>
              </div>
              <Switch
                checked={prefs.notify_recurring_due}
                onCheckedChange={(checked) =>
                  savePreferences({ notify_recurring_due: checked })
                }
              />
            </div>

            {isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
