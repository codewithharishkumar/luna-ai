import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";

export async function GET() {
  const healthStatus: Record<string, any> = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      database: "unknown",
      openai: process.env.OPENAI_API_KEY ? "configured" : "missing",
      stripe: process.env.STRIPE_SECRET_KEY ? "configured" : "missing",
      redis: process.env.UPSTASH_REDIS_REST_URL ? "configured" : "missing",
    },
    feature_flags: {
      ENABLE_VOICE: process.env.ENABLE_VOICE === "true",
      ENABLE_STRIPE: process.env.ENABLE_STRIPE === "true",
      ENABLE_EMOTION_ENGINE: process.env.ENABLE_EMOTION_ENGINE === "true",
    },
  };

  try {
    // Check Supabase connectivity
    const start = Date.now();
    const { error } = await supabase.from("relationships").select("count", { head: true, count: "exact" }).limit(1);
    
    if (error) throw error;
    
    healthStatus.services.database = `ok (ping: ${Date.now() - start}ms)`;
  } catch (dbError: any) {
    healthStatus.status = "error";
    healthStatus.services.database = `failed: ${dbError.message || dbError}`;
  }

  const statusCode = healthStatus.status === "ok" ? 200 : 500;
  return NextResponse.json(healthStatus, { status: statusCode });
}
