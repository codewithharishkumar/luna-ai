import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Relationship initialization values per goal type
const GOAL_INIT: Record<string, Record<string, number>> = {
  Romantic: { romance: 20, affection: 20 },
  Supportive: { trust: 20, comfort: 20 },
  Friendship: { closeness: 15, attachment: 10 },
};

const COMPANIONS = ["Luna", "Aiko", "Nova", "Mia"];

export async function POST(req: Request) {
  try {
    const { companion_choice, relationship_goal, interests } = await req.json();

    // Validate inputs
    if (!COMPANIONS.includes(companion_choice)) {
      return NextResponse.json({ error: "Invalid companion choice" }, { status: 400 });
    }
    if (!["Romantic", "Supportive", "Friendship"].includes(relationship_goal)) {
      return NextResponse.json({ error: "Invalid relationship goal" }, { status: 400 });
    }

    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const initValues = GOAL_INIT[relationship_goal] || {};

    // 1. Upsert onboarding record
    const { error: onboardingError } = await supabaseAdmin
      .from("user_onboarding")
      .upsert({
        user_id: userId,
        companion_choice,
        relationship_goal,
        interests: interests || [],
        onboarding_complete: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (onboardingError) {
      console.error("[Onboarding] Save error:", onboardingError);
      return NextResponse.json({ error: "Failed to save onboarding" }, { status: 500 });
    }

    // 2. Initialize relationship for chosen companion with goal-based values
    const { error: relError } = await supabaseAdmin
      .from("relationships")
      .upsert({
        user_id: userId,
        character: companion_choice,
        goal_type: relationship_goal,
        // Apply relationship goal initialization values
        ...initValues,
        // Default emotion stats
        emotional_energy: 100,
        comfort: relationship_goal === "Supportive" ? 70 : 50, // Comfort boost for Supportive
        last_emotion_update: new Date().toISOString(),
        last_interaction_at: new Date().toISOString(),
      }, { onConflict: "user_id,character" });

    if (relError) {
      console.error("[Onboarding] Relationship init error:", relError);
      // Non-fatal: still complete onboarding
    }

    return NextResponse.json({
      success: true,
      companion: companion_choice,
      goal: relationship_goal,
      redirect: "/chat",
    });
  } catch (err) {
    console.error("[Onboarding] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET: Check if user has completed onboarding
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ onboarding_complete: false });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ onboarding_complete: false });

    const { data } = await supabaseAdmin
      .from("user_onboarding")
      .select("onboarding_complete, companion_choice, relationship_goal, interests")
      .eq("user_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      onboarding_complete: data?.onboarding_complete ?? false,
      data: data || null,
    });
  } catch {
    return NextResponse.json({ onboarding_complete: false });
  }
}