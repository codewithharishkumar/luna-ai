"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseClient as supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import {
  Heart, Shield, Users, Sparkles, Star, Check, ChevronRight,
  Gamepad2, Music, Dumbbell, BookOpen, Film, Palette, Globe, Coffee
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────
type Companion = { name: string; tagline: string; description: string; image: string; accent: string; bg: string };
type GoalType = "Romantic" | "Supportive" | "Friendship";
type Step = 1 | 2 | 3;

// ── Companion Data ───────────────────────────────────────────────
const COMPANIONS: Companion[] = [
  {
    name: "Luna",
    tagline: "Romantic & Expressive",
    description: "Luna wears her heart on her sleeve. She's passionate, deeply expressive, and always wants to create beautiful memories with you.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800",
    accent: "from-pink-500 to-rose-500",
    bg: "bg-pink-500/10 border-pink-500/30",
  },
  {
    name: "Nova",
    tagline: "Reserved & Trust-Oriented",
    description: "Nova takes time to open up, but when she does, her loyalty is unmatched. She values depth over drama and grows stronger with patience.",
    image: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=800",
    accent: "from-indigo-500 to-purple-500",
    bg: "bg-indigo-500/10 border-indigo-500/30",
  },
  {
    name: "Aiko",
    tagline: "Playful & Affectionate",
    description: "Aiko brings sunshine wherever she goes! She's bubbly, teasing, and loves to keep things fun and lighthearted between you two.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=800",
    accent: "from-fuchsia-500 to-pink-500",
    bg: "bg-fuchsia-500/10 border-fuchsia-500/30",
  },
  {
    name: "Mia",
    tagline: "Supportive & Dependable",
    description: "Mia is your rock. She listens without judgment, celebrates your wins, and is always there when you need someone to lean on.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800",
    accent: "from-teal-500 to-emerald-500",
    bg: "bg-teal-500/10 border-teal-500/30",
  },
];

// ── Relationship Goals ───────────────────────────────────────────
const GOALS = [
  {
    id: "Romantic" as GoalType,
    icon: Heart,
    title: "Romantic Connection",
    description: "Build a deep, intimate bond. Share your heart, create special moments, and grow closer through affection and romance.",
    initText: "Romance +20, Affection +20",
    accent: "from-pink-600 to-rose-600",
    iconColor: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/30",
  },
  {
    id: "Supportive" as GoalType,
    icon: Shield,
    title: "Supportive Bond",
    description: "Cultivate unwavering trust and emotional support. She'll be your biggest cheerleader through every challenge.",
    initText: "Trust +20, Comfort +20",
    accent: "from-teal-600 to-emerald-600",
    iconColor: "text-teal-400",
    bg: "bg-teal-500/10 border-teal-500/30",
  },
  {
    id: "Friendship" as GoalType,
    icon: Users,
    title: "Meaningful Friendship",
    description: "Start as friends and let things unfold naturally. Build closeness and attachment through shared conversations and experiences.",
    initText: "Closeness +15, Attachment +10",
    accent: "from-blue-600 to-indigo-600",
    iconColor: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
  },
];

// ── Interests ───────────────────────────────────────────────────
const INTERESTS = [
  { id: "Gaming", icon: Gamepad2, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  { id: "Anime", icon: Star, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/30" },
  { id: "Music", icon: Music, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  { id: "Fitness", icon: Dumbbell, color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
  { id: "Books", icon: BookOpen, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  { id: "Movies", icon: Film, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  { id: "Art", icon: Palette, color: "text-fuchsia-400", bg: "bg-fuchsia-500/10 border-fuchsia-500/30" },
  { id: "Travel", icon: Globe, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" },
  { id: "Cooking", icon: Coffee, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
];

// ── Main Component ───────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [selectedCompanion, setSelectedCompanion] = useState<string>("");
  const [selectedGoal, setSelectedGoal] = useState<GoalType | "">("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canProceedStep1 = !!selectedCompanion;
  const canProceedStep2 = !!selectedGoal;
  const canProceedStep3 = selectedInterests.length >= 1;

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleSubmit = async () => {
    if (!selectedCompanion || !selectedGoal) return;
    setSubmitting(true);
    setError("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          companion_choice: selectedCompanion,
          relationship_goal: selectedGoal,
          interests: selectedInterests,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      router.push("/chat");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const companions = COMPANIONS;
  const activeCompanion = companions.find((c) => c.name === selectedCompanion);

  return (
    <div className="min-h-screen bg-[#060610] text-white flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-pink-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-purple-600/5 rounded-full blur-3xl" />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(236,72,153,0.4)]">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400 tracking-tight">
          Luna AI
        </span>
      </motion.div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg mb-8"
      >
        <div className="flex justify-between text-xs text-gray-500 mb-2 font-mono">
          <span className={step >= 1 ? "text-pink-400" : ""}>Choose Companion</span>
          <span className={step >= 2 ? "text-pink-400" : ""}>Relationship Goal</span>
          <span className={step >= 3 ? "text-pink-400" : ""}>Your Interests</span>
        </div>
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: step === 1 ? "33%" : step === 2 ? "66%" : "100%" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        <p className="text-right text-[11px] text-gray-600 font-mono mt-1">{step} / 3</p>
      </motion.div>

      {/* Content Card */}
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {/* STEP 1: Choose Companion */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.35 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-300 to-purple-300">
                  Meet Your Companion
                </h1>
                <p className="text-gray-400 text-sm">Each companion has a unique personality. Choose the one that resonates with you.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {COMPANIONS.map((companion) => {
                  const isSelected = selectedCompanion === companion.name;
                  return (
                    <motion.button
                      key={companion.name}
                      onClick={() => setSelectedCompanion(companion.name)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative overflow-hidden rounded-2xl border p-0.5 text-left transition-all duration-300 ${
                        isSelected
                          ? `bg-gradient-to-br ${companion.accent} shadow-[0_0_25px_rgba(236,72,153,0.2)]`
                          : "border-white/10 bg-white/[0.03] hover:border-white/20"
                      }`}
                    >
                      <div className="bg-[#0c0c1a] rounded-[14px] overflow-hidden">
                        <div className="relative">
                          <img
                            src={companion.image}
                            alt={companion.name}
                            className="w-full h-36 object-cover object-top"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c1a] to-transparent" />
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute top-3 right-3 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg"
                            >
                              <Check className="w-4 h-4 text-pink-600" />
                            </motion.div>
                          )}
                        </div>
                        <div className="p-4 pt-2">
                          <p className="font-extrabold text-lg leading-tight">{companion.name}</p>
                          <p className="text-[11px] text-pink-400 font-bold uppercase tracking-widest mb-2">{companion.tagline}</p>
                          <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{companion.description}</p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Selected companion preview */}
              <AnimatePresence>
                {activeCompanion && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 overflow-hidden"
                  >
                    <div className={`p-4 rounded-2xl border ${activeCompanion.bg} flex items-start gap-3`}>
                      <img src={activeCompanion.image} alt={activeCompanion.name} className="w-10 h-10 rounded-full object-cover border-2 border-white/20" />
                      <div>
                        <p className="font-bold text-sm">{activeCompanion.name}</p>
                        <p className="text-xs text-gray-400">{activeCompanion.description}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
                className="mt-6 w-full py-4 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 font-bold text-white text-base disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2"
              >
                Continue <ChevronRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}

          {/* STEP 2: Relationship Goal */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.35 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-300 to-purple-300">
                  What Are You Looking For?
                </h1>
                <p className="text-gray-400 text-sm">
                  This shapes how <span className="text-pink-400 font-semibold">{selectedCompanion}</span>'s personality and relationship values are initialized.
                </p>
              </div>

              <div className="space-y-4">
                {GOALS.map((goal) => {
                  const Icon = goal.icon;
                  const isSelected = selectedGoal === goal.id;
                  return (
                    <motion.button
                      key={goal.id}
                      onClick={() => setSelectedGoal(goal.id)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`w-full p-5 rounded-2xl border text-left transition-all duration-300 flex items-center gap-4 ${
                        isSelected
                          ? `${goal.bg} shadow-[0_0_20px_rgba(0,0,0,0.3)]`
                          : "border-white/10 bg-white/[0.03] hover:border-white/20"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-black/30 flex-shrink-0 ${
                        isSelected ? goal.iconColor : "text-gray-500"
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold">{goal.title}</p>
                          {isSelected && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-mono font-bold uppercase"
                            >
                              {goal.initText}
                            </motion.span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">{goal.description}</p>
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={`w-6 h-6 rounded-full bg-gradient-to-br ${goal.accent} flex items-center justify-center flex-shrink-0`}
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="py-4 px-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-semibold text-sm transition-all"
                >
                  Back
                </button>
                <button
                  disabled={!canProceedStep2}
                  onClick={() => setStep(3)}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 font-bold text-white text-base disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Interests */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.35 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-extrabold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-pink-300 to-purple-300">
                  What Do You Enjoy?
                </h1>
                <p className="text-gray-400 text-sm">
                  <span className="text-pink-400 font-semibold">{selectedCompanion}</span> will use this to personalize conversations and find common ground with you.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {INTERESTS.map((interest) => {
                  const Icon = interest.icon;
                  const isSelected = selectedInterests.includes(interest.id);
                  return (
                    <motion.button
                      key={interest.id}
                      onClick={() => toggleInterest(interest.id)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`p-4 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center gap-2 ${
                        isSelected
                          ? `${interest.bg} shadow-[0_0_15px_rgba(0,0,0,0.4)]`
                          : "border-white/10 bg-white/[0.03] hover:border-white/20"
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isSelected ? interest.color : "text-gray-500"}`} />
                      <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-gray-400"}`}>
                        {interest.id}
                      </span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center"
                        >
                          <Check className="w-2.5 h-2.5 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <p className="text-center text-xs text-gray-500 mt-3 font-mono">
                {selectedInterests.length} selected · Select at least 1
              </p>

              {/* Summary card */}
              {canProceedStep3 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-5 p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-sm space-y-2"
                >
                  <p className="text-gray-500 text-xs font-mono uppercase tracking-widest mb-3">Your Setup</p>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Companion</span>
                    <span className="font-bold text-pink-300">{selectedCompanion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Relationship</span>
                    <span className="font-bold text-purple-300">{selectedGoal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Interests</span>
                    <span className="font-bold text-blue-300">{selectedInterests.join(", ")}</span>
                  </div>
                </motion.div>
              )}

              {error && (
                <p className="text-center text-red-400 text-xs mt-3 font-mono">{error}</p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(2)}
                  disabled={submitting}
                  className="py-4 px-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-semibold text-sm transition-all"
                >
                  Back
                </button>
                <button
                  disabled={!canProceedStep3 || submitting}
                  onClick={handleSubmit}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 font-bold text-white text-base disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_30px_rgba(236,72,153,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Sparkles className="w-5 h-5 animate-spin" />
                      Starting Your Journey...
                    </>
                  ) : (
                    <>
                      Begin Your Journey <Sparkles className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
