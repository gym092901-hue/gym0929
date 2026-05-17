import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFreeInsightSections,
  createPremiumPreviewSections,
} from "@/lib/readings/content";
import { postposition } from "@/lib/korean/postposition";
import { generateFreePetSajuReading } from "@/lib/saju/petSajuEngine";
import { generatePremiumReport } from "@/lib/saju/premiumReportGenerator";
import type { PetSajuInput } from "@/lib/saju/petSajuEngine";

const mongInput: PetSajuInput = {
  name: "몽이",
  type: "dog",
  birthDate: "2021-05-14",
  birthTime: null,
  birthTimeUnknown: true,
  adoptionDate: "2021-08-20",
};

function createPremium(input: PetSajuInput) {
  return generatePremiumReport({
    ...input,
    freeSummary: generateFreePetSajuReading(input).report,
  }).report;
}

function getMonthlyAdviceBlock(report: string) {
  const match = report.match(/9\. 월별 조언\n([\s\S]*?)\n월별 조언은/);

  return match?.[1].trim() ?? "";
}

function getRepeatedLongSentences(text: string) {
  const counts = new Map<string, number>();
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];

  for (const sentence of sentences) {
    const normalized = sentence.replace(/\s+/g, " ").trim();

    if (normalized.length < 24) {
      continue;
    }

    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return Array.from(counts)
    .filter(([, count]) => count > 1)
    .map(([sentence]) => sentence);
}

const premiumForbiddenPatterns = [
  "몽이 의",
  "몽이 이",
  "기운은 기운은",
  "잘 맞아요.도",
  ".도 잘 맞습니다",
  "올해는 올해는",
  "낯선 자극을 만났을 때는 금의 기운은",
  "금의 기운은 기준을 세우고",
  "화의 기운은 올해는",
  "이런 방향을 함께 보여줘요",
];

describe("report postposition rendering", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not duplicate 이 after 몽이 in free and premium reports", () => {
    const free = generateFreePetSajuReading(mongInput).report;
    const premium = generatePremiumReport({
      ...mongInput,
      freeSummary: free,
    }).report;
    const freeSections = createFreeInsightSections(mongInput)
      .map((section) => section.body)
      .join("\n");
    const previewSections = createPremiumPreviewSections(mongInput)
      .map((section) => section.body)
      .join("\n");
    const rendered = [free, premium, freeSections, previewSections].join("\n");

    expect(rendered).not.toContain("몽이이");
    expect(rendered).toContain("몽이는");
    expect(rendered).toContain("몽이의");
    expect(rendered).toContain("몽이를");
    expect(rendered).toContain("몽이에게");
  });

  it("renders common pet names with natural Korean postpositions", () => {
    const cases = ["몽이", "초코", "나비", "구름이", "콩이", "루루"];

    for (const name of cases) {
      expect(postposition.topic(name)).not.toContain("이이");
      expect(postposition.possessive(name)).not.toContain("이이");
      expect(postposition.object(name)).not.toContain("이이");
      expect(postposition.to(name)).not.toContain("이이");
    }

    expect(postposition.topic("몽이")).toBe("몽이는");
    expect(postposition.possessive("몽이")).toBe("몽이의");
    expect(postposition.object("몽이")).toBe("몽이를");
    expect(postposition.to("몽이")).toBe("몽이에게");
    expect(postposition.topic(" 몽이 ")).toBe("몽이는");
  });

  it("does not duplicate five-element sentence prefixes in premium reports", () => {
    const premium = createPremium(mongInput);

    for (const element of ["목", "화", "토", "금", "수"]) {
      expect(premium).not.toContain(`${element}의 기운은 ${element}의 기운은`);
    }

    expect(premium).not.toContain("화의 결이 더해져 화의 기운은");
    expect(premium).not.toContain("금의 결이 더해져 금의 기운은");
    expect(premium).not.toContain("낯선 자극을 만났을 때는 금의 기운은");
    expect(premium).not.toContain("금의 기운은 기준을 세우고");
  });

  it("removes known premium report template artifacts", () => {
    const premium = createPremium(mongInput);

    for (const pattern of premiumForbiddenPatterns) {
      expect(premium).not.toContain(pattern);
    }

    expect(premium).not.toContain("이런 방향을 함께 보여줘요");
    expect(premium).not.toMatch(/[목화토금수]의 기운은 올해는/);
    expect(premium).toContain(
      "낯선 자극을 만났을 때 몽이는 먼저 거리와 분위기를 확인하려는 경향이 있어요.",
    );
    expect(premium).toContain(
      "올해는 몽이의 표현력이 조금 더 살아날 수 있는 흐름이에요.",
    );
    expect(premium).toContain("두 기운을 함께 보면");
  });

  it("does not expose raw five-element scores in premium report text", () => {
    const premium = createPremium(mongInput);

    expect(premium).not.toContain("오행 점수");
    expect(premium).not.toMatch(/[목화토금수]\s*\d+점/);
    expect(premium).not.toContain("부족");
    expect(premium).not.toContain("결핍");
    expect(premium).not.toContain("나쁨");
    expect(premium).toContain("오행 흐름은 숫자로 평가하기보다 행동 언어");
  });

  it("keeps free reading labels clean for card rendering", () => {
    const free = generateFreePetSajuReading(mongInput).report;
    const sectionTitles = createFreeInsightSections(mongInput).map(
      (section) => section.title,
    );

    expect(free).not.toMatch(/\d+\.\s*우리 아이 한 줄 성향/);
    expect(free).not.toMatch(/\d+\.\s*기본 기운 해석/);
    expect(sectionTitles).toEqual([
      "한 줄 성향",
      "대표 기운",
      "보호자와의 교감",
      "생활 루틴 조언",
      "심층 리포트 미리보기",
    ]);
  });

  it("does not paste the free summary source into premium reports", () => {
    const free = generateFreePetSajuReading(mongInput).report;
    const premium = generatePremiumReport({
      ...mongInput,
      freeSummary: free,
    }).report;

    expect(premium).toContain("무료 결과에서 보였던 흐름을 더 깊게 보면");
    expect(premium).not.toContain("1. 우리 아이 한 줄 성향");
    expect(premium).not.toContain("2. 기본 기운 해석");
    expect(premium).not.toContain("3. 보호자에게 보이는 애착 방식");
    expect(premium).not.toContain("4. 생활 루틴 조언");
    expect(premium).not.toContain("5. 심층 리포트 미리보기");
    expect(premium).not.toContain(free.replace(/\s+/g, " ").slice(0, 120));
  });

  it("creates twelve distinct seasonal monthly advice lines for dogs", () => {
    const monthlyAdvice = getMonthlyAdviceBlock(createPremium(mongInput));
    const lines = monthlyAdvice.split("\n").filter(Boolean);

    expect(lines).toHaveLength(12);
    expect(new Set(lines).size).toBe(12);
    expect(monthlyAdvice).toContain("1월: 실내 루틴");
    expect(monthlyAdvice).toContain("3월: 새로운 냄새");
    expect(monthlyAdvice).toContain("7월: 더위");
    expect(monthlyAdvice).toContain("9월: 산책 리듬");
    expect(monthlyAdvice).toContain("12월: 따뜻한 루틴");
    expect(monthlyAdvice).not.toContain("질병");
    expect(monthlyAdvice).not.toContain("사고");
    expect(getRepeatedLongSentences(monthlyAdvice)).toEqual([]);
    expect(monthlyAdvice).not.toContain("몽이는 가진");
    expect(monthlyAdvice).toContain("몽이의 기질");
  });

  it("uses different monthly advice for cats", () => {
    const catInput: PetSajuInput = {
      ...mongInput,
      name: "나비",
      type: "cat",
    };
    const dogLines = getMonthlyAdviceBlock(createPremium(mongInput)).split("\n");
    const catMonthlyAdvice = getMonthlyAdviceBlock(createPremium(catInput));
    const catLines = catMonthlyAdvice.split("\n");

    expect(catLines).toHaveLength(12);
    expect(new Set(catLines).size).toBe(12);
    expect(catLines[0]).not.toBe(dogLines[0]);
    expect(catMonthlyAdvice).toContain("창가 자리");
    expect(catMonthlyAdvice).toContain("사냥 놀이");
    expect(catMonthlyAdvice).toContain("숨숨집");
    expect(getRepeatedLongSentences(catMonthlyAdvice)).toEqual([]);
  });
});
