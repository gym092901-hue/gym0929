import { describe, expect, it } from "vitest";
import { buildProductionScenePackage } from "@/lib/services/production-workflow-service";

describe("production workflow package", () => {
  it("packages human-in-loop image and Veo3 prompts for a usage scene", () => {
    const scene = buildProductionScenePackage({
      productName: "폼롤러",
      storyboardId: "storyboard_1",
      sceneId: "scene_usage_1",
      sceneType: "usage",
      visualPlan:
        "성인 사람이 폼롤러를 종아리 아래에 접촉해 사용하는 장면. 인체 검수: 손/발/관절/사지 수 정상, 자연스러운 자세, 폼롤러 접촉점 명확.",
      narration: "종아리 아래에 두고 천천히 앞뒤로 굴리세요.",
      onScreenText: "종아리부터 굴리세요",
      assetIds: [],
      existingAssets: []
    });

    expect(scene.imageSource).toBe("chatgpt-pro-manual");
    expect(scene.videoSource).toBe("veo3");
    expect(scene.chatGptImagePrompt).toContain("ChatGPT Pro");
    expect(scene.veoPrompt).toContain("Vertical 9:16");
    expect(scene.missingInputs).toContain("ChatGPT Pro 이미지");
    expect(scene.missingInputs).toContain("Veo3 영상 또는 직접 촬영 영상");
    expect(scene.anatomyReport.verdict).toBe("pass");
  });

  it("marks uploaded video scenes as render-ready inputs", () => {
    const scene = buildProductionScenePackage({
      productName: "폼롤러",
      storyboardId: "storyboard_1",
      sceneId: "scene_usage_2",
      sceneType: "usage",
      visualPlan:
        "성인 사람이 폼롤러를 등 아래에 접촉해 사용하는 장면. 인체 검수: 손/발/관절/사지 수 정상, 자연스러운 자세, 폼롤러 접촉점 명확.",
      narration: "등 상부에 짧게 사용하세요.",
      onScreenText: "등 상부는 짧게",
      assetIds: ["asset_image", "asset_video"],
      existingAssets: [
        { id: "asset_image", kind: "image", role: "usage" },
        { id: "asset_video", kind: "video", role: "usage" }
      ]
    });

    expect(scene.imageSource).toBe("uploaded");
    expect(scene.videoSource).toBe("uploaded");
    expect(scene.missingInputs).toEqual([]);
    expect(scene.nextAction).toContain("최종 MP4 렌더");
  });
});
