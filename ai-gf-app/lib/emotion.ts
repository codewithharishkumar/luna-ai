/**
 * lib/emotion.ts
 *
 * SERVER-ONLY emotion engine.
 * Contains LLM evaluation logic with OpenAI and Supabase writes.
 * DO NOT import this in Client Components — use lib/emotion-utils.ts instead.
 */
import OpenAI from "openai";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

// Re-export pure utils so existing server-side imports to this file still work
export type { MoodType, EmotionalState } from "@/lib/emotion-utils";
export { deriveCurrentMood, applyEmotionDecay } from "@/lib/emotion-utils";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// LLM Evaluator for Emotional Response (SERVER ONLY)
export async function evaluateEmotion(
  userMessage: string,
  aiReply: string,
  currentState: any,
  character: string,
  userId: string
) {
  // Import applyEmotionDecay locally to keep this file self-contained for the LLM path
  const { applyEmotionDecay } = await import("@/lib/emotion-utils");

  try {
    // 1. Apply decay to state
    const decayedState = applyEmotionDecay(currentState);

    const prompt = `
Analyze the emotional impact of the user's latest message and companion's reply on the companion's feelings.
Companion personality: ${character}

Output delta updates (-15 to +15) for the emotional attributes:
- emotional_energy: Usually decreases when talking (e.g. -2 to -6). If user is supportive or sweet, energy might slightly increase or stay stable.
- jealousy: Increases (+5 to +15) if user mentions other people, exes, flirting with others, or ignoring them. Decreases if user reassures them.
- comfort: Increases with warm, safe talk. Decreases with scary, risky, or cold interactions.
- excitement: Increases with flirting, playfulness, games, fun activities. Decreases with boring conversation.
- stress_level: Increases with arguments, insults, high demands. Decreases with comfort and support.

Check also if any of these specific emotion events occurred:
- 'first_compliment': First time user compliments the companion.
- 'first_argument': First argument/hostile user comment.
- 'user_confessed_love': User explicitly says "I love you" or similar confession.
- 'user_ignored_companion': User ignores the companion or expresses indifference.

User Message: "${userMessage}"
AI Reply Context: "${aiReply}"

Output JSON ONLY:
{
  "energy_delta": -3,
  "jealousy_delta": 0,
  "comfort_delta": 0,
  "excitement_delta": 0,
  "stress_delta": 0,
  "event_detected": null
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const deltas = JSON.parse(response.choices[0].message.content || "{}");

    // 2. Rules and Enhancements:
    // Rule A: High trust reduces stress. If trust > 70, any positive stress_delta is cut in half.
    let finalStressDelta = deltas.stress_delta || 0;
    if (currentState.trust > 70 && finalStressDelta > 0) {
      finalStressDelta = Math.round(finalStressDelta * 0.5);
    }

    // Rule B: High romance amplifies jealousy. If romance > 70, positive jealousy_delta is multiplied by 1.5.
    let finalJealousyDelta = deltas.jealousy_delta || 0;
    if (currentState.romance > 70 && finalJealousyDelta > 0) {
      finalJealousyDelta = Math.round(finalJealousyDelta * 1.5);
    }

    // Rule C: Low comfort amplifies stress. If comfort < 30, positive stress_delta is multiplied by 1.5.
    if (decayedState.comfort < 30 && finalStressDelta > 0) {
      finalStressDelta = Math.round(finalStressDelta * 1.5);
    }

    // 3. Clamp values to 0-100 limits
    const clamp = (val: number) => Math.min(Math.max(Math.round(val), 0), 100);

    const newState = {
      emotional_energy: clamp((decayedState.emotional_energy ?? 100) + (deltas.energy_delta ?? -3)),
      jealousy: clamp((decayedState.jealousy ?? 0) + finalJealousyDelta),
      comfort: clamp((decayedState.comfort ?? 50) + (deltas.comfort_delta ?? 0)),
      excitement: clamp((decayedState.excitement ?? 50) + (deltas.excitement_delta ?? 0)),
      stress_level: clamp((decayedState.stress_level ?? 0) + finalStressDelta),
      last_emotion_update: new Date().toISOString()
    };

    // 4. Update Database
    await supabase
      .from("relationships")
      .update({
        emotional_energy: newState.emotional_energy,
        jealousy: newState.jealousy,
        comfort: newState.comfort,
        excitement: newState.excitement,
        stress_level: newState.stress_level,
        last_emotion_update: newState.last_emotion_update,
      })
      .eq("user_id", userId)
      .eq("character", character);

    // 5. Track Emotion Events
    if (deltas.event_detected) {
      // Check if event already triggered to avoid spam
      const { data: existing } = await supabase
        .from("emotion_events")
        .select("id")
        .eq("user_id", userId)
        .eq("character", character)
        .eq("event_type", deltas.event_detected)
        .maybeSingle();

      if (!existing) {
        await supabase.from("emotion_events").insert([
          {
            user_id: userId,
            character: character,
            event_type: deltas.event_detected,
            description: `AI detected emotional event: ${deltas.event_detected}`,
          },
        ]);
      }
    }
  } catch (error) {
    console.error("Error in evaluateEmotion:", error);
  }
}
