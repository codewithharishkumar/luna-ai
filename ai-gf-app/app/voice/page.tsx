"use client";

import { useEffect, useState } from "react";
import { Mic, PhoneOff, Loader2, Play } from "lucide-react";
import { motion } from "framer-motion";
import { voiceClient } from "@/lib/voice/webrtc";

type VoiceState =
  | "connecting"
  | "connected"
  | "listening"
  | "processing"
  | "speaking"
  | "disconnected"
  | "error";

export default function VoicePage() {
  const [voiceState, setVoiceState] = useState<VoiceState>("disconnected");
  const [character, setCharacter] = useState<string>("Luna");
  const [isMounted, setIsMounted] = useState(false);
  const [callInitiated, setCallInitiated] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedGirl");
      if (stored) {
        setCharacter(stored);
      }
    }
    setIsMounted(true);

    return () => {
      voiceClient.terminateCall();
    };
  }, []);

  const startCall = async () => {
    setCallInitiated(true);
    setVoiceState("connecting");
    
    voiceClient.onStateChange = (state) => {
      setVoiceState(state);
    };

    const connected = await voiceClient.initializeCall(character);
    if (connected) {
      // Auto-start listening on successful connection
      voiceClient.startListening();
    } else {
      setCallInitiated(false);
    }
  };

  const handleMic = () => {
    if (voiceState !== "listening") {
      voiceClient.startListening();
    } else {
      voiceClient.stopListening();
    }
  };

  const endCall = async () => {
    await voiceClient.terminateCall();
    window.location.href = "/chat";
  };

  const getStatusText = () => {
    if (!callInitiated) return "Ready";
    
    switch (voiceState) {
      case "connecting":
        return "Connecting...";
      case "connected":
        return "Connected";
      case "listening":
        return "Listening...";
      case "processing":
        return "Thinking...";
      case "speaking":
        return "Speaking...";
      case "error":
        return "Microphone/Playback Error";
      default:
        return "Disconnected";
    }
  };

  const getCharacterImage = () => {
    switch (character) {
      case "Aiko":
        return "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=800";
      case "Nova":
        return "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=800";
      case "Mia":
        return "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800";
      default:
        return "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800";
    }
  };

  const isMicListening = voiceState === "listening";

  if (!isMounted) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden px-6">
        <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden px-6">
      <div className="absolute inset-0 bg-gradient-to-br from-pink-900/20 via-purple-900/10 to-black" />
      <div className="absolute w-[500px] h-[500px] bg-pink-500/20 blur-[150px] rounded-full" />

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          animate={{
            scale: voiceState === "speaking" ? [1, 1.08, 1] : 1,
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
          className="relative"
        >
          <img
            src={getCharacterImage()}
            alt={character}
            className="w-40 h-40 rounded-full object-cover border-4 border-pink-500 shadow-[0_0_80px_rgba(236,72,153,0.5)]"
          />

          <motion.div
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            className="absolute inset-0 rounded-full border border-pink-500"
          />
        </motion.div>

        <h1 className="mt-8 text-4xl font-bold text-white">{character}</h1>

        <div className="mt-3 flex items-center gap-2 text-pink-400">
          {voiceState === "processing" && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>

        <div className="flex items-center gap-6 mt-12">
          {!callInitiated ? (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={startCall}
              className="px-8 py-4 rounded-full bg-pink-600 flex items-center justify-center shadow-[0_0_40px_rgba(236,72,153,0.7)] text-white font-bold gap-2 text-lg hover:bg-pink-500 transition-colors"
            >
              <Play className="w-6 h-6" /> Start Voice Call
            </motion.button>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleMic}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isMicListening
                    ? "bg-pink-600 shadow-[0_0_40px_rgba(236,72,153,0.7)]"
                    : "bg-white/10 border border-white/10"
                }`}
              >
                <Mic className="w-8 h-8 text-white" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={endCall}
                className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.6)]"
              >
                <PhoneOff className="w-8 h-8 text-white" />
              </motion.button>
            </>
          )}
        </div>

        <p className="mt-8 text-gray-500 text-sm text-center max-w-sm">
          Speak naturally with {character}. Real-time emotional AI voice interaction is active.
        </p>
      </div>
    </main>
  );
}