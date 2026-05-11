export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function ratioScore(count: number, target: number, max: number): number {
  if (target <= 0) {
    return 0;
  }
  return Math.min(max, (count / target) * max);
}

export function weightedSum(parts: Record<string, number>): number {
  return clampScore(Object.values(parts).reduce((sum, value) => sum + value, 0));
}

export function gradeScore(score: number): string {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

export function includesAny(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

export const highRiskClaimWords = [
  "치료",
  "완치",
  "효능",
  "의학",
  "병원",
  "통증 제거",
  "100%",
  "무조건",
  "기적",
  "보장",
  "인생템",
  "후기",
  "리뷰에 따르면"
];
