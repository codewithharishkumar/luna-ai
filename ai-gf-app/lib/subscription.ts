import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export type SubscriptionTier = "free" | "basic" | "premium" | "ultra";

export interface Subscription {
  plan_tier: SubscriptionTier;
  status: string;
  trial_started_at: string;
  trial_ends_at: string;
  trial_message_count: number;
  trial_voice_seconds: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
}

export const SubscriptionService = {
  getOrCreateSubscription: async (userId: string): Promise<Subscription> => {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      // Auto-create a default free subscription
      const defaultSub = {
        user_id: userId,
        plan_tier: "free" as SubscriptionTier,
        status: "active",
        trial_started_at: new Date().toISOString(),
        trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        trial_message_count: 0,
        trial_voice_seconds: 0
      };

      const { data: inserted, error: insertError } = await supabase
        .from("subscriptions")
        .insert([defaultSub])
        .select("*")
        .single();

      if (!insertError && inserted) {
        return inserted;
      }

      return {
        plan_tier: "free",
        status: "active",
        trial_started_at: defaultSub.trial_started_at,
        trial_ends_at: defaultSub.trial_ends_at,
        trial_message_count: 0,
        trial_voice_seconds: 0
      };
    }

    return data;
  },

  checkTrialLimits: (sub: Subscription): { allowed: boolean; reason?: "trial_expired" | "message_limit" | "voice_limit" } => {
    // Premium and Ultra tiers with active status are exempt from trial limits
    if (sub.plan_tier !== "free" && sub.status === "active") {
      return { allowed: true };
    }

    // Rule 1: Trial expires after 3 days
    const trialEnds = new Date(sub.trial_ends_at).getTime();
    if (Date.now() > trialEnds) {
      return { allowed: false, reason: "trial_expired" };
    }

    // Rule 2: 300 messages maximum
    if (sub.trial_message_count >= 300) {
      return { allowed: false, reason: "message_limit" };
    }

    // Rule 3: 1800 voice seconds maximum
    if (sub.trial_voice_seconds >= 1800) {
      return { allowed: false, reason: "voice_limit" };
    }

    return { allowed: true };
  },

  incrementMessageUsage: async (userId: string, amount: number = 1): Promise<void> => {
    // Only increment usage for free tier subscriptions
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_tier")
      .eq("user_id", userId)
      .maybeSingle();

    if (sub?.plan_tier === "free") {
      await supabase.rpc("increment_trial_messages", { p_user_id: userId, amount });
    }
  },

  incrementVoiceUsage: async (userId: string, seconds: number): Promise<void> => {
    // Only increment usage for free tier subscriptions
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_tier")
      .eq("user_id", userId)
      .maybeSingle();

    if (sub?.plan_tier === "free") {
      // Atomically increment voice seconds
      await supabase.rpc("increment_trial_voice", { p_user_id: userId, amount: seconds });
      // Also increments trial message count because a voice response is also a message
      await supabase.rpc("increment_trial_messages", { p_user_id: userId, amount: 1 });
    }
  }
};
