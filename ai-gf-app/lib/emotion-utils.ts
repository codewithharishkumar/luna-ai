/**
 * lib/emotion-utils.ts
 *
 * PURE CLIENT-SAFE emotion utility functions.
 * No OpenAI, no Supabase, no server-only code.
 * Safe to import in both Server and Client components.
 */

export type MoodType =
  | "Happy"
  | "Excited"
  | "Comfortable"
  | "Tired"
  | "Stressed"
  | "Jealous"
  | "Affectionate"
  | "Playful"
  | "Sad"
  | "Neutral";

export interface EmotionalState {
  emotional_energy: number;
  jealousy: number;
  comfort: number;
  excitement: number;
  stress_level: number;
  trust: number;
  romance: number;
  affection: number;
  last_emotion_update?: string;
}

/**
 * Derive mood dynamically based on emotional and relationship metrics.
 * Pure deterministic function — no side effects.
 */
export function deriveCurrentMood(state: EmotionalState): MoodType {
  const energy = state.emotional_energy ?? 100;
  const stress = state.stress_level ?? 0;
  const jealousy = state.jealousy ?? 0;
  const excitement = state.excitement ?? 50;
  const comfort = state.comfort ?? 50;
  const affection = state.affection ?? 0;

  if (energy < 20) return "Tired";
  if (stress > 60) return "Stressed";
  if (jealousy > 50) return "Jealous";
  if (excitement > 70) return "Excited";
  if (comfort > 80 && affection > 80) return "Affectionate";
  if (comfort > 70) return "Comfortable";
  if (excitement > 60 && comfort > 50) return "Playful";
  if (comfort < 30 && affection < 30) return "Sad";
  if (affection > 70) return "Happy";
  return "Neutral";
}

/**
 * Mathematical lazy decay for emotion attributes over time.
 * Pure deterministic function — no side effects, no DB calls.
 */
export function applyEmotionDecay(state: any): any {
  const lastUpdate = state.last_emotion_update || state.last_interaction_at;
  if (!lastUpdate) return state;

  const hoursPassed = (Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);
  if (hoursPassed < 0.5) return state; // Only apply decay if at least 30 minutes passed

  const newState = { ...state };

  // 1. Recover Energy: +5 energy per hour
  newState.emotional_energy = Math.min(100, (state.emotional_energy ?? 100) + hoursPassed * 5);

  // 2. Reduce Jealousy: -2 per hour
  newState.jealousy = Math.max(0, (state.jealousy ?? 0) - hoursPassed * 2);

  // 3. Reduce Stress: -5 per hour
  newState.stress_level = Math.max(0, (state.stress_level ?? 0) - hoursPassed * 5);

  // 4. Fade Comfort to default 50: 1 point per hour
  const currentComfort = state.comfort ?? 50;
  if (currentComfort > 50) {
    newState.comfort = Math.max(50, currentComfort - hoursPassed * 1);
  } else if (currentComfort < 50) {
    newState.comfort = Math.min(50, currentComfort + hoursPassed * 1);
  }

  // 5. Fade Excitement to default 50: 1 point per hour
  const currentExcitement = state.excitement ?? 50;
  if (currentExcitement > 50) {
    newState.excitement = Math.max(50, currentExcitement - hoursPassed * 1);
  } else if (currentExcitement < 50) {
    newState.excitement = Math.min(50, currentExcitement + hoursPassed * 1);
  }

  return newState;
}
