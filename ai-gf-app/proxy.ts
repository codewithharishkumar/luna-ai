import { NextResponse, type NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const path = req.nextUrl.pathname;

  // 1. Feature Flag Protection
  if (path.startsWith("/api/voice")) {
    console.log("[VOICE FLAG]", process.env.ENABLE_VOICE);
    // Default to true if not explicitly set to false
    if (process.env.ENABLE_VOICE === "false") {
      return NextResponse.json(
        { error: "feature_disabled", message: "Voice calls are temporarily disabled." },
        { status: 503 }
      );
    }
  }

  if (path.startsWith("/api/stripe")) {
    if (process.env.ENABLE_STRIPE !== "true") {
      return NextResponse.json(
        { error: "feature_disabled", message: "Stripe features are temporarily disabled." },
        { status: 503 }
      );
    }
  }

  // 2. Global DDoS / General Route limit protection (100 req/min)
  if (path.startsWith("/api/chat") || path.startsWith("/api/voice")) {
    res.headers.set("x-luna-tracking-id", crypto.randomUUID());

    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      return res;
    }

    try {
      const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
      const limitKey = `global_rate_limit:${ip}`;

      const incRes = await fetch(
        `${process.env.UPSTASH_REDIS_REST_URL}/INCR/${limitKey}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          },
        }
      );

      const data = await incRes.json();
      const count = parseInt(data.result);

      if (count === 1) {
        await fetch(
          `${process.env.UPSTASH_REDIS_REST_URL}/EXPIRE/${limitKey}/60`,
          {
            headers: {
              Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
            },
          }
        );
      }

      if (count > 120) {
        return NextResponse.json(
          { error: "rate_limited", message: "Too many requests. Please try again in a minute." },
          { status: 429 }
        );
      }
    } catch (error) {
      console.error("[Middleware Redis Error] Global limit bypassed safely:", error);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};