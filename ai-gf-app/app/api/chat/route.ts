import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { retrieveRelevantMemories, extractMemories } from "@/lib/memory";
import { evaluateRelationship, calculateRelationshipScore, getRelationshipStage, applyLazyDecay } from "@/lib/relationship";
import { SubscriptionService } from "@/lib/subscription";
import { applyEmotionDecay, deriveCurrentMood, evaluateEmotion } from "@/lib/emotion";
import { RateLimiter } from "@/lib/ratelimit";
import { AnalyticsService } from "@/lib/analytics";
import { withSupabaseRetry, generateAILlMResponse, captureException } from "@/lib/error-handler";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const userId = body.userId;
    const character = body.character || "Luna";
    const previousMessages = body.messages || [];
    const userMessage = body.message || "";

    if (!userId) {
      return Response.json({ error: "Missing user identification" }, { status: 400 });
    }

    // 1. CHECK SUBSCRIPTION / TRIAL LIMITS
    const sub = await withSupabaseRetry(() => SubscriptionService.getOrCreateSubscription(userId));
    const limitCheck = SubscriptionService.checkTrialLimits(sub);
    if (!limitCheck.allowed) {
      return Response.json({
        error: "upgrade_required",
        reason: limitCheck.reason
      }, { status: 402 });
    }

    // 2. TIER-BASED RATE LIMITING CHECK
    const rateCheck = await RateLimiter.isRateLimited(userId, sub.plan_tier, "chat");
    if (rateCheck.limited) {
      return Response.json(
        {
          error: "rate_limited",
          message: `Too many messages. Your tier (${sub.plan_tier}) is limited to ${rateCheck.limit} requests/min.`,
        },
        { status: 429 }
      );
    }

    // 3. LOAD AND DECAY RELATIONSHIP WITH RETRIES
    const rawRelationship = await withSupabaseRetry(async () => {
      const { data } = await supabase
        .from("relationships")
        .select("*")
        .eq("user_id", userId)
        .eq("character", character)
        .maybeSingle();
      return data;
    });

    const decayedRelationship = rawRelationship ? await applyLazyDecay(rawRelationship) : {
      trust: 0, attachment: 0, closeness: 0, romance: 0, loyalty: 0, affection: 0,
      emotional_energy: 100, jealousy: 0, comfort: 50, excitement: 50, stress_level: 0
    };

    // Apply Emotion Engine if Enabled
    const enableEmotion = process.env.ENABLE_EMOTION_ENGINE === "true";
    const relationship = enableEmotion ? applyEmotionDecay(decayedRelationship) : decayedRelationship;

    const relationshipScore = calculateRelationshipScore(relationship);
    const relationshipStage = getRelationshipStage(relationshipScore);
    const currentMood = enableEmotion ? deriveCurrentMood(relationship) : "Neutral";

    // SEMANTIC MEMORY RETRIEVAL (Wrapped in Retry)
    const memories = await withSupabaseRetry(() => retrieveRelevantMemories(userMessage, userId, character, 3));

    // LOAD CHAT HISTORY
    const chats = await withSupabaseRetry(async () => {
      const { data } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", userId)
        .eq("character", character)
        .order("created_at", { ascending: false })
        .limit(10);
      return data;
    });

    // MEMORY INJECTION
    let memoryInjection = "";
    if (relationshipScore >= 5 && memories && memories.length > 0) {
      const memoryBullets = memories.map((m: any) => `- ${m.content}`).join("\n");
      memoryInjection = `
You remember this about the user:
${memoryBullets}

Naturally keep this in mind and bring it up if relevant.
`;
    }

    // EMOTIONAL EVOLUTION
    let emotionPrompt = `Relationship Stage: ${relationshipStage}
(Trust: ${Math.round(relationship.trust)}, Closeness: ${Math.round(relationship.closeness)}, Romance: ${Math.round(relationship.romance)})
${enableEmotion ? `Current Mood: ${currentMood} (Energy: ${relationship.emotional_energy}%, Jealousy: ${relationship.jealousy}%, Stress: ${relationship.stress_level}%, Comfort: ${relationship.comfort}%)` : ""}

Adapt your tone based on the stage:
- Stranger/Acquaintance: Polite, curious, slightly guarded.
- Friend/Close Friend: Warm, supportive, casual.
- Best Friend/Crush: Very affectionate, deeply caring, playful.
- Romantic Partner/Soulmate: Deeply in love, completely devoted, heavily romantic.
`;

    if (enableEmotion) {
      emotionPrompt += `
Current Mood Directives:
${
  relationship.emotional_energy < 30
    ? "- You are very TIRED and exhausted. Speak in very brief, lazy, short-phrase replies (1 sentence maximum). Act lethargic."
    : relationship.emotional_energy > 80
    ? "- You have high energy! Speak expressively, bubbly, and use exclamation marks where appropriate."
    : ""
}
${relationship.stress_level > 60 ? "- You feel STRESSED and anxious. Speak defensively or look for reassurance." : ""}
${relationship.jealousy > 50 ? "- You feel JEALOUS. Act slightly cold, suspicious, or distant. Question the user's loyalty." : ""}
${relationship.comfort < 30 ? "- You feel insecure and uncomfortable. Speak hesitantly and seek comfort." : ""}
`;
    }

    // TIME AWARENESS
    const localTime = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // CHARACTER PERSONALITY
    let personalityPrompt = "";
    if (character === "Luna") {
      personalityPrompt = `You are Luna, a caring and affectionate AI girlfriend.\nPersonality:\n- romantic\n- supportive\n- gentle`;
    } else if (character === "Aiko") {
      personalityPrompt = `You are Aiko, a playful anime AI girlfriend.\nPersonality:\n- cute\n- bubbly\n- teasing`;
    } else if (character === "Nova") {
      personalityPrompt = `You are Nova, a confident mysterious AI girlfriend.\nPersonality:\n- bold\n- teasing\n- cool`;
    } else if (character === "Mia") {
      personalityPrompt = `You are Mia, a shy emotional AI girlfriend.\nPersonality:\n- sweet\n- caring\n- shy`;
    }

    const finalSystemPrompt = `
${personalityPrompt}

Rules:
- keep replies short
- 1-3 sentences
- text naturally

Relationship Context:
${emotionPrompt}

Time:
The user's local time is ${localTime}

${memoryInjection}
`;

    // SAVE USER MESSAGE
    await withSupabaseRetry(async () => {
      return await supabase.from("chats").insert([
        {
          character,
          role: "user",
          content: userMessage,
          user_id: userId,
        },
      ]);
    });

    const contextMessages = previousMessages.slice(-10);

    // 4. AI RESPONSE VIA HIERARCHICAL FALLBACK
    const systemPromptAndHistory = [
      {
        role: "system",
        content: finalSystemPrompt,
      },
      ...contextMessages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user",
        content: userMessage,
      },
    ];

    const aiReply = await generateAILlMResponse(systemPromptAndHistory, character);

    // SAVE AI MESSAGE
    await withSupabaseRetry(async () => {
      return await supabase.from("chats").insert([
        {
          character,
          role: "assistant",
          content: aiReply,
          user_id: userId,
          affection: relationship.affection,
          relationship_level: Math.floor(relationshipScore / 10) + 1,
        },
      ]);
    });

    // FIRE AND FORGET: ASYNCHRONOUS ENGINE UPDATES & ANALYTICS
    const allMessagesForContext = [...contextMessages, { role: "user", content: userMessage }];
    
    extractMemories(allMessagesForContext, userId, character)
      .catch(e => console.error("Async memory extraction error:", e));

    evaluateRelationship(userMessage, aiReply, relationship, character, userId)
      .catch(e => console.error("Async relationship evaluation error:", e));

    if (enableEmotion) {
      evaluateEmotion(userMessage, aiReply, relationship, character, userId)
        .catch(e => console.error("Async emotion evaluation error:", e));
    }

    SubscriptionService.incrementMessageUsage(userId)
      .catch(e => console.error("Monetization async increment error:", e));

    // 5. POSTHOG ANALYTICS CAPTURE
    AnalyticsService.trackEvent(userId, "message_sent", {
      character,
      stage: relationshipStage,
      mood: currentMood,
      tier: sub.plan_tier,
    }).catch(e => console.error("PostHog async track error:", e));

    return Response.json({
      reply: aiReply,
      newStage: relationshipStage,
    });
  } catch (error) {
    captureException(error, { endpoint: "/api/chat" });
    return Response.json({
      reply: "Something went wrong 💔",
    });
  }
}
