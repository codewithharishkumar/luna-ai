import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";
import { retrieveRelevantMemories, extractMemories } from "@/lib/memory";
import { evaluateRelationship, calculateRelationshipScore, getRelationshipStage, applyLazyDecay } from "@/lib/relationship";
import { SubscriptionService } from "@/lib/subscription";
import { applyEmotionDecay, deriveCurrentMood, evaluateEmotion } from "@/lib/emotion";
import { RateLimiter } from "@/lib/ratelimit";
import { AnalyticsService } from "@/lib/analytics";
import { withSupabaseRetry, generateAILlMResponse, captureException } from "@/lib/error-handler";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Different voices for each character
const VOICES = {
  Luna: "EXAVITQu4vr4xnSDxMaL", // Bella
  Aiko: "EXAVITQu4vr4xnSDxMaL", // Bella
  Mia: "XrExE9yKIg1WjnnlVkGX",  // Matilda
  Nova: "XrExE9yKIg1WjnnlVkGX", // Elli
};

const PROMPTS = {
  Luna: "You are Luna.\nYou are romantic, affectionate, warm, loving, and emotionally supportive. Speak naturally and sweetly. Keep replies short.",
  Aiko: "You are Aiko.\nYou are playful, cute, energetic, anime-inspired, and cheerful. Speak in a fun and lively way. Keep replies short.",
  Nova: "You are Nova.\nYou are confident, intelligent, independent, and bold. Speak with confidence and maturity. Keep replies short.",
  Mia: "You are Mia.\nYou are gentle, kind, supportive, comforting, and caring. Speak softly and warmly. Keep replies short.",
};

export async function POST(req: Request) {
  try {
    console.log("[VOICE API] POST /api/voice reached.");
    const body = await req.json();
    const transcript = body.transcript;
    const character = body.character || "Luna";
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json({ error: "Missing user identification" }, { status: 400 });
    }

    if (!transcript) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    // 1. CHECK SUBSCRIPTION / TRIAL LIMITS (Retry wrapped)
    const sub = await withSupabaseRetry(() => SubscriptionService.getOrCreateSubscription(userId));
    const limitCheck = SubscriptionService.checkTrialLimits(sub);
    if (!limitCheck.allowed) {
      return NextResponse.json({
        error: "upgrade_required",
        reason: limitCheck.reason
      }, { status: 402 });
    }

    // 2. TIER-BASED RATE LIMITING CHECK
    const rateCheck = await RateLimiter.isRateLimited(userId, sub.plan_tier, "voice");
    if (rateCheck.limited) {
      return NextResponse.json(
        {
          error: "rate_limited",
          message: `Too many voice requests. Your tier (${sub.plan_tier}) is limited to ${rateCheck.limit} requests/min.`,
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

    // SEMANTIC MEMORY RETRIEVAL (Retry wrapped)
    const memories = await withSupabaseRetry(() => retrieveRelevantMemories(transcript, userId, character, 3));

    // LOAD CHAT HISTORY (Retry wrapped)
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

    const memoryText = memories?.map((m: any) => `- ${m.content}`).join("\n") || "";

    let relationshipInfo = `
Relationship Stage: ${relationshipStage}
(Trust: ${Math.round(relationship.trust)}, Closeness: ${Math.round(relationship.closeness)}, Romance: ${Math.round(relationship.romance)})
${enableEmotion ? `Current Mood: ${currentMood} (Energy: ${relationship.emotional_energy}%, Jealousy: ${relationship.jealousy}%, Stress: ${relationship.stress_level}%, Comfort: ${relationship.comfort}%)` : ""}

Adapt your tone based on the stage:
- Stranger/Acquaintance: Polite, curious, slightly guarded.
- Friend/Close Friend: Warm, supportive, casual.
- Best Friend/Crush: Very affectionate, deeply caring, playful.
- Romantic Partner/Soulmate: Deeply in love, completely devoted, heavily romantic.
`;

    if (enableEmotion) {
      relationshipInfo += `
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

    const previousMessages = chats?.slice().reverse().map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    })) || [];

    const systemPromptAndHistory = [
      {
        role: "system",
        content: `
${PROMPTS[character as keyof typeof PROMPTS] || PROMPTS.Luna}

${relationshipInfo}

User Memories:
${memoryText}

Remember the user's name, facts, past conversations, and relationship progress.
`,
      },
      ...previousMessages,
      {
        role: "user",
        content: transcript,
      },
    ];

    // 4. AI RESPONSE VIA HIERARCHICAL FALLBACK
    const aiReply = await generateAILlMResponse(systemPromptAndHistory, character);

    // SAVE USER MESSAGE (Retry wrapped)
    await withSupabaseRetry(async () => {
      return await supabase.from("chats").insert([
        {
          character,
          role: "user",
          content: transcript,
          user_id: userId,
        },
      ]);
    });

    // SAVE AI MESSAGE (Retry wrapped)
    await withSupabaseRetry(async () => {
      return await supabase.from("chats").insert([
        {
          character,
          role: "assistant",
          content: aiReply,
          user_id: userId,
        },
      ]);
    });

    // FIRE AND FORGET: ASYNCHRONOUS UPDATE TASKS
    const allMessagesForContext = [...previousMessages, { role: "user", content: transcript }];
    
    extractMemories(allMessagesForContext, userId, character)
      .catch(e => console.log("Voice Async memory extraction error:", e));

    evaluateRelationship(transcript, aiReply, relationship, character, userId)
      .catch(e => console.log("Voice Async relationship evaluation error:", e));

    if (enableEmotion) {
      evaluateEmotion(transcript, aiReply, relationship, character, userId)
        .catch(e => console.log("Voice Async emotion evaluation error:", e));
    }

    // ESTIMATE VOICE DURATION & INCREMENT USAGE
    const word_count = aiReply.split(/\s+/).length;
    const durationSeconds = Math.max(Math.ceil((word_count / 120) * 60), 3);
    SubscriptionService.incrementVoiceUsage(userId, durationSeconds)
      .catch(e => console.error("Voice monetization increment error:", e));

    // 5. POSTHOG ANALYTICS CAPTURE
    AnalyticsService.trackEvent(userId, "voice_call_started", {
      character,
      duration: durationSeconds,
      tier: sub.plan_tier,
    }).catch(e => console.error("PostHog async track error:", e));

    // ELEVENLABS TEXT-TO-SPEECH
    let base64Audio = null;
    if (ELEVENLABS_API_KEY) {
      try {
        const voiceId = VOICES[character as keyof typeof VOICES] || VOICES.Luna;
        const elevenResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
          {
            method: "POST",
            headers: {
              Accept: "audio/mpeg",
              "Content-Type": "application/json",
              "xi-api-key": ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
              text: aiReply,
              model_id: "eleven_multilingual_v2",
              voice_settings: {
                stability: 0.45,
                similarity_boost: 0.85,
                style: 0.7,
                use_speaker_boost: true,
              },
            }),
          }
        );

        if (elevenResponse.ok) {
          const audioBuffer = await elevenResponse.arrayBuffer();
          base64Audio = Buffer.from(audioBuffer).toString("base64");
        } else {
          const errorText = await elevenResponse.text();
          console.error("[ELEVENLABS ERROR]", errorText);
        }
      } catch (err) {
        console.error("[ELEVENLABS FETCH ERROR]", err);
      }
    } else {
      console.warn("[VOICE] ELEVENLABS_API_KEY is missing. Audio will not be generated.");
    }

    // Capture Voice End event
    AnalyticsService.trackEvent(userId, "voice_call_ended", {
      character,
      duration: durationSeconds,
    }).catch(e => console.error("PostHog end track error:", e));

    return NextResponse.json({
      character,
      transcript,
      reply: aiReply,
      audioUrl: base64Audio ? `data:audio/mpeg;base64,${base64Audio}` : null,
    });
  } catch (error) {
    captureException(error, { endpoint: "/api/voice" });
    return NextResponse.json({ error: "Voice API failed" }, { status: 500 });
  }
}