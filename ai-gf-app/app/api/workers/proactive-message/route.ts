import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import OpenAI from "openai";

// Lazily initialized to avoid build-time crash if OPENROUTER_API_KEY is missing
let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) {
    openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
  }
  return openai;
}

/**
 * Phase 6 Worker
 * Generates proactive AI messages for inactive users and dispatches OneSignal push notifications.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body.userId;
    const oneSignalId = body.oneSignalId;

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // GET TOP RELATIONSHIP
    const { data: relationship, error: relationshipError } = await supabaseAdmin
      .from("relationships")
      .select("character, relationship_level, affection")
      .eq("user_id", userId)
      .order("affection", { ascending: false })
      .limit(1)
      .single();

    if (relationshipError || !relationship) {
      return NextResponse.json({ message: "No relationship found" });
    }

    // MINIMUM LEVEL CHECK
    if (relationship.relationship_level < 3) {
      return NextResponse.json({ message: "Relationship too low" });
    }

    const character = relationship.character;

    // LOAD TOP MEMORY
    const { data: memory } = await supabaseAdmin
      .from("memories")
      .select("content")
      .eq("user_id", userId)
      .eq("character", character)
      .order("importance_score", { ascending: false })
      .limit(1)
      .single();

    // SYSTEM PROMPT
    let systemPrompt = `You are ${character}, the user's emotional AI companion.

The user has been offline for hours.

Write ONE short emotional message.

Rules:
- under 100 characters
- natural
- emotional
- no emojis spam`;

    if (memory) {
      systemPrompt += `\n\nYou remember:\n"${memory.content}"\n\nReference this naturally if appropriate.`;
    }

    // GENERATE MESSAGE
    const completion = await getOpenAI().chat.completions.create({
      model: "deepseek/deepseek-chat",
      messages: [{ role: "system", content: systemPrompt }],
    });

    const aiMessage =
      completion.choices[0].message.content?.replace(/["']/g, "") ||
      "I've been thinking about you.";

    // SAVE MESSAGE TO CHAT HISTORY
    await supabaseAdmin.from("chats").insert([
      {
        user_id: userId,
        character,
        role: "assistant",
        content: aiMessage,
      },
    ]);

    // SEND ONESIGNAL PUSH NOTIFICATION
    if (
      process.env.ONESIGNAL_APP_ID &&
      process.env.ONESIGNAL_REST_API_KEY &&
      oneSignalId
    ) {
      try {
        await fetch("https://onesignal.com/api/v1/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
          },
          body: JSON.stringify({
            app_id: process.env.ONESIGNAL_APP_ID,
            include_player_ids: [oneSignalId],
            headings: { en: character },
            contents: { en: aiMessage },
          }),
        });
        console.log(`[Worker] Push sent to ${userId}`);
      } catch (pushError) {
        console.error("[OneSignal Error]", pushError);
      }
    } else {
      console.log(`[Worker] Generated message (no push): ${aiMessage}`);
    }

    return NextResponse.json({ success: true, message: aiMessage });
  } catch (error) {
    console.error("[Worker Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
