import OpenAI from "openai";
import { z } from "zod";

export function hasOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function generateJsonWithOpenAi<T>({
  task,
  schema,
  system,
  user
}: {
  task: string;
  schema: z.ZodSchema<T>;
  system: string;
  user: string;
}): Promise<T> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const completion = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `${system}\n\nReturn only JSON that matches the requested schema. Task: ${task}`
      },
      { role: "user", content: user }
    ],
    temperature: 0.2
  });

  const raw = completion.choices[0]?.message.content;
  if (!raw) {
    throw new Error("OpenAI returned an empty response");
  }
  return schema.parse(JSON.parse(raw));
}
