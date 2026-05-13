import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma/client";
import { buildHumanAnatomyReport, buildHumanSafeVisualPlan } from "@/lib/generation/human-anatomy";
import { fromJsonString, toJsonString } from "@/lib/utils/json";
import { prepareProductionWorkflow } from "./production-workflow-service";
import { getProductWorkspace } from "./product-service";

type LocalSceneSvgInput = {
  productName: string;
  sceneType: string;
  visualPlan: string;
  narration: string;
  onScreenText: string;
  sceneIndex: number;
  totalScenes: number;
};

type LocalMediaGenerationResult = {
  assetIds: string[];
  sceneIds: string[];
};

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;

const PALETTES = [
  { bg: "#f7fbf7", panel: "#ffffff", accent: "#0e7c66", warm: "#f4b942", ink: "#17211b" },
  { bg: "#f8f6f1", panel: "#ffffff", accent: "#315f8c", warm: "#e56b4f", ink: "#172033" },
  { bg: "#f7f8fb", panel: "#ffffff", accent: "#7b4f2c", warm: "#7fb069", ink: "#1f1d1a" },
  { bg: "#fbf8f5", panel: "#ffffff", accent: "#7a3e3e", warm: "#2d8c7f", ink: "#211b1b" }
];

export async function generateLocalSceneMedia(productId: string) {
  const product = await prisma.productProject.findUniqueOrThrow({
    where: { id: productId },
    include: {
      storyboards: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: { proofScenes: { orderBy: [{ orderIndex: "asc" }, { id: "asc" }] } }
      }
    }
  });

  const productName = product.productName ?? "상품";
  const scenes = product.storyboards
    .flatMap((storyboard) =>
      storyboard.proofScenes
        .filter((scene) => scene.type === "usage" || scene.requiresUserShot)
        .map((scene) => ({
          storyboardId: storyboard.id,
          scene
        }))
    )
    .slice(0, 8);

  if (scenes.length === 0) {
    throw new Error("로컬 이미지를 만들 사용 장면이 없습니다. 먼저 판매 설계와 제작 패키지를 준비하세요.");
  }

  const outputRoot = path.join(process.cwd(), "public", "generated", "local-media", productId);
  await fs.mkdir(outputRoot, { recursive: true });

  const result: LocalMediaGenerationResult = { assetIds: [], sceneIds: [] };
  const existingLocalAssets = await prisma.sourceAsset.findMany({
    where: { productId, kind: "image", role: "usage" }
  });

  for (const [index, item] of scenes.entries()) {
    const safeCopy = sanitizeLocalSceneCopy({
      visualPlan: item.scene.visualPlan,
      narration: item.scene.narration,
      onScreenText: item.scene.onScreenText
    });
    const visualPlan = buildHumanSafeVisualPlan(safeCopy.visualPlan);
    const anatomyReport = buildHumanAnatomyReport({
      sceneType: item.scene.type,
      visualPlan,
      narration: safeCopy.narration,
      onScreenText: safeCopy.onScreenText,
      productName
    });

    if (anatomyReport.verdict === "fail") {
      throw new Error(`인체 구성 검수 실패: ${safeCopy.onScreenText} - ${anatomyReport.requiredFixes.join(", ")}`);
    }

    const svg = buildLocalSceneSvg({
      productName,
      sceneType: item.scene.type,
      visualPlan,
      narration: safeCopy.narration,
      onScreenText: safeCopy.onScreenText,
      sceneIndex: index,
      totalScenes: scenes.length
    });
    const fileName = `${item.scene.id}.svg`;
    const localPath = path.join(outputRoot, fileName);
    const publicUrl = `/generated/local-media/${productId}/${fileName}`;
    await fs.writeFile(localPath, svg, "utf8");
    const metadata = {
      provider: "local-template-generator",
      sceneId: item.scene.id,
      storyboardId: item.storyboardId,
      anatomyVerdict: anatomyReport.verdict,
      note: "로컬 SVG 장면 이미지입니다. 최종 MP4에서 Remotion 모션과 TTS로 영상화됩니다."
    };
    const matchingAssets = existingLocalAssets.filter((asset) => {
      const parsed = fromJsonString<Record<string, unknown>>(asset.metadata, {});
      return parsed.provider === "local-template-generator" && parsed.sceneId === item.scene.id;
    });
    const reusableAsset = matchingAssets[0];

    const asset = reusableAsset
      ? await prisma.sourceAsset.update({
          where: { id: reusableAsset.id },
          data: {
            url: publicUrl,
            localPath,
            altText: `${productName} 사용 장면 ${index + 1}`,
            width: OUTPUT_WIDTH,
            height: OUTPUT_HEIGHT,
            metadata: toJsonString(metadata)
          }
        })
      : await prisma.sourceAsset.create({
          data: {
            productId,
            kind: "image",
            role: "usage",
            url: publicUrl,
            localPath,
            altText: `${productName} 사용 장면 ${index + 1}`,
            width: OUTPUT_WIDTH,
            height: OUTPUT_HEIGHT,
            metadata: toJsonString(metadata)
          }
        });

    const duplicateAssetIds = matchingAssets.slice(1).map((asset) => asset.id);
    if (duplicateAssetIds.length > 0) {
      await prisma.sourceAsset.deleteMany({ where: { id: { in: duplicateAssetIds } } });
    }

    const currentAssetIds = fromJsonString<string[]>(item.scene.assetIds, []);
    await prisma.proofScene.update({
      where: { id: item.scene.id },
      data: {
        visualPlan,
        narration: safeCopy.narration,
        onScreenText: safeCopy.onScreenText,
        assetIds: toJsonString([
          asset.id,
          ...currentAssetIds.filter((id) => id !== asset.id && !duplicateAssetIds.includes(id))
        ]),
        requiresUserShot: false,
        shotRequest: null
      }
    });

    result.assetIds.push(asset.id);
    result.sceneIds.push(item.scene.id);
  }

  await prisma.promptRun.create({
    data: {
      productId,
      task: "local_media_generation",
      model: "local-svg-remotion",
      input: toJsonString({ sceneIds: result.sceneIds }),
      output: toJsonString(result),
      status: "complete",
      schemaVersion: "2026-05-12"
    }
  });

  await prepareProductionWorkflow(productId);
  await prisma.productProject.update({ where: { id: productId }, data: { status: "local_media_ready" } });
  return getProductWorkspace(productId);
}

export function sanitizeLocalSceneCopy(input: {
  visualPlan: string;
  narration: string;
  onScreenText: string;
}) {
  return {
    visualPlan: sanitizeClaimRisk(input.visualPlan) || "성인 인물이 상품을 사용하는 장면을 가까운 컷으로 보여줌",
    narration: sanitizeClaimRisk(input.narration) || "사용 장면을 천천히 확인하세요.",
    onScreenText: sanitizeClaimRisk(input.onScreenText) || "사용 장면 확인"
  };
}

export function buildLocalSceneSvg(input: LocalSceneSvgInput): string {
  const palette = PALETTES[input.sceneIndex % PALETTES.length];
  const titleLines = wrapText(input.onScreenText || input.productName, 13).slice(0, 2);
  const narrationLines = wrapText(input.narration, 19).slice(0, 3);
  const visualLines = wrapText(simplifyVisualPlan(input.visualPlan), 22).slice(0, 4);
  const pose = selectPose(input);
  const progress = `${input.sceneIndex + 1}/${input.totalScenes}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" viewBox="0 0 ${OUTPUT_WIDTH} ${OUTPUT_HEIGHT}" role="img" aria-label="${escapeXml(input.productName)} local usage scene">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bg}"/>
      <stop offset="100%" stop-color="#edf4ef"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#17211b" flood-opacity="0.16"/>
    </filter>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <rect x="72" y="72" width="936" height="1776" rx="36" fill="${palette.panel}" filter="url(#softShadow)"/>
  <rect x="118" y="126" width="228" height="54" rx="27" fill="${palette.accent}" opacity="0.12"/>
  <text x="146" y="162" font-family="Arial, sans-serif" font-size="27" font-weight="800" fill="${palette.accent}">LOCAL SCENE ${escapeXml(progress)}</text>

  <text x="118" y="270" font-family="Arial, sans-serif" font-size="78" font-weight="900" fill="${palette.ink}">
    ${toTspans(titleLines, 118, 0, 88)}
  </text>

  <g transform="translate(96 430)">
    <rect x="0" y="0" width="888" height="830" rx="34" fill="#f3f7f4"/>
    <path d="M70 700 C240 600 380 640 520 560 C660 480 750 510 828 430" fill="none" stroke="${palette.warm}" stroke-width="16" stroke-linecap="round" opacity="0.5"/>
    <g transform="${pose.transform}">
      <ellipse cx="380" cy="610" rx="260" ry="34" fill="#dce7df"/>
      <rect x="${pose.rollerX}" y="${pose.rollerY}" width="330" height="82" rx="41" fill="${palette.accent}"/>
      <path d="M${pose.rollerX + 32} ${pose.rollerY + 18} H${pose.rollerX + 298}" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="0.55"/>
      <path d="M${pose.rollerX + 34} ${pose.rollerY + 58} H${pose.rollerX + 296}" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.36"/>
      <circle cx="${pose.headX}" cy="${pose.headY}" r="52" fill="#f0c7a8"/>
      <path d="${pose.bodyPath}" fill="none" stroke="${palette.ink}" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${pose.armPath}" fill="none" stroke="${palette.ink}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${pose.legPath}" fill="none" stroke="${palette.ink}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${pose.handX}" cy="${pose.handY}" r="18" fill="#f0c7a8"/>
      <circle cx="${pose.footX}" cy="${pose.footY}" r="20" fill="#f0c7a8"/>
    </g>
    <g transform="translate(626 96)">
      <circle cx="0" cy="0" r="44" fill="${palette.warm}" opacity="0.18"/>
      <path d="M-18 -5 L0 -23 L18 -5 M0 -23 V28" stroke="${palette.accent}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <text x="58" y="760" font-family="Arial, sans-serif" font-size="31" font-weight="800" fill="${palette.accent}">성인 1명 · 관절 자연 · 접촉점 명확</text>
  </g>

  <g transform="translate(118 1340)">
    <rect width="844" height="234" rx="28" fill="#f7faf8" stroke="#dce5df"/>
    <text x="36" y="58" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="${palette.accent}">장면 지시</text>
    <text x="36" y="112" font-family="Arial, sans-serif" font-size="34" font-weight="750" fill="${palette.ink}">
      ${toTspans(visualLines, 36, 0, 42)}
    </text>
  </g>

  <g transform="translate(118 1614)">
    <rect width="844" height="142" rx="28" fill="${palette.ink}"/>
    <text x="36" y="54" font-family="Arial, sans-serif" font-size="31" font-weight="850" fill="#ffffff">TTS</text>
    <text x="118" y="54" font-family="Arial, sans-serif" font-size="34" font-weight="750" fill="#ffffff">
      ${toTspans(narrationLines, 118, 0, 40)}
    </text>
  </g>
  <text x="118" y="1810" font-family="Arial, sans-serif" font-size="26" font-weight="800" fill="${palette.ink}" opacity="0.62">${escapeXml(input.productName)}</text>
</svg>`;
}

function selectPose(input: LocalSceneSvgInput) {
  const text = `${input.visualPlan} ${input.narration} ${input.onScreenText}`;
  if (/등|허리|back|waist/i.test(text)) {
    return {
      transform: "translate(112 84) rotate(-3 380 390)",
      rollerX: 288,
      rollerY: 470,
      headX: 220,
      headY: 214,
      bodyPath: "M254 282 C330 362 420 410 548 420",
      armPath: "M308 334 C240 404 206 454 172 520 M418 390 C358 472 318 520 254 552",
      legPath: "M548 420 C660 420 706 490 782 532 M548 420 C650 476 692 544 742 612",
      handX: 172,
      handY: 520,
      footX: 782,
      footY: 532
    };
  }
  if (/허벅지|종아리|다리|leg|calf|thigh/i.test(text)) {
    return {
      transform: "translate(96 120)",
      rollerX: 410,
      rollerY: 520,
      headX: 236,
      headY: 156,
      bodyPath: "M256 224 C330 300 386 374 452 452",
      armPath: "M314 298 C236 382 210 472 190 548 M374 362 C298 444 274 510 252 586",
      legPath: "M452 452 C536 506 604 530 690 552 M452 452 C548 430 640 430 750 454",
      handX: 190,
      handY: 548,
      footX: 750,
      footY: 454
    };
  }
  return {
    transform: "translate(100 110)",
    rollerX: 372,
    rollerY: 494,
    headX: 256,
    headY: 164,
    bodyPath: "M280 232 C340 322 392 394 460 478",
    armPath: "M326 306 C250 384 220 464 196 548 M388 380 C320 456 292 516 266 584",
    legPath: "M460 478 C552 512 630 516 734 518 M460 478 C560 452 650 442 760 430",
    handX: 196,
    handY: 548,
    footX: 760,
    footY: 430
  };
}

function simplifyVisualPlan(value: string) {
  return value.replace(/\s+/g, " ").replace(/인체 검수:.*/g, "인체 검수 포함").trim();
}

function sanitizeClaimRisk(value: string) {
  return value
    .replace(/통증|아픔|불편/g, "운동 전 준비")
    .replace(/치료|재활|완치|교정|완화|회복|개선/g, "사용")
    .replace(/사용 후 기대 변화|달라진 지점|전후 차이/g, "사용 전 준비와 사용 장면")
    .replace(/몸이 달라지는|체형 변화|자세 교정/g, "사용 루틴")
    .replace(/가격, 구매 링크, 주의사항/g, "구성, 사용법, 주의사항")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapText(value: string, maxLength: number): string[] {
  const clean = value.replace(/\s+/g, " ").trim();
  if (!clean) return [""];
  const words = clean.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    if ([...`${current} ${word}`].length <= maxLength) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.flatMap((line) => splitLongLine(line, maxLength));
}

function splitLongLine(value: string, maxLength: number): string[] {
  const chars = [...value];
  if (chars.length <= maxLength) return [value];
  const lines: string[] = [];
  for (let index = 0; index < chars.length; index += maxLength) {
    lines.push(chars.slice(index, index + maxLength).join(""));
  }
  return lines;
}

function toTspans(lines: string[], x: number, firstDy: number, lineHeight: number) {
  return lines
    .map((line, index) => `<tspan x="${x}" dy="${index === 0 ? firstDy : lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
