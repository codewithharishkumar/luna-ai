"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  role: "user" | "assistant";
  content: string;
  time: string;
};

export function MessageBubble({ role, content, time }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "relative max-w-[85%] md:max-w-[70%] px-5 py-3.5 rounded-2xl shadow-lg backdrop-blur-md border",
          isUser
            ? "bg-pink-600/20 border-pink-500/50 text-white rounded-br-sm"
            : "bg-purple-900/40 border-purple-500/30 text-gray-100 rounded-bl-sm"
        )}
      >
        {isUser && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/10 to-pink-600/10 -z-10 pointer-events-none" />
        )}
        
        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans">
          {content}
        </p>
        
        <div
          className={cn(
            "text-[10px] mt-2 flex items-center gap-1",
            isUser ? "text-pink-300 justify-end" : "text-purple-300 justify-start"
          )}
        >
          <span>{time}</span>
          {isUser && (
            <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3 text-pink-400" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    </motion.div>
  );
}
