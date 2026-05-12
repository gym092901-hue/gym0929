import { describe, expect, it } from "vitest";
import { buildHumanAnatomyReport, buildHumanSafeVisualPlan } from "@/lib/generation/human-anatomy";
import { buildUsageImagePrompt } from "@/lib/generation/openai-image";
import { buildVeoUsagePrompt } from "@/lib/generation/google-veo";

describe("ai media guardrails", () => {
  it("requires explicit anatomy checks for human usage scenes", () => {
    const report = buildHumanAnatomyReport({
      sceneType: "usage",
      visualPlan: "사람이 폼롤러를 사용하는 장면",
      narration: "폼롤러를 천천히 굴리세요",
      onScreenText: "종아리 롤링"
    });

    expect(report.verdict).toBe("fail");
    expect(report.requiredFixes.join(" ")).toContain("손/발/관절/사지");
  });

  it("passes human-safe visual plans", () => {
    const visualPlan = buildHumanSafeVisualPlan("성인 사람이 폼롤러를 종아리 아래에 접촉해 사용하는 장면");
    const report = buildHumanAnatomyReport({
      sceneType: "usage",
      visualPlan,
      narration: "천천히 앞뒤로 굴리세요",
      onScreenText: "종아리부터 굴리세요"
    });

    expect(report.verdict).toBe("pass");
  });

  it("adds anatomy guardrails to OpenAI image and Veo prompts", () => {
    const imagePrompt = buildUsageImagePrompt({
      productName: "폼롤러",
      sceneType: "usage",
      prompt: "adult person rolling calves on a black foam roller"
    });
    const veoPrompt = buildVeoUsagePrompt({
      productName: "폼롤러",
      sceneType: "usage",
      prompt: "adult person rolling calves on a black foam roller"
    });

    expect(imagePrompt).toContain("Human anatomy requirements");
    expect(veoPrompt).toContain("Human anatomy guardrails");
    expect(veoPrompt).toContain("9:16");
  });
});
