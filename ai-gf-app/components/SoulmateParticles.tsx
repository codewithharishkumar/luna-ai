"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

type Props = {
  level: number;
};

type Particle = {
  size: number;
  left: number;
  top: number;
  delay: number;
  duration: number;
};

export function SoulmateParticles({ level }: Props) {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    // Avoid synchronous state changes inside effect body to prevent cascading render warnings
    const handle = requestAnimationFrame(() => {
      setMounted(true);

      const generatedParticles = Array.from({
        length: Math.min(level * 6, 30),
      }).map(() => ({
        size: Math.random() * 6 + 2,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 3,
        duration: Math.random() * 5 + 3,
      }));

      setParticles(generatedParticles);
    });

    return () => cancelAnimationFrame(handle);
  }, [level]);

  // PREVENT SSR HYDRATION MISMATCH
  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            background: level >= 5 ? "#ff4fd8" : "#9d4edd",
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            filter: "blur(2px)",
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 1, 0.2],
            scale: [1, 1.4, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
}
