import fs from "node:fs/promises";
import path from "node:path";
import { findForbiddenSensitiveTerms } from "../lib/reports/sensitiveTerms";

type Snapshot = {
  label: string;
  path: string;
  fileBase: string;
  status: number;
  finalUrl: string;
  text: string;
  html: string;
};

const baseUrl = (process.env.GPT_REVIEW_BASE_URL || "http://127.0.0.1:3000")
  .replace(/\/$/, "");
const outDir = path.join(process.cwd(), "gpt-review");

function stripHtml(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchSnapshot(
  label: string,
  routePath: string,
  fileBase: string,
  init?: RequestInit,
): Promise<Snapshot> {
  const response = await fetch(`${baseUrl}${routePath}`, {
    redirect: "follow",
    ...init,
  });
  const html = await response.text();
  const text = stripHtml(html);

  return {
    label,
    path: routePath,
    fileBase,
    status: response.status,
    finalUrl: response.url,
    text,
    html,
  };
}

async function createReading(species: "dog" | "cat") {
  const sampleName = species === "dog" ? "몽이" : "나비";
  const response = await fetch(`${baseUrl}/api/readings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: sampleName,
      type: species,
      birth_date: species === "dog" ? "2021-05-14" : "2022-03-04",
      birth_time_unknown: true,
      adoption_date: species === "dog" ? "2021-08-20" : "2022-05-01",
      owner_email: null,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    readingId?: string;
  };

  if (!response.ok || !body.readingId) {
    throw new Error(`샘플 ${species} reading 생성 실패: ${response.status}`);
  }

  return body.readingId;
}

function has(text: string, phrase: string) {
  return text.includes(phrase);
}

const customerFacingGenerationPatterns = [
  { label: "AI", pattern: /(^|[^A-Za-z])AI([^A-Za-z]|$)/ },
  { label: "인공지능", pattern: /인공지능/ },
  { label: "Gemini", pattern: /Gemini/ },
  { label: "API", pattern: /(^|[^A-Za-z])API([^A-Za-z]|$)/ },
  { label: "SDK", pattern: /(^|[^A-Za-z])SDK([^A-Za-z]|$)/ },
  { label: "프롬프트", pattern: /프롬프트/ },
  { label: "모델 응답", pattern: /모델 응답/ },
  { label: "자동 생성", pattern: /자동 생성/ },
  { label: "규칙 기반 엔진", pattern: /규칙 기반 엔진/ },
] as const;

function findCustomerFacingGenerationPhrases(text: string) {
  return customerFacingGenerationPatterns
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);
}

function buildSummary(snapshots: Snapshot[], dogReadingId: string, catReadingId: string) {
  const bundle = snapshots.map((snapshot) => snapshot.text).join("\n\n");
  const htmlBundle = snapshots.map((snapshot) => snapshot.html).join("\n\n");
  const plainBundle = stripHtml(htmlBundle);
  const forbiddenSensitiveTermMatches = findForbiddenSensitiveTerms(bundle);
  const oldPricePhraseMatches = [
    "2,900",
    "2,900원",
    "1,000",
    "1,000원",
    "4,900",
    "4,900원",
    "5,900",
    "5,900원",
    "3,900",
    "3,900원",
  ].filter((pattern) => has(bundle, pattern));
  const pdfPaidPhraseMatches = [
    "PDF 소장본",
    "PDF 소장본 추가 1,000원",
    "PDF 소장본 추가 1,000",
    "PDF 다운로드 추가 상품",
    "PDF 추가 결제",
  ].filter((pattern) => has(bundle, pattern));
  const duplicatedElementPhraseMatches = [
    "기운은 기운은",
    "금의 기운은 금의 기운은",
    "화의 기운은 화의 기운은",
    "토의 기운은 토의 기운은",
  ].filter((pattern) => has(bundle, pattern));
  const badPostpositionMatches = [
    "몽이 의",
    "몽이 이",
    "나비 의",
    "나비 이",
    "나비이",
  ].filter((pattern) => has(bundle, pattern));
  const awkwardSentenceMatches = [
    "잘 맞아요.도",
    "낯선 자극을 만났을 때는 금의 기운은",
    "화의 기운은 올해는",
    "이런 방향을 함께 보여줘요",
  ].filter((pattern) => has(bundle, pattern));
  const productionBypassMatches = [
    "심층 리포트 페이지 바로 보기",
    "테스트 결제 성공 처리",
    "카카오페이 실패 화면 보기",
    "페이팔 실패 화면 보기",
    "데모 PDF 미리보기",
  ].filter((pattern) => has(bundle, pattern));
  const customerFacingGenerationPhraseMatches = Array.from(
    new Set([
      ...findCustomerFacingGenerationPhrases(bundle),
      ...findCustomerFacingGenerationPhrases(htmlBundle),
    ]),
  );
  const hasHookCopy =
    has(htmlBundle, 'data-testid="pet-hook-card"') &&
    /(몽이는|나비는|우리 강아지는|우리 고양이는)\s+.{8,90}야\./.test(
      plainBundle,
    );
  const hasRawElementScore = /[목화토금수]\s*\d+점/.test(bundle);
  const hasStandaloneMeongAvatar = /(^|\s)멍(?=\s|$)/.test(plainBundle);
  const premiumBlockedSnapshot = snapshots.find(
    (snapshot) => snapshot.fileBase === "premium-blocked",
  );
  const pdfBlockedSnapshot = snapshots.find(
    (snapshot) => snapshot.fileBase === "pdf-api-blocked",
  );
  const premiumAccessBlockedBeforePayment = Boolean(
    premiumBlockedSnapshot &&
      (premiumBlockedSnapshot.finalUrl.includes("/checkout/") ||
        [401, 403, 307, 308].includes(premiumBlockedSnapshot.status)),
  );
  const pdfApiBlockedBeforePayment = pdfBlockedSnapshot?.status === 403;
  const checks = {
    dogReadingId,
    catReadingId,
    hasDogMascot:
      has(htmlBundle, 'data-mascot="dog"') ||
      has(htmlBundle, 'data-mascot-kind="dog"'),
    hasCatMascot:
      has(htmlBundle, 'data-mascot="cat"') ||
      has(htmlBundle, 'data-mascot-kind="cat"'),
    hasPetHookCard: has(htmlBundle, 'data-testid="pet-hook-card"'),
    hasHookCopy,
    hasBadPostposition: badPostpositionMatches.length > 0,
    hasDuplicatedElementPhrase: duplicatedElementPhraseMatches.length > 0,
    hasRawElementScore,
    hasForbiddenSensitiveTerms: forbiddenSensitiveTermMatches.length > 0,
    hasOldPricePhrases: oldPricePhraseMatches.length > 0,
    hasStandaloneMeongAvatar,
    hasPdfPaidPhrase: pdfPaidPhraseMatches.length > 0,
    hasCustomerFacingAiPhrase: customerFacingGenerationPhraseMatches.length > 0,
    hasCustomerFacingGenerationPhrase:
      customerFacingGenerationPhraseMatches.length > 0,
    hasOldPrice2900: has(bundle, "2,900") || has(bundle, "2,900원"),
    hasOldPrice1000: has(bundle, "1,000") || has(bundle, "1,000원"),
    hasOldPrice4900: has(bundle, "4,900") || has(bundle, "4,900원"),
    hasOldPrice5900: has(bundle, "5,900") || has(bundle, "5,900원"),
    hasOldPrice3900: has(bundle, "3,900") || has(bundle, "3,900원"),
    hasOldPdfKeepsakeCopy: has(bundle, "PDF 소장본"),
    hasOldPdfPaidCopy:
      has(bundle, "PDF 소장본 추가 1,000") ||
      has(bundle, "PDF 소장본 추가 1,000원"),
    hasOldPdfExtraPaymentCopy:
      has(bundle, "PDF 추가 결제") ||
      has(bundle, "PDF 다운로드 추가 상품"),
    hasAwkwardSentence: awkwardSentenceMatches.length > 0,
    hasHookSpacingError:
      has(bundle, " 야.") ||
      has(bundle, "애교쟁이 야") ||
      has(bundle, "감수성러 야"),
    hasPixelMascotCopy: has(bundle, "픽셀 캐릭터"),
    hasDogFaceIllustrationCopy: has(bundle, "강아지 얼굴 일러스트"),
    hasCatFaceIllustrationCopy: has(bundle, "고양이 얼굴 일러스트"),
    hasReportCardTogetherCharacterCopy: has(
      bundle,
      "리포트 카드를 함께 보는 캐릭터",
    ),
    hasCatBehaviorVocabulary:
      has(bundle, "자기 자리") &&
      has(bundle, "창밖 관찰") &&
      has(bundle, "느린 눈맞춤") &&
      has(bundle, "꼬리") &&
      has(bundle, "사냥놀이"),
    reviewProtected:
      has(bundle, "관리자 검토 페이지입니다") &&
      !has(bundle, "검토용 종합 페이지") &&
      !has(bundle, "GPT 점검용"),
    hasPremiumDirectBypassCopy: has(bundle, "심층 리포트 페이지 바로 보기"),
    hasDemoPaymentCopy: has(bundle, "테스트 결제 성공 처리"),
    hasDemoPdfPreviewCopy: has(bundle, "데모 PDF 미리보기"),
    premiumAccessBlockedBeforePayment,
    pdfApiBlockedBeforePayment,
    forbiddenSensitiveTermMatches,
    oldPricePhraseMatches,
    pdfPaidPhraseMatches,
    duplicatedElementPhraseMatches,
    badPostpositionMatches,
    awkwardSentenceMatches,
    productionBypassMatches,
    customerFacingAiPhraseMatches: customerFacingGenerationPhraseMatches,
    customerFacingGenerationPhraseMatches,
  };

  return {
    generatedAt: new Date().toISOString(),
    baseUrl,
    dogReadingId,
    catReadingId,
    snapshots: snapshots.map((snapshot) => ({
      label: snapshot.label,
      path: snapshot.path,
      status: snapshot.status,
      finalUrl: snapshot.finalUrl,
      fileBase: snapshot.fileBase,
    })),
    checks,
  };
}

function buildPrompt(summary: ReturnType<typeof buildSummary>, snapshots: Snapshot[]) {
  const pages = snapshots
    .map(
      (snapshot) => `### ${snapshot.label}
- URL: ${snapshot.finalUrl}
- HTTP: ${snapshot.status}
- 파일: \`${snapshot.fileBase}.html\`, \`${snapshot.fileBase}.txt\`

\`\`\`text
${snapshot.text.slice(0, 5000)}
\`\`\``,
    )
    .join("\n\n");

  return `# 멍냥사주 GPT 재점검 패키지

생성 시각: ${summary.generatedAt}
기준 URL: ${summary.baseUrl}

아래 스냅샷과 요약을 기준으로 멍냥사주 정식 출시 전 UI, 문구, 가격, 결제 권한, PDF 권한, 캐릭터 일관성을 검토해줘.

## 중점 검토 항목

- 무료 결과와 유료 결과가 명확히 구분되는지
- DogMascot/CatMascot가 species별로 자연스럽게 노출되는지
- PetHookCard의 첫 문장 훅이 바로 공감되는지
- "멍" 같은 텍스트형 아바타가 실제 캐릭터 대신 노출되지 않는지
- 가격 정책이 심층 리포트 1,990원, 추가 콘텐츠 990원, PDF 저장 무료로 일관적인지
- "2,900원", "1,000원", "4,900원", "5,900원", "3,900원"과 예전 유료 PDF 문구가 없는지
- "몽이 의", "잘 맞아요.도", "화의 기운은 올해는", "낯선 자극을 만났을 때는 금의 기운은" 같은 문장 오류가 없는지
- 고객 화면에 기술 생성 방식이 드러나는 표현이 노출되지 않는지
- 모바일 리포트형 UI로 읽기 좋은지

## 자동 요약

\`\`\`json
${JSON.stringify(summary, null, 2)}
\`\`\`

## 페이지 스냅샷

${pages}
`;
}

async function main() {
  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const dogReadingId = await createReading("dog");
  const catReadingId = await createReading("cat");

  const snapshots: Snapshot[] = [];
  const targets = [
    ["홈", "/", "home"],
    ["입력", "/input", "input"],
    ["입력 흐름 재확인", "/sample", "sample"],
    ["강아지 무료 결과", `/result/free/${dogReadingId}`, "free-result-dog"],
    ["고양이 무료 결과", `/result/free/${catReadingId}`, "free-result-cat"],
    [
      "심층 리포트 체크아웃",
      `/checkout/${dogReadingId}?productType=premium_report`,
      "checkout-premium-report",
    ],
    [
      "PDF 저장 안내",
      `/checkout/${dogReadingId}?productType=pdf_report`,
      "checkout-pdf-report",
    ],
    ["프리미엄 직접 접근 차단", `/result/premium/${dogReadingId}`, "premium-blocked"],
    ["PDF 저장 권한 차단", `/api/pdf/${dogReadingId}`, "pdf-api-blocked"],
    ["검토 페이지", "/review", "review"],
    ["베타 테스트 안내", "/test", "test"],
  ] as const;

  for (const [label, routePath, fileBase] of targets) {
    const snapshot = await fetchSnapshot(label, routePath, fileBase);
    snapshots.push(snapshot);
    await fs.writeFile(path.join(outDir, `${fileBase}.html`), snapshot.html);
    await fs.writeFile(path.join(outDir, `${fileBase}.txt`), snapshot.text);
  }

  const compatibilityCopies = [
    ["free-result-dog", "free-result"],
    ["checkout-premium-report", "checkout"],
    ["premium-blocked", "premium-result"],
  ] as const;

  for (const [sourceBase, targetBase] of compatibilityCopies) {
    await fs.copyFile(
      path.join(outDir, `${sourceBase}.html`),
      path.join(outDir, `${targetBase}.html`),
    );
    await fs.copyFile(
      path.join(outDir, `${sourceBase}.txt`),
      path.join(outDir, `${targetBase}.txt`),
    );
  }

  const summary = buildSummary(snapshots, dogReadingId, catReadingId);
  await fs.writeFile(
    path.join(outDir, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  await fs.writeFile(
    path.join(outDir, "GPT_REVIEW_PROMPT.md"),
    buildPrompt(summary, snapshots),
  );
  await fs.writeFile(
    path.join(outDir, "README.md"),
    `# 멍냥사주 GPT 점검 패키지

이 폴더는 GPT가 localhost에 직접 접속하지 못할 때 업로드해서 검토할 수 있는 최신 스냅샷입니다.

1. \`GPT_REVIEW_PROMPT.md\` 내용을 GPT에 붙여넣으세요.
2. 더 정확한 점검을 원하면 이 폴더의 \`.txt\`, \`.html\`, \`summary.json\` 파일을 함께 업로드하세요.
3. 외부 URL로 검토받으려면 Vercel 배포 후 \`https://배포주소/input\`을 공유하세요.
4. 정식 production에서는 프리미엄 직접 접근과 PDF 저장 요청이 결제 없이 열리면 안 됩니다.

생성 기준 URL: ${baseUrl}
생성 시각: ${summary.generatedAt}
`,
  );

  if (summary.checks.hasCustomerFacingGenerationPhrase) {
    console.error(
      "review export txt/html에서 고객 화면 금지 문구가 발견되었습니다.",
      summary.checks.customerFacingGenerationPhraseMatches,
    );
    process.exit(1);
  }

  console.log(`GPT review snapshot exported to ${outDir}`);
  console.log(JSON.stringify(summary.checks, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
