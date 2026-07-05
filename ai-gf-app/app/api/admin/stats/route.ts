import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());

async function isAdmin(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user?.email) return null;
  if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) return null;
  return user.id;
}

export async function GET(req: Request) {
  const adminId = await isAdmin(req);
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // ── Users ──────────────────────────────────────────────
    const { count: totalUsers } = await supabaseAdmin
      .from("user_onboarding")
      .select("*", { count: "exact", head: true });

    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString();

    const { count: dau } = await supabaseAdmin
      .from("chats")
      .select("user_id", { count: "exact", head: true })
      .gt("created_at", yesterday);

    const { count: wau } = await supabaseAdmin
      .from("chats")
      .select("user_id", { count: "exact", head: true })
      .gt("created_at", lastWeek);

    // ── Subscriptions ──────────────────────────────────────
    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_tier, status");

    const activeSubs = subs?.filter((s) => s.status === "active") || [];
    const basicCount = activeSubs.filter((s) => s.plan_tier === "basic").length;
    const premiumCount = activeSubs.filter((s) => s.plan_tier === "premium").length;
    const freeCount = (subs || []).filter((s) => s.plan_tier === "free").length;
    const totalPaying = basicCount + premiumCount;
    const estimatedMRR = basicCount * 299 + premiumCount * 599;
    const trialConversionRate =
      (subs || []).length > 0 ? ((totalPaying / (subs || []).length) * 100).toFixed(1) : "0.0";

    // ── Usage ──────────────────────────────────────────────
    const { count: messagesToday } = await supabaseAdmin
      .from("chats")
      .select("*", { count: "exact", head: true })
      .gt("created_at", yesterday)
      .eq("role", "user");

    const { data: voiceData } = await supabaseAdmin
      .from("subscriptions")
      .select("trial_voice_seconds");
    const totalVoiceSeconds = voiceData?.reduce((acc, s) => acc + (s.trial_voice_seconds || 0), 0) || 0;
    const totalVoiceMinutes = Math.floor(totalVoiceSeconds / 60);

    // ── Onboarding Funnel ──────────────────────────────────
    const { count: onboardingComplete } = await supabaseAdmin
      .from("user_onboarding")
      .select("*", { count: "exact", head: true })
      .eq("onboarding_complete", true);

    // Companion popularity
    const { data: companionData } = await supabaseAdmin
      .from("user_onboarding")
      .select("companion_choice")
      .eq("onboarding_complete", true);

    const companionStats: Record<string, number> = {};
    companionData?.forEach(({ companion_choice }) => {
      companionStats[companion_choice] = (companionStats[companion_choice] || 0) + 1;
    });

    // ── Feedback ──────────────────────────────────────────
    const { data: feedbackData } = await supabaseAdmin
      .from("feedback")
      .select("feedback_type, rating, is_reviewed, message, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    const avgRating = feedbackData && feedbackData.length > 0
      ? (feedbackData.reduce((s, f) => s + (f.rating || 0), 0) / feedbackData.filter((f) => f.rating).length).toFixed(2)
      : "N/A";

    const feedbackTypeBreakdown: Record<string, number> = {};
    feedbackData?.forEach(({ feedback_type }) => {
      feedbackTypeBreakdown[feedback_type] = (feedbackTypeBreakdown[feedback_type] || 0) + 1;
    });

    const unreviewedCount = feedbackData?.filter((f) => !f.is_reviewed).length || 0;

    // ── System Health ──────────────────────────────────────
    const healthStatuses = await checkSystemHealth();

    return NextResponse.json({
      users: {
        total: totalUsers || 0,
        dau: dau || 0,
        wau: wau || 0,
        onboarding_completed: onboardingComplete || 0,
        companion_popularity: companionStats,
      },
      revenue: {
        estimated_mrr_inr: estimatedMRR,
        active_subscribers: totalPaying,
        basic_subscribers: basicCount,
        premium_subscribers: premiumCount,
        free_trial_users: freeCount,
        trial_conversion_rate: `${trialConversionRate}%`,
      },
      usage: {
        messages_today: messagesToday || 0,
        total_voice_minutes: totalVoiceMinutes,
      },
      feedback: {
        avg_rating: avgRating,
        unreviewed_count: unreviewedCount,
        type_breakdown: feedbackTypeBreakdown,
        recent: feedbackData?.slice(0, 10) || [],
      },
      health: healthStatuses,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Admin Stats] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function checkSystemHealth() {
  const results: Record<string, { status: "ok" | "degraded" | "error"; latency?: number }> = {};

  // Supabase check
  try {
    const start = Date.now();
    await supabaseAdmin.from("subscriptions").select("id").limit(1);
    results.supabase = { status: "ok", latency: Date.now() - start };
  } catch {
    results.supabase = { status: "error" };
  }

  // OpenAI check (just a header-check ping to avoid token usage)
  try {
    const start = Date.now();
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    });
    results.openai = {
      status: res.ok ? "ok" : "degraded",
      latency: Date.now() - start,
    };
  } catch {
    results.openai = { status: "error" };
  }

  // Stripe check
  try {
    const start = Date.now();
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
    });
    results.stripe = {
      status: res.ok ? "ok" : "degraded",
      latency: Date.now() - start,
    };
  } catch {
    results.stripe = { status: "error" };
  }

  // Redis check
  try {
    const start = Date.now();
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      const res = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
        headers: { Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}` },
      });
      results.redis = {
        status: res.ok ? "ok" : "degraded",
        latency: Date.now() - start,
      };
    } else {
      results.redis = { status: "degraded" };
    }
  } catch {
    results.redis = { status: "error" };
  }

  return results;
}

// PATCH: Mark feedback as reviewed
export async function PATCH(req: Request) {
  const adminId = await isAdmin(req);
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { feedback_id } = await req.json();
  if (!feedback_id) return NextResponse.json({ error: "Missing feedback_id" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("feedback")
    .update({ is_reviewed: true })
    .eq("id", feedback_id);

  if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
  return NextResponse.json({ success: true });
}
