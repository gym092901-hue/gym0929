// @ts-nocheck

const fs = require("node:fs");
const path = require("node:path");

const baseUrl = (process.env.QA_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const readingId = process.env.QA_READING_ID || "demo-mong-2026";
const expectedDemoMode = process.env.QA_EXPECT_DEMO_MODE;
const rootDir = process.cwd();

const results = [];

function addResult(group, check, ok, detail = "") {
  results.push({
    구간: group,
    점검: check,
    결과: ok ? "PASS" : "FAIL",
    상세: detail,
  });
}

function addSkip(group, check, detail = "") {
  results.push({
    구간: group,
    점검: check,
    결과: "SKIP",
    상세: detail,
  });
}

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), "utf8");
}

function hasAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

function hasNone(text, needles) {
  return needles.every((needle) => !text.includes(needle));
}

function normalizeHtml(text) {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

function getPremiumPriceFromCatalog() {
  const catalog = readProjectFile("lib/products/catalog.ts");
  const match = catalog.match(/premium_report:\s*{[\s\S]*?price:\s*(\d+)/);
  return match ? Number(match[1]) : 4900;
}

function getFutureDate() {
  const now = new Date();
  return `${now.getUTCFullYear() + 1}-01-01`;
}

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: options.redirect || "follow",
    method: options.method || "GET",
    headers: options.headers,
    body: options.body,
  });
  const text = await response.text();

  return {
    status: response.status,
    ok: response.ok,
    text: normalizeHtml(text),
    rawText: text,
    headers: response.headers,
    redirected: response.redirected,
    url: response.url,
  };
}

async function get(pathname, options = {}) {
  return request(pathname, options);
}

async function postJson(pathname, body, options = {}) {
  return request(pathname, {
    ...options,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: JSON.stringify(body),
  });
}

async function resetDemoPayment(productType) {
  return postJson("/api/demo/reset-payment", {
    readingId,
    productType,
  });
}

async function approveDemoPayment(productType) {
  return postJson("/api/demo/approve-payment", {
    readingId,
    productType,
  });
}

async function detectDemoMode() {
  const demo = await get("/demo", { redirect: "manual" });
  return demo.status === 200;
}

async function runHomeChecks() {
  const forbiddenLabels = [
    "Pet Fortune Reading",
    "Free Reading",
    "Today's Mini Reading",
    "Free Reading Menu",
    "Premium Fields",
    "Premium Report",
    "Premium Reading",
    "Premium Chapter",
  ];
  const home = await get("/");

  addResult("홈", "/ 정상 로딩", home.status === 200, `status ${home.status}`);
  addResult(
    "홈",
    "우리 아이 사주 보기 버튼 존재",
    home.text.includes("우리 아이 사주 보기"),
  );
  addResult(
    "홈",
    "샘플 리포트 보기 버튼 존재",
    home.text.includes("샘플 리포트 보기"),
  );
  addResult(
    "홈",
    "개발용 영문 라벨 미노출",
    hasNone(home.text, forbiddenLabels),
    "지정된 영문 개발 라벨 목록 기준",
  );
}

async function runInputChecks() {
  const inputPage = await get("/input");
  const inputSource = readProjectFile("app/input/page.tsx");
  const missingName = await postJson("/api/readings", {
    type: "dog",
    birth_time_unknown: true,
    adoption_date: "2021-08-20",
  });
  const missingSpecies = await postJson("/api/readings", {
    name: "몽이",
    birth_time_unknown: true,
    adoption_date: "2021-08-20",
  });
  const missingDates = await postJson("/api/readings", {
    name: "몽이",
    type: "dog",
    birth_date_unknown: true,
    birth_time_unknown: true,
  });
  const futureDate = await postJson("/api/readings", {
    name: "몽이",
    type: "dog",
    birth_date: getFutureDate(),
    birth_time_unknown: true,
    adoption_date: "2021-08-20",
  });
  const invalidEmail = await postJson("/api/readings", {
    name: "몽이",
    type: "dog",
    birth_date: "2021-05-14",
    birth_time_unknown: true,
    owner_email: "not-an-email",
  });

  addResult("입력", "/input 정상 로딩", inputPage.status === 200, `status ${inputPage.status}`);
  addResult(
    "입력",
    "이름 없이 제출 시 오류",
    missingName.status === 400 && missingName.text.includes("우리 아이 이름을 입력해 주세요."),
  );
  addResult(
    "입력",
    "강아지/고양이 선택 필수",
    missingSpecies.status === 400 && missingSpecies.text.includes("강아지인지 고양이인지 알려주세요."),
  );
  addResult(
    "입력",
    "생일을 몰라요 체크 시 생년월일 비활성화",
    inputSource.includes("disabled={birthDateUnknown}"),
    "클라이언트 상태 바인딩 확인",
  );
  addResult(
    "입력",
    "태어난 시간을 몰라요 체크 시 시간 비활성화 및 초기화",
    inputSource.includes("disabled={timeUnknown}") && inputSource.includes('setBirthTime("")'),
    "클라이언트 상태 바인딩 확인",
  );
  addResult(
    "입력",
    "생일 없음 + 입양일 없음 제출 시 오류",
    missingDates.status === 400 && missingDates.text.includes("생일을 모른다면 처음 만난 날을 알려주세요."),
  );
  addResult(
    "입력",
    "미래 날짜 입력 방지",
    futureDate.status === 400 && futureDate.text.includes("미래 날짜는 사용할 수 없어요.") && inputSource.includes("max={today}"),
  );
  addResult(
    "입력",
    "이메일 형식 오류 처리",
    invalidEmail.status === 400 && inputSource.includes("이메일 형식이 올바르지 않아요."),
    "API 거부 + 화면 문구 확인",
  );
}

async function runFreeResultChecks(isDemoMode) {
  const freeSource = readProjectFile("app/result/free/[readingId]/page.tsx");
  const homeSource = readProjectFile("app/page.tsx");
  const demoConfigSource = readProjectFile("lib/demo/config.ts");
  const free = await get(`/result/free/${readingId}`, { redirect: "manual" });
  const staticDemoGuard =
    freeSource.includes("demoModeEnabled") &&
    freeSource.includes("DemoPremiumDirectButton");

  if (free.status === 200) {
    addResult("무료 결과", `/result/free/${readingId} 정상 로딩`, true, "status 200");
    addResult(
      "무료 결과",
      "몽이 심층 리포트 보기 버튼 존재",
      free.text.includes("몽이 심층 리포트 보기"),
    );
    addResult(
      "무료 결과",
      "DEMO_MODE=true 직접 보기 버튼/배지 노출",
      free.text.includes("데모 검수용 프리미엄 바로 보기") &&
        free.text.includes("데모 검수용"),
      "현재 실행 서버가 데모 모드일 때 확인",
    );
  } else {
    addSkip(
      "무료 결과",
      `/result/free/${readingId} 정상 로딩`,
      `status ${free.status}. 데모 모드가 꺼져 있으면 demo reading은 차단됩니다.`,
    );
  }

  addResult(
    "무료 결과",
    "DEMO_MODE=false 직접 보기 버튼 미노출 가드",
    staticDemoGuard,
    "소스에서 demoModeEnabled 조건부 렌더링 확인",
  );

  if (expectedDemoMode === "false") {
    addResult(
      "무료 결과",
      "DEMO_MODE=false 현재 서버에서 데모 버튼 미노출",
      free.status !== 200 || !free.text.includes("데모 검수용 프리미엄 바로 보기"),
      `status ${free.status}`,
    );
  } else if (!isDemoMode) {
    addSkip(
      "무료 결과",
      "DEMO_MODE=true 데모 배지 노출",
      "현재 서버가 데모 모드가 아닙니다.",
    );
  }

  addResult(
    "운영 가드",
    "production 또는 Vercel production에서 데모 강제 비활성화",
    demoConfigSource.includes("VERCEL_ENV") &&
      demoConfigSource.includes("NODE_ENV") &&
      demoConfigSource.includes("isProductionRuntime"),
    "isDemoModeEnabled 소스 확인",
  );
  addResult(
    "홈",
    "production 샘플 링크는 정적 무료 샘플로 연결",
    homeSource.includes('"/sample"') &&
      homeSource.includes("isDemoModeEnabled()"),
    "데모 비활성 환경에서는 /sample 사용",
  );
}

async function runCheckoutChecks(isDemoMode) {
  const checkoutSource = readProjectFile("app/checkout/[readingId]/page.tsx");
  const checkoutExperienceSource = readProjectFile(
    "components/payment/CheckoutExperience.tsx",
  );
  const price = getPremiumPriceFromCatalog();

  if (isDemoMode) {
    await resetDemoPayment("pdf_report");
    await resetDemoPayment("premium_report");
  }

  const checkout = await get(
    `/checkout/${readingId}?productType=premium_report${
      isDemoMode ? "&forceCheckout=1" : ""
    }`,
    { redirect: "manual" },
  );

  if (checkout.status === 200) {
    addResult("체크아웃", "premium_report 체크아웃 정상 로딩", true, "status 200");
    addResult(
      "체크아웃",
      "가격은 서버 product config 기준으로 표시",
      checkout.text.includes(`${price.toLocaleString("ko-KR")}원`),
      `catalog price ${price}`,
    );
    addResult(
      "체크아웃",
      "체크박스 3개 선택 전 결제 버튼 비활성화",
      checkout.text.includes("disabled") &&
        (checkout.text.includes("테스트 결제 성공 처리") ||
          checkout.text.includes("카카오페이로 결제하기")),
      "초기 SSR 상태 기준",
    );
    addResult(
      "체크아웃",
      "체크박스 선택 후 결제 버튼 활성화 로직 존재",
      checkoutExperienceSource.includes("checkedItems.every(Boolean)") &&
        checkoutExperienceSource.includes("disabled={!isAgreed}"),
      "클라이언트 상태 로직 확인",
    );
    addResult(
      "체크아웃",
      "DEMO_MODE=true 테스트 결제 버튼 노출",
      isDemoMode ? checkout.text.includes("테스트 결제 성공 처리") : true,
      isDemoMode ? "현재 서버 확인" : "현재 서버는 데모 모드가 아닙니다.",
    );
  } else {
    addSkip(
      "체크아웃",
      "premium_report 체크아웃 정상 로딩",
      `status ${checkout.status}. demo reading이 비활성화된 환경일 수 있습니다.`,
    );
  }

  addResult(
    "체크아웃",
    "DEMO_MODE=false 테스트 결제 버튼 미노출 가드",
    checkoutSource.includes("demoModeEnabled") &&
      checkoutExperienceSource.includes("demoModeEnabled ?") &&
      checkoutExperienceSource.includes("DemoPaymentButton"),
    "소스에서 데모 조건부 렌더링 확인",
  );
  addResult(
    "체크아웃",
    "운영 결제 환경변수 없으면 실제 결제 버튼 숨김",
    checkoutSource.includes("isKakaoPayConfigured") &&
      checkoutSource.includes("isPayPalConfigured") &&
      checkoutExperienceSource.includes("결제 준비 중입니다") &&
      checkoutExperienceSource.includes("hasLivePaymentProvider"),
    "서버에서 provider 준비 여부를 boolean으로 전달",
  );
  addResult(
    "체크아웃",
    "실패/취소 화면 보기 링크는 DEMO_MODE=true 전용",
    checkoutSource.includes("{demoModeEnabled ?") &&
      checkoutSource.includes("카카오페이 실패 화면 보기") &&
      checkoutSource.includes("페이팔 실패 화면 보기"),
    "소스 가드 확인",
  );
}

async function runPremiumChecks(isDemoMode) {
  if (!isDemoMode) {
    addSkip(
      "프리미엄",
      "데모 premium 흐름",
      "현재 서버가 DEMO_MODE=true가 아니라서 데모 결제 흐름을 건너뜁니다.",
    );
    return;
  }

  await resetDemoPayment("pdf_report");
  await resetDemoPayment("premium_report");

  const blockedPremium = await get(`/result/premium/${readingId}`, {
    redirect: "manual",
  });
  const blockedLocation = blockedPremium.headers.get("location") || "";
  addResult(
    "프리미엄",
    "결제 없이 접근 시 checkout으로 redirect",
    [301, 302, 303, 307, 308].includes(blockedPremium.status) &&
      blockedLocation.includes(`/checkout/${readingId}?productType=premium_report`),
    `status ${blockedPremium.status}, location ${blockedLocation}`,
  );

  const approved = await approveDemoPayment("premium_report");
  addResult(
    "프리미엄",
    "approved payment 생성",
    approved.status === 200 && approved.text.includes("paymentId"),
    `status ${approved.status}`,
  );

  const premium = await get(`/result/premium/${readingId}#premium-section-1`);
  const badPatterns = [
    "몽이 의",
    "몽이 이",
    "잘 맞아요.도",
    "기운은 기운은",
    "금의 기운은 금의 기운은",
    "화의 기운은 화의 기운은",
    "화의 기운은 올해는",
    "낯선 자극을 만났을 때는 금의 기운은",
    "이런 방향을 함께 보여줘요",
  ];

  addResult("프리미엄", "approved payment가 있으면 접근 가능", premium.status === 200, `status ${premium.status}`);
  addResult("프리미엄", "몽이 의 문구 없음", !premium.text.includes("몽이 의"));
  addResult("프리미엄", "잘 맞아요.도 문구 없음", !premium.text.includes("잘 맞아요.도"));
  addResult("프리미엄", "기운은 기운은 문구 없음", hasNone(premium.text, badPatterns));
  addResult(
    "프리미엄",
    "오행 밸런스 표시",
    premium.text.includes("오행 밸런스") && premium.text.includes("기운 흐름"),
  );
  addResult(
    "프리미엄",
    "오행 보완 표현이 부드럽게 표시",
    premium.text.includes("생활에서 채워주면 좋은 리듬") &&
      !premium.text.includes("보완하면 좋은 기운"),
  );
  addResult(
    "프리미엄",
    "목차 앵커 이동 대상 존재",
    premium.text.includes('href="#premium-section-1"') &&
      premium.text.includes('id="premium-section-1"'),
  );
}

async function runPdfChecks(isDemoMode) {
  if (!isDemoMode) {
    addSkip(
      "PDF",
      "데모 PDF 상품 흐름",
      "현재 서버가 DEMO_MODE=true가 아니라서 데모 결제 흐름을 건너뜁니다.",
    );
    return;
  }

  await resetDemoPayment("pdf_report");
  await resetDemoPayment("premium_report");

  const pdfWithoutPremium = await get(
    `/checkout/${readingId}?productType=pdf_report&forceCheckout=1`,
  );
  addResult(
    "PDF",
    "premium_report 없이 pdf_report checkout 접근 시 차단",
    pdfWithoutPremium.status === 200 &&
      pdfWithoutPremium.text.includes("PDF 소장본은 심층 리포트 구매 후 이용할 수 있어요."),
    `status ${pdfWithoutPremium.status}`,
  );

  const pdfApiForbidden = await get(`/api/pdf/${readingId}`);
  addResult(
    "PDF",
    "권한 없는 PDF API 요청은 403",
    pdfApiForbidden.status === 403,
    `status ${pdfApiForbidden.status}`,
  );

  await approveDemoPayment("premium_report");
  const pdfCheckout = await get(
    `/checkout/${readingId}?productType=pdf_report&forceCheckout=1`,
  );
  addResult(
    "PDF",
    "premium_report 있음 + pdf_report 없음이면 PDF 추가 구매 가능",
    pdfCheckout.status === 200 &&
      pdfCheckout.text.includes("PDF 소장본") &&
      pdfCheckout.text.includes("1,000원") &&
      pdfCheckout.text.includes("테스트 결제 성공 처리"),
    `status ${pdfCheckout.status}`,
  );

  await approveDemoPayment("pdf_report");
  const premiumAfterPdf = await get(`/result/premium/${readingId}`);
  addResult(
    "PDF",
    "pdf_report approved면 PDF 다운로드 버튼 표시",
    premiumAfterPdf.status === 200 && premiumAfterPdf.text.includes("PDF 다운로드"),
    `status ${premiumAfterPdf.status}`,
  );

  const pdfSuccess = await get(`/api/pdf/${readingId}`);
  addResult(
    "PDF",
    "pdf_report approved면 PDF API 다운로드 가능",
    pdfSuccess.status === 200 &&
      (pdfSuccess.headers.get("content-type") || "").includes("application/pdf"),
    `status ${pdfSuccess.status}`,
  );
}

async function main() {
  console.log(`멍냥사주 QA 자동 점검 시작: ${baseUrl}`);

  let isDemoMode = false;
  try {
    isDemoMode = await detectDemoMode();
  } catch (error) {
    console.error(
      `QA 대상 서버에 연결할 수 없습니다: ${baseUrl}\nNext.js dev 서버를 먼저 실행하거나 QA_BASE_URL을 확인해 주세요.`,
    );
    console.error(error);
    process.exit(1);
  }

  if (expectedDemoMode && String(isDemoMode) !== expectedDemoMode) {
    addResult(
      "환경",
      "QA_EXPECT_DEMO_MODE 일치",
      false,
      `expected ${expectedDemoMode}, actual ${isDemoMode}`,
    );
  } else {
    addResult(
      "환경",
      "데모 모드 감지",
      true,
      isDemoMode ? "DEMO_MODE=true" : "DEMO_MODE=false 또는 production",
    );
  }

  await runHomeChecks();
  await runInputChecks();
  await runFreeResultChecks(isDemoMode);
  await runCheckoutChecks(isDemoMode);
  await runPremiumChecks(isDemoMode);
  await runPdfChecks(isDemoMode);

  console.table(results);

  const failed = results.filter((result) => result.결과 === "FAIL");
  const skipped = results.filter((result) => result.결과 === "SKIP");

  console.log(
    `\n요약: PASS ${results.length - failed.length - skipped.length}, FAIL ${failed.length}, SKIP ${skipped.length}`,
  );

  if (skipped.length > 0) {
    console.log(
      "참고: 전체 데모 결제 흐름은 DEMO_MODE=true로 서버를 실행해야 모두 점검됩니다.",
    );
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("QA 스크립트 실행 중 오류가 발생했습니다.");
  console.error(error);
  process.exit(1);
});
