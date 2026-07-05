import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = body.userId;
    const character = body.character;

    if (!userId) {
      return Response.json({ messages: [], relationships: {}, streak: 0 });
    }

    // LOAD CHARACTER CHATS
    let messages: any[] = [];
    if (character) {
      const { data, error } = await supabaseAdmin
        .from("chats")
        .select("*")
        .eq("user_id", userId)
        .eq("character", character)
        .order("created_at", { ascending: true });

      if (!error && data) {
        messages = data;
      }
    }

    // LOAD RELATIONSHIPS
    const { data: rels } = await supabaseAdmin
      .from("relationships")
      .select("character, affection, relationship_level")
      .eq("user_id", userId);

    const relationshipsRecord: Record<string, any> = {};
    if (rels) {
      rels.forEach((r) => {
        relationshipsRecord[r.character] = {
          affection: r.affection,
          level: r.relationship_level,
        };
      });
    }

    // LOAD USER CHAT HISTORY FOR STREAK
    const { data: allUserChats } = await supabaseAdmin
      .from("chats")
      .select("created_at")
      .eq("user_id", userId)
      .eq("role", "user")
      .order("created_at", { ascending: false });

    // CALCULATE STREAK
    let streak = 0;
    if (allUserChats && allUserChats.length > 0) {
      const uniqueDays = new Set<string>();
      allUserChats.forEach((chat) => {
        const dateStr = new Date(chat.created_at).toISOString().split("T")[0];
        uniqueDays.add(dateStr);
      });

      const sortedDays = Array.from(uniqueDays).sort().reverse();
      const todayStr = new Date().toISOString().split("T")[0];
      const currentDate = new Date(todayStr);

      if (sortedDays.length > 0) {
        const lastChatDate = new Date(sortedDays[0]);
        const diffDays = Math.ceil(
          Math.abs(currentDate.getTime() - lastChatDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays <= 1) {
          streak = 1;
          for (let i = 1; i < sortedDays.length; i++) {
            const d1 = new Date(sortedDays[i - 1]);
            const d2 = new Date(sortedDays[i]);
            const days = Math.ceil(
              Math.abs(d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24)
            );
            if (days === 1) streak++;
            else break;
          }
        }
      }
    }

    return Response.json({ messages, relationships: relationshipsRecord, streak });
  } catch (error) {
    console.error("[/api/load]", error);
    return Response.json({ messages: [], relationships: {}, streak: 0 });
  }
}
