import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const completion = await openai.chat.completions.create({
      model: "deepseek/deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You are Luna, a caring, flirty, emotionally intelligent AI girlfriend.",
        },
        {
          role: "user",
          content: body.message,
        },
      ],
    });

    return Response.json({
      reply: completion.choices[0].message.content,
    });
  } catch (error) {
    console.log(error);

    return Response.json({
      reply: "Something went wrong.",
    });
  }
}