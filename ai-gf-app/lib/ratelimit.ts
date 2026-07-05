export type UserTier = "free" | "basic" | "premium" | "ultra";

const LIMITS: Record<UserTier, { chat: number; voice: number }> = {
  free: { chat: 20, voice: 10 },
  basic: { chat: 50, voice: 20 },
  premium: { chat: 100, voice: 50 },
  ultra: { chat: 9999, voice: 9999 }, // Exempt
};

export const RateLimiter = {
  isRateLimited: async (
    identifier: string,
    tier: UserTier,
    type: "chat" | "voice"
  ): Promise<{ limited: boolean; limit: number; remaining: number; reset: number }> => {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    // Gracefully bypass if Upstash Redis credentials are not configured
    if (!url || !token) {
      return { limited: false, limit: 0, remaining: 9999, reset: 0 };
    }

    const limits = LIMITS[tier] || LIMITS.free;
    const limit = type === "chat" ? limits.chat : limits.voice;

    const key = `ratelimit:${identifier}:${type}:${Math.floor(Date.now() / 60000)}`;

    try {
      // Execute atomic INCR and EXPIRE in a single Redis pipeline call to Upstash REST API
      const response = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, "60"],
        ]),
      });

      if (!response.ok) {
        throw new Error(`Upstash returned status ${response.status}`);
      }

      const results = await response.json();
      const currentCount = results[0]?.result ?? 1;

      return {
        limited: currentCount > limit,
        limit,
        remaining: Math.max(0, limit - currentCount),
        reset: 60 - (new Date().getSeconds()),
      };
    } catch (error) {
      console.error("[RateLimiter Error] Bypassing limits due to error:", error);
      // Fallback: allow request in case Redis is down
      return { limited: false, limit, remaining: 1, reset: 0 };
    }
  },
};
