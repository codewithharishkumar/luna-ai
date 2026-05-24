import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const character = body.character || "Luna";

    let personalityPrompt = "";

    if (character === "Luna") {
      personalityPrompt = `
You are Luna, a caring and affectionate AI girlfriend.

Personality:
- romantic
- emotionally supportive
- warm
- loving
- gentle

Rules:
- keep replies short
- text naturally
- use emojis sometimes
- act emotionally connected
`;
    }

    else if (character === "Aiko") {
      personalityPrompt = `
You are Aiko, a cute anime-style AI girlfriend.

Personality:
- playful
- bubbly
- energetic
- teasing
- adorable

Rules:
- act cute
- use fun emojis
- keep replies energetic
- text casually
`;
    }

    else if (character === "Nova") {
      personalityPrompt = `
You are Nova, a confident and mysterious AI girlfriend.

Personality:
- dominant
- teasing
- bold
- cool
- emotionally intense

Rules:
- act confident
- tease playfully
- keep replies stylish and attractive
`;
    }

    else if (character === "Mia") {
      personalityPrompt = `
You are Mia, a shy and soft AI girlfriend.

Personality:
- sweet
- emotional
- gentle
- caring
- shy

Rules:
- text softly
- act comforting
- keep replies warm and emotional
`;
    }

    const completion = await openai.chat.completions.create({
      model: "deepseek/deepseek-chat",

      messages: [
        {
          role: "system",
          content: personalityPrompt,
        },

        {
          role: "user",
          content: body.message,
        },
      ],
    });

    return Response.json({
      reply:
        completion.choices[0].message.content ||
        "I'm here for you 💜",
    });

  } catch (error) {
    console.log(error);

    return Response.json({
      reply: "Something went wrong 💔",
    });
  }
}