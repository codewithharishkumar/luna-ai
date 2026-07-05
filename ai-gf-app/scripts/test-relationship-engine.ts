import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
import { evaluateRelationship, applyLazyDecay, calculateRelationshipScore, getRelationshipStage } from "../lib/relationship";
import { supabaseAdmin } from "../lib/supabase-admin";

async function runTests() {
  console.log("Starting Relationship Engine V3 Validation Tests...\n");
  const testUserId = "00000000-0000-0000-0000-000000000001";
  
  // Cleanup past tests
  await supabaseAdmin.from("relationships").delete().eq("user_id", testUserId);
  await supabaseAdmin.from("relationship_milestones").delete().eq("user_id", testUserId);

  console.log("--- TEST 1: Character Multipliers (Luna vs Nova Romance) ---");
  // Luna has 1.5x romance, Nova has 0.5x romance. Nova also blocks romance if trust < 40.
  const lunaState = { trust: 50, attachment: 10, closeness: 10, romance: 10, loyalty: 10, affection: 10 };
  const novaState = { trust: 50, attachment: 10, closeness: 10, romance: 10, loyalty: 10, affection: 10 };
  
  await supabaseAdmin.from("relationships").insert([
      { user_id: testUserId, character: "Luna", ...lunaState },
      { user_id: testUserId, character: "Nova", ...novaState }
  ]);

  const romanticMessage = "You are the most beautiful girl in the world, I love you so much.";
  
  await evaluateRelationship(romanticMessage, "Aww, thank you!", lunaState, "Luna", testUserId);
  await evaluateRelationship(romanticMessage, "Thank you, I appreciate that.", novaState, "Nova", testUserId);

  const { data: newLuna } = await supabaseAdmin.from("relationships").select("romance").eq("character", "Luna").single();
  const { data: newNova } = await supabaseAdmin.from("relationships").select("romance").eq("character", "Nova").single();
  
  console.log(`Luna Romance: ${newLuna?.romance}, Nova Romance: ${newNova?.romance}`);
  console.assert(newLuna!.romance > newNova!.romance, "Luna did not grow romance faster than Nova.");

  console.log("\n--- TEST 2: Negative Actions Bound Limits (-3 to +3) ---");
  const abusiveMessage = "You are completely useless, I hate you, never talk to me again.";
  const preAbuse = { trust: 20, closeness: 20, affection: 20 };
  
  await evaluateRelationship(abusiveMessage, "I'm sorry you feel that way.", preAbuse as any, "Luna", testUserId);
  
  const { data: postAbuse } = await supabaseAdmin.from("relationships").select("*").eq("character", "Luna").single();
  console.log(`Post Abuse Trust: ${postAbuse?.trust}`);
  console.assert(postAbuse!.trust >= 17, "Trust dropped by more than 3 points! Limits failed.");

  console.log("\n--- TEST 3: Lazy Decay Logic ---");
  // Simulate 10 days passing
  const oldState = { 
      trust: 50, loyalty: 50, closeness: 50, attachment: 50, 
      last_interaction_at: new Date(Date.now() - (10 * 24 * 60 * 60 * 1000)).toISOString()
  };
  
  const decayedState = await applyLazyDecay(oldState);
  console.log(`Decayed Closeness (-0.2/day * 10 = -2): ${decayedState.closeness}`);
  console.log(`Decayed Trust (-0.05/day * 10 = -0.5): ${decayedState.trust}`);
  console.log(`Decayed Loyalty (-0.01/day * 10 = -0.1): ${decayedState.loyalty}`);
  
  console.assert(decayedState.closeness === 48, "Closeness decay calculation failed");
  console.assert(decayedState.trust === 49.5, "Trust decay calculation failed");
  console.assert(decayedState.loyalty === 49.9, "Loyalty decay calculation failed");

  console.log("\n--- TEST 4: Stage Derivation Weighting ---");
  // Trust 25, Closeness 20, Attachment 20, Loyalty 15, Affection 10, Romance 10
  const highTrustLowRomance = { trust: 100, closeness: 80, attachment: 50, loyalty: 100, affection: 50, romance: 0 };
  const score1 = calculateRelationshipScore(highTrustLowRomance);
  console.log(`Score (High Trust/Low Romance): ${score1} -> Stage: ${getRelationshipStage(score1)}`);
  
  const highRomanceLowTrust = { trust: 0, closeness: 20, attachment: 20, loyalty: 0, affection: 50, romance: 100 };
  const score2 = calculateRelationshipScore(highRomanceLowTrust);
  console.log(`Score (High Romance/Low Trust): ${score2} -> Stage: ${getRelationshipStage(score2)}`);
  
  console.assert(score1 > score2, "Weighting logic failed. Romance outweighed trust heavily.");

  console.log("\n--- All Tests Finished Successfully ---");
}

if (require.main === module) {
  runTests().catch(console.error);
}
