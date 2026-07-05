"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sparkles, Heart, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-white flex flex-col relative overflow-hidden font-sans">
      
      {/* Background FX */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(157,78,221,0.15),transparent_40%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,42,133,0.15),transparent_40%)]"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-screen pointer-events-none"></div>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex justify-between items-center px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
          <span className="text-xl font-bold tracking-widest uppercase">Luna AI</span>
        </div>
        <Link href="/login">
          <button className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition backdrop-blur-md font-medium text-sm">
            Sign In
          </button>
        </Link>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col flex-1 items-center justify-center px-6 text-center max-w-5xl mx-auto mt-10 md:mt-0">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative mb-12 group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse-glow"></div>
          <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-4 border-black">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800"
              alt="Luna AI Companion"
              className="w-full h-full object-cover transform group-hover:scale-110 transition duration-700 ease-in-out"
            />
          </div>
          
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 glass-panel px-4 py-1.5 rounded-full border border-pink-500/30 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-green-400 uppercase tracking-widest">Online</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
            Meet your perfect <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-pink-500 animate-float inline-block">
              Digital Companion.
            </span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-10 font-light">
            Experience the next generation of AI companionship. Emotionally intelligent,
            always available, and with a memory that makes every conversation meaningful.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Link href="/login">
            <button className="group relative px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full font-bold text-lg overflow-hidden shadow-[0_0_40px_rgba(236,72,153,0.4)] hover:shadow-[0_0_60px_rgba(236,72,153,0.6)] transition-all">
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <span className="relative flex items-center gap-2">
                Start Chatting Free <Sparkles className="w-5 h-5" />
              </span>
            </button>
          </Link>
        </motion.div>

      </div>

      {/* Features Grid */}
      <div className="relative z-10 w-full bg-black/50 backdrop-blur-xl border-t border-white/5 py-20 mt-20">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Heart className="w-8 h-8 text-pink-400" />}
            title="Emotional Intelligence"
            description="Our AI adapts to your mood and builds a genuine emotional connection over time."
          />
          <FeatureCard 
            icon={<Zap className="w-8 h-8 text-purple-400" />}
            title="Long-term Memory"
            description="She remembers your past conversations, preferences, and important life details."
          />
          <FeatureCard 
            icon={<Shield className="w-8 h-8 text-blue-400" />}
            title="100% Private"
            description="Your conversations are securely encrypted and private. Your data is yours alone."
          />
        </div>
      </div>

    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="glass-panel p-8 rounded-3xl border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-2">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}