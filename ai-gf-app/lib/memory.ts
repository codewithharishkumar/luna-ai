import OpenAI from "openai";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

const embeddingsOpenai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
});

const MEMORY_CATEGORIES = [
  "name", "age", "birthday", "favorite_color", "favorite_food", 
  "hobby", "education", "profession", "goals", "dreams", 
  "family", "relationship", "preferences", "personality_trait", "life_event"
];

// Simple in-memory cache to deduplicate extraction requests for the exact same conversation context
// Key: userId_character, Value: hash of last message
const extractionCache = new Map<string, string>();

export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await embeddingsOpenai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return null;
  }
}

export async function retrieveRelevantMemories(
  userMessage: string, 
  userId: string, 
  character: string,
  limit: number = 3,
  includeArchived: boolean = false
) {
  const queryEmbedding = await generateEmbedding(userMessage);
  
  if (!queryEmbedding) return [];

  const { data: memories, error } = await supabase.rpc("match_memories", {
    query_embedding: queryEmbedding,
    match_count: limit,
    match_threshold: 0.3,
    p_user_id: userId,
    p_character: character,
    include_archived: includeArchived
  });

  if (error) {
    console.error("Error retrieving memories:", error);
    return [];
  }

  // Fire-and-forget reinforcement
  if (memories && memories.length > 0) {
    Promise.all(memories.map((m: any) => supabase.rpc("reinforce_memory", { memory_id: m.id })))
      .catch(e => console.error("Reinforcement error:", e));
  }

  return memories || [];
}

async function resolveMemoryConflict(newFact: any, existingMemories: any[]) {
  const prompt = `
You are a Memory Decision Engine.
We extracted a NEW fact about the user. We also found EXISTING memories that might be related.
Decide how to handle the new fact based on the existing memories.

Actions allowed:
- CREATE: The new fact is completely new and unrelated to existing facts.
- UPDATE: The new fact is a minor correction/update to an existing fact (e.g., "I like red" -> "I love red").
- IGNORE: The new fact is a duplicate of an existing fact.
- MERGE: The new fact and existing fact should be combined into one richer fact.
- ARCHIVE_AND_CREATE: The new fact represents a major life change that contradicts an old fact (e.g., "I study Biology" -> "I changed my major to CS", or "My dog is Max" -> "Max passed away"). We archive the old one and create the new one to preserve history.

Respond ONLY in JSON format:
{
  "action": "CREATE" | "UPDATE" | "IGNORE" | "MERGE" | "ARCHIVE_AND_CREATE",
  "target_id": "UUID of the existing memory to modify (if applicable)",
  "merged_content": "The final text of the memory (required for UPDATE or MERGE)"
}

NEW FACT:
"${newFact.content}" (Category: ${newFact.category})

EXISTING MEMORIES:
${existingMemories.map(m => `[ID: ${m.id}] ${m.content}`).join("\n")}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.0,
  });

  return JSON.parse(response.choices[0].message.content || "{}");
}

export async function extractMemories(
  messages: any[], 
  userId: string, 
  character: string
) {
  try {
    const recentMessages = messages.slice(-5);
    const lastUserMessage = recentMessages.filter(m => m.role === "user").pop()?.content || "";
    
    // 1. COST OPTIMIZATION: Deduplicate repeated extraction requests
    const cacheKey = `${userId}_${character}`;
    if (extractionCache.get(cacheKey) === lastUserMessage) {
        return; // We already processed this exact last message, skip.
    }
    extractionCache.set(cacheKey, lastUserMessage);

    const conversationText = recentMessages.map(m => `${m.role}: ${m.content}`).join("\n");

    const prompt = `
Extract any new, important factual information about the user from the conversation.
Categories allowed: ${MEMORY_CATEGORIES.join(", ")}

Respond ONLY in JSON format:
{
  "memories": [
    {
      "category": "favorite_food",
      "content": "The user's favorite food is sushi.",
      "importance_score": 5,
      "confidence_score": 0.95
    }
  ]
}

- importance_score: 1-10 (10 is critical like Name/Birthday).
- confidence_score: 0.0-1.0 (How certain are you this is a genuine fact, not a joke or hypothetical?).
If there is no new factual information, return an empty array.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }, { role: "user", content: conversationText }],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    const extractedMemories = result.memories || [];

    for (const mem of extractedMemories) {
      // 2. COST OPTIMIZATION: Skip low confidence memories to save embedding costs
      if (!mem.confidence_score || mem.confidence_score < 0.7) {
          console.log(`Skipping low confidence memory: ${mem.content} (${mem.confidence_score})`);
          continue;
      }

      // 3. Check for similar existing memories to deduplicate/merge
      // First, get a temporary embedding for search
      const tempEmbedding = await generateEmbedding(mem.content);
      if (!tempEmbedding) continue;

      const { data: similarMemories } = await supabase.rpc("match_memories", {
        query_embedding: tempEmbedding,
        match_count: 3,
        match_threshold: 0.4, // Broad search to catch conflicts
        p_user_id: userId,
        p_character: character,
        include_archived: false
      });

      let action = "CREATE";
      let targetId = null;
      let finalContent = mem.content;

      if (similarMemories && similarMemories.length > 0) {
          // Send to Decision Engine
          const decision = await resolveMemoryConflict(mem, similarMemories);
          action = decision.action;
          targetId = decision.target_id;
          if (decision.merged_content) finalContent = decision.merged_content;
      }

      // Execute Action
      if (action === "IGNORE") {
          console.log(`Ignored duplicate memory: ${mem.content}`);
          continue;
      }

      const finalEmbedding = (finalContent === mem.content) ? tempEmbedding : await generateEmbedding(finalContent);

      if (action === "CREATE") {
          await supabase.from("memories").insert([{
              user_id: userId, character, category: mem.category,
              content: finalContent, importance_score: mem.importance_score || 5,
              confidence_score: mem.confidence_score, embedding: finalEmbedding,
              last_accessed_at: new Date().toISOString()
          }]);
      } else if ((action === "UPDATE" || action === "MERGE") && targetId) {
          await supabase.from("memories").update({
              content: finalContent,
              embedding: finalEmbedding,
              last_accessed_at: new Date().toISOString(),
              confidence_score: Math.max(mem.confidence_score, 0.9) // Boost confidence on merge
          }).eq("id", targetId);
      } else if (action === "ARCHIVE_AND_CREATE" && targetId) {
          // Archive old
          await supabase.from("memories").update({
              is_archived: true,
              archived_at: new Date().toISOString()
          }).eq("id", targetId);
          
          // Create new
          await supabase.from("memories").insert([{
            user_id: userId, character, category: mem.category,
            content: finalContent, importance_score: mem.importance_score || 5,
            confidence_score: mem.confidence_score, embedding: finalEmbedding,
            last_accessed_at: new Date().toISOString()
        }]);
      }
    }

  } catch (error) {
    console.error("Error in memory extraction task:", error);
  }
}
