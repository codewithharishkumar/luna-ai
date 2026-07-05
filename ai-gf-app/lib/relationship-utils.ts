/**
 * lib/relationship-utils.ts
 *
 * PURE CLIENT-SAFE relationship utility functions.
 * No OpenAI, no Supabase, no server-only code.
 * Safe to import in both Server and Client components.
 */

export const STAGES = [
  "Stranger",         // 0-10
  "Acquaintance",     // 11-20
  "Friend",           // 21-30
  "Close Friend",     // 31-40
  "Best Friend",      // 41-50
  "Crush",            // 51-60
  "Deep Crush",       // 61-70
  "Romantic Partner", // 71-80
  "Life Partner",     // 81-90
  "Soulmate"          // 91-100
];

/**
 * Calculate weighted relationship score (0-100).
 * Pure deterministic function — no side effects.
 */
export function calculateRelationshipScore(state: any): number {
  const trust = state.trust || 0;
  const closeness = state.closeness || 0;
  const attachment = state.attachment || 0;
  const loyalty = state.loyalty || 0;
  const affection = state.affection || 0;
  const romance = state.romance || 0;

  // Weights: Trust 25%, Closeness 20%, Attachment 20%, Loyalty 15%, Affection 10%, Romance 10%
  const score =
    (trust * 0.25) +
    (closeness * 0.20) +
    (attachment * 0.20) +
    (loyalty * 0.15) +
    (affection * 0.10) +
    (romance * 0.10);

  return Math.min(Math.max(score, 0), 100);
}

/**
 * Map a numeric relationship score to a named stage.
 * Pure deterministic function — no side effects.
 */
export function getRelationshipStage(score: number): string {
  const index = Math.min(Math.floor(score / 10), 9);
  return STAGES[index];
}
