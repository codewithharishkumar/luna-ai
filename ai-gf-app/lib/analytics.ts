export const AnalyticsService = {
  trackEvent: async (
    userId: string,
    event: string,
    properties: Record<string, any> = {}
  ): Promise<void> => {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

    // Gracefully bypass if PostHog credentials are not configured
    if (!posthogKey) {
      return;
    }

    try {
      // Fire-and-forget REST capture event
      fetch(`${posthogHost}/capture/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: posthogKey,
          event: event,
          properties: {
            distinct_id: userId,
            $lib: "nextjs-rest",
            ...properties,
          },
          timestamp: new Date().toISOString(),
        }),
      }).catch((e) => console.error("[PostHog Track Event Error]", e));
    } catch (error) {
      console.error("[PostHog Fatal Track Error]", error);
    }
  },
};
