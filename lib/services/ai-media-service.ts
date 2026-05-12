import { prisma } from "@/lib/prisma/client";
import { buildHumanAnatomyReport, buildHumanSafeVisualPlan } from "@/lib/generation/human-anatomy";
import { buildChatGptProImagePrompt, generateUsageImageWithOpenAI } from "@/lib/generation/openai-image";
import { DEFAULT_VEO_MODEL, buildVeoUsagePrompt, generateUsageVideoWithVeo } from "@/lib/generation/google-veo";
import { fromJsonString, toJsonString } from "@/lib/utils/json";
import { getProductWorkspace } from "./product-service";

type SceneForGeneration = {
  id: string;
  type: string;
  visualPlan: string;
  narration: string;
  onScreenText: string;
  assetIds: string[];
};

export async function generateAiUsageMediaForProduct(productId: string) {
  const product = await prisma.productProject.findUniqueOrThrow({
    where: { id: productId },
    include: {
      storyboards: {
        orderBy: { createdAt: "asc" },
        include: { proofScenes: { orderBy: { orderIndex: "asc" } } }
      }
    }
  });

  const scenes = product.storyboards
    .flatMap((storyboard) => storyboard.proofScenes)
    .filter((scene) => scene.type === "usage" || scene.requiresUserShot)
    .slice(0, 3)
    .map((scene): SceneForGeneration => ({
      id: scene.id,
      type: scene.type,
      visualPlan: buildHumanSafeVisualPlan(scene.visualPlan),
      narration: scene.narration,
      onScreenText: scene.onScreenText,
      assetIds: fromJsonString<string[]>(scene.assetIds, [])
    }));

  if (scenes.length === 0) {
    throw new Error("AI 영상 생성을 위한 사용 장면 스토리보드가 없습니다. 먼저 스토리보드를 생성하세요.");
  }

  await prisma.promptRun.create({
    data: {
      productId,
      task: "ai_usage_media_generation_started",
      model: [process.env.OPENAI_IMAGE_MODEL || "gpt-image-2", process.env.GOOGLE_VEO_MODEL || DEFAULT_VEO_MODEL].join(" + "),
      input: toJsonString({ sceneIds: scenes.map((scene) => scene.id) }),
      status: "started",
      schemaVersion: "2026-05-12"
    }
  });

  for (const scene of scenes) {
    await generateSceneMedia(productId, product.productName ?? "상품", scene);
  }

  await prisma.productProject.update({ where: { id: productId }, data: { status: "ai_media_prepared" } });
  return getProductWorkspace(productId);
}

async function generateSceneMedia(productId: string, productName: string, scene: SceneForGeneration) {
  const anatomyReport = buildHumanAnatomyReport({
    sceneType: scene.type,
    visualPlan: scene.visualPlan,
    narration: scene.narration,
    onScreenText: scene.onScreenText,
    productName
  });
  const scenePrompt = [scene.visualPlan, scene.narration, scene.onScreenText].join("\n");
  const imagePrompt = buildChatGptProImagePrompt({ productName, sceneType: scene.type, prompt: scenePrompt });
  const veoPrompt = buildVeoUsagePrompt({ productName, sceneType: scene.type, prompt: scenePrompt });

  await prisma.promptRun.create({
    data: {
      productId,
      task: "human_anatomy_check",
      model: "rule-based-human-anatomy-guardrails",
      input: toJsonString({ sceneId: scene.id, scenePrompt }),
      output: toJsonString(anatomyReport),
      status: anatomyReport.verdict,
      schemaVersion: "2026-05-12"
    }
  });

  if (anatomyReport.verdict === "fail") {
    await prisma.shotRequest.create({
      data: {
        productId,
        description: `인체 구성 수정 필요: ${scene.onScreenText}`,
        reason: anatomyReport.requiredFixes.join(" / ")
      }
    });
    return;
  }

  const generatedImage = await generateUsageImageWithOpenAI({
    productId,
    sceneId: scene.id,
    productName,
    sceneType: scene.type,
    prompt: scenePrompt
  });
  let sourceImageAssetId: string | null = null;

  if (!generatedImage) {
    await recordChatGptProImagePrompt(productId, scene, imagePrompt);
  } else {
    const imageAsset = await prisma.sourceAsset.create({
      data: {
        productId,
        kind: "image",
        role: "usage",
        url: generatedImage.publicUrl,
        localPath: generatedImage.localPath,
        altText: `${productName} AI 사용 장면 기준 이미지`,
        metadata: toJsonString({
          provider: "openai-image",
          model: generatedImage.model,
          sceneId: scene.id,
          prompt: generatedImage.prompt,
          negativePrompt: generatedImage.negativePrompt,
          humanAnatomyReport: anatomyReport
        })
      }
    });
    sourceImageAssetId = imageAsset.id;
    await appendAssetToScene(scene.id, imageAsset.id);
  }

  const generatedVideo = await generateUsageVideoWithVeo({
    productId,
    sceneId: scene.id,
    productName,
    sceneType: scene.type,
    prompt: scenePrompt,
    imagePath: generatedImage?.localPath,
    imageMimeType: generatedImage?.mimeType
  });

  if (!generatedVideo) {
    await recordMissingProvider(productId, scene, "GEMINI_API_KEY", veoPrompt, true);
    return;
  }

  const videoAsset = await prisma.sourceAsset.create({
    data: {
      productId,
      kind: "video",
      role: "usage",
      url: generatedVideo.publicUrl,
      localPath: generatedVideo.localPath,
      altText: `${productName} Veo 사용 장면 영상`,
      metadata: toJsonString({
        provider: "google-veo",
        model: generatedVideo.model,
        sceneId: scene.id,
        operationName: generatedVideo.operationName,
        prompt: generatedVideo.prompt,
        sourceImageAssetId,
        humanAnatomyReport: anatomyReport
      })
    }
  });

  await appendAssetToScene(scene.id, videoAsset.id);
}

async function appendAssetToScene(sceneId: string, assetId: string) {
  const scene = await prisma.proofScene.findUniqueOrThrow({ where: { id: sceneId } });
  const assetIds = fromJsonString<string[]>(scene.assetIds, []);
  const nextAssetIds = [assetId, ...assetIds.filter((id) => id !== assetId)];
  await prisma.proofScene.update({
    where: { id: sceneId },
    data: {
      assetIds: toJsonString(nextAssetIds),
      requiresUserShot: false,
      shotRequest: null
    }
  });
}

async function recordMissingProvider(
  productId: string,
  scene: SceneForGeneration,
  missingEnv: string,
  prompt: string,
  createShotRequest: boolean
) {
  if (createShotRequest) {
    await prisma.shotRequest.create({
      data: {
        productId,
        description: `${missingEnv} 설정 후 AI 사용 영상 생성 가능: ${scene.onScreenText}`,
        reason: `현재 ${missingEnv}가 없어 실제 생성은 건너뛰었습니다. 생성 프롬프트: ${prompt}`
      }
    });
  }
  await prisma.promptRun.create({
    data: {
      productId,
      task: "ai_media_prompt_ready",
      model: missingEnv,
      input: toJsonString({ sceneId: scene.id, prompt }),
      status: "blocked_missing_api_key",
      schemaVersion: "2026-05-12"
    }
  });
}

async function recordChatGptProImagePrompt(productId: string, scene: SceneForGeneration, prompt: string) {
  await prisma.shotRequest.create({
    data: {
      productId,
      description: `ChatGPT Pro 이미지 생성 필요: ${scene.onScreenText}`,
      reason: `ChatGPT 이미지 생성창에 아래 프롬프트를 붙여넣고, 생성된 이미지를 이 앱의 "ChatGPT 이미지/영상 업로드"에 올리세요.\n\n${prompt}`
    }
  });
  await prisma.promptRun.create({
    data: {
      productId,
      task: "chatgpt_pro_image_prompt_ready",
      model: "chatgpt-pro-manual",
      input: toJsonString({ sceneId: scene.id, prompt }),
      status: "waiting_for_manual_chatgpt_image",
      schemaVersion: "2026-05-12"
    }
  });
}
