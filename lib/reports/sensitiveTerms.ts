export const allowedSensitiveSafetyNotices = [
  "질병이나 수명을 예측하지 않아요",
  "사고를 단정하지 않아요",
  "사고를 단정하거나 불안을 키우지 않아요",
  "건강, 수명, 사고를 예측하거나 의학적 판단을 제공하지 않습니다",
  "치료 조언을 제공하지 않습니다",
];

export const forbiddenSensitivePatterns = [
  "질병운",
  "사고수",
  "수명이 짧다",
  "큰 사고가 생긴다",
  "병이 생긴다",
  "치료가 필요하다",
  "위험한 운",
  "나쁜 운",
];

function normalizeSensitiveText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function removeAllowedSensitiveSafetyNotices(text: string) {
  return allowedSensitiveSafetyNotices.reduce(
    (result, notice) =>
      result.replaceAll(normalizeSensitiveText(notice), ""),
    normalizeSensitiveText(text),
  );
}

export function findForbiddenSensitiveTerms(text: string) {
  const searchableText = removeAllowedSensitiveSafetyNotices(text);

  return forbiddenSensitivePatterns.filter((pattern) =>
    searchableText.includes(pattern),
  );
}

export function hasForbiddenSensitiveTerms(text: string) {
  return findForbiddenSensitiveTerms(text).length > 0;
}
