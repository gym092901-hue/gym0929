import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs/promises";
import path from "node:path";
import { ensureNarrationAudio } from "@/lib/tts/narration";
import type { RenderScene } from "@/lib/remotion/types";
import type { FoamRollerExerciseAdProps } from "@/remotion/compositions/FoamRollerExerciseAd";

const storyboardId = "foam-roller-exercise-demo";
const outputFileName = `${storyboardId}.mp4`;

const narrationScenes: RenderScene[] = [
  {
    id: "hook",
    type: "hook",
    durationSec: 3,
    visualPlan: "폼롤러가 튀듯이 등장하고, 종아리/등/허벅지 루틴을 빠르게 예고한다.",
    narration: "폼롤러, 사진만 보고 고르지 마세요. 세 가지 운동 루틴으로 바로 쓰는 모습을 먼저 보세요.",
    onScreenText: "폼롤러, 이렇게 쓰면 바로 루틴이 됩니다",
    assetUrls: [],
    requiresUserShot: false
  },
  {
    id: "calf",
    type: "use",
    durationSec: 5,
    visualPlan: "종아리 아래에 폼롤러가 놓이고 다리가 앞뒤로 굴러간다.",
    narration: "첫 번째는 종아리 롤링. 발목부터 무릎 아래까지 천천히 앞뒤로 굴려줍니다.",
    onScreenText: "1. 종아리 롤링",
    assetUrls: [],
    requiresUserShot: false
  },
  {
    id: "back",
    type: "use",
    durationSec: 5,
    visualPlan: "등 상부 아래에 폼롤러가 놓이고 상체가 짧게 움직인다.",
    narration: "두 번째는 등 상부. 어깨 아래쪽을 짧게 굴리면서 자세를 확인하세요.",
    onScreenText: "2. 등 상부 롤링",
    assetUrls: [],
    requiresUserShot: false
  },
  {
    id: "thigh",
    type: "use",
    durationSec: 5,
    visualPlan: "허벅지 앞쪽을 폼롤러 위에 올리고 짧은 왕복 동작을 보여준다.",
    narration: "세 번째는 허벅지 앞쪽. 운동 전후 5분 루틴으로 쓰기 좋습니다.",
    onScreenText: "3. 허벅지 앞쪽 롤링",
    assetUrls: [],
    requiresUserShot: false
  },
  {
    id: "proof",
    type: "proof",
    durationSec: 4,
    visualPlan: "종아리, 등, 허벅지 세 루틴 체크 카드가 순서대로 뜬다.",
    narration: "하나로 종아리, 등, 허벅지까지. 집에서 바로 따라 할 수 있는 루틴입니다.",
    onScreenText: "하나로 3가지 루틴",
    assetUrls: [],
    requiresUserShot: false
  },
  {
    id: "cta",
    type: "cta",
    durationSec: 5,
    visualPlan: "제품과 구매 버튼을 크게 보여주며 마지막 CTA를 배치한다.",
    narration: "집에 하나 두면 운동 루틴이 훨씬 쉬워집니다. 옵션과 가격은 링크에서 확인하세요. 불편하면 즉시 중단하세요.",
    onScreenText: "옵션과 가격 확인",
    assetUrls: [],
    requiresUserShot: false
  }
];

async function main() {
  const outputDir = path.join(process.cwd(), "storage", "renders");
  const outputLocation = path.join(outputDir, outputFileName);
  await fs.mkdir(outputDir, { recursive: true });

  const narrationAudioUrl = await ensureNarrationAudio({
    storyboardId,
    productName: "폼롤러",
    scenes: narrationScenes
  });
  const inputProps: FoamRollerExerciseAdProps = {
    narrationAudioUrl: narrationAudioUrl ? toRemotionAssetUrl(narrationAudioUrl) : undefined
  };

  const serveUrl = await bundle({
    entryPoint: path.join(process.cwd(), "remotion", "index.ts"),
    webpackOverride: (config) => config
  });
  const composition = await selectComposition({
    serveUrl,
    id: "FoamRollerExerciseAd",
    inputProps
  });
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps
  });

  console.log(`Rendered foam roller demo: ${outputLocation}`);
}

function toRemotionAssetUrl(url: string): string {
  if (url.startsWith("/public/")) return url;
  if (url.startsWith("/")) return `/public${url}`;
  return url;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
