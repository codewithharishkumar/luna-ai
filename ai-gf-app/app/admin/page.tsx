"use client";

import { useEffect, useState, useCallback } from "react";
import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, MessageCircle, Mic, Activity,
  Star, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  ShieldCheck, BarChart3, Heart, Zap, DollarSign,
  ThumbsUp, Bug, Lightbulb, CreditCard, HelpCircle
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────
type HealthStatus = "ok" | "degraded" | "error";
type FeedbackItem = {
  id: string;
  feedback_type: string;
  rating: number;
  message: string;
  companion_name: string;
  is_reviewed: boolean;
  created_at: string;
};
type AdminStats = {
  users: { total: number; dau: number; wau: number; onboarding_completed: number; companion_popularity: Record<string, number> };
  revenue: { estimated_mrr_inr: number; active_subscribers: number; basic_subscribers: number; premium_subscribers: number; free_trial_users: number; trial_conversion_rate: string };
  usage: { messages_today: number; total_voice_minutes: number };
  feedback: { avg_rating: string; unreviewed_count: number; type_breakdown: Record<string, number>; recent: FeedbackItem[] };
  health: Record<string, { status: HealthStatus; latency?: number }>;
  generated_at: string;
};

const FEEDBACK_ICONS: Record<string, any> = {
  general: HelpCircle,
  bug: Bug,
  feature_request: Lightbulb,
  conversation_quality: MessageCircle,
  billing: CreditCard,
};

const FEEDBACK_COLORS: Record<string, string> = {
  general: "text-blue-400",
  bug: "text-red-400",
  feature_request: "text-yellow-400",
  conversation_quality: "text-purple-400",
  billing: "text-green-400",
};

function HealthDot({ status, latency }: { status: HealthStatus; latency?: number }) {
  if (status === "ok") return (
    <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold">
      <CheckCircle className="w-4 h-4" />
      OK {latency != null && <span className="text-green-600 font-mono">{latency}ms</span>}
    </span>
  );
  if (status === "degraded") return (
    <span className="flex items-center gap-1.5 text-yellow-400 text-xs font-bold">
      <AlertTriangle className="w-4 h-4" />
      Degraded
    </span>
  );
  return (
    <span className="flex items-center gap-1.5 text-red-400 text-xs font-bold">
      <XCircle className="w-4 h-4" />
      Error
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-black/30 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
      {sub && <p className="text-[10px] text-gray-600 font-mono">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [markingReviewed, setMarkingReviewed] = useState<string | null>(null);

  const fetchStats = useCallback(async (token: string) => {
    const res = await fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Forbidden");
    return res.json() as Promise<AdminStats>;
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      try {
        const data = await fetchStats(session.access_token);
        setStats(data);
        setAuthorized(true);
      } catch {
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchStats, router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const data = await fetchStats(session.access_token);
      setStats(data);
    } finally {
      setRefreshing(false);
    }
  };

  const markReviewed = async (feedbackId: string) => {
    setMarkingReviewed(feedbackId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      await fetch("/api/admin/stats", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ feedback_id: feedbackId }),
      });
      // Refresh stats
      const data = await fetchStats(session.access_token);
      setStats(data);
      setSelectedFeedback(null);
    } finally {
      setMarkingReviewed(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060610] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <ShieldCheck className="w-10 h-10 text-pink-500 animate-pulse" />
          <p className="text-gray-400 text-sm font-mono animate-pulse">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!authorized || !stats) return null;

  const companions = ["Luna", "Nova", "Aiko", "Mia"];
  const totalCompanionPicks = Object.values(stats.users.companion_popularity).reduce((a, b) => a + b, 0) || 1;

  const healthServices = [
    { name: "Supabase", key: "supabase", icon: Activity },
    { name: "OpenAI", key: "openai", icon: Zap },
    { name: "Stripe", key: "stripe", icon: CreditCard },
    { name: "Redis", key: "redis", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-[#060610] text-white font-sans">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[700px] h-[400px] bg-purple-600/4 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-pink-600/4 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#060610]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg leading-none">Admin Console</h1>
            <p className="text-[11px] text-gray-500 font-mono">Luna AI Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[10px] text-gray-600 font-mono hidden md:block">
            Updated: {new Date(stats.generated_at).toLocaleTimeString()}
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold transition-all"
          >
            Exit Admin
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-8 relative z-10">

        {/* ── Section: User Stats ─────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-lg">User Overview</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={stats.users.total} color="text-blue-400" />
            <StatCard icon={Activity} label="Daily Active Users" value={stats.users.dau} sub="Last 24 hours" color="text-green-400" />
            <StatCard icon={TrendingUp} label="Weekly Active Users" value={stats.users.wau} sub="Last 7 days" color="text-purple-400" />
            <StatCard
              icon={CheckCircle}
              label="Onboarding Complete"
              value={stats.users.onboarding_completed}
              sub={`${((stats.users.onboarding_completed / Math.max(stats.users.total, 1)) * 100).toFixed(1)}% completion`}
              color="text-pink-400"
            />
          </div>

          {/* Companion Popularity */}
          <div className="mt-4 glass-panel p-5 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-4 h-4 text-pink-400" />
              <h3 className="font-bold text-sm">Companion Popularity</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {companions.map((name) => {
                const count = stats.users.companion_popularity[name] || 0;
                const pct = Math.round((count / totalCompanionPicks) * 100);
                return (
                  <div key={name} className="text-center space-y-2">
                    <p className="text-sm font-bold">{name}</p>
                    <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                      />
                    </div>
                    <p className="text-xs text-gray-400">{count} users ({pct}%)</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Section: Revenue ────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-green-400" />
            <h2 className="font-bold text-lg">Revenue Metrics</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/10 col-span-2 md:col-span-1">
              <p className="text-xs text-gray-400 mb-1">Estimated MRR</p>
              <p className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400">
                ₹{stats.revenue.estimated_mrr_inr.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-gray-600 font-mono mt-1">Basic×299 + Premium×599</p>
            </div>
            <StatCard icon={Users} label="Active Subscribers" value={stats.revenue.active_subscribers} sub={`Conversion: ${stats.revenue.trial_conversion_rate}`} color="text-purple-400" />
            <StatCard icon={TrendingUp} label="Free Trial Users" value={stats.revenue.free_trial_users} color="text-yellow-400" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Star className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold">{stats.revenue.basic_subscribers}</p>
                <p className="text-xs text-gray-400">Basic Subscribers</p>
                <p className="text-[10px] text-gray-600 font-mono">₹99/wk · ₹299/mo</p>
              </div>
            </div>
            <div className="glass-panel p-5 rounded-2xl border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <p className="text-2xl font-extrabold">{stats.revenue.premium_subscribers}</p>
                <p className="text-xs text-gray-400">Premium Subscribers</p>
                <p className="text-[10px] text-gray-600 font-mono">₹199/wk · ₹599/mo</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section: Usage ──────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="w-5 h-5 text-purple-400" />
            <h2 className="font-bold text-lg">Platform Usage</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <StatCard icon={MessageCircle} label="Messages Today" value={stats.usage.messages_today} sub="Last 24 hours" color="text-purple-400" />
            <StatCard icon={Mic} label="Total Voice Minutes" value={`${stats.usage.total_voice_minutes}m`} sub="All time" color="text-teal-400" />
          </div>
        </section>

        {/* ── Section: System Health ──────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-green-400" />
            <h2 className="font-bold text-lg">System Health</h2>
          </div>
          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {healthServices.map(({ name, key, icon: Icon }) => {
                const h = stats.health[key] || { status: "error" as HealthStatus };
                const statusColors = {
                  ok: "border-green-500/30 bg-green-500/5",
                  degraded: "border-yellow-500/30 bg-yellow-500/5",
                  error: "border-red-500/30 bg-red-500/5",
                };
                return (
                  <div key={key} className={`p-4 rounded-xl border ${statusColors[h.status]} space-y-2`}>
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <p className="text-sm font-bold">{name}</p>
                    </div>
                    <HealthDot status={h.status} latency={h.latency} />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Section: Feedback ───────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-yellow-400" />
              <h2 className="font-bold text-lg">User Feedback</h2>
            </div>
            {stats.feedback.unreviewed_count > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                {stats.feedback.unreviewed_count} unreviewed
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
            {/* Avg Rating */}
            <div className="glass-panel p-5 rounded-2xl border border-white/10 text-center">
              <p className="text-xs text-gray-400 mb-2">Average Rating</p>
              <p className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-400">
                {stats.feedback.avg_rating}
              </p>
              <div className="flex justify-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      parseFloat(stats.feedback.avg_rating) >= star ? "text-yellow-400 fill-yellow-400" : "text-gray-600"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Type Breakdown */}
            <div className="glass-panel p-5 rounded-2xl border border-white/10 md:col-span-2">
              <p className="text-xs text-gray-400 mb-3 font-mono uppercase tracking-widest">Feedback by Type</p>
              <div className="space-y-2">
                {Object.entries(stats.feedback.type_breakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => {
                    const total = Object.values(stats.feedback.type_breakdown).reduce((a, b) => a + b, 0) || 1;
                    const pct = Math.round((count / total) * 100);
                    const Icon = FEEDBACK_ICONS[type] || HelpCircle;
                    const color = FEEDBACK_COLORS[type] || "text-gray-400";
                    return (
                      <div key={type} className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="capitalize">{type.replace(/_/g, " ")}</span>
                            <span className="font-mono text-gray-400">{count} ({pct}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.7 }}
                              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {Object.keys(stats.feedback.type_breakdown).length === 0 && (
                  <p className="text-xs text-gray-500 italic">No feedback submitted yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Feedback Review Panel */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-sm">Recent Feedback</h3>
              <span className="text-[10px] text-gray-500 font-mono">Latest 10 entries</span>
            </div>
            <div className="divide-y divide-white/5">
              {stats.feedback.recent.length === 0 ? (
                <p className="text-xs text-gray-500 italic p-5">No feedback yet.</p>
              ) : (
                stats.feedback.recent.map((fb) => {
                  const Icon = FEEDBACK_ICONS[fb.feedback_type] || HelpCircle;
                  const color = FEEDBACK_COLORS[fb.feedback_type] || "text-gray-400";
                  return (
                    <div
                      key={fb.id}
                      onClick={() => setSelectedFeedback(selectedFeedback?.id === fb.id ? null : fb)}
                      className={`p-4 cursor-pointer hover:bg-white/[0.02] transition-all ${
                        !fb.is_reviewed ? "bg-yellow-500/[0.02] border-l-2 border-l-yellow-500/30" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold capitalize">{fb.feedback_type?.replace(/_/g, " ")}</span>
                              {!fb.is_reviewed && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-mono">NEW</span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 truncate">{fb.message || "No message"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 text-right">
                          {fb.rating && (
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} className={`w-3 h-3 ${fb.rating >= s ? "text-yellow-400 fill-yellow-400" : "text-gray-700"}`} />
                              ))}
                            </div>
                          )}
                          <span className="text-[10px] text-gray-600 font-mono">
                            {new Date(fb.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Expanded feedback detail */}
                      {selectedFeedback?.id === fb.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-3 pt-3 border-t border-white/5"
                        >
                          <p className="text-xs text-gray-300 leading-relaxed mb-3">{fb.message || "No additional message."}</p>
                          {fb.companion_name && (
                            <p className="text-xs text-gray-500 mb-3">
                              Companion: <span className="text-pink-400 font-bold">{fb.companion_name}</span>
                            </p>
                          )}
                          {!fb.is_reviewed && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markReviewed(fb.id); }}
                              disabled={markingReviewed === fb.id}
                              className="text-xs px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 font-bold transition-all"
                            >
                              {markingReviewed === fb.id ? "Marking..." : "✓ Mark as Reviewed"}
                            </button>
                          )}
                          {fb.is_reviewed && (
                            <span className="text-xs text-gray-600 font-mono">✓ Reviewed</span>
                          )}
                        </motion.div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="pb-8 text-center text-[10px] text-gray-700 font-mono">
          Admin Console · Luna AI Platform · Data is live and read-only
        </div>
      </main>
    </div>
  );
}
