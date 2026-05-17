import { afterEach, describe, expect, it, vi } from "vitest";
import { createFreeInsightSections, createPremiumPreviewSections } from "@/lib/readings/content";
import { createFreeSummary } from "@/lib/reports/free-summary";
import {
  assertReportTextQuality,
  forbiddenReportPatterns,
  sanitizeReportText,
} from "@/lib/reports/sanitizeReportText";
import { generatePremiumReport } from "@/lib/saju/premiumReportGenerator";
import type { PetSajuInput } from "@/lib/saju/petSajuEngine";

const demoInput: PetSajuInput = {
  name: "몽이",
  type: "dog",
  birthDate: "2021-05-14",
  birthTime: null,
  birthTimeUnknown: true,
  adoptionDate: "2021-08-20",
};

function generatedReportBundle() {
  const freeSummary = createFreeSummary(demoInput);
  const premiumReport = generatePremiumReport({
    ...demoInput,
    freeSummary,
  }).report;
  const freeSections = createFreeInsightSections({
    ...demoInput,
    freeSummary,
  })
    .map((section) => section.body)
    .join("\n");
  const premiumPreview = createPremiumPreviewSections({
    ...demoInput,
    freeSummary,
  })
    .map((section) => section.body)
    .join("\n");

  return [freeSummary, premiumReport, freeSections, premiumPreview].join("\n");
}

describe("sanitizeReportText", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.VERCEL_ENV;
  });

  it("normalizes known awkward report patterns and warns in development", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const text =
      "몽이 의 흐름은 잘 맞아요.도 잘 맞습니다. 화의 기운은 올해는 표현이 살아나요. 낯선 자극을 만났을 때는 금의 기운은 기준을 세워요.";

    const result = sanitizeReportText(text, {
      context: "test_report",
      petName: "몽이",
    });

    expect(warn).toHaveBeenCalled();
    expect(result).toContain("몽이의");
    expect(result).toContain(
      "짧고 즐거운 놀이 뒤에 차분한 마무리 시간을 붙여주면 몽이에게 더 안정적인 리듬이 됩니다.",
    );
    expect(result).toContain(
      "올해는 몽이의 표현력이 조금 더 살아날 수 있는 흐름이에요.",
    );
    expect(result).toContain(
      "낯선 자극을 만났을 때 몽이는 먼저 거리와 분위기를 확인하려는 경향이 있어요.",
    );
    expect(result).not.toContain("몽이 의");
    expect(result).not.toContain("잘 맞아요.도");
    expect(result).not.toContain(".도 잘 맞습니다");
    expect(result).not.toContain("화의 기운은 올해는");
    expect(result).not.toContain("낯선 자극을 만났을 때는 금의 기운은");
    expect(result).not.toContain("금의 기운은 기준을 세우고");
  });

  it("throws in production when a forbidden pattern remains", () => {
    process.env.VERCEL_ENV = "production";

    expect(() =>
      sanitizeReportText("몽이 이", {
        context: "production_report",
      }),
    ).toThrow("Report quality check failed in production");
  });

  it("keeps generated free, premium, sample, and review preview text clean", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bundle = generatedReportBundle();

    expect(() => assertReportTextQuality(bundle, "generated_bundle")).not.toThrow();

    for (const pattern of forbiddenReportPatterns) {
      expect(bundle).not.toContain(pattern);
    }

    warn.mockRestore();
  });
});
