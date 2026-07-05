import ws from "ws";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    realtime: {
      transport: ws as any,
    },
  }
);

async function main() {
  console.log("Starting Relationship Backfill Migration...");

  const { data: relationships, error } = await supabase
    .from("relationships")
    .select("*");

  if (error) {
    console.error("Error fetching relationships:", error);
    process.exit(1);
  }

  if (!relationships || relationships.length === 0) {
    console.log("No relationships found. Done!");
    process.exit(0);
  }

  console.log(`Found ${relationships.length} relationships to migrate.`);

  let successCount = 0;
  let errorCount = 0;

  for (const rel of relationships) {
    try {
      // If already migrated, skip (assuming if trust > 0 it's migrated, unless it's a completely new user)
      // Actually we will just overwrite if they haven't been active, but let's be safe.
      if (rel.trust > 0 || rel.total_messages > 0) {
        console.log(`Skipping ${rel.user_id} - already migrated or active.`);
        continue;
      }

      const legacyAffection = rel.affection || 1;
      
      // Normalize legacy affection. Let's assume old level 10 was affection ~ 500.
      // We cap the base at 125 to map safely to 100 max.
      const normalizedBase = Math.min(Math.max(legacyAffection, 0), 125);
      
      const closeness = Math.min(Math.round(normalizedBase * 0.8), 100);
      const attachment = Math.min(Math.round(normalizedBase * 0.8), 100);
      const trust = Math.min(Math.round(normalizedBase * 0.5), 100);
      const romance = Math.min(Math.round(normalizedBase * 0.5), 100);
      const loyalty = Math.min(Math.round(normalizedBase * 0.6), 100);
      
      // We cap the actual 'affection' column to 100 now.
      const newAffection = Math.min(legacyAffection, 100);

      // Estimate total messages based on affection (since it grew by 1 or 5 per msg)
      const estimatedMessages = Math.max(Math.round(legacyAffection / 2), 1);

      const { error: updateError } = await supabase
        .from("relationships")
        .update({ 
            affection: newAffection,
            trust,
            closeness,
            attachment,
            romance,
            loyalty,
            total_messages: estimatedMessages,
            last_interaction_at: new Date().toISOString()
        })
        .eq("user_id", rel.user_id)
.eq("character", rel.character);

      if (updateError) {
        console.error(
  `Failed to update relationship ${rel.user_id}-${rel.character}:`,
  updateError
);
        errorCount++;
      } else {
        successCount++;
      }

    } catch (err) {
      console.error(`Error processing relationship ${rel.id}:`, err);
      errorCount++;
    }
  }

  console.log("=========================================");
  console.log(`Relationship Backfill complete.`);
  console.log(`Successfully processed: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log("=========================================");
}

main().catch(console.error);
