export type RenderScene = {
  id: string;
  type: string;
  durationSec: number;
  visualPlan: string;
  narration: string;
  onScreenText: string;
  assetUrls: string[];
  assetMedia?: Array<{
    url: string;
    kind: string;
    role?: string;
  }>;
  requiresUserShot: boolean;
  shotRequest?: string;
};

export type ShortsRenderProps = {
  productName: string;
  variant: string;
  durationSec: number;
  narrationAudioUrl?: string;
  scenes: RenderScene[];
};

export const defaultShortsRenderProps: ShortsRenderProps = {
  productName: "상품",
  variant: "A",
  durationSec: 27,
  scenes: [
    {
      id: "default_scene",
      type: "problem",
      durationSec: 27,
      visualPlan: "기본 미리보기",
      narration: "스토리보드를 불러오는 중입니다.",
      onScreenText: "스토리보드 미리보기",
      assetUrls: [],
      requiresUserShot: false
    }
  ]
};
