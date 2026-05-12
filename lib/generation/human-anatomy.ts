import { HumanAnatomyReportSchema, type HumanAnatomyIssue, type HumanAnatomyReport } from "@/lib/schemas/human-anatomy-report";

export const HUMAN_ANATOMY_GUARDRAILS = [
  "adult human only, no minors",
  "one natural human body with plausible limb count",
  "hands, feet, fingers, and joints must be anatomically coherent",
  "no extra limbs, duplicated hands, fused fingers, warped torso, or broken joints",
  "exercise posture must look safe, balanced, and physically possible",
  "foam roller contact point must be visible and match the described exercise",
  "no medical cure, pain relief, rehabilitation, or body transformation claim"
];

export const HUMAN_ANATOMY_NEGATIVE_PROMPT = [
  "extra arms",
  "extra legs",
  "extra fingers",
  "missing fingers",
  "fused fingers",
  "deformed hands",
  "deformed feet",
  "broken joints",
  "twisted spine",
  "warped torso",
  "impossible pose",
  "floating body",
  "duplicated person",
  "child",
  "teenager",
  "injury",
  "medical treatment",
  "pain relief claim",
  "before after body transformation",
  "logo",
  "watermark",
  "text in image"
].join(", ");

export type HumanAnatomyInput = {
  sceneType: string;
  visualPlan: string;
  narration?: string;
  onScreenText?: string;
  productName?: string | null;
};

export function buildHumanAnatomyReport(input: HumanAnatomyInput): HumanAnatomyReport {
  const text = [input.sceneType, input.visualPlan, input.narration, input.onScreenText].filter(Boolean).join(" ");
  const lower = text.toLowerCase();
  const issues: HumanAnatomyIssue[] = [];
  const isHumanScene = /사람|인체|손|발|다리|팔|허리|등|종아리|허벅지|운동|사용|자세|human|person|body|hand|foot|leg|arm|exercise/i.test(text);

  if (isHumanScene && !/성인|adult|사람|human|person/i.test(text)) {
    issues.push({
      code: "adult_human_missing",
      severity: "medium",
      message: "사람이 등장하는 사용 장면인데 성인 인물 기준이 명시되지 않았습니다.",
      fix: "프롬프트에 성인 인물만 등장하도록 명시"
    });
  }
  if (isHumanScene && !/손|발|관절|사지|finger|hand|foot|joint|limb|anatom/i.test(text)) {
    issues.push({
      code: "anatomy_detail_missing",
      severity: "high",
      message: "손, 발, 관절, 사지 수 정상 여부를 확인하는 지시가 없습니다.",
      fix: "손/발/관절/사지가 자연스럽고 정상적으로 보이도록 지시"
    });
  }
  if (isHumanScene && !/폼롤러|foam roller|접촉|contact|under|위에|아래/i.test(text)) {
    issues.push({
      code: "product_contact_missing",
      severity: "medium",
      message: "폼롤러와 신체 접촉 지점이 명확하지 않습니다.",
      fix: "폼롤러가 어느 부위 아래/위에 닿는지 명확히 작성"
    });
  }
  if (/통증|치료|재활|완치|교정|pain|cure|therapy|rehab/i.test(lower)) {
    issues.push({
      code: "medical_claim_risk",
      severity: "high",
      message: "의료/통증 개선처럼 보일 수 있는 표현이 포함되어 있습니다.",
      fix: "운동 루틴/사용 장면 중심으로 바꾸고 효능 주장을 제거"
    });
  }

  const checklist = {
    adultHumanOnly: !isHumanScene || /성인|adult|사람|human|person/i.test(text),
    plausibleLimbCount: !isHumanScene || /사지|limb|팔|다리|arm|leg|anatom/i.test(text),
    naturalJointAlignment: !isHumanScene || /관절|joint|자연|natural|anatom/i.test(text),
    handsAndFeetReadable: !isHumanScene || /손|발|hand|foot|finger/i.test(text),
    productContactClear: !isHumanScene || /폼롤러|foam roller|접촉|contact|under|위에|아래/i.test(text),
    safeExercisePosture: !isHumanScene || !/통증|치료|재활|완치|교정|pain|cure|therapy|rehab/i.test(lower),
    noSevereDistortion: !isHumanScene || /왜곡|distortion|extra|deform|anatom|자연/i.test(text)
  };
  const highIssues = issues.filter((issue) => issue.severity === "high").length;
  const score = Math.max(0, 100 - highIssues * 30 - (issues.length - highIssues) * 15);

  return HumanAnatomyReportSchema.parse({
    verdict: issues.length === 0 ? "pass" : highIssues > 0 ? "fail" : "needs_revision",
    score,
    checklist,
    issues,
    requiredFixes: issues.map((issue) => issue.fix),
    promptGuardrails: HUMAN_ANATOMY_GUARDRAILS,
    negativePrompt: HUMAN_ANATOMY_NEGATIVE_PROMPT
  });
}

export function buildHumanSafeVisualPlan(basePlan: string): string {
  return [
    basePlan,
    "인체 검수: 성인 인물 1명, 손/발/관절/사지 수 정상, 자연스러운 자세, 폼롤러 접촉점 명확, 왜곡된 손가락/팔다리/허리 금지."
  ].join(" ");
}
