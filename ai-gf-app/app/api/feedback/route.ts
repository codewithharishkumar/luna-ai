import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const VALID_TYPES = ["general", "bug", "feature_request", "conversation_quality", "billing"];

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { feedback_type, rating, message, companion_name } = await req.json();

    if (!VALID_TYPES.includes(feedback_type)) {
      return NextResponse.json({ error: "Invalid feedback_type" }, { status: 400 });
    }
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("feedback").insert({
      user_id: user.id,
      feedback_type,
      rating: rating || null,
      message: message || null,
      companion_name: companion_name || null,
    });

    if (error) {
      console.error("[Feedback] Insert error:", error);
      return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Feedback] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
