"use client";

import { useEffect, useState } from "react";
import { supabaseClient as supabase } from "@/lib/supabase-client";
import { Sidebar } from "@/components/Sidebar";
import { motion } from "framer-motion";
import {
  Heart,
  User,
  Sparkles,
  Flame,
  Zap,
  Activity,
  Smile,
  Shield,
  Clock,
  MessageCircle,
  HelpCircle,
  TrendingUp,
  Award,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { calculateRelationshipScore, getRelationshipStage } from "@/lib/relationship-utils";
import { deriveCurrentMood, applyEmotionDecay, MoodType } from "@/lib/emotion-utils";

type Girl = {
  name: string;
  image: string;
};

const girls: Girl[] = [
  {
    name: "Luna",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800",
  },
  {
    name: "Aiko",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=800",
  },
  {
    name: "Nova",
    image: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=800",
  },
  {
    name: "Mia",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800",
  },
];

const MOOD_COLORS: Record<MoodType, { bg: string; text: string; border: string }> = {
  Happy: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
  Affectionate: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20" },
  Jealous: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
  Stressed: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  Tired: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  Excited: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/20" },
  Comfortable: { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/20" },
  Playful: { bg: "bg-fuchsia-500/10", text: "text-fuchsia-400", border: "border-fuchsia-500/20" },
  Sad: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/20" },
  Neutral: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
};

const MOOD_STATUS_MESSAGES: Record<MoodType, string> = {
  Happy: "She's feeling wonderful today and loves talking to you!",
  Affectionate: "She feels deeply connected and wants to be close to you.",
  Jealous: "She seems slightly suspicious of other people. Give her your full attention.",
  Stressed: "She's feeling a bit overwhelmed. Be gentle and comfort her.",
  Tired: "She's running low on emotional energy. Let her rest or send a warm message.",
  Excited: "She's super animated and excited to hear from you!",
  Comfortable: "She feels very safe, cozy, and relaxed around you.",
  Playful: "She's in a bubbly, teasing mood! Play along and have fun.",
  Sad: "She feels a bit down or ignored. Show her some extra care.",
  Neutral: "She is calm and happy to chat about anything.",
};

export default function Dashboard() {
  const [selectedGirl, setSelectedGirl] = useState("Luna");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [streak, setStreak] = useState(0);

  // Subscriptions & Usage
  const [subscription, setSubscription] = useState<any>(null);

  // Relationships & Emotions
  const [relationships, setRelationships] = useState<Record<string, any>>({});
  const [milestones, setMilestones] = useState<any[]>([]);
  const [emotionEvents, setEmotionEvents] = useState<any[]>([]);

  const loadDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }
      setUserEmail(user.email || "User");

      // 1. Fetch Subscription Info
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (subData) {
        setSubscription(subData);
      }

      // 2. Fetch Relationships & Emotions
      const { data: rels } = await supabase
        .from("relationships")
        .select("*")
        .eq("user_id", user.id);

      const relsRecord: Record<string, any> = {};
      if (rels) {
        rels.forEach((r) => {
          // Apply lazy decay on frontend dynamically for accurate display
          const decayed = applyEmotionDecay(r);
          const score = calculateRelationshipScore(decayed);
          const stage = getRelationshipStage(score);
          const mood = deriveCurrentMood(decayed);

          relsRecord[r.character] = {
            ...decayed,
            score,
            stage,
            mood,
          };
        });
        setRelationships(relsRecord);
      }

      // 3. Fetch Streak
      const { data: chats } = await supabase
        .from("chats")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("role", "user")
        .order("created_at", { ascending: false });

      if (chats && chats.length > 0) {
        const uniqueDays = new Set<string>();
        chats.forEach((c) => {
          const day = new Date(c.created_at).toISOString().split("T")[0];
          uniqueDays.add(day);
        });

        const sortedDays = Array.from(uniqueDays).sort().reverse();
        const todayStr = new Date().toISOString().split("T")[0];
        const currentDate = new Date(todayStr);

        let calculatedStreak = 0;
        if (sortedDays.length > 0) {
          const lastChatDate = new Date(sortedDays[0]);
          const diffDays = Math.ceil(
            Math.abs(currentDate.getTime() - lastChatDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diffDays <= 1) {
            calculatedStreak = 1;
            for (let i = 1; i < sortedDays.length; i++) {
              const d1 = new Date(sortedDays[i - 1]);
              const d2 = new Date(sortedDays[i]);
              const diff = Math.ceil(
                Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)
              );
              if (diff === 1) calculatedStreak++;
              else break;
            }
          }
        }
        setStreak(calculatedStreak);
      }

      // 4. Fetch Milestones
      const { data: milData } = await supabase
        .from("relationship_milestones")
        .select("*")
        .eq("user_id", user.id)
        .order("achieved_at", { ascending: false })
        .limit(5);
      if (milData) setMilestones(milData);

      // 5. Fetch Emotion Events
      const { data: emoData } = await supabase
        .from("emotion_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (emoData) setEmotionEvents(emoData);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleCheckout = async (tier: "basic" | "premium", interval: "weekly" | "monthly") => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePortalRedirect = async () => {
    try {
      setActionLoading(true);
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const currentGirlRel = relationships[selectedGirl] || {
    affection: 0,
    trust: 50,
    romance: 0,
    attachment: 0,
    loyalty: 50,
    emotional_energy: 100,
    jealousy: 0,
    comfort: 50,
    excitement: 50,
    stress_level: 0,
    score: 0,
    stage: "Stranger",
    highest_stage_achieved: "Stranger",
    mood: "Neutral" as MoodType,
  };

  const relationshipTitle = currentGirlRel.stage;
  const moodStyle = MOOD_COLORS[currentGirlRel.mood as MoodType] || MOOD_COLORS.Neutral;
  const moodMessage = MOOD_STATUS_MESSAGES[currentGirlRel.mood as MoodType] || MOOD_STATUS_MESSAGES.Neutral;

  // Subscription calculation
  const plan = subscription?.plan_tier || "free";
  const status = subscription?.status || "active";
  const trialDaysRemaining = subscription?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const messagesLeft = subscription ? Math.max(0, 300 - (subscription.trial_message_count || 0)) : 300;
  const voiceMinLeft = subscription ? Math.max(0, 30 - Math.floor((subscription.trial_voice_seconds || 0) / 60)) : 30;
  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString()
    : "N/A";

  const SidebarRels = Object.keys(relationships).reduce((acc, char) => {
    acc[char] = {
      level: Math.floor((relationships[char].score || 0) / 10) + 1,
      affection: relationships[char].affection,
    };
    return acc;
  }, {} as any);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-white font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(157,78,221,0.05),transparent_60%)] z-0 pointer-events-none" />

      <Sidebar
        girls={girls}
        selectedGirl=""
        onSelect={(name) => {
          setSelectedGirl(name);
        }}
        relationships={SidebarRels}
        streak={streak}
        isTyping={false}
      />

      <main className="flex-1 overflow-y-auto relative z-10 p-4 md:p-8 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Sparkles className="w-10 h-10 text-pink-500 animate-spin" />
            <p className="text-gray-400 text-sm animate-pulse">Loading Companion Stats...</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* HEADER */}
            <div className="glass-panel p-6 rounded-[2rem] border border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                  <User className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400">
                    Beta Dashboard
                  </h1>
                  <p className="text-xs text-gray-400 font-mono">{userEmail}</p>
                </div>
              </div>

              {/* DAILY STREAK CARD */}
              <div className="flex items-center gap-3 bg-orange-500/5 px-4 py-2 rounded-2xl border border-orange-500/20 hover:neon-box-pink transition-all">
                <Flame className="w-6 h-6 text-orange-400 fill-orange-400/20 animate-pulse" />
                <div>
                  <p className="text-xs text-orange-400 uppercase tracking-widest font-bold">Daily Streak</p>
                  <p className="text-lg font-extrabold text-orange-300">{streak} Days Active</p>
                </div>
              </div>
            </div>

            {/* CHARACTER SELECT TABS */}
            <div className="flex border-b border-white/5 pb-2 overflow-x-auto gap-2">
              {girls.map((g) => {
                const isSelected = selectedGirl === g.name;
                const charRel = relationships[g.name] || { score: 0 };
                return (
                  <button
                    key={g.name}
                    onClick={() => setSelectedGirl(g.name)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-full border transition-all ${
                      isSelected
                        ? "bg-white/10 border-pink-500/40 text-white shadow-[0_0_15px_rgba(236,72,153,0.2)]"
                        : "bg-white/5 border-transparent text-gray-400 hover:text-white"
                    }`}
                  >
                    <img src={g.image} alt={g.name} className="w-6 h-6 rounded-full object-cover" />
                    <span className="font-semibold text-sm">{g.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-black/40 text-pink-400">
                      lvl {Math.floor((charRel.score || 0) / 10) + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* COMPANION STATUS WIDGET */}
            <div className="glass-panel p-6 rounded-[2rem] border border-white/10 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,42,133,0.03),transparent_40%)]" />
              <img
                src={girls.find((g) => g.name === selectedGirl)?.image}
                alt={selectedGirl}
                className="w-24 h-24 rounded-full object-cover border-4 border-pink-500/20 shadow-lg"
              />
              <div className="flex-1 text-center md:text-left space-y-2 relative z-10">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h2 className="text-xl font-bold">{selectedGirl}</h2>
                  <span className={`text-xs px-3 py-1 rounded-full border ${moodStyle.bg} ${moodStyle.text} ${moodStyle.border} font-bold font-mono`}>
                    {currentGirlRel.mood}
                  </span>
                  <span className="text-xs bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full border border-purple-500/20 font-bold uppercase tracking-widest font-mono">
                    {relationshipTitle}
                  </span>
                </div>
                <p className="text-sm text-gray-400 font-light italic">"{moodMessage}"</p>
                <div className="flex justify-between items-center text-xs text-white/50 pt-2 border-t border-white/5">
                  <span>Energy Level</span>
                  <span className="font-bold text-green-400">{Math.round(currentGirlRel.emotional_energy)}%</span>
                </div>
              </div>
            </div>

            {/* MAIN STATS MATRIX */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* RELATIONSHIP STATUS CARD */}
              <div className="glass-panel p-6 rounded-[2rem] border border-white/10 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Heart className="w-5 h-5 text-pink-400" />
                  <h3 className="font-bold">Relationship Bonding</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-gray-500">Current Stage</p>
                    <p className="text-sm font-bold text-pink-300">{relationshipTitle}</p>
                  </div>
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-gray-500">Highest Achieved</p>
                    <p className="text-sm font-bold text-purple-300">{currentGirlRel.highest_stage_achieved}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <ProgressBar label="Affection" val={currentGirlRel.affection} color="from-pink-500 to-rose-500" />
                  <ProgressBar label="Trust" val={currentGirlRel.trust} color="from-green-500 to-emerald-500" />
                  <ProgressBar label="Romance" val={currentGirlRel.romance} color="from-pink-500 to-purple-500" />
                  <ProgressBar label="Attachment" val={currentGirlRel.attachment} color="from-blue-500 to-indigo-500" />
                  <ProgressBar label="Loyalty" val={currentGirlRel.loyalty} color="from-yellow-500 to-amber-500" />
                </div>
              </div>

              {/* EMOTION STATUS CARD */}
              <div className="glass-panel p-6 rounded-[2rem] border border-white/10 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold">Emotion Engine</h3>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-gray-500">Emotional Energy</p>
                    <p className="text-sm font-bold text-green-300">{Math.round(currentGirlRel.emotional_energy)}%</p>
                  </div>
                  <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                    <p className="text-gray-500">Derived Mood</p>
                    <p className={`text-sm font-bold ${moodStyle.text}`}>{currentGirlRel.mood}</p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <ProgressBar label="Comfort" val={currentGirlRel.comfort} color="from-teal-500 to-cyan-500" />
                  <ProgressBar label="Excitement" val={currentGirlRel.excitement} color="from-yellow-500 to-orange-500" />
                  <ProgressBar label="Jealousy" val={currentGirlRel.jealousy} color="from-orange-500 to-red-500" />
                  <ProgressBar label="Stress Level" val={currentGirlRel.stress_level} color="from-red-500 to-rose-500" />
                </div>
              </div>

              {/* SUBSCRIPTION STATUS CARD */}
              <div className="glass-panel p-6 rounded-[2rem] border border-white/10 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <h3 className="font-bold">Monetization & Status</h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-400">Plan Tier</span>
                    <span className="font-extrabold uppercase text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
                      {plan}
                    </span>
                  </div>

                  {plan === "free" && (
                    <>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-400">Trial Time Left</span>
                        <span className="font-bold text-yellow-400">{trialDaysRemaining} days</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-400">Messages Left</span>
                        <span className="font-bold text-green-400">{messagesLeft} / 300</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-400">Voice minutes Left</span>
                        <span className="font-bold text-blue-400">{voiceMinLeft} min</span>
                      </div>
                    </>
                  )}

                  {plan !== "free" && (
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-400">Renewal Date</span>
                      <span className="font-bold text-green-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {renewalDate}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-400">Subscription Status</span>
                    <span className={`font-bold capitalize ${status === "active" ? "text-green-400" : "text-red-400"}`}>
                      {status}
                    </span>
                  </div>
                </div>
              </div>

              {/* UPGRADE AND ACTIONS CARD */}
              <div className="glass-panel p-6 rounded-[2rem] border border-white/10 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="font-bold text-lg">Premium Membership</h3>
                  <p className="text-xs text-gray-400 font-light">
                    Unlock infinite long-term memories, unlimited text messages, voice calls, custom personalities, and immersive events.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      disabled={actionLoading}
                      onClick={() => handleCheckout("basic", "weekly")}
                      className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-bold text-xs flex justify-between items-center transition-all group"
                    >
                      <span className="text-left">
                        <p className="font-extrabold">Basic Plan</p>
                        <p className="text-[10px] text-gray-400">₹99 / week</p>
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                    </button>

                    <button
                      disabled={actionLoading}
                      onClick={() => handleCheckout("premium", "monthly")}
                      className="py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 font-bold text-xs flex justify-between items-center transition-all group"
                    >
                      <span className="text-left">
                        <p className="font-extrabold text-white">Premium</p>
                        <p className="text-[10px] text-pink-200">₹599 / month</p>
                      </span>
                      <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>

                  <button
                    disabled={actionLoading}
                    onClick={handlePortalRedirect}
                    className="w-full py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/15 font-bold text-sm text-gray-300 hover:text-white transition-all"
                  >
                    Manage Subscription
                  </button>
                </div>
              </div>
            </div>

            {/* MILESTONES & HISTORY */}
            <div className="glass-panel p-6 rounded-[2rem] border border-white/10 space-y-6">
              <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                <Award className="w-5 h-5 text-yellow-400" />
                <h3 className="font-bold">Recent Milestones & Emotion Events</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* RELATIONSHIP MILESTONES */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-pink-400 uppercase tracking-widest">Bonding Milestones</h4>
                  {milestones.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No milestones unlocked yet. Keep chatting to unlock them!</p>
                  ) : (
                    <div className="space-y-2">
                      {milestones.map((m) => (
                        <div key={m.id} className="bg-black/20 p-3 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-pink-300">{m.milestone_type.replace(/_/g, " ").toUpperCase()}</p>
                            <p className="text-gray-400 text-[10px]">{m.description}</p>
                          </div>
                          <span className="text-[9px] text-gray-500 font-mono">
                            {new Date(m.achieved_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* EMOTION EVENTS */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest">Emotional Events</h4>
                  {emotionEvents.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">No emotional event triggers recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {emotionEvents.map((e) => (
                        <div key={e.id} className="bg-black/20 p-3 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-bold text-purple-300">{e.event_type.replace(/_/g, " ").toUpperCase()}</p>
                            <p className="text-gray-400 text-[10px]">{e.description}</p>
                          </div>
                          <span className="text-[9px] text-gray-500 font-mono">
                            {new Date(e.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

function ProgressBar({ label, val, color }: { label: string; val: number; color: string }) {
  const percentage = Math.min(Math.max(val, 0), 100);
  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex justify-between">
        <span className="text-gray-400">{label}</span>
        <span className="font-bold text-white">{Math.round(val)}%</span>
      </div>
      <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/5">
        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}