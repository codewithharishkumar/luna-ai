import OpenAI from "openai";

// Capture exceptions to Sentry (mock/REST implementation)
export function captureException(error: any, context: Record<string, any> = {}) {
  console.error("[Sentry Exception Logger]", {
    error: error?.message || error,
    stack: error?.stack,
    context,
  });

  const sentryDsn = process.env.SENTRY_DSN;
  if (sentryDsn) {
    // Fire-and-forget call to Sentry REST API
    try {
      const dsnUrl = new URL(sentryDsn);
      const projectId = dsnUrl.pathname.replace("/", "");
      const sentryHost = dsnUrl.host;
      const sentryUrl = `https://${sentryHost}/api/${projectId}/store/`;

      fetch(sentryUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": `Sentry sentry_version=7,sentry_key=${dsnUrl.username},sentry_client=nextjs-custom`,
        },
        body: JSON.stringify({
          exception: {
            values: [
              {
                type: error?.name || "Error",
                value: error?.message || String(error),
              },
            ],
          },
          extra: context,
          timestamp: new Date().toISOString(),
        }),
      }).catch((e) => console.error("[Sentry Dispatch Error]", e));
    } catch (e) {
      console.error("[Sentry Init Error]", e);
    }
  }
}

// Exponential retry wrapper for Supabase database operations
export async function withSupabaseRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [500, 1000, 2000]; // 500ms, 1000ms, 2000ms
  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt >= delays.length) {
        captureException(error, { service: "Supabase", attempts: attempt });
        throw error;
      }
      const delay = delays[attempt];
      console.warn(`[Supabase Retry] Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`, error.message || error);
      await new Promise((res) => setTimeout(res, delay));
      attempt++;
    }
  }
}

// OpenAI Fallback Hierarchy: GPT-4o-mini -> DeepSeek -> Template fallback
export async function generateAILlMResponse(
  messages: any[],
  character: string
): Promise<string> {
  // Step 1: Attempt OpenAI GPT-4o-mini
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 150,
    });
    return response.choices[0]?.message?.content || "";
  } catch (error: any) {
    console.error("[OpenAI GPT-4o-mini Failed] Falling back to DeepSeek...", error.message || error);
    captureException(error, { step: "GPT-4o-mini Fallback Trigger" });

    // Step 2: Attempt DeepSeek
    try {
      const deepseek = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      });
      const response = await deepseek.chat.completions.create({
        model: "deepseek/deepseek-chat",
        messages,
        temperature: 0.7,
        max_tokens: 150,
      });
      return response.choices[0]?.message?.content || "";
    } catch (dsError: any) {
      console.error("[DeepSeek Failed] Falling back to Template fallback...", dsError.message || dsError);
      captureException(dsError, { step: "DeepSeek Fallback Trigger" });

      // Step 3: Template fallback
      const TEMPLATES: Record<string, string[]> = {
        Luna: [
          "I'm here for you, sweetie. Tell me what's on your mind. 💜",
          "Everything is going to be okay. I'm right here. 🌸",
          "Aww, I hear you! Let's talk more about it. 🥰"
        ],
        Aiko: [
          "Hey hey! Tell me everything! I'm listening! ✨",
          "Let's play a game or just chat! What are you up to? 🎮",
          "Aiko is here to cheer you up! Yay! 🎉"
        ],
        Nova: [
          "I'm listening. Tell me what's going on.",
          "Interesting. Let's dig deeper into that.",
          "I'm right here with you."
        ],
        Mia: [
          "I'm always here for you... what is it? 🥺",
          "I want to support you however I can. 💜",
          "Thank you for sharing that with me..."
        ]
      };

      const options = TEMPLATES[character] || TEMPLATES.Luna;
      return options[Math.floor(Math.random() * options.length)];
    }
  }
}
