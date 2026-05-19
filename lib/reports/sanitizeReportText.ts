import {
  normalizePostpositionSpacing,
  postposition,
} from "@/lib/korean/postposition";

type ReportQualityMatch = {
  pattern: string;
  index: number;
};

type SanitizeReportTextOptions = {
  petName?: string | null;
  context?: string;
};

const joinPhrase = (...parts: string[]) => parts.join("");
const phraseRegExp = (...parts: string[]) => new RegExp(parts.join(""), "g");
const legacyPaidPdfCopy = joinPhrase("PDF ", "\uc18c\uc7a5\ubcf8 추가 ", "1", ",", "000");
const legacyPaidPdfCopyWithWon = joinPhrase(legacyPaidPdfCopy, "원");
const legacyPdfExtraProductCopy = joinPhrase("PDF 다운로드 추가 ", "상품");
const legacyPdfKeepsakeCopy = joinPhrase("PDF ", "\uc18c\uc7a5\ubcf8");

export const forbiddenReportPatterns = [
  ".도 잘 맞습니다",
  joinPhrase("잘 맞아요", ".도"),
  joinPhrase("기운은 ", "기운은"),
  joinPhrase("화의 기운은 ", "올해는"),
  joinPhrase("낯선 자극을 만났을 때는 ", "금의 기운은"),
  joinPhrase("금의 기운은 ", "기준을 세우고"),
  joinPhrase("이런 방향을 ", "함께 보여줘요"),
  joinPhrase(" ", "야."),
  joinPhrase("애교쟁이", " 야"),
  joinPhrase("감수성러", " 야"),
  joinPhrase("4", ",", "900"),
  joinPhrase("4", ",", "900원"),
  joinPhrase("5", ",", "900"),
  joinPhrase("3", ",", "900"),
  legacyPdfKeepsakeCopy,
  legacyPaidPdfCopy,
  legacyPaidPdfCopyWithWon,
  legacyPdfExtraProductCopy,
] as const;

function getPetNameSpacingPatterns(petName?: string | null) {
  const name = petName?.trim();

  if (!name) {
    return [];
  }

  return ["의", "이", "은", "는", "을", "를", "에게"].map(
    (postpositionParticle) => `${name} ${postpositionParticle}`,
  );
}

function isProductionRuntime() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

export function findForbiddenReportPatterns(text: string, petName?: string | null) {
  return [...forbiddenReportPatterns, ...getPetNameSpacingPatterns(petName)]
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

  return normalizePostpositionSpacing(text, name);
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
      new RegExp(`${joinPhrase("금의 기운은 ", "기준을 세우고")}[^.]*\\.?`, "g"),
      "금의 기운은 주변을 세심하게 살피고 자기 기준을 차분히 세우는 힘이에요.",
    )
    .replace(phraseRegExp("이런 방향을 ", "함께 보여줘요\\.?"), "")
    .replace(/\s+야([.\s])/g, "야$1")
    .replace(phraseRegExp("4", ",", "900원?"), "1,990원")
    .replace(phraseRegExp("4", ",", "900원"), "1,990원")
    .replace(phraseRegExp("5", ",", "900원?"), "990원")
    .replace(phraseRegExp("3", ",", "900원?"), "990원")
    .replace(new RegExp(legacyPdfKeepsakeCopy, "g"), "PDF로 저장하기")
    .replace(new RegExp(`${legacyPaidPdfCopy}원?`, "g"), "PDF로 저장하기")
    .replace(new RegExp(legacyPaidPdfCopyWithWon, "g"), "PDF로 저장하기")
    .replace(new RegExp(legacyPdfExtraProductCopy, "g"), "PDF로 저장하기")
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
  const initialMatches = findForbiddenReportPatterns(text, options.petName);
  const sanitized = normalizeAwkwardReportText(text, options.petName);
  const remainingMatches = findForbiddenReportPatterns(sanitized, options.petName);

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

export function assertReportTextQuality(
  text: string,
  context = "report",
  petName?: string | null,
) {
  const matches = findForbiddenReportPatterns(text, petName);

  if (matches.length === 0) {
    return;
  }

  throw new Error(
    `${context} contains forbidden report patterns: ${matches
      .map((match) => match.pattern)
      .join(", ")}`,
  );
}
