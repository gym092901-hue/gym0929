import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { HUMAN_ANATOMY_GUARDRAILS, HUMAN_ANATOMY_NEGATIVE_PROMPT } from "@/lib/generation/human-anatomy";

export type GenerateUsageImageInput = {
  productId: string;
  sceneId: string;
  productName: string;
  sceneType: string;
  prompt: string;
};

export type GeneratedUsageImage = {
  model: string;
  prompt: string;
  negativePrompt: string;
  publicUrl: string;
  localPath: string;
  mimeType: string;
};

export function buildUsageImagePrompt(input: Pick<GenerateUsageImageInput, "productName" | "sceneType" | "prompt">): string {
  return [
    "Create a photorealistic vertical 9:16 commercial fitness product usage frame.",
    `Product: ${input.productName}.`,
    `Scene type: ${input.sceneType}.`,
    input.prompt,
    "Show one adult person using the product in a realistic home setting.",
    "The product must be clearly visible and physically touching the correct body part for the described exercise.",
    "No visible brand logos, no text, no watermark, no medical cure or pain relief claim.",
    `Human anatomy requirements: ${HUMAN_ANATOMY_GUARDRAILS.join("; ")}.`
  ].join("\n");
}

export async function generateUsageImageWithOpenAI(input: GenerateUsageImageInput): Promise<GeneratedUsageImage | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
  const size = process.env.OPENAI_IMAGE_SIZE?.trim() || "1024x1536";
  const quality = process.env.OPENAI_IMAGE_QUALITY?.trim() || "high";
  const prompt = buildUsageImagePrompt(input);

  const client = new OpenAI({ apiKey });
  const response = await client.images.generate({
    model,
    prompt,
    size,
    quality,
    n: 1
  } as any);

  const imageBase64 = (response as any).data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error("OpenAI 이미지 응답에 b64_json이 없습니다.");
  }

  const relativeDir = path.join("generated", "ai-media", input.productId);
  const publicDir = path.join(process.cwd(), "public", relativeDir);
  await fs.mkdir(publicDir, { recursive: true });
  const fileName = `${input.sceneId}-openai-image.png`;
  const localPath = path.join(publicDir, fileName);
  await fs.writeFile(localPath, Buffer.from(imageBase64, "base64"));

  return {
    model,
    prompt,
    negativePrompt: HUMAN_ANATOMY_NEGATIVE_PROMPT,
    publicUrl: `/${relativeDir.replaceAll(path.sep, "/")}/${fileName}`,
    localPath,
    mimeType: "image/png"
  };
}
