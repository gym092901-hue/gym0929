import { postposition } from "@/lib/korean/postposition";

type ReportQualityMatch = {
  pattern: string;
  index: number;
};

type SanitizeReportTextOptions = {
  petName?: string | null;
  context?: string;
};

export const forbiddenReportPatterns = [
  "몽이 의",
  "몽이 이",
  ".도 잘 맞습니다",
  "잘 맞아요.도",
  "기운은 기운은",
  "화의 기운은 올해는",
  "낯선 자극을 만났을 때는 금의 기운은",
  "금의 기운은 기준을 세우고",
  "이런 방향을 함께 보여줘요",
  "4,900",
  "4,900원",
  "5,900",
  "3,900",
  "PDF 소장본 추가 1,000",
  "PDF 소장본 추가 1,000원",
  "PDF 다운로드 추가 상품",
] as const;

function isProductionRuntime() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findForbiddenReportPatterns(text: string) {
  return forbiddenReportPatterns
    .map<ReportQualityMatch | null>((pattern) => {
      const index = text.indexOf(pattern);

      return index >= 0 ? { pattern, index } : null;
    })
    .filter((match): match is ReportQualityMatch => Boolean(match));
}

function warnReportQuality(context: string, matches: ReportQualityMatch[]) {
  if (matches.length === 0 || isProductionRuntime()) {
    return;
  }

  console.warn("[report-quality] 금지 패턴이 발견되어 리포트 문장을 정리했습니다.", {
    context,
    matches,
  });
}

function normalizePetNameSpacing(text: string, petName?: string | null) {
  const name = petName?.trim();

  if (!name) {
    return text;
  }

  const escapedName = escapeRegExp(name);

  return text
    .replace(new RegExp(`${escapedName}\\s+의`, "g"), `${name}의`)
    .replace(new RegExp(`${escapedName}\\s+에게`, "g"), `${name}에게`)
    .replace(new RegExp(`${escapedName}\\s+이를`, "g"), `${name}를`)
    .replace(new RegExp(`${escapedName}\\s+이는`, "g"), `${name}는`)
    .replace(new RegExp(`${escapedName}\\s+이의`, "g"), `${name}의`)
    .replace(new RegExp(`${escapedName}\\s+이에게`, "g"), `${name}에게`)
    .replace(new RegExp(`${escapedName}\\s+이(?=[은는이가을를의에게\\s,.!?]|$)`, "g"), name)
    .replace(new RegExp(`${escapedName}\\s+는`, "g"), `${name}는`)
    .replace(new RegExp(`${escapedName}\\s+은`, "g"), `${name}은`)
    .replace(new RegExp(`${escapedName}\\s+을`, "g"), `${name}을`)
    .replace(new RegExp(`${escapedName}\\s+를`, "g"), `${name}를`);
}

function normalizeAwkwardReportText(text: string, petName?: string | null) {
  const name = petName?.trim();
  const nameTopic = name ? postposition.topic(name) : "반려동물은";
  const namePossessive = name ? postposition.possessive(name) : "반려동물의";
  const nameTo = name ? postposition.to(name) : "반려동물에게";

  return normalizePetNameSpacing(text, petName)
    .replace(
      /잘 맞아요\.도\s*잘 맞습니다\.?/g,
      `짧고 즐거운 놀이 뒤에 차분한 마무리 시간을 붙여주면 ${nameTo} 더 안정적인 리듬이 됩니다.`,
    )
    .replace(
      /잘 맞아요\.도/g,
      `짧고 즐거운 놀이 뒤에 차분한 마무리 시간을 붙여주면 ${nameTo} 더 안정적인 리듬이 됩니다.`,
    )
    .replace(/기운은\s+기운은/g, "기운은")
    .replace(
      /[목화토금수]의 기운은\s+올해는[^.]*\.?/g,
      `올해는 ${namePossessive} 표현력이 조금 더 살아날 수 있는 흐름이에요.`,
    )
    .replace(
      /낯선 자극을 만났을 때는\s+[목화토금수]의 기운은[^.]*\.?/g,
      `낯선 자극을 만났을 때 ${nameTopic} 먼저 거리와 분위기를 확인하려는 경향이 있어요.`,
    )
    .replace(
      /낯선 자극 앞에서는\s+[목화토금수]\s*기운이\s+[^.]*\.?/g,
      `낯선 자극을 만났을 때 ${nameTopic} 먼저 거리와 분위기를 확인하려는 경향이 있어요.`,
    )
    .replace(
      /금의 기운은 기준을 세우고[^.]*\.?/g,
      "금의 기운은 주변을 세심하게 살피고 자기 기준을 차분히 세우는 힘이에요.",
    )
    .replace(/이런 방향을 함께 보여줘요\.?/g, "")
    .replace(/4,900원?/g, "2,900원")
    .replace(/4,900원/g, "2,900원")
    .replace(/5,900원?/g, "1,000원")
    .replace(/3,900원?/g, "1,000원")
    .replace(/PDF 소장본 추가 1,000원?/g, "PDF 무료 저장")
    .replace(/PDF 소장본 추가 1,000원/g, "PDF 무료 저장")
    .replace(/PDF 다운로드 추가 상품/g, "PDF 무료 저장")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function sanitizeReportText(
  text: string,
  options: SanitizeReportTextOptions = {},
) {
  const context = options.context ?? "report";
  const initialMatches = findForbiddenReportPatterns(text);
  const sanitized = normalizeAwkwardReportText(text, options.petName);
  const remainingMatches = findForbiddenReportPatterns(sanitized);

  warnReportQuality(context, initialMatches);

  if (remainingMatches.length > 0) {
    if (isProductionRuntime()) {
      throw new Error(
        `Report quality check failed in production: ${remainingMatches
          .map((match) => match.pattern)
          .join(", ")}`,
      );
    }

    console.warn("[report-quality] 정리 후에도 금지 패턴이 남아 있습니다.", {
      context,
      matches: remainingMatches,
    });
  }

  return sanitized;
}

export function assertReportTextQuality(text: string, context = "report") {
  const matches = findForbiddenReportPatterns(text);

  if (matches.length === 0) {
    return;
  }

  throw new Error(
    `${context} contains forbidden report patterns: ${matches
      .map((match) => match.pattern)
      .join(", ")}`,
  );
}
