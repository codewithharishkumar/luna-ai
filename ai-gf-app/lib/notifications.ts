/**
 * Phase 6: REAL Notifications & Proactive Presence
 * Modular client-side hooks for managing OneSignal Push ecosystems.
 */
import { supabaseClient } from "@/lib/supabase-client";

export const NotificationService = {
  // Request permission from the browser/device
  requestPermission: async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    
    try {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    } catch (e) {
      console.error("[NotificationService] Error requesting permissions", e);
      return false;
    }
  },

  // Save device token to Supabase for the QStash worker
  registerDeviceToken: async (userId: string, token: string) => {
    console.log(`[NotificationService] OneSignal token ${token} registered for ${userId}`);
    try {
      await supabaseClient.from("user_settings").upsert({
        user_id: userId,
        onesignal_id: token,
        push_enabled: true
      });
    } catch (e) {
      console.error("Failed to register token to DB", e);
    }
  },

  // Handle incoming foreground notifications (fallback if OneSignal SDK isn't managing it)
  showLocalNotification: (title: string, body: string, icon?: string) => {
    if (typeof window === "undefined" || Notification.permission !== "granted") return;
    
    new Notification(title, {
      body,
      icon: icon || "/favicon.ico",
      badge: "/favicon.ico",
    });
  }
};
