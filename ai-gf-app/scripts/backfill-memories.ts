import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// We need the service role key to bypass RLS for backfilling, OR anon key if we don't care, 
// but wait, anon key has RLS, so it might fail to read all users' memories.
// We'll use the service role key if available, otherwise just anon key.
// Actually, it's a script run by admin, let's use what we have or tell them to supply service key.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
  console.log("Starting memory backfill script...");

  // 1. Fetch memories that don't have embeddings
  const { data: memories, error } = await supabase
    .from("memories")
    .select("*")
    .is("embedding", null);

  if (error) {
    console.error("Error fetching memories:", error);
    process.exit(1);
  }

  if (!memories || memories.length === 0) {
    console.log("No memories found that need embeddings. Done!");
    process.exit(0);
  }

  console.log(`Found ${memories.length} memories to process.`);

  let successCount = 0;
  let errorCount = 0;

  for (const memory of memories) {
    try {
      console.log(`Processing memory ${memory.id}: "${memory.content.substring(0, 30)}..."`);
      
      // Generate embedding
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: memory.content,
        encoding_format: "float",
      });
      
      const embedding = response.data[0].embedding;

      // Update the database
      const { error: updateError } = await supabase
        .from("memories")
        .update({ 
            embedding,
            last_accessed_at: memory.last_accessed_at || new Date().toISOString()
        })
        .eq("id", memory.id);

      if (updateError) {
        console.error(`Failed to update memory ${memory.id}:`, updateError);
        errorCount++;
      } else {
        successCount++;
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 200));

    } catch (err) {
      console.error(`Error processing memory ${memory.id}:`, err);
      errorCount++;
    }
  }

  console.log("=========================================");
  console.log(`Backfill complete.`);
  console.log(`Successfully processed: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log("=========================================");
}

main().catch(console.error);
