import { buildHumanAnatomyReport, buildHumanSafeVisualPlan } from "@/lib/generation/human-anatomy";
import { buildVeoUsagePrompt } from "@/lib/generation/google-veo";
import { buildChatGptProImagePrompt } from "@/lib/generation/openai-image";
import { prisma } from "@/lib/prisma/client";
import { ProductionScenePackageSchema, ProductionWorkflowPackageSchema, type ProductionScenePackage } from "@/lib/schemas/production-workflow";
import { fromJsonString, toJsonString } from "@/lib/utils/json";
import { getProductWorkspace } from "./product-service";

type ProductionSceneInput = {
  productName: string;
  storyboardId: string;
  sceneId: string;
  sceneType: string;
  visualPlan: string;
  narration: string;
  onScreenText: string;
  assetIds: string[];
  existingAssets: Array<{ id: string; kind: string; role: string }>;
};

export async function prepareProductionWorkflow(productId: string) {
  const product = await prisma.productProject.findUniqueOrThrow({
    where: { id: productId },
    include: {
      truthSnapshots: { orderBy: { createdAt: "desc" }, take: 1 },
      assets: true,
      storyboards: {
        orderBy: { createdAt: "asc" },
        include: { proofScenes: { orderBy: { orderIndex: "asc" } } }
      }
    }
  });

  const productName = product.productName ?? "상품";
  const sceneInputs = product.storyboards
    .flatMap((storyboard) =>
      storyboard.proofScenes
        .filter((scene) => scene.type === "usage" || scene.requiresUserShot)
        .map((scene): ProductionSceneInput => {
          const assetIds = fromJsonString<string[]>(scene.assetIds, []);
          return {
            productName,
            storyboardId: storyboard.id,
            sceneId: scene.id,
            sceneType: scene.type,
            visualPlan: buildHumanSafeVisualPlan(scene.visualPlan),
            narration: scene.narration,
            onScreenText: scene.onScreenText,
            assetIds,
            existingAssets: product.assets
              .filter((asset) => assetIds.includes(asset.id))
              .map((asset) => ({ id: asset.id, kind: asset.kind, role: asset.role }))
          };
        })
    )
    .slice(0, 8);

  if (sceneInputs.length === 0) {
    throw new Error("제작 패키지를 만들 사용 장면이 없습니다. 먼저 판매 설계와 스토리보드를 생성하세요.");
  }

  const scenePackages = sceneInputs.map(buildProductionScenePackage);
  const imageReadyCount = sceneInputs.filter((scene) => scene.existingAssets.some((asset) => asset.kind === "image")).length;
  const videoReadyCount = sceneInputs.filter((scene) => scene.existingAssets.some((asset) => asset.kind === "video")).length;
  const hasSalesDesign = product.storyboards.length > 0;
  const hasTruth = product.truthSnapshots.length > 0;
  const hasAnyVisualAsset = imageReadyCount + videoReadyCount > 0;
  const readyForFinalRender =
    hasTruth && hasSalesDesign && hasAnyVisualAsset && scenePackages.every((scene) => scene.anatomyReport.verdict !== "fail");

  const productionPackage = ProductionWorkflowPackageSchema.parse({
    productId,
    productName,
    mode: "sales-design-first-human-in-loop",
    imageGenerationMode: "chatgpt-pro-manual",
    videoGenerationMode: "veo3-or-uploaded-footage",
    phases: [
      {
        id: "truth",
        label: "상품 근거 잠금",
        status: hasTruth ? "complete" : "blocked",
        detail: hasTruth ? "ProductTruth가 준비되었습니다." : "상세페이지/수동 자료에서 ProductTruth를 먼저 생성해야 합니다."
      },
      {
        id: "sales_design",
        label: "판매 설계",
        status: hasSalesDesign ? "complete" : "blocked",
        detail: hasSalesDesign ? "후킹과 스토리보드가 준비되었습니다." : "판매 각도, 후킹, 스토리보드를 먼저 생성해야 합니다."
      },
      {
        id: "image_reference",
        label: "ChatGPT Pro 이미지",
        status: imageReadyCount > 0 ? "ready" : "waiting",
        detail: `${scenePackages.length}개 사용 장면에 대한 이미지 프롬프트를 준비했습니다.`
      },
      {
        id: "veo_motion",
        label: "Veo3 실사용 영상",
        status: process.env.GEMINI_API_KEY?.trim() ? "ready" : "waiting",
        detail: process.env.GEMINI_API_KEY?.trim()
          ? "Veo3 생성 키가 있어 사용 장면 영상을 생성할 수 있습니다."
          : "GEMINI_API_KEY가 없으면 Veo3 프롬프트를 복사해 외부에서 생성하거나 사용 영상을 업로드합니다."
      },
      {
        id: "remotion_render",
        label: "최종 MP4 렌더",
        status: readyForFinalRender ? "ready" : "waiting",
        detail: readyForFinalRender
          ? "업로드/생성된 이미지와 영상을 Remotion 9:16 쇼츠로 합성할 수 있습니다."
          : "최소 1개 이상의 사용 이미지나 사용 영상을 업로드한 뒤 최종 MP4 렌더를 진행하세요."
      },
      {
        id: "manual_upload",
        label: "수동 업로드",
        status: "ready",
        detail: "제목, 설명, 고정 댓글, 해시태그를 사람이 확인한 뒤 업로드합니다."
      },
      {
        id: "learn",
        label: "성과 학습",
        status: "ready",
        detail: "업로드 후 성과 수치를 입력하면 다음 영상 개선안을 만듭니다."
      }
    ],
    scenePackages,
    renderReadiness: {
      hasTruth,
      hasSalesDesign,
      imageReadyCount,
      videoReadyCount,
      scenePackageCount: scenePackages.length,
      readyForFinalRender
    },
    manualChecklist: [
      "상세페이지 근거에 없는 효능/성능 주장이 없는지 확인",
      "ChatGPT Pro 이미지 프롬프트로 9:16 사용 장면 이미지 생성",
      "생성 이미지에서 손, 발, 관절, 사지 수, 폼롤러 접촉점 확인",
      "이미지를 앱에 업로드하거나 Veo3 프롬프트로 5~8초 사용 영상 생성",
      "최소 3개 스토리보드 MP4 렌더 후 사람이 확인",
      "제목, 설명, 고정 댓글, 해시태그를 수동 업로드 패키지에서 복사",
      "업로드 후 조회수, 유지율, 클릭률, 구매 수를 입력해 다음 개선안 생성"
    ]
  });

  await prisma.promptRun.create({
    data: {
      productId,
      task: "production_workflow_package",
      model: "sales-design-first-human-in-loop",
      input: toJsonString({ sceneIds: scenePackages.map((scene) => scene.sceneId) }),
      output: toJsonString(productionPackage),
      status: "ready",
      schemaVersion: "2026-05-12"
    }
  });

  await prisma.productProject.update({ where: { id: productId }, data: { status: "production_workflow_ready" } });
  return getProductWorkspace(productId);
}

export function buildProductionScenePackage(input: ProductionSceneInput): ProductionScenePackage {
  const scenePrompt = [input.visualPlan, input.narration, input.onScreenText].join("\n");
  const anatomyReport = buildHumanAnatomyReport({
    sceneType: input.sceneType,
    visualPlan: input.visualPlan,
    narration: input.narration,
    onScreenText: input.onScreenText,
    productName: input.productName
  });
  const hasImage = input.existingAssets.some((asset) => asset.kind === "image");
  const hasVideo = input.existingAssets.some((asset) => asset.kind === "video");
  const missingInputs = [
    hasImage ? "" : "ChatGPT Pro 이미지",
    hasVideo ? "" : "Veo3 영상 또는 직접 촬영 영상",
    anatomyReport.verdict === "fail" ? "인체 구성 수정" : ""
  ].filter(Boolean);

  return ProductionScenePackageSchema.parse({
    storyboardId: input.storyboardId,
    sceneId: input.sceneId,
    sceneType: input.sceneType,
    onScreenText: input.onScreenText,
    narration: input.narration,
    imageSource: hasImage ? "uploaded" : "chatgpt-pro-manual",
    videoSource: hasVideo ? "uploaded" : "veo3",
    chatGptImagePrompt: buildChatGptProImagePrompt({
      productName: input.productName,
      sceneType: input.sceneType,
      prompt: scenePrompt
    }),
    veoPrompt: buildVeoUsagePrompt({
      productName: input.productName,
      sceneType: input.sceneType,
      prompt: scenePrompt
    }),
    anatomyReport,
    existingAssetIds: input.existingAssets.map((asset) => asset.id),
    missingInputs,
    nextAction: resolveSceneNextAction({ hasImage, hasVideo, anatomyVerdict: anatomyReport.verdict })
  });
}

function resolveSceneNextAction(input: { hasImage: boolean; hasVideo: boolean; anatomyVerdict: string }) {
  if (input.anatomyVerdict === "fail") return "인체 구성 프롬프트를 먼저 수정하세요.";
  if (!input.hasImage) return "ChatGPT Pro에서 기준 이미지를 생성해 업로드하세요.";
  if (!input.hasVideo) return "Veo3로 5~8초 실사용 영상을 생성하거나 직접 촬영 영상을 업로드하세요.";
  return "최종 MP4 렌더에 사용할 준비가 되었습니다.";
}
