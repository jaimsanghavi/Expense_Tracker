import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

// Configure web-push with VAPID details
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

webpush.setVapidDetails(
  `mailto:admin@${new URL(SITE_URL).hostname}`,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

/**
 * Send a push notification to all of a user's subscribed devices.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const supabase = await createClient();

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) return;

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush
        .sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        )
        .catch(async (err) => {
          // Remove expired/invalid subscriptions
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
          throw err;
        })
    )
  );

  return results;
}
