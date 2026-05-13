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
      assets: true,
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
  await fs.rm(outputRoot, { recursive: true, force: true });
  await fs.mkdir(outputRoot, { recursive: true });

  const result: LocalMediaGenerationResult = { assetIds: [], sceneIds: [] };
  const assetMap = new Map(product.assets.map((asset) => [asset.id, asset]));
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
    const referenceAssetIds = currentAssetIds.filter((id) => {
      const sourceAsset = assetMap.get(id);
      if (!sourceAsset || id === asset.id || duplicateAssetIds.includes(id)) return false;
      return getAssetProvider(sourceAsset.metadata) !== "local-template-generator";
    });
    const localAssetIds = currentAssetIds.filter((id) => {
      const sourceAsset = assetMap.get(id);
      if (!sourceAsset || id === asset.id || duplicateAssetIds.includes(id)) return false;
      return getAssetProvider(sourceAsset.metadata) === "local-template-generator";
    });
    const nextAssetIds = [asset.id, ...referenceAssetIds, ...localAssetIds];
    await prisma.proofScene.update({
      where: { id: item.scene.id },
      data: {
        visualPlan,
        narration: safeCopy.narration,
        onScreenText: safeCopy.onScreenText,
        assetIds: toJsonString([...new Set(nextAssetIds)]),
        requiresUserShot: false,
        shotRequest: null
      }
    });

    result.assetIds.push(asset.id);
    result.sceneIds.push(item.scene.id);
  }

  if (result.assetIds.length > 0) {
    await prisma.sourceAsset.deleteMany({
      where: {
        productId,
        kind: "image",
        role: "usage",
        id: { notIn: result.assetIds },
        metadata: { contains: "local-template-generator" }
      }
    });
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

function getAssetProvider(metadata: unknown): string {
  return String(fromJsonString<Record<string, unknown>>(metadata, {}).provider ?? "");
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
  const person = selectPerson(input.sceneIndex);
  const progress = `${input.sceneIndex + 1}/${input.totalScenes}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" viewBox="0 0 ${OUTPUT_WIDTH} ${OUTPUT_HEIGHT}" role="img" aria-label="${escapeXml(`${person.label} ${input.productName} 사용 장면`)}">
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
  <rect x="118" y="126" width="286" height="54" rx="27" fill="${palette.accent}" opacity="0.12"/>
  <text x="146" y="162" font-family="Arial, sans-serif" font-size="27" font-weight="800" fill="${palette.accent}">${escapeXml(person.label)} 컷 ${escapeXml(progress)}</text>

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
      ${renderHair(person.kind, pose.headX, pose.headY, palette.ink)}
      <circle cx="${pose.headX}" cy="${pose.headY}" r="52" fill="${person.skin}"/>
      <path d="${pose.bodyPath}" fill="none" stroke="${person.outfit}" stroke-width="42" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${pose.armPath}" fill="none" stroke="${person.outfit}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${pose.legPath}" fill="none" stroke="${person.outfit}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${pose.handX}" cy="${pose.handY}" r="18" fill="${person.skin}"/>
      <circle cx="${pose.footX}" cy="${pose.footY}" r="20" fill="${person.skin}"/>
    </g>
    <g transform="translate(626 96)">
      <circle cx="0" cy="0" r="44" fill="${palette.warm}" opacity="0.18"/>
      <path d="M-18 -5 L0 -23 L18 -5 M0 -23 V28" stroke="${palette.accent}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <text x="58" y="760" font-family="Arial, sans-serif" font-size="31" font-weight="800" fill="${palette.accent}">${escapeXml(person.label)} · 성인 · 관절/사지 자연 · 접촉점 명확</text>
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

function selectPerson(index: number) {
  return index % 2 === 0
    ? { label: "한국인 남성", kind: "male" as const, skin: "#edc39f", outfit: "#1f4d5f" }
    : { label: "한국인 여성", kind: "female" as const, skin: "#f0c7a8", outfit: "#7a3e3e" };
}

function renderHair(kind: "male" | "female", headX: number, headY: number, color: string) {
  if (kind === "female") {
    return [
      `<path d="M${headX - 56} ${headY - 8} C${headX - 74} ${headY - 74} ${headX + 72} ${headY - 84} ${headX + 60} ${headY - 6} C${headX + 84} ${headY + 64} ${headX - 78} ${headY + 72} ${headX - 56} ${headY - 8}Z" fill="${color}" opacity="0.95"/>`,
      `<path d="M${headX - 34} ${headY - 46} C${headX - 10} ${headY - 76} ${headX + 40} ${headY - 60} ${headX + 46} ${headY - 20}" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" opacity="0.18"/>`
    ].join("");
  }

  return `<path d="M${headX - 54} ${headY - 14} C${headX - 42} ${headY - 76} ${headX + 46} ${headY - 78} ${headX + 58} ${headY - 12} C${headX + 16} ${headY - 34} ${headX - 16} ${headY - 32} ${headX - 54} ${headY - 14}Z" fill="${color}" opacity="0.95"/>`;
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
  const clean = value
    .replace(/상세\s*본문/g, "상품 설명")
    .replace(/상세\s*페이지|상세페이지/g, "상품 정보")
    .replace(/가격\s*불명확|가격\s*불명|가격\s*미확인|가격 정보 없음/g, "구성 확인")
    .replace(/불명확|불명|미확인/g, "확인 필요")
    .replace(/먼저 쓰는 장면부터 확인/g, "사용 장면부터 확인")
    .replace(/구매 전 확인할 점/g, "구성, 사용법, 주의사항")
    .replace(/옵션과 가격은 상품 정보에서 확인/g, "구성, 옵션 확인")
    .replace(/통증|아픔|불편/g, "운동 전 준비")
    .replace(/치료|재활|완치|교정|완화|회복|개선/g, "사용")
    .replace(/사용 후 기대 변화|달라진 지점|전후 차이/g, "사용 전 준비와 사용 장면")
    .replace(/몸이 달라지는|체형 변화|자세 교정/g, "사용 루틴")
    .replace(/가격, 구매 링크, 주의사항/g, "구성, 사용법, 주의사항")
    .replace(/\s+/g, " ")
    .trim();
  if (/^(naver|네이버)\.?$/i.test(clean.trim()) || /직접\s*확인하지\s*못|자동\s*수집|웹검색|같은 상품 후보|수집이 막|원본 상품|페이지 차단|본문 확인|네이버\s*검색|검색\s*결과|상품\s*\d{5,}|메뉴\s*영역|본문\s*바로가기|바로가기|상품 정보에 제시된 장점|구성 확인 필요|옵션 확인 필요|주의사항 확인 필요/i.test(clean)) {
    return "";
  }
  return clean;
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
