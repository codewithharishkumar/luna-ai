import { extractMemories, retrieveRelevantMemories } from "../lib/memory";
import { supabaseAdmin } from "../lib/supabase-admin";

async function runTests() {
  console.log("Starting Memory Engine Hardening Tests...");
  const testUserId = "00000000-0000-0000-0000-000000000000"; // Dummy ID
  const testCharacter = "Luna";

  // Cleanup past tests
  await supabaseAdmin.from("memories").delete().eq("user_id", testUserId);

  console.log("\n--- TEST 1: Initial Creation & Confidence Threshold ---");
  // Should create "I like pizza" (high confidence). Should ignore "Maybe I like blue" (low confidence).
  await extractMemories([
      { role: "user", content: "I like pizza a lot." },
      { role: "user", content: "Maybe I like the color blue, I don't know." }
  ], testUserId, testCharacter);
  
  let memories = await retrieveRelevantMemories("What do I like?", testUserId, testCharacter, 10);
  console.log(`Found ${memories.length} memories.`);
  console.assert(memories.some((m: any) => m.content.includes("pizza")), "Pizza memory missing");
  console.assert(!memories.some((m: any) => m.content.includes("blue")), "Low confidence blue memory incorrectly saved");

  console.log("\n--- TEST 2: Deduplication (IGNORE) ---");
  // Should ignore duplicate
  await extractMemories([
    { role: "user", content: "I really like pizza." }
  ], testUserId, testCharacter);
  memories = await retrieveRelevantMemories("pizza", testUserId, testCharacter, 10);
  console.log(`Found ${memories.length} memories for pizza.`);
  console.assert(memories.length === 1, "Duplicate pizza memory created");

  console.log("\n--- TEST 3: Updating / Merging ---");
  // "I love pizza with extra cheese" should UPDATE or MERGE
  await extractMemories([
    { role: "user", content: "I love pizza, especially with extra cheese." }
  ], testUserId, testCharacter);
  memories = await retrieveRelevantMemories("pizza", testUserId, testCharacter, 10);
  console.log(`Memory content after merge/update: ${memories[0]?.content}`);
  console.assert(memories[0]?.content.toLowerCase().includes("cheese"), "Memory did not merge/update properly");

  console.log("\n--- TEST 4: Archiving (ARCHIVE_AND_CREATE) ---");
  await extractMemories([
    { role: "user", content: "My dog Max is a good boy." }
  ], testUserId, testCharacter);

  await extractMemories([
    { role: "user", content: "My dog Max passed away yesterday. I'm so sad." }
  ], testUserId, testCharacter);

  const activeMemories = await retrieveRelevantMemories("dog", testUserId, testCharacter, 10, false);
  const allMemories = await retrieveRelevantMemories("dog", testUserId, testCharacter, 10, true);
  
  console.log(`Active dog memories: ${activeMemories.length}`);
  console.log(`All dog memories (including archived): ${allMemories.length}`);
  console.assert(activeMemories[0]?.content.includes("passed away"), "Active memory does not reflect death");
  console.assert(allMemories.length > 1, "Old memory was not archived properly");

  console.log("\n--- All Tests Finished ---");
}

// execute if running directly
if (require.main === module) {
  runTests().catch(console.error);
}
