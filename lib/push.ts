import type WebPush from "web-push";
import { createClient } from "@/lib/supabase/server";

let webpush: typeof WebPush | null = null;

async function getWebPush() {
  if (webpush) return webpush;

  const mod = await import("web-push");
  webpush = mod.default;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys not configured");
  }

  webpush.setVapidDetails(
    `mailto:admin@${new URL(siteUrl).hostname}`,
    publicKey,
    privateKey
  );

  return webpush;
}

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
  const wp = await getWebPush();
  const supabase = await createClient();

  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) return;

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      wp
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
