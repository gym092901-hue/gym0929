import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenAI, type GenerateVideosOperation, type Image as GeminiImage } from "@google/genai";
import { HUMAN_ANATOMY_GUARDRAILS, HUMAN_ANATOMY_NEGATIVE_PROMPT } from "@/lib/generation/human-anatomy";

export type GenerateVeoUsageVideoInput = {
  productId: string;
  sceneId: string;
  productName: string;
  sceneType: string;
  prompt: string;
  imagePath?: string;
  imageMimeType?: string;
};

export type GeneratedVeoVideo = {
  model: string;
  prompt: string;
  publicUrl: string;
  localPath: string;
  operationName?: string;
  mimeType: string;
};

export function buildVeoUsagePrompt(input: Pick<GenerateVeoUsageVideoInput, "productName" | "sceneType" | "prompt">): string {
  return [
    "Vertical 9:16 short-form commerce video, realistic camera movement, 5 to 8 seconds.",
    `Product: ${input.productName}.`,
    `Scene type: ${input.sceneType}.`,
    input.prompt,
    "Show one adult person naturally using the product, with a clear beginning and end of the movement.",
    "The foam roller or product contact point must remain visible throughout the shot.",
    "Keep the motion physically possible and safe-looking. No medical, cure, rehabilitation, pain relief, or body transformation claim.",
    `Human anatomy guardrails: ${HUMAN_ANATOMY_GUARDRAILS.join("; ")}.`
  ].join("\n");
}

export async function generateUsageVideoWithVeo(input: GenerateVeoUsageVideoInput): Promise<GeneratedVeoVideo | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.GOOGLE_VEO_MODEL?.trim() || "veo-3.1-generate-preview";
  const prompt = buildVeoUsagePrompt(input);
  const ai = new GoogleGenAI({ apiKey });
  const image = input.imagePath ? await readGeminiImage(input.imagePath, input.imageMimeType ?? "image/png") : undefined;
  const request = {
    model,
    prompt,
    ...(image ? { image } : {}),
    config: {
      numberOfVideos: 1,
      aspectRatio: "9:16",
      durationSeconds: Number(process.env.GOOGLE_VEO_DURATION_SECONDS ?? 8),
      resolution: process.env.GOOGLE_VEO_RESOLUTION || "720p",
      personGeneration: "allow_adult",
      negativePrompt: HUMAN_ANATOMY_NEGATIVE_PROMPT,
      enhancePrompt: true,
      generateAudio: false
    }
  } as any;
  let operation = await ai.models.generateVideos(request);

  operation = await waitForVeoOperation(ai, operation);
  if (operation.error) {
    throw new Error(`Veo 생성 실패: ${JSON.stringify(operation.error)}`);
  }

  const generatedVideo = operation.response?.generatedVideos?.[0]?.video;
  if (!generatedVideo) {
    throw new Error("Veo 응답에 generatedVideos가 없습니다.");
  }

  const relativeDir = path.join("generated", "ai-media", input.productId);
  const publicDir = path.join(process.cwd(), "public", relativeDir);
  await fs.mkdir(publicDir, { recursive: true });
  const fileName = `${input.sceneId}-veo.mp4`;
  const localPath = path.join(publicDir, fileName);

  if (generatedVideo.videoBytes) {
    await fs.writeFile(localPath, Buffer.from(generatedVideo.videoBytes, "base64"));
  } else {
    await ai.files.download({ file: generatedVideo, downloadPath: localPath } as any);
  }

  return {
    model,
    prompt,
    publicUrl: `/${relativeDir.replaceAll(path.sep, "/")}/${fileName}`,
    localPath,
    operationName: operation.name,
    mimeType: "video/mp4"
  };
}

async function readGeminiImage(imagePath: string, mimeType: string): Promise<GeminiImage> {
  const bytes = await fs.readFile(imagePath);
  return {
    imageBytes: bytes.toString("base64"),
    mimeType
  };
}

async function waitForVeoOperation(ai: GoogleGenAI, initialOperation: GenerateVideosOperation): Promise<GenerateVideosOperation> {
  const timeoutMs = Number(process.env.GOOGLE_VEO_TIMEOUT_MS ?? 600_000);
  const pollMs = Number(process.env.GOOGLE_VEO_POLL_MS ?? 10_000);
  const deadline = Date.now() + timeoutMs;
  let operation = initialOperation;

  while (!operation.done && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    operation = await ai.operations.getVideosOperation({ operation } as any);
  }

  if (!operation.done) {
    throw new Error("Veo 생성 작업이 제한 시간 안에 끝나지 않았습니다.");
  }
  return operation;
}
