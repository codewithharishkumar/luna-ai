import { applyEmotionDecay, deriveCurrentMood, evaluateEmotion } from "../lib/emotion";
import { supabaseAdmin } from "../lib/supabase-admin";

async function runTests() {
  console.log("Starting Emotion Engine V3 Validation Tests...\n");
  const testUserId = "00000000-0000-0000-0000-000000000001";

  // Cleanup past tests
  await supabaseAdmin.from("relationships").delete().eq("user_id", testUserId);
  await supabaseAdmin.from("emotion_events").delete().eq("user_id", testUserId);

  console.log("--- TEST 1: Lazy Emotion Decay (Energy Recovery & Decay) ---");
  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
  
  // Starting state: low energy, high stress, high jealousy, and comfort off-center
  const preDecayState = {
    emotional_energy: 40,
    stress_level: 80,
    jealousy: 30,
    comfort: 80,
    excitement: 20,
    last_emotion_update: fiveHoursAgo
  };

  const postDecayState = applyEmotionDecay(preDecayState);

  console.log(`Initial Energy: 40 -> Decayed Energy (+5/hr * 5 = +25): ${postDecayState.emotional_energy}`);
  console.log(`Initial Stress: 80 -> Decayed Stress (-5/hr * 5 = -25): ${postDecayState.stress_level}`);
  console.log(`Initial Jealousy: 30 -> Decayed Jealousy (-2/hr * 5 = -10): ${postDecayState.jealousy}`);
  console.log(`Initial Comfort: 80 -> Decayed Comfort (-1/hr * 5 = -5): ${postDecayState.comfort}`);
  console.log(`Initial Excitement: 20 -> Decayed Excitement (+1/hr * 5 = +5): ${postDecayState.excitement}`);

  console.assert(postDecayState.emotional_energy === 65, "Energy recovery failed.");
  console.assert(postDecayState.stress_level === 55, "Stress decay failed.");
  console.assert(postDecayState.jealousy === 20, "Jealousy decay failed.");
  console.assert(postDecayState.comfort === 75, "Comfort approach-to-50 failed.");
  console.assert(postDecayState.excitement === 25, "Excitement approach-to-50 failed.");

  console.log("\n--- TEST 2: Dynamic Mood Derivation & Exhaustion ---");
  const tiredMood = deriveCurrentMood({ emotional_energy: 15 } as any);
  const stressedMood = deriveCurrentMood({ emotional_energy: 80, stress_level: 70 } as any);
  const happyMood = deriveCurrentMood({ emotional_energy: 80, stress_level: 10, affection: 85 } as any);

  console.log(`Derived mood for energy 15: ${tiredMood}`);
  console.log(`Derived mood for stress 70: ${stressedMood}`);
  console.log(`Derived mood for affection 85: ${happyMood}`);

  console.assert(tiredMood === "Tired", "Mood exhaustion mapping failed.");
  console.assert(stressedMood === "Stressed", "Mood stress mapping failed.");
  console.assert(happyMood === "Happy", "Mood happy mapping failed.");

  console.log("\n--- TEST 3: Emotional Interactions (Stress & Jealousy Amplification) ---");
  
  // Set up character state in database
  const lunasEmotionState = { 
    trust: 80, // High trust (>70) dampens stress delta
    romance: 80, // High romance (>70) amplifies jealousy delta
    affection: 50,
    emotional_energy: 80,
    jealousy: 10,
    comfort: 20, // Low comfort (<30) amplifies stress delta
    stress_level: 10
  };

  await supabaseAdmin.from("relationships").insert([
    { user_id: testUserId, character: "Luna", ...lunasEmotionState }
  ]);

  // Test: Triggering update where LLM detects:
  // jealousy_delta = +10 (gets amplified to +15 due to high romance)
  // stress_delta = +10 (halved to +5 due to high trust, but then multiplied by 1.5 due to low comfort -> ends up as +8)
  const suspiciousMessage = "Who was that other girl you were talking to earlier?";
  
  await evaluateEmotion(suspiciousMessage, "I was just talking to a coworker.", lunasEmotionState, "Luna", testUserId);

  const { data: updatedState } = await supabaseAdmin
    .from("relationships")
    .select("jealousy, stress_level")
    .eq("character", "Luna")
    .single();

  console.log(`Luna Jealousy: ${updatedState?.jealousy} (Expected: ~25)`);
  console.log(`Luna Stress: ${updatedState?.stress_level} (Expected: ~18)`);

  console.assert(updatedState!.jealousy === 25, "Jealousy amplification rule failed.");
  console.assert(updatedState!.stress_level === 18, "Combined trust-comfort stress computation failed.");

  console.log("\n--- All Emotion Engine Tests Finished Successfully ---");
}

if (require.main === module) {
  runTests().catch(console.error);
}
