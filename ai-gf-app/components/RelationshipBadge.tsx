"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useEffect, useRef } from "react";

type RelationshipBadgeProps = {
  affection: number;
  level: number;
};

function getRelationshipTitle(level: number) {
  if (level >= 5) return "Soulmate";
  if (level >= 4) return "Intimate";
  if (level >= 3) return "Close";
  if (level >= 2) return "Friend";

  return "Stranger";
}

export function RelationshipBadge({
  affection,
  level,
}: RelationshipBadgeProps) {
  const prevLevel = useRef(level);

  useEffect(() => {
    if (level > prevLevel.current) {
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }

      prevLevel.current = level;
    }
  }, [level]);

  // Progress calculation
  const progress = Math.min(
    ((affection % 50) / 50) * 100,
    100
  );

  // Relationship title
  const title = getRelationshipTitle(level);

  // Glow calculations
  const blurAmount = Math.min(
    affection / 5 + 10,
    60
  );

  const opacityAmount = Math.min(
    affection / 1000 + 0.3,
    0.9
  );

  const glowSize = Math.min(
    affection / 10 + 10,
    80
  );

  return (
    <div className="flex flex-col gap-1 items-end sm:items-start relative">

      <div className="flex items-center gap-3 relative z-10">

        {/* Aura Glow */}
        <div
          className="absolute left-4 top-4 -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen pointer-events-none transition-all duration-1000"
          style={{
            width: `${glowSize}px`,
            height: `${glowSize}px`,
            background:
              level >= 3
                ? "rgba(255,42,133,1)"
                : "rgba(157,78,221,0.5)",
            filter: `blur(${blurAmount}px)`,
            opacity: opacityAmount,
          }}
        />

        {/* Heart Icon */}
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-black/50 border border-white/20 z-10 overflow-hidden">

          <Heart className="w-4 h-4 text-pink-400 fill-pink-400 animate-pulse relative z-10" />

          {level >= 3 && (
            <motion.div
              className="absolute -inset-1 rounded-full border border-pink-400/50"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.8, 0, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
              }}
            />
          )}
        </div>

        {/* Text */}
        <div className="hidden sm:flex flex-col z-10">

          <span className="text-xs font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-400 tracking-widest uppercase">

            {title}

            <span className="text-white/50 font-normal ml-1">
              Lvl {level}
            </span>
          </span>

          <span className="text-[10px] text-gray-400 font-medium">
            {affection.toLocaleString()} Affection
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden hidden sm:block border border-white/5 z-10">

        <motion.div
          className="h-full bg-gradient-to-r from-pink-600 to-purple-500 rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${progress}%`,
          }}
          transition={{
            duration: 1,
            ease: "easeOut",
          }}
        />
      </div>
    </div>
  );
}