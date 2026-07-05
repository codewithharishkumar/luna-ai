"use client";

import { useState } from "react";
import { supabaseClient } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

async function checkOnboardingAndRedirect(
  accessToken: string,
  router: ReturnType<typeof useRouter>
) {
  try {
    const res = await fetch("/api/onboarding", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (data.onboarding_complete) {
      router.push("/chat");
    } else {
      router.push("/onboarding");
    }
  } catch {
    router.push("/chat"); // fallback
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // SIGNUP
  async function handleSignup() {
    if (!email || !password) {
      setError("Please fill all fields");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const { data: signUpData, error: signUpError } =
        await supabaseClient.auth.signUp({ email, password });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (signUpData.session) {
        router.push("/onboarding");
      } else {
        setError("Account created! Please check your email to confirm your account.");
        setLoading(false);
      }
    } catch {
      setError("Signup failed. Please try again.");
      setLoading(false);
    }
  }

  // LOGIN
  async function handleLogin() {
    if (!email || !password) {
      setError("Please fill all fields");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const { data: signInData, error: signInError } =
        await supabaseClient.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (signInData.session) {
        await checkOnboardingAndRedirect(signInData.session.access_token, router);
      }

      setLoading(false);
    } catch {
      setError("Login failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6 overflow-hidden relative">

      {/* BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-900/20 via-purple-900/10 to-black" />

      {/* GLOW */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-pink-500/20 blur-[120px] rounded-full" />
      <div className="absolute bottom-20 right-20 w-72 h-72 bg-purple-500/20 blur-[120px] rounded-full" />

      {/* CARD */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 shadow-2xl"
      >
        <h1 className="text-5xl font-bold text-white mb-3">Luna AI 💜</h1>
        <p className="text-gray-400 mb-8">Your futuristic emotional AI companion</p>

        <div className="space-y-5">
          {/* ERROR */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* EMAIL */}
          <input
            id="email"
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 text-white outline-none focus:border-pink-500 transition"
          />

          {/* PASSWORD */}
          <input
            id="password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 text-white outline-none focus:border-purple-500 transition"
          />

          {/* LOGIN */}
          <button
            id="login-btn"
            onClick={handleLogin}
            disabled={loading}
            className="w-full p-4 rounded-2xl bg-gradient-to-r from-pink-600 to-purple-600 text-white font-bold hover:scale-[1.02] transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>

          {/* SIGNUP */}
          <button
            id="signup-btn"
            onClick={handleSignup}
            disabled={loading}
            className="w-full p-4 rounded-2xl border border-white/10 bg-white/5 text-white font-bold hover:bg-white/10 transition disabled:opacity-60"
          >
            {loading ? "Loading..." : "Create Account"}
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm mt-8">
          Powered by Luna AI ✨
        </p>
      </motion.div>
    </main>
  );
}
