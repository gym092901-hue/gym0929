import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import fs from "node:fs/promises";
import path from "node:path";
import { ensureNarrationAudio } from "@/lib/tts/narration";
import type { RenderScene } from "@/lib/remotion/types";
import type { FoamRollerExerciseAdProps } from "@/remotion/compositions/FoamRollerExerciseAd";

const storyboardId = "foam-roller-photo-motion-demo";
const outputFileName = `${storyboardId}.mp4`;

const narrationScenes: RenderScene[] = [
  {
    id: "hook",
    type: "hook",
    durationSec: 3,
    visualPlan: "실제 사람이 폼롤러를 쓰는 종아리, 등, 허벅지 컷을 빠르게 보여준다.",
    narration: "폼롤러, 그냥 사면 잘 안 씁니다. 하지만 이 세 동작이면 집에서도 바로 루틴이 됩니다.",
    onScreenText: "폼롤러, 그냥 두면 안 씁니다",
    assetUrls: [],
    requiresUserShot: false
  },
  {
    id: "calf",
    type: "use",
    durationSec: 5.5,
    visualPlan: "사람이 매트 위에서 종아리 아래에 폼롤러를 두고 사용하는 컷.",
    narration: "첫 번째는 종아리. 앉아서 폼롤러 위에 다리를 올리고, 천천히 앞뒤로 굴리세요.",
    onScreenText: "1. 종아리부터 굴리세요",
    assetUrls: [],
    requiresUserShot: false
  },
  {
    id: "back",
    type: "use",
    durationSec: 5.5,
    visualPlan: "사람이 누워서 등 상부 아래에 폼롤러를 두고 사용하는 컷.",
    narration: "두 번째는 등 상부. 누워서 어깨 아래쪽만 짧게 굴리면 따라 하기 쉽습니다.",
    onScreenText: "2. 등 상부는 짧게",
    assetUrls: [],
    requiresUserShot: false
  },
  {
    id: "quad",
    type: "use",
    durationSec: 5.5,
    visualPlan: "사람이 엎드린 자세에서 허벅지 앞쪽 아래에 폼롤러를 두고 사용하는 컷.",
    narration: "세 번째는 허벅지 앞쪽. 운동 전후 5분 루틴에 넣기 좋은 동작입니다.",
    onScreenText: "3. 허벅지 앞쪽까지",
    assetUrls: [],
    requiresUserShot: false
  },
  {
    id: "proof",
    type: "proof",
    durationSec: 4.5,
    visualPlan: "세 가지 실사용 컷을 카드로 정리해 실제 활용도를 보여준다.",
    narration: "한 개로 종아리, 등, 허벅지까지. 사진보다 중요한 건 실제로 어떻게 쓰는지입니다.",
    onScreenText: "한 개로 3가지 사용 장면",
    assetUrls: [],
    requiresUserShot: false
  },
  {
    id: "cta",
    type: "cta",
    durationSec: 5,
    visualPlan: "실사용 컷 위에 구매 장벽을 낮추는 CTA를 배치한다.",
    narration: "집에서 바로 따라 할 폼롤러가 필요하다면, 옵션과 가격은 링크에서 확인하세요. 불편하면 즉시 중단하세요.",
    onScreenText: "집에서 바로 따라 할 폼롤러",
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
    inputProps,
    concurrency: 2,
    timeoutInMilliseconds: 120_000
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
