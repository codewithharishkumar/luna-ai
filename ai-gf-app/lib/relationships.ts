export function getRelationshipTitle(level: number): string {
  if (level === 1) return "Stranger";
  if (level === 2) return "Friend";
  if (level === 3) return "Close";
  if (level === 4) return "Intimate";
  if (level >= 5) return "Soulmate";
  return "Acquaintance";
}

export function getAuraGlow(level: number): string {
  if (level === 1) return "shadow-[0_0_10px_rgba(236,72,153,0.1)] border-pink-500/20";
  if (level === 2) return "shadow-[0_0_15px_rgba(236,72,153,0.3)] border-pink-500/40";
  if (level === 3) return "shadow-[0_0_20px_rgba(157,78,221,0.5)] border-purple-500/50";
  if (level === 4) return "shadow-[0_0_30px_rgba(157,78,221,0.7)] border-purple-400/70";
  if (level >= 5) return "shadow-[0_0_50px_rgba(255,42,133,0.9)] border-pink-400";
  return "";
}

export function getStatusText(level: number, isTyping: boolean): string {
  if (isTyping) return "Typing...";
  
  // Time-aware idle behaviors
  const hour = new Date().getHours();
  if (hour >= 2 && hour <= 6) return "Sleeping 💤";
  if (hour >= 7 && hour <= 9) return "Drinking coffee ☕";
  
  // If not a specific time-based state, use emotional rotation based on level
  if (level < 3) return "Online";
  
  const rand = Math.random();
  if (rand < 0.5) return "Online";
  if (rand < 0.7) return "Thinking about you";
  if (rand < 0.8) return "Looking at your messages";
  if (rand < 0.9) return "Waiting for your reply";
  return "Missing you";
}
