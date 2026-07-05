/**
 * lib/relationship.ts
 *
 * SERVER-ONLY relationship engine.
 * Contains LLM evaluation logic with OpenAI and Supabase writes.
 * DO NOT import this in Client Components — use lib/relationship-utils.ts instead.
 */
import OpenAI from "openai";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

import { STAGES, calculateRelationshipScore, getRelationshipStage } from "@/lib/relationship-utils";
export { STAGES, calculateRelationshipScore, getRelationshipStage } from "@/lib/relationship-utils";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Character specific growth multipliers
const CHARACTER_MODIFIERS: Record<string, Record<string, number>> = {
  Luna: { romance: 1.5, trust: 1.0, attachment: 1.0, closeness: 1.0, loyalty: 1.0, affection: 1.2 },
  Aiko: { romance: 1.0, trust: 1.0, attachment: 1.5, closeness: 1.5, loyalty: 1.0, affection: 1.2 },
  Mia:  { romance: 1.0, trust: 1.5, attachment: 1.0, closeness: 1.0, loyalty: 1.5, affection: 1.0 },
  Nova: { romance: 0.5, trust: 1.0, attachment: 1.0, closeness: 1.0, loyalty: 1.0, affection: 1.0 }, // Nova requires high trust manually handled
};

export async function applyLazyDecay(state: any): Promise<any> {
  if (!state.last_interaction_at) return state;

  const daysPassed = (Date.now() - new Date(state.last_interaction_at).getTime()) / (1000 * 60 * 60 * 24);
  
  if (daysPassed < 1) return state; // Only decay if more than a day passed

  const newState = { ...state };
  
  // Differential decay rates per day
  const DECAY_RATES = {
    trust: 0.05,       // Very slow
    loyalty: 0.01,     // Almost none
    attachment: 0.1,   // Slow
    closeness: 0.2,    // Moderate
    romance: 0.2,      // Moderate
    affection: 0.2     // Moderate
  };

  for (const key of Object.keys(DECAY_RATES)) {
    if (newState[key] > 0) {
      newState[key] = Math.max(0, newState[key] - (daysPassed * DECAY_RATES[key as keyof typeof DECAY_RATES]));
    }
  }

  return newState;
}

export async function evaluateRelationship(
  userMessage: string,
  aiReply: string,
  currentState: any,
  character: string,
  userId: string
) {
  try {
    // 1. Lazy Decay Application on the current state
    const decayedState = await applyLazyDecay(currentState);

    // 2. LLM Evaluation for Deltas
    const prompt = `
Analyze the emotional impact of the user's latest message on the relationship.
Look for deeper concepts: emotional vulnerability, appreciation, gratitude, trust signals, abusive behavior, and romantic signals.

Output a JSON object with deltas (-3 to +3) for each relationship dimension based on the message.
- Trust: Increases with vulnerability, consistency, keeping promises. Decreases with lies or erratic behavior.
- Closeness: Increases with sharing personal details, daily check-ins. Decreases with coldness.
- Attachment: Increases when the user relies on the AI or expresses missing them.
- Romance: Increases with flirting, affectionate pet names, declarations of love.
- Loyalty: Increases when the user defends the AI or expresses long-term commitment.
- Affection: General warmth and kindness.

If the user is abusive, insulting, or cruel, apply negative deltas (-1 to -3) primarily to Trust and Affection.

User Message: "${userMessage}"
AI Reply Context: "${aiReply}"

Output JSON ONLY:
{
  "trust_delta": 0,
  "closeness_delta": 0,
  "attachment_delta": 0,
  "romance_delta": 0,
  "loyalty_delta": 0,
  "affection_delta": 0,
  "milestone_detected": null
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const deltas = JSON.parse(response.choices[0].message.content || "{}");
    const modifiers = CHARACTER_MODIFIERS[character] || CHARACTER_MODIFIERS["Luna"];

    // 3. Apply Deltas and Clamp
    const clamp = (val: number) => Math.min(Math.max(Math.round(val), 0), 100);
    const limitDelta = (delta: number) => Math.min(Math.max(delta || 0, -3), 3); // Max +-3 per message
    
    // Nova Special Rule: Romance cannot increase if trust is < 40
    let finalRomanceDelta = limitDelta(deltas.romance_delta) * modifiers.romance;
    if (character === "Nova" && decayedState.trust < 40 && finalRomanceDelta > 0) {
      finalRomanceDelta = 0; // Block romance growth
    }

    const newState = {
      trust: clamp(decayedState.trust + (limitDelta(deltas.trust_delta) * modifiers.trust)),
      closeness: clamp(decayedState.closeness + (limitDelta(deltas.closeness_delta) * modifiers.closeness)),
      attachment: clamp(decayedState.attachment + (limitDelta(deltas.attachment_delta) * modifiers.attachment)),
      romance: clamp(decayedState.romance + finalRomanceDelta),
      loyalty: clamp(decayedState.loyalty + (limitDelta(deltas.loyalty_delta) * modifiers.loyalty)),
      affection: clamp(decayedState.affection + (limitDelta(deltas.affection_delta) * modifiers.affection)),
      total_messages: (decayedState.total_messages || 0) + 1,
      last_interaction_at: new Date().toISOString()
    };

    const newScore = calculateRelationshipScore(newState);
    const newStage = getRelationshipStage(newScore);
    
    let highestStage = decayedState.highest_stage_achieved || "Stranger";
    const stagesList = ["Stranger", "Acquaintance", "Friend", "Close Friend", "Best Friend", "Crush", "Deep Crush", "Romantic Partner", "Life Partner", "Soulmate"];
    if (stagesList.indexOf(newStage) > stagesList.indexOf(highestStage)) {
      highestStage = newStage;
    }

    // 4. Update Database
    await supabase.from("relationships").update({
      trust: newState.trust,
      closeness: newState.closeness,
      attachment: newState.attachment,
      romance: newState.romance,
      loyalty: newState.loyalty,
      affection: newState.affection,
      total_messages: newState.total_messages,
      last_interaction_at: newState.last_interaction_at,
      highest_stage_achieved: highestStage
    }).eq("user_id", userId).eq("character", character);

    // 5. Milestones Handling
    const milestonesToInsert = [];
    
    if (newState.total_messages === 1) {
      milestonesToInsert.push({ milestone_type: "first_conversation", description: "First interaction" });
    } else if (newState.total_messages === 100) {
      milestonesToInsert.push({ milestone_type: "100_messages", description: "Reached 100 messages" });
    } else if (newState.total_messages === 500) {
      milestonesToInsert.push({ milestone_type: "500_messages", description: "Reached 500 messages" });
    }

    if (deltas.milestone_detected) {
      // Check if it already exists to avoid spamming "first_secret" multiple times
      const { data: existing } = await supabase.from("relationship_milestones")
        .select("id").eq("user_id", userId).eq("character", character).eq("milestone_type", deltas.milestone_detected);
        
      if (!existing || existing.length === 0) {
        milestonesToInsert.push({ 
          milestone_type: deltas.milestone_detected, 
          description: `AI detected ${deltas.milestone_detected}` 
        });
      }
    }

    if (milestonesToInsert.length > 0) {
      await supabase.from("relationship_milestones").insert(
        milestonesToInsert.map(m => ({
          user_id: userId,
          character: character,
          milestone_type: m.milestone_type,
          description: m.description
        }))
      );
    }

  } catch (error) {
    console.error("Error evaluating relationship:", error);
  }
}
