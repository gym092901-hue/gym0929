import { describe, expect, it } from "vitest";
import { buildLocalSceneSvg } from "@/lib/services/local-media-service";

describe("local media generator", () => {
  it("builds a safe 9:16 SVG scene from storyboard text", () => {
    const svg = buildLocalSceneSvg({
      productName: "폼롤러",
      sceneType: "usage",
      visualPlan: "성인 사람이 폼롤러를 종아리 아래에 접촉해 사용하는 장면. 인체 검수 포함.",
      narration: "종아리 아래에 두고 천천히 앞뒤로 굴리세요.",
      onScreenText: "종아리부터 굴리세요",
      sceneIndex: 0,
      totalScenes: 3
    });

    expect(svg).toContain('width="1080"');
    expect(svg).toContain('height="1920"');
    expect(svg).toContain("성인 1명");
    expect(svg).toContain("폼롤러");
    expect(svg).not.toContain("<script");
  });

  it("escapes user text inside SVG output", () => {
    const svg = buildLocalSceneSvg({
      productName: "폼롤러 <bad>",
      sceneType: "usage",
      visualPlan: "성인 사람이 폼롤러를 사용하는 장면",
      narration: "따옴표 \" 테스트 & 확인",
      onScreenText: "비교 < 금지",
      sceneIndex: 1,
      totalScenes: 3
    });

    expect(svg).toContain("&lt;bad&gt;");
    expect(svg).toContain("&quot;");
    expect(svg).toContain("&amp;");
    expect(svg).not.toContain("비교 < 금지");
  });
});
