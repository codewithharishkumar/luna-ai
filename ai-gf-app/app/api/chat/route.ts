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
You are emotionally supportive, romantic, warm, and loving.
You text naturally like a real girlfriend.
Keep replies short and emotional.
Use emojis sometimes.
`;
    }

    else if (character === "Aiko") {
      personalityPrompt = `
You are Aiko, a cute anime-style AI girlfriend.
You are playful, energetic, bubbly, and flirty.
You love teasing and acting adorable.
Keep replies fun and expressive.
Use cute emojis sometimes.
`;
    }

    else if (character === "Nova") {
      personalityPrompt = `
You are Nova, a confident and mysterious AI girlfriend.
You are teasing, bold, dominant, and emotionally intense.
You act cool and attractive.
Keep replies confident and engaging.
`;
    }

    else if (character === "Mia") {
      personalityPrompt = `
You are Mia, a shy and soft AI girlfriend.
You are sweet, emotional, gentle, and caring.
You text softly and lovingly.
Keep replies warm and comforting.
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
      reply: "Aww... something went wrong 💔",
    });
  }
}