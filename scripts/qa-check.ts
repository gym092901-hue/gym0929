// @ts-nocheck

const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const crypto = require("node:crypto");
const zlib = require("node:zlib");

const baseUrl = (process.env.QA_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  "",
);
const readingId = process.env.QA_READING_ID || "demo-mong-2026";
const expectedDemoMode = process.env.QA_EXPECT_DEMO_MODE;
const rootDir = process.cwd();
const phrase = (...parts) => parts.join("");
const forbiddenCopy = {
  dogTextAvatar: String.fromCharCode(0xba4d),
  testPaymentSuccess: phrase("테스트 결제 성공 ", "처리"),
  premiumDirect: phrase("심층 리포트 페이지 ", "바로 보기"),
  demoPdfPreview: phrase("데모 PDF ", "미리보기"),
  awkwardPlaySuffix: phrase("잘 맞아요", ".도"),
  fireYearPrefix: phrase("화의 기운은 ", "올해는"),
  strangerMetalPrefix: phrase("낯선 자극을 만났을 때는 ", "금의 기운은"),
  hookYaPeriodSpacing: phrase(" ", "야."),
  hookYaSeparatedPeriod: phrase("야", " ."),
  hookYaWordSpacing: phrase(" ", "야", " "),
  hookAegyoSpacing: phrase("애교쟁이", " 야"),
  hookSensitivitySpacing: phrase("감수성러", " 야"),
  checkoutPixelMascot: phrase("픽셀 ", "캐릭터"),
  checkoutPaymentPixelMascot: phrase("몽이 결제를 안내하는 ", "픽셀 ", "캐릭터"),
  checkoutReceiptPixelMascot: phrase("영수증을 든 반려동물 ", "픽셀 ", "캐릭터"),
  checkoutButtonPixelMascot: phrase("결제 버튼을 안내하는 반려동물 ", "픽셀 ", "캐릭터"),
  dogFaceIllustration: phrase("강아지 얼굴 ", "일러스트"),
  catFaceIllustration: phrase("고양이 얼굴 ", "일러스트"),
  reportCardTogetherCharacter: phrase("리포트 카드를 함께 보는 ", "캐릭터"),
  legacyPdfKeepsakeCopy: phrase("PDF ", "\uc18c\uc7a5\ubcf8"),
  legacyPaidPdfCopy: phrase("PDF ", "\uc18c\uc7a5\ubcf8 추가 ", "1", ",", "000"),
  legacyPaidPdfCopyWithWon: phrase("PDF ", "\uc18c\uc7a5\ubcf8 추가 ", "1", ",", "000원"),
  legacyPdfExtraProductCopy: phrase("PDF 다운로드 추가 ", "상품"),
};

const results = [];

function addResult(group, check, ok, detail = "", meta = {}) {
  results.push({
    구간: group,
    점검: check,
    결과: ok ? "PASS" : "FAIL",
    URL: meta.url || "",
    "문구/요소": meta.issue || "",
    "확인 파일": meta.file || "",
    상세: detail,
  });
}

function addSkip(group, check, detail = "", meta = {}) {
  results.push({
    구간: group,
    점검: check,
    결과: "SKIP",
    URL: meta.url || "",
    "문구/요소": meta.issue || "",
    "확인 파일": meta.file || "",
    상세: detail,
  });
}

function readProjectFile(filePath) {
  return fs.readFileSync(path.join(rootDir, filePath), "utf8");
}

function readReviewExportTextHtmlBundle() {
  const reviewDir = path.join(rootDir, "gpt-review");

  if (!fs.existsSync(reviewDir)) {
    return null;
  }

  const files = fs
    .readdirSync(reviewDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(txt|html)$/i.test(entry.name))
    .map((entry) => path.join(reviewDir, entry.name));

  if (files.length === 0) {
    return "";
  }

  return files.map((filePath) => fs.readFileSync(filePath, "utf8")).join("\n\n");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function getBaseName(filePath) {
  return filePath.split(/[\\/]/).pop();
}

function readGptReviewFolderEntries() {
  const reviewDir = path.join(rootDir, "gpt-review");

  if (!fs.existsSync(reviewDir)) {
    return null;
  }

  const entries = new Map();
  const files = fs
    .readdirSync(reviewDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(txt|html|json)$/i.test(entry.name));

  for (const entry of files) {
    entries.set(entry.name, fs.readFileSync(path.join(reviewDir, entry.name), "utf8"));
  }

  return entries;
}

function readGptReviewZipEntries() {
  const zipPath = path.join(rootDir, "gpt-review.zip");

  if (!fs.existsSync(zipPath)) {
    return null;
  }

  const buffer = fs.readFileSync(zipPath);
  const minSearchOffset = Math.max(0, buffer.length - 66000);
  let eocdOffset = -1;

  for (let offset = buffer.length - 22; offset >= minSearchOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new Error("gpt-review.zip central directory를 찾을 수 없습니다.");
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let centralOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = new Map();

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) {
      throw new Error(`gpt-review.zip central entry ${index}를 읽을 수 없습니다.`);
    }

    const compressionMethod = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const fileNameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localHeaderOffset = buffer.readUInt32LE(centralOffset + 42);
    const entryName = buffer
      .subarray(centralOffset + 46, centralOffset + 46 + fileNameLength)
      .toString("utf8");

    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error(`gpt-review.zip local entry ${entryName}를 읽을 수 없습니다.`);
    }

    const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    let contents;

    if (compressionMethod === 0) {
      contents = compressed;
    } else if (compressionMethod === 8) {
      contents = zlib.inflateRawSync(compressed);
    } else {
      contents = null;
    }

    const baseName = getBaseName(entryName);

    if (contents && /\.(txt|html|json)$/i.test(baseName)) {
      entries.set(baseName, contents.toString("utf8"));
    }

    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function hasAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

function hasNone(text, needles) {
  return needles.every((needle) => !text.includes(needle));
}

function countOccurrences(text, pattern) {
  return text.match(pattern)?.length || 0;
}

function normalizeHtml(text) {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

function stripHtml(text) {
  return normalizeHtml(text)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasStandaloneTextToken(html, token) {
  const plainText = stripHtml(html);
  return new RegExp(`(^|\\s)${token}(?=\\s|$)`).test(plainText);
}

function hasMascotSpecies(html, species) {
  return (
    html.includes(`data-mascot="${species}"`) ||
    html.includes(`data-mascot-species="${species}"`)
  );
}

function hasMascotSpeciesMarker(html, species) {
  return html.includes(`data-mascot-species="${species}"`);
}

function findLineMatches(fileName, content, checks) {
  const lines = String(content || "").split(/\r\n|\n|\r/);
  const matches = [];

  lines.forEach((line, index) => {
    checks.forEach(({ label, phrase, pattern }) => {
      if (phrase && line.includes(phrase)) {
        matches.push({ fileName, line: index + 1, phrase: label || phrase });
      }

      if (pattern) {
        const regex = new RegExp(pattern.source, pattern.flags.replace("g", ""));

        if (regex.test(line)) {
          matches.push({ fileName, line: index + 1, phrase: label || pattern.source });
        }
      }
    });
  });

  return matches;
}

function formatSnapshotMatches(matches, limit = 12) {
  const preview = matches
    .slice(0, limit)
    .map((match) => `${match.fileName}:${match.line} "${match.phrase}"`)
    .join("; ");

  return matches.length > limit
    ? `${preview}; ... +${matches.length - limit} more`
    : preview;
}

function isLocalQaTarget() {
  try {
    const parsed = new URL(baseUrl);
    return ["127.0.0.1", "localhost", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function getPremiumPriceFromCatalog() {
  const catalog = readProjectFile("lib/products/catalog.ts");
  const match = catalog.match(/premium_report:\s*{[\s\S]*?price:\s*(\d+)/);
  return match ? Number(match[1]) : 1990;
}

function getProductPriceFromCatalog(productType) {
  const catalog = readProjectFile("lib/products/catalog.ts");
  const match = catalog.match(
    new RegExp(`${productType}:\\s*{[\\s\\S]*?price:\\s*(\\d+)`),
  );
  return match ? Number(match[1]) : null;
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
    "무료 사주 맛보기 시작 버튼 존재",
    home.text.includes("무료 사주 맛보기 시작"),
  );
  addResult(
    "홈",
    "무료/유료 가격 안내 분리",
    home.text.includes("무료 맛보기는 무료로 볼 수 있고") &&
      home.text.includes("심층 리포트") &&
      home.text.includes("1,990원"),
    "홈에서는 무료 시작과 유료 심층 리포트 선택 결제를 함께 안내",
  );
  addResult(
    "홈",
    "샘플 리포트 보기 버튼 미노출",
    !home.text.includes("샘플 리포트 보기"),
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
  const inputSummaryTagsSource = readProjectFile(
    "components/report/PetInputSummaryTags.tsx",
  );
  const readingsRouteSource = readProjectFile("app/api/readings/route.ts");
  const localReadingStoreSource = readProjectFile("lib/readings/localReadingStore.ts");
  const databaseTypes = readProjectFile("types/database.ts");
  const lifestyleSource = readProjectFile("lib/readings/lifestyle.ts");
  const contentSource = readProjectFile("lib/readings/content.ts");
  const engineSource = readProjectFile("lib/saju/petSajuEngine.ts");
  const premiumSource = readProjectFile("lib/saju/premiumReportGenerator.ts");
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
    "생일을 몰라요 체크 시 생년월일 비활성화 및 초기화",
    inputSource.includes("disabled={birthDateUnknown}") &&
      inputSource.includes("value={birthDate}") &&
      inputSource.includes('setBirthDate("")'),
    "클라이언트 상태 바인딩과 값 초기화 확인",
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
    futureDate.status === 400 &&
      futureDate.text.includes("미래 날짜는 사용할 수 없어요.") &&
      inputSource.includes("isFutureDate"),
  );
  addResult(
    "입력",
    "보호자 이메일 입력란 제거 및 API 형식 방어 유지",
    invalidEmail.status === 400 &&
      invalidEmail.text.includes("이메일 형식을 다시 확인해 주세요.") &&
      !inputPage.text.includes("보호자 이메일") &&
      !inputSource.includes('name="owner_email"'),
    "화면에서는 이메일을 받지 않고, 직접 payload가 들어와도 서버에서 형식 검증",
  );
  addResult(
    "입력",
    "개인정보처리방침 링크 표시",
    inputPage.text.includes("개인정보처리방침") &&
      inputSource.includes('href="/privacy"'),
    "이메일 안내 영역 링크 확인",
  );
  addResult(
    "입력",
    "생활 패턴 입력란 제거",
    hasNone(inputPage.text, [
      "생활 패턴",
      "생활 환경",
      "하루 산책/놀이 횟수",
      "혼자 있는 시간",
      "낯선 사람 반응",
      "보호자와의 거리감",
      "좋아하는 활동",
      "보호자가 궁금한 점",
    ]),
    "최근 입력 UX 정책에 따라 기본 정보만 받도록 정리",
    {
      url: "/input",
      issue: "remove lifestyle personalization fields from input UI",
      file: "app/input/page.tsx",
    },
  );
  addResult(
    "입력",
    "기본 입력 요약 태그 UI 존재",
    inputSource.includes("<PetInputSummaryTags") &&
      inputSummaryTagsSource.includes("flex flex-wrap"),
    "이름, 종, 날짜, 시간 모름 정보를 pill 태그로 표시",
    {
      url: "/input",
      issue: "basic input summary tags",
      file: "app/input/page.tsx, components/report/PetInputSummaryTags.tsx",
    },
  );
  addResult(
    "입력",
    "입력 폼 하단 공통 요약 태그 컴포넌트 연결",
    inputSource.includes("<PetInputSummaryTags") &&
      inputSummaryTagsSource.includes('data-testid="pet-input-summary-tags"') &&
      inputSummaryTagsSource.includes('trimmed === "null"') &&
      inputSummaryTagsSource.includes('trimmed === "undefined"'),
    "하단 태그 컴포넌트와 null/undefined 방지 로직 확인",
    {
      url: "/input",
      issue: "PetInputSummaryTags input integration",
      file: "app/input/page.tsx, components/report/PetInputSummaryTags.tsx",
    },
  );
  addResult(
    "입력",
    "생활 패턴 서버 필드는 선택값으로만 유지",
    readingsRouteSource.includes("normalizeLifestyleProfile") &&
      readingsRouteSource.includes("living_environment") &&
      readingsRouteSource.includes("daily_activity_frequency") &&
      readingsRouteSource.includes("stranger_reaction") &&
      databaseTypes.includes("living_environment") &&
      databaseTypes.includes("favorite_activities") &&
      !inputSource.includes("living_environment") &&
      !inputSource.includes("daily_activity_frequency"),
    "DB/API 호환성은 유지하되 입력 화면에서는 노출하지 않음",
    {
      url: "/api/readings",
      issue: "optional lifestyle persistence without input UI",
      file: "app/api/readings/route.ts, types/database.ts",
    },
  );
  addResult(
    "입력",
    "생활 패턴 리포트 문장 반영",
    lifestyleSource.includes("createLifestyleContextCopy") &&
      contentSource.includes("lifestyleCopy") &&
      engineSource.includes("createLifestyleContextCopy") &&
      premiumSource.includes("createLifestyleContextCopy"),
    "무료 섹션, 무료 요약, 프리미엄 리포트 생성기에 생활 패턴 컨텍스트 반영",
    {
      issue: "lifestyle report personalization",
      file: "lib/readings/lifestyle.ts, lib/readings/content.ts, lib/saju/petSajuEngine.ts, lib/saju/premiumReportGenerator.ts",
    },
  );
  addResult(
    "운영 가드",
    "production에서 Supabase 미설정 시 local reading 생성 금지",
    readingsRouteSource.includes("isProductionRuntime()") &&
      readingsRouteSource.includes("isDemoModeEnabled()") &&
      readingsRouteSource.includes('process.env.NODE_ENV === "development"') &&
      readingsRouteSource.includes("운영 데이터베이스 설정이 필요합니다.") &&
      readingsRouteSource.indexOf("운영 데이터베이스 설정이 필요합니다.") <
        readingsRouteSource.indexOf("createLocalReading({") &&
      localReadingStoreSource.includes("isProductionRuntime()") &&
      localReadingStoreSource.includes("isDemoModeEnabled()") &&
      localReadingStoreSource.includes('process.env.NODE_ENV === "development"') &&
      localReadingStoreSource.includes("throw new Error") &&
      localReadingStoreSource.includes("운영 데이터베이스 설정이 필요합니다."),
    "운영에서는 DB 설정 오류를 반환하고, development 또는 DEMO_MODE=true일 때만 local-* fallback 허용",
    {
      url: "/api/readings",
      issue: "production local reading fallback block",
      file: "app/api/readings/route.ts, lib/readings/localReadingStore.ts",
    },
  );
}

async function runFreeResultChecks(isDemoMode) {
  const freeSource = readProjectFile("app/result/free/[readingId]/page.tsx");
  const homeSource = readProjectFile("app/page.tsx");
  const demoConfigSource = readProjectFile("lib/demo/config.ts");
  const readingsSource = readProjectFile("lib/readings.ts");
  const free = await get(`/result/free/${readingId}`, { redirect: "manual" });
  const staticDemoGuard =
    freeSource.includes("demoModeEnabled") &&
    freeSource.includes("DemoPremiumDirectButton");

  if (free.status === 200) {
    addResult("무료 결과", `/result/free/${readingId} 정상 로딩`, true, "status 200");
    addResult(
      "무료 결과",
      "상단 앱바가 무료 화면을 무료로 표시",
      free.text.includes("무료 사주 맛보기") &&
        free.text.includes("무료 열람 중") &&
        freeSource.includes('rightLabel="무료"') &&
        !freeSource.includes('rightLabel={`${premiumPrice}원`}'),
      "가격은 유료 CTA에서만 표시",
    );
    addResult(
      "무료 결과",
      "몽이 심층 리포트 보기 버튼 존재",
      free.text.includes("몽이 심층 리포트 보기"),
    );
    if (isDemoMode) {
      addResult(
        "무료 결과",
        "DEMO_MODE=true 직접 보기 버튼/배지 노출",
        free.text.includes("데모 검수용 프리미엄 바로 보기") &&
          free.text.includes("데모 검수용"),
        "현재 실행 서버가 데모 모드일 때 확인",
      );
    } else {
      addResult(
        "무료 결과",
        "DEMO_MODE=false 직접 보기 버튼 미노출",
        !free.text.includes("데모 검수용 프리미엄 바로 보기"),
        "현재 실행 서버가 데모 모드가 아닐 때 확인",
      );
    }
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
    "샘플 리포트 링크 미노출",
    !homeSource.includes("샘플 리포트 보기") &&
      !homeSource.includes('href="/sample"'),
    "현재 공개 흐름은 실제 입력 페이지 중심",
  );
  addResult(
    "운영 가드",
    "demo reading은 production에서 무료 결과와 getReading 모두 차단",
    freeSource.includes("isDemoReadingId(readingId)") &&
      freeSource.includes('redirect("/sample")') &&
      readingsSource.includes("readingId === demoReadingId") &&
      readingsSource.includes("isDemoModeEnabled() ? getDemoReading() : null"),
    "demo-mong-2026은 운영에서 /sample redirect 또는 null 처리",
    {
      url: `/result/free/${readingId}`,
      issue: "demo reading production guard",
      file: "app/result/free/[readingId]/page.tsx, lib/readings.ts",
    },
  );
}

async function runCheckoutChecks(isDemoMode) {
  const checkoutSource = readProjectFile("app/checkout/[readingId]/page.tsx");
  const checkoutExperienceSource = readProjectFile(
    "components/payment/CheckoutExperience.tsx",
  );
  const checkoutMascotSourceBundle = [
    checkoutSource,
    checkoutExperienceSource,
    readProjectFile("components/report/ReportSceneBanner.tsx"),
    readProjectFile("components/mascot/PetMascot.tsx"),
  ].join("\n");
  const checkoutMascotForbiddenLabels = [
    forbiddenCopy.checkoutPaymentPixelMascot,
    forbiddenCopy.checkoutReceiptPixelMascot,
    forbiddenCopy.checkoutButtonPixelMascot,
    forbiddenCopy.checkoutPixelMascot,
  ];
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
    const checkoutForbiddenMascotLabel = checkoutMascotForbiddenLabels.find(
      (label) => checkout.text.includes(label),
    );

    addResult("체크아웃", "premium_report 체크아웃 정상 로딩", true, "status 200");
    addResult(
      "체크아웃",
      "가격은 서버 product config 기준으로 표시",
      checkout.text.includes(`${price.toLocaleString("ko-KR")}원`),
      `catalog price ${price}`,
    );
    addResult(
      "체크아웃",
      "정식 가격 안내는 1,990원/990원/PDF 무료로 표시",
      checkout.text.includes("심층 리포트 1,990원") &&
        checkout.text.includes("추가 콘텐츠 990원") &&
        checkout.text.includes("PDF 무료"),
      "checkout product summary price copy",
      {
        url: `/checkout/${readingId}?productType=premium_report`,
        issue: "checkout release price copy",
        file: "app/checkout/[readingId]/page.tsx",
      },
    );
    addResult(
      "체크아웃",
      "체크박스 3개 선택 전 결제 버튼 비활성화",
      checkout.text.includes("disabled") &&
        (checkout.text.includes(forbiddenCopy.testPaymentSuccess) ||
          checkout.text.includes("데모 결제 승인") ||
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
      isDemoMode ? checkout.text.includes("데모 결제 승인") : true,
      isDemoMode ? "현재 서버 확인" : "현재 서버는 데모 모드가 아닙니다.",
    );
    addResult(
      "체크아웃",
      "캐릭터 설명 텍스트가 사용자 화면에 노출되지 않음",
      !checkoutForbiddenMascotLabel,
      checkoutForbiddenMascotLabel
        ? `forbidden checkout mascot label found: ${checkoutForbiddenMascotLabel}`
        : "",
      {
        url: `/checkout/${readingId}?productType=premium_report`,
        issue: checkoutForbiddenMascotLabel || "checkout mascot label",
        file: "app/checkout/[readingId]/page.tsx, components/payment/CheckoutExperience.tsx",
      },
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
    "체크아웃 캐릭터 설명에 픽셀 관련 표현 없음",
    !checkoutMascotForbiddenLabels.some((label) =>
      checkoutMascotSourceBundle.includes(label),
    ),
    "장식용 캐릭터는 decorative/aria-hidden 처리하고 화면 문구로 설명하지 않음",
    {
      issue: "checkout pixel mascot copy",
      file: "app/checkout/[readingId]/page.tsx, components/payment/CheckoutExperience.tsx, components/report/ReportSceneBanner.tsx",
    },
  );
  addResult(
    "체크아웃",
    "운영 결제 환경변수 없으면 실제 결제 버튼 숨김",
    checkoutSource.includes("isKakaoPayConfigured") &&
      checkoutSource.includes("isPayPalConfigured") &&
      checkoutExperienceSource.includes("결제 준비 중입니다") &&
      checkoutExperienceSource.includes("hasLivePaymentProvider") &&
      checkoutExperienceSource.includes("!hasLivePaymentProvider ?") &&
      checkoutExperienceSource.includes("!demoModeEnabled && !hasLivePaymentProvider"),
    "서버에서 provider 준비 여부를 boolean으로 전달하고 결제수단이 없으면 준비 안내만 표시",
  );
  addResult(
    "체크아웃",
    "KakaoPay env 없으면 숨김, env 있으면 카카오페이 버튼 표시 분기",
    [
      "KAKAOPAY_CLIENT_ID",
      "KAKAOPAY_SECRET_KEY",
      "KAKAOPAY_CID",
      "KAKAOPAY_BASE_URL",
      "isSiteUrlConfigured()",
      "kakaoPayEnabled={isKakaoPayConfigured()}",
    ].every((needle) => checkoutSource.includes(needle)) &&
      checkoutExperienceSource.includes("kakaoPayEnabled ?") &&
      checkoutExperienceSource.includes("<CheckoutPaymentButtons"),
    "KakaoPay 필수 환경변수와 사이트 URL이 모두 설정된 경우에만 버튼 렌더링",
    {
      url: "/checkout/[readingId]?productType=premium_report",
      issue: "KakaoPay env-gated checkout button",
      file: "app/checkout/[readingId]/page.tsx, components/payment/CheckoutExperience.tsx",
    },
  );
  addResult(
    "체크아웃",
    "PayPal env 없으면 숨김, env 있으면 PayPal 버튼 표시 분기",
    [
      "PAYPAL_CLIENT_ID",
      "PAYPAL_CLIENT_SECRET",
      "PAYPAL_BASE_URL",
      "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
      "isSiteUrlConfigured()",
      "paypalEnabled={isPayPalConfigured()}",
    ].every((needle) => checkoutSource.includes(needle)) &&
      checkoutExperienceSource.includes("paypalEnabled ?") &&
      checkoutExperienceSource.includes("<PayPalCheckout"),
    "PayPal 서버/브라우저용 환경변수와 사이트 URL이 모두 설정된 경우에만 버튼 렌더링",
    {
      url: "/checkout/[readingId]?productType=premium_report",
      issue: "PayPal env-gated checkout button",
      file: "app/checkout/[readingId]/page.tsx, components/payment/CheckoutExperience.tsx",
    },
  );
  addResult(
    "체크아웃",
    "production + 결제 env 없음이면 데모/실제 결제 버튼 없이 준비 안내",
    checkoutExperienceSource.includes("!hasLivePaymentProvider ?") &&
      checkoutExperienceSource.includes("결제 준비 중입니다") &&
      checkoutExperienceSource.includes("DemoPaymentButton") &&
      checkoutExperienceSource.includes("demoModeEnabled ?") &&
      checkoutExperienceSource.includes("kakaoPayEnabled ?") &&
      checkoutExperienceSource.includes("paypalEnabled ?"),
    "DEMO_MODE가 꺼지고 provider env가 없으면 준비 안내 분기만 렌더링",
    {
      url: "/checkout/[readingId]?productType=premium_report",
      issue: "production no live payment provider fallback",
      file: "components/payment/CheckoutExperience.tsx",
    },
  );
  addResult(
    "체크아웃",
    "실패/취소 화면 보기 링크는 DEMO_MODE=true 전용",
    checkoutSource.includes("{demoModeEnabled ?") &&
      checkoutSource.includes("개발용 결제 실패 확인") &&
      checkoutSource.includes("개발용 결제 취소 확인"),
    "소스 가드 확인",
  );

  if (checkout.status === 200 && !isDemoMode) {
    [
      "개발용 결제 실패 확인",
      "개발용 결제 취소 확인",
    ].forEach((label) => {
      addResult(
        "권한 검사",
        `production에서 ${label} 없음`,
        !checkout.text.includes(label),
        checkout.text.includes(label) ? `forbidden demo link found: ${label}` : "",
        {
          url: `/checkout/${readingId}?productType=premium_report`,
          issue: label,
          file: "components/payment/CheckoutExperience.tsx",
        },
      );
    });
  }
}

async function runRuntimeAuthorizationChecks(isDemoMode) {
  if (isDemoMode) {
    await resetDemoPayment("premium_report");
  }

  const blockedPremium = await get(`/result/premium/${readingId}`, {
    redirect: "manual",
  });
  const blockedLocation = blockedPremium.headers.get("location") || "";
  const premiumBlocked =
    ([301, 302, 303, 307, 308].includes(blockedPremium.status) &&
      (blockedLocation.includes(`/checkout/${readingId}?productType=premium_report`) ||
        blockedLocation.includes("/input"))) ||
    [403, 404].includes(blockedPremium.status);

  addResult(
    "권한 검사",
    "결제 없이 프리미엄 직접 접근 시 checkout redirect 또는 접근 차단",
    premiumBlocked,
    `status ${blockedPremium.status}, location ${blockedLocation}`,
    {
      url: `/result/premium/${readingId}`,
      issue: "premium direct access without payment",
      file: "app/result/premium/[readingId]/page.tsx, lib/payment/checkPaymentAccess.ts",
    },
  );

  if (isDemoMode) {
    await resetDemoPayment("premium_report");
  }

  const pdfForbidden = await get(`/api/pdf/${readingId}`);
  addResult(
    "권한 검사",
    "결제 없이 PDF API 호출 시 403",
    pdfForbidden.status === 403,
    `status ${pdfForbidden.status}`,
    {
      url: `/api/pdf/${readingId}`,
      issue: "PDF API without premium_report approved payment",
      file: "app/api/pdf/[readingId]/route.ts",
    },
  );
}

function inspectGptReviewSnapshotEntries(label, entries) {
  const requiredFiles = [
    "home.txt",
    "input.txt",
    "free-result-cat.txt",
    "checkout-premium-report.txt",
    "premium-result.txt",
    "sample.txt",
    "summary.json",
  ];
  const missingRequired = requiredFiles.filter((fileName) => !entries.has(fileName));
  const hasDogFreeResult = entries.has("free-result-dog.txt") || entries.has("free-result.txt");

  addResult(
    "GPT 스냅샷",
    `${label}: 필수 txt/json 파일 존재`,
    missingRequired.length === 0 && hasDogFreeResult,
    [
      missingRequired.length > 0 ? `missing: ${missingRequired.join(", ")}` : "",
      hasDogFreeResult ? "" : "missing: free-result-dog.txt 또는 free-result.txt",
    ]
      .filter(Boolean)
      .join("; "),
    {
      url: label,
      issue: "snapshot required files",
      file: "gpt-review.zip, gpt-review/",
    },
  );

  const textTargets = [
    "home.txt",
    "input.txt",
    entries.has("free-result-dog.txt") ? "free-result-dog.txt" : "free-result.txt",
    "free-result-cat.txt",
    "checkout-premium-report.txt",
    "premium-result.txt",
    "sample.txt",
    "summary.json",
  ].filter((fileName) => entries.has(fileName));
  const textChecks = [
    { label: "2,900원", phrase: "2,900원" },
    { label: "1,000원", phrase: "1,000원" },
    { label: "4,900원", phrase: "4,900원" },
    { label: "5,900원", phrase: "5,900원" },
    { label: "3,900원", phrase: "3,900원" },
    { label: "PDF 소장본 추가 1,000원", phrase: "PDF 소장본 추가 1,000원" },
    { label: "PDF 소장본", phrase: "PDF 소장본" },
    { label: "PDF 다운로드 추가 상품", phrase: "PDF 다운로드 추가 상품" },
    { label: "PDF 결제", phrase: "PDF 결제" },
    { label: "AI", pattern: /(^|[^A-Za-z])AI([^A-Za-z]|$)/ },
    { label: "인공지능", phrase: "인공지능" },
    { label: "Gemini", phrase: "Gemini" },
    { label: "규칙 기반 엔진", phrase: "규칙 기반 엔진" },
    { label: "자동 생성", phrase: "자동 생성" },
    {
      label: "standalone 멍",
      pattern: /(^|[\s"'“”‘’<>()\[\]{}.,!?·:;])멍(?=[\s"'“”‘’<>()\[\]{}.,!?·:;]|$)/,
    },
  ];
  const textViolations = textTargets.flatMap((fileName) =>
    findLineMatches(fileName, entries.get(fileName), textChecks),
  );

  addResult(
    "GPT 스냅샷",
    `${label}: 가격/PDF/기술/텍스트 아바타 금지 문구 없음`,
    textViolations.length === 0,
    textViolations.length > 0
      ? formatSnapshotMatches(textViolations)
      : "forbidden phrases not found in snapshot txt/json files",
    {
      url: label,
      issue: "snapshot forbidden phrases",
      file: "home.txt, input.txt, free-result*.txt, checkout-premium-report.txt, premium-result.txt, sample.txt, summary.json",
    },
  );

  const htmlTargets = [
    "home.html",
    "input.html",
    entries.has("free-result-dog.html") ? "free-result-dog.html" : "free-result.html",
    "free-result-cat.html",
    "sample.html",
  ];
  const htmlBundle = htmlTargets
    .filter((fileName) => entries.has(fileName))
    .map((fileName) => entries.get(fileName))
    .join("\n");
  const hasPetHook = htmlBundle.includes('data-testid="pet-hook-card"');
  const hasDogMascot = htmlBundle.includes('data-mascot-species="dog"');
  const hasCatMascot = htmlBundle.includes('data-mascot-species="cat"');

  addResult(
    "GPT 스냅샷",
    `${label}: PetHookCard 및 DogMascot/CatMascot 존재`,
    hasPetHook && hasDogMascot && hasCatMascot,
    [
      hasPetHook ? "" : "missing PetHookCard marker",
      hasDogMascot ? "" : "missing DogMascot marker",
      hasCatMascot ? "" : "missing CatMascot marker",
    ]
      .filter(Boolean)
      .join("; "),
    {
      url: label,
      issue: "snapshot mascot/hook markers",
      file: "free-result*.html, sample.html",
    },
  );

  let summary = null;

  try {
    summary = JSON.parse(entries.get("summary.json") || "{}");
  } catch (error) {
    addResult(
      "GPT 스냅샷",
      `${label}: summary.json 파싱`,
      false,
      error instanceof Error ? error.message : String(error),
      {
        url: label,
        issue: "snapshot summary parse",
        file: "summary.json",
      },
    );
  }

  if (summary) {
    const checks = summary.checks || {};
    const expectedFalseFlags = [
      "hasOldPricePhrases",
      "hasStandaloneMeongAvatar",
      "hasPdfPaidPhrase",
      "hasCustomerFacingAiPhrase",
      "hasCustomerFacingGenerationPhrase",
    ];
    const badFalseFlags = expectedFalseFlags.filter((flag) => checks[flag] !== false);
    const expectedTrueFlags = [
      "hasPetHookCard",
      "hasDogMascot",
      "hasCatMascot",
      "premiumAccessBlockedBeforePayment",
      "pdfApiBlockedBeforePayment",
      "reviewProtected",
    ];
    const badTrueFlags = expectedTrueFlags.filter((flag) => checks[flag] !== true);
    const sampleSnapshot = (summary.snapshots || []).find(
      (snapshot) => snapshot.fileBase === "sample" || snapshot.path === "/sample",
    );
    const samplePublic = Boolean(sampleSnapshot && sampleSnapshot.status === 200);

    addResult(
      "GPT 스냅샷",
      `${label}: summary 정책 플래그 일치`,
      badFalseFlags.length === 0 && badTrueFlags.length === 0 && samplePublic,
      [
        badFalseFlags.length > 0 ? `expected false: ${badFalseFlags.join(", ")}` : "",
        badTrueFlags.length > 0 ? `expected true: ${badTrueFlags.join(", ")}` : "",
        samplePublic ? "" : "/sample status is not 200 in summary",
      ]
        .filter(Boolean)
        .join("; "),
      {
        url: label,
        issue: "snapshot summary policy flags",
        file: "summary.json",
      },
    );
  }
}

function runGptReviewSnapshotChecks() {
  const folderEntries = readGptReviewFolderEntries();
  const zipEntries = (() => {
    try {
      return readGptReviewZipEntries();
    } catch (error) {
      addResult(
        "GPT 스냅샷",
        "gpt-review.zip 읽기",
        false,
        error instanceof Error ? error.message : String(error),
        {
          url: "gpt-review.zip",
          issue: "zip read failure",
          file: "gpt-review.zip",
        },
      );
      return null;
    }
  })();

  if (folderEntries) {
    inspectGptReviewSnapshotEntries("gpt-review folder", folderEntries);
  } else {
    addSkip(
      "GPT 스냅샷",
      "gpt-review folder 검사",
      "gpt-review folder not found",
      {
        url: "gpt-review/",
        issue: "snapshot folder missing",
        file: "gpt-review/",
      },
    );
  }

  if (zipEntries) {
    inspectGptReviewSnapshotEntries("gpt-review.zip", zipEntries);
  } else {
    addResult(
      "GPT 스냅샷",
      "gpt-review.zip 존재",
      false,
      "gpt-review.zip not found or unreadable",
      {
        url: "gpt-review.zip",
        issue: "snapshot zip missing",
        file: "gpt-review.zip",
      },
    );
  }

  if (folderEntries && zipEntries) {
    const compareFiles = [
      "home.txt",
      "input.txt",
      "free-result-dog.txt",
      "free-result.txt",
      "free-result-cat.txt",
      "checkout-premium-report.txt",
      "checkout.txt",
      "premium-result.txt",
      "sample.txt",
      "summary.json",
    ];
    const mismatches = compareFiles.filter((fileName) => {
      if (!folderEntries.has(fileName) || !zipEntries.has(fileName)) {
        return folderEntries.has(fileName) !== zipEntries.has(fileName);
      }

      return sha256(folderEntries.get(fileName)) !== sha256(zipEntries.get(fileName));
    });

    addResult(
      "GPT 스냅샷",
      "gpt-review folder와 zip 내용 일치",
      mismatches.length === 0,
      mismatches.length > 0
        ? `mismatch: ${mismatches.join(", ")}`
        : "zip snapshot matches generated folder for required files",
      {
        url: "gpt-review.zip",
        issue: "snapshot folder/zip mismatch",
        file: "gpt-review.zip, gpt-review/",
      },
    );
  }
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
    phrase("몽이", " 의"),
    phrase("몽이", " 이"),
    forbiddenCopy.awkwardPlaySuffix,
    ".도 잘 맞습니다",
    phrase("기운은 ", "기운은"),
    phrase("금의 기운은 ", "금의 기운은"),
    phrase("금의 기운은 ", "기준을 세우고"),
    phrase("화의 기운은 ", "화의 기운은"),
    forbiddenCopy.fireYearPrefix,
    forbiddenCopy.strangerMetalPrefix,
    phrase("이런 방향을 ", "함께 보여줘요"),
  ];

  addResult("프리미엄", "approved payment가 있으면 접근 가능", premium.status === 200, `status ${premium.status}`);
  addResult(
    "프리미엄",
    `${phrase("몽이", " 의")} 문구 없음`,
    !premium.text.includes(phrase("몽이", " 의")),
  );
  addResult(
    "프리미엄",
    `${forbiddenCopy.awkwardPlaySuffix} 문구 없음`,
    !premium.text.includes(forbiddenCopy.awkwardPlaySuffix),
  );
  addResult(
    "프리미엄",
    `${phrase("기운은 ", "기운은")} 문구 없음`,
    hasNone(premium.text, badPatterns),
  );
  addResult(
    "프리미엄",
    "오행 밸런스 표시",
    premium.text.includes("오행 밸런스") && premium.text.includes("기운 흐름"),
  );
  addResult(
    "프리미엄",
    "오행 보완 표현이 부드럽게 표시",
    (premium.text.includes("천천히 채워주면 좋은 리듬") ||
      premium.text.includes("생활에서 채워주면 좋은 리듬")) &&
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
      "PDF로 저장하기 흐름",
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
    "premium_report 없이 pdf_report checkout 접근 시 premium_report checkout으로 이동",
    pdfWithoutPremium.status === 200 &&
      pdfWithoutPremium.url.includes("productType=premium_report"),
    `status ${pdfWithoutPremium.status}, url ${pdfWithoutPremium.url}`,
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
    "premium_report 있음이면 PDF 체크아웃 대신 프리미엄으로 이동",
    pdfCheckout.status === 200 &&
      pdfCheckout.url.includes(`/result/premium/${readingId}`) &&
      pdfCheckout.text.includes("PDF로 저장하기"),
    `status ${pdfCheckout.status}, url ${pdfCheckout.url}`,
  );

  const premiumAfterPdf = await get(`/result/premium/${readingId}`);
  addResult(
    "PDF",
    "premium_report approved면 PDF로 저장하기 버튼 표시",
    premiumAfterPdf.status === 200 && premiumAfterPdf.text.includes("PDF로 저장하기"),
    `status ${premiumAfterPdf.status}`,
  );

  const pdfSuccess = await get(`/api/pdf/${readingId}`);
  addResult(
    "PDF",
    "premium_report approved면 PDF API 다운로드 가능",
    pdfSuccess.status === 200 &&
      (pdfSuccess.headers.get("content-type") || "").includes("application/pdf"),
    `status ${pdfSuccess.status}`,
  );
}

async function runUiEnhancementChecks(isDemoMode) {
  let uiReadingId = readingId;
  if (isLocalQaTarget() && !isDemoMode) {
    const dogReading = await postJson("/api/readings", {
      name: "몽이",
      type: "dog",
      birth_date: "2021-05-14",
      birth_time_unknown: true,
      adoption_date: "2021-08-20",
    });

    try {
      const parsed = JSON.parse(dogReading.text);
      if (dogReading.status === 200 && parsed.readingId) {
        uiReadingId = parsed.readingId;
      }
    } catch {
      // Keep the configured QA_READING_ID fallback when local reading creation is unavailable.
    }
  }

  const homePath = "/";
  const inputPath = "/input";
  const freePath = `/result/free/${uiReadingId}`;
  const checkoutPath = `/checkout/${uiReadingId}?productType=premium_report${
    isDemoMode ? "&forceCheckout=1" : ""
  }`;
  const premiumPath = `/result/premium/${uiReadingId}#premium-section-1`;
  const reviewPath = "/review";
  const testPath = "/test";
  const demoPath = "/demo";
  const samplePath = "/sample";

  const home = await get(homePath);
  const input = await get(inputPath);
  const free = await get(freePath, { redirect: "manual" });
  const checkout = await get(checkoutPath, { redirect: "manual" });
  const review = await get(reviewPath, { redirect: "manual" });
  const test = await get(testPath, { redirect: "manual" });
  const demo = await get(demoPath, { redirect: "manual" });
  const sample = await get(samplePath, { redirect: "manual" });
  const reviewSource = readProjectFile("app/review/page.tsx");
  const testSource = readProjectFile("app/test/page.tsx");
  const demoSource = readProjectFile("app/demo/page.tsx");
  const adminSource = readProjectFile("app/admin/page.tsx");
  const sampleSource = readProjectFile("app/sample/page.tsx");
  const inputSource = readProjectFile("app/input/page.tsx");
  const freeResultSource = readProjectFile("app/result/free/[readingId]/page.tsx");
  const premiumResultSource = readProjectFile(
    "app/result/premium/[readingId]/page.tsx",
  );
  const inputSummaryTagsSource = readProjectFile(
    "components/report/PetInputSummaryTags.tsx",
  );
  const petMascotSource = readProjectFile("components/mascot/PetMascot.tsx");

  const testLocation = test.headers.get("location") || "";
  const sampleLocation = sample.headers.get("location") || "";
  const expectsProductionVisibility =
    process.env.QA_EXPECT_PRODUCTION === "true" ||
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production";
  const testRouteOk = expectsProductionVisibility
    ? [307, 308].includes(test.status) &&
      (testLocation.includes("/sample") || testLocation.includes("/input"))
    : test.status === 200 &&
      test.text.includes("멍냥사주를 먼저 써보고 알려주세요");
  addResult(
    "운영 노출 정책",
    "/test는 production에서 입력 흐름으로 redirect, demo/dev에서만 공개",
    testRouteOk,
    `status ${test.status}, location ${testLocation || test.url}`,
    {
      url: testPath,
      issue: "/test production hidden",
      file: "app/test/page.tsx",
    },
  );

  addResult(
    "운영 노출 정책",
    "/demo는 production에서 숨김",
    isDemoMode ? demo.status === 200 : demo.status === 404,
    `status ${demo.status}`,
    {
      url: demoPath,
      issue: "/demo production hidden",
      file: "app/demo/page.tsx",
    },
  );

  addResult(
    "운영 노출 정책",
    "/sample은 실제 입력 흐름으로 연결",
    ([307, 308].includes(sample.status) && sampleLocation.includes("/input")) ||
      sampleSource.includes('redirect("/input")'),
    `status ${sample.status}, location ${sampleLocation || sample.url}`,
    {
      url: samplePath,
      issue: "/sample redirects to actual input flow",
      file: "app/sample/page.tsx",
    },
  );

  addResult(
    "운영 노출 정책",
    "/sample 데모 결제/프리미엄 바로보기 미제공",
    !sampleSource.includes("DemoPremiumDirectButton") &&
      !sampleSource.includes("DemoPaymentButton") &&
      !sampleSource.includes(forbiddenCopy.demoPdfPreview) &&
      !sampleSource.includes(forbiddenCopy.testPaymentSuccess) &&
      !sampleSource.includes('href="/checkout') &&
      !sampleSource.includes('href="/result/premium'),
    "sample source guard",
    {
      url: samplePath,
      issue: "premium direct, mock payment, demo PDF",
      file: "app/sample/page.tsx",
    },
  );

  addResult(
    "운영 노출 정책",
    "review/test/demo/admin 성격 페이지 noindex 적용",
    [reviewSource, testSource, demoSource, adminSource].every(
      (source) =>
        source.includes("robots") &&
        source.includes("index: false") &&
        source.includes("follow: false"),
    ),
    "review, test, demo, admin metadata robots 확인",
    {
      url: "/review, /test, /demo, /admin",
      issue: "noindex protected/internal routes",
      file: "app/review/page.tsx, app/test/page.tsx, app/demo/page.tsx, app/admin/page.tsx",
    },
  );

  addResult(
    "운영 노출 정책",
    "/review는 production에서 ADMIN_PASSWORD 보호",
    reviewSource.includes("isAdminPasswordConfigured") &&
      reviewSource.includes("hasAdminSession") &&
      reviewSource.includes("ReviewAdminLogin") &&
      reviewSource.includes("ReviewAdminDisabled") &&
      reviewSource.includes("isDemoModeEnabled"),
    "DEMO_MODE가 아니면 관리자 비밀번호와 세션 없이는 내용 미노출",
    {
      url: "/review",
      issue: "review admin password protection",
      file: "app/review/page.tsx, lib/admin/auth.ts",
    },
  );

  addResult(
    "운영 노출 정책",
    "/test는 production에서 숨김 또는 noindex",
    testSource.includes("productionRuntime") &&
      (testSource.includes('redirect("/sample")') ||
        testSource.includes('redirect("/input")')) &&
      testSource.includes("robots"),
    "/test production redirect 및 noindex metadata 확인",
    {
      url: "/test",
      issue: "/test production redirect/noindex",
      file: "app/test/page.tsx",
    },
  );

  addResult(
    "운영 노출 정책",
    "/demo는 production에서 404 처리",
    demoSource.includes("isDemoModeEnabled") &&
      demoSource.includes("notFound()") &&
      demoSource.includes("robots"),
    "DEMO_MODE가 아니면 /demo는 notFound 처리",
    {
      url: "/demo",
      issue: "/demo production notFound",
      file: "app/demo/page.tsx",
    },
  );

  addResult(
    "운영 노출 정책",
    "/admin은 ADMIN_PASSWORD 보호",
    adminSource.includes("isAdminPasswordConfigured") &&
      adminSource.includes("hasAdminSession") &&
      adminSource.includes("AdminLogin") &&
      adminSource.includes("robots"),
    "관리자 비밀번호 설정과 세션 없이는 대시보드 미노출",
    {
      url: "/admin",
      issue: "admin password protection",
      file: "app/admin/page.tsx, lib/admin/auth.ts",
    },
  );

  addResult(
    "운영 노출 정책",
    "production에서 demo-mong-2026 무료 결과 직접 공개 차단",
    freeResultSource.includes("isDemoReadingId(readingId)") &&
      freeResultSource.includes("!demoModeEnabled") &&
      (freeResultSource.includes('redirect("/sample")') ||
        freeResultSource.includes("notFound()")),
    "데모 readingId는 운영에서 /sample redirect 또는 notFound 처리",
    {
      url: "/result/free/demo-mong-2026",
      issue: "demo reading production block",
      file: "app/result/free/[readingId]/page.tsx",
    },
  );

  addResult(
    "UI 고도화",
    "입력 정보 요약 태그가 주요 결과 상단에 연결",
    inputSummaryTagsSource.includes('data-testid="pet-input-summary-tags"') &&
      freeResultSource.includes("<PetInputSummaryTags") &&
      premiumResultSource.includes("<PetInputSummaryTags") &&
      inputSource.includes("<PetInputSummaryTags"),
    "입력/무료/프리미엄 화면에 기본 입력 정보 요약 태그 연결",
    {
      url: "/input, /result/free/[readingId], /result/premium/[readingId]",
      issue: "PetInputSummaryTags",
      file: "components/report/PetInputSummaryTags.tsx, app/input/page.tsx, app/result/free/[readingId]/page.tsx, app/result/premium/[readingId]/page.tsx",
    },
  );

  addResult(
    "UI 고도화",
    "입력 정보 태그에 null/undefined 미노출",
    !stripHtml(input.text).includes("null") &&
      !stripHtml(input.text).includes("undefined") &&
      inputSummaryTagsSource.includes('trimmed === "null"') &&
      inputSummaryTagsSource.includes('trimmed === "undefined"'),
    "입력 화면 렌더링과 컴포넌트 필터 로직 확인",
    {
      url: "/input",
      issue: "null/undefined summary tag",
      file: "components/report/PetInputSummaryTags.tsx",
    },
  );

  addResult(
    "운영 노출 정책",
    "/review 관리자 비밀번호 보호",
    reviewSource.includes("isDemoModeEnabled()") &&
      reviewSource.includes("reviewOpenWithoutPassword") &&
      reviewSource.includes("hasAdminSession") &&
      reviewSource.includes("isAdminPasswordConfigured") &&
      reviewSource.includes('name="returnTo" value="/review"') &&
      (isDemoMode ||
        (review.text.includes("관리자 검토 페이지입니다") &&
          !review.text.includes("멍냥사주 전체 미리보기"))),
    isDemoMode
      ? "DEMO_MODE=true 비운영 환경은 자유 접근"
      : "DEMO_MODE=false 또는 production에서는 관리자 안내/로그인 화면",
    {
      url: reviewPath,
      issue: "ADMIN_PASSWORD gate",
      file: "app/review/page.tsx, lib/admin/auth.ts, app/admin/actions.ts",
    },
  );

  addResult(
    "UI 고도화",
    "홈 페이지에 PetMascot 렌더링",
    home.status === 200 && home.text.includes('data-mascot="both"'),
    `status ${home.status}`,
    {
      url: homePath,
      issue: "PetMascot 또는 DogMascot/CatMascot",
      file: "app/page.tsx",
    },
  );

  addResult(
    "UI 고도화",
    "입력 페이지에 강아지/고양이 선택 캐릭터 카드 존재",
    input.status === 200 &&
      countOccurrences(input.text, /data-mascot=/g) >= 4 &&
      hasMascotSpeciesMarker(input.text, "dog") &&
      hasMascotSpeciesMarker(input.text, "cat"),
    `status ${input.status}`,
    {
      url: inputPath,
      issue: 'data-mascot-species="dog/cat"',
      file: "app/input/page.tsx",
    },
  );

  addResult(
    "캐릭터 검사",
    "input 강아지 선택 카드에 DogMascot 존재",
    input.status === 200 && hasMascotSpeciesMarker(input.text, "dog"),
    `status ${input.status}`,
    {
      url: inputPath,
      issue: 'data-mascot-species="dog"',
      file: "app/input/page.tsx, components/mascot/PetMascot.tsx, components/mascot/DogMascot.tsx",
    },
  );

  addResult(
    "캐릭터 검사",
    "input 고양이 선택 카드에 CatMascot 존재",
    input.status === 200 && hasMascotSpeciesMarker(input.text, "cat"),
    `status ${input.status}`,
    {
      url: inputPath,
      issue: 'data-mascot-species="cat"',
      file: "app/input/page.tsx, components/mascot/PetMascot.tsx, components/mascot/CatMascot.tsx",
    },
  );

  addResult(
    "UI 고도화",
    "입력 페이지에 모바일 앱바 존재",
    input.status === 200 &&
      input.text.includes("정보 입력") &&
      input.text.includes("우리 아이 이야기를 살짝 들려주세요"),
    `status ${input.status}`,
    {
      url: inputPath,
      issue: "ReportMobileBar",
      file: "app/input/page.tsx, components/report/ReportMobileBar.tsx",
    },
  );

  if (free.status === 200) {
    const freeMascotCount = countOccurrences(free.text, /data-mascot=/g);

    addResult(
      "UI 고도화",
      "무료 결과 페이지에 미니 캐릭터 3개 이상",
      freeMascotCount >= 3,
      `mascot labels ${freeMascotCount}`,
      {
        url: freePath,
        issue: "무료 결과 mascot 요소 3개 이상",
        file: "app/result/free/[readingId]/page.tsx, components/report/FreeReadingExplorer.tsx",
      },
    );

    addResult(
      "캐릭터 검사",
      "무료 결과에 텍스트형 강아지 아바타 없음",
      !hasStandaloneTextToken(free.text, forbiddenCopy.dogTextAvatar),
      hasStandaloneTextToken(free.text, forbiddenCopy.dogTextAvatar)
        ? "standalone dog text avatar found"
        : "",
      {
        url: freePath,
        issue: "dog text avatar",
        file: "app/result/free/[readingId]/page.tsx, components/mascot/PetMascot.tsx",
      },
    );

    addResult(
      "캐릭터 검사",
      "dog 무료 결과에 DogMascot 렌더링",
      hasMascotSpecies(free.text, "dog"),
      hasMascotSpecies(free.text, "dog") ? "dog mascot marker found" : "dog mascot marker missing",
      {
        url: freePath,
        issue: "DogMascot free result",
        file: "app/result/free/[readingId]/page.tsx, components/mascot/DogMascot.tsx",
      },
    );
  } else {
    addSkip(
      "UI 고도화",
      "무료 결과 페이지에 미니 캐릭터 3개 이상",
      `status ${free.status}. 데모 reading이 비활성화된 환경일 수 있습니다.`,
      {
        url: freePath,
        issue: "무료 결과 mascot 요소 3개 이상",
        file: "app/result/free/[readingId]/page.tsx, components/report/FreeReadingExplorer.tsx",
      },
    );
  }

  if (isLocalQaTarget()) {
    const catReading = await postJson("/api/readings", {
      name: "나비",
      type: "cat",
      birth_date: "2022-03-04",
      birth_time_unknown: true,
      adoption_date: "2022-05-01",
    });
    let catReadingId = "";
    try {
      catReadingId = JSON.parse(catReading.text).readingId || "";
    } catch {
      catReadingId = "";
    }

    if (catReading.status === 200 && catReadingId) {
      const catFree = await get(`/result/free/${catReadingId}`, {
        redirect: "manual",
      });
      addResult(
        "캐릭터 검사",
        "cat 결과에 CatMascot 렌더링",
        catFree.status === 200 && hasMascotSpecies(catFree.text, "cat"),
        `status ${catFree.status}, readingId ${catReadingId}`,
        {
          url: `/result/free/${catReadingId}`,
          issue: "CatMascot cat result",
          file: "app/result/free/[readingId]/page.tsx, components/mascot/CatMascot.tsx",
        },
      );
    } else if (
      catReading.status === 500 &&
      catReading.text.includes("운영 데이터베이스 설정이 필요합니다.")
    ) {
      addResult(
        "운영 가드",
        "production에서 Supabase 미설정 시 cat local reading 생성 금지",
        true,
        "status 500, local-* fallback 차단 확인",
        {
          url: "/api/readings",
          issue: "production cat local reading fallback block",
          file: "app/api/readings/route.ts, lib/readings/localReadingStore.ts",
        },
      );
      addSkip(
        "캐릭터 검사",
        "cat 결과에 CatMascot 렌더링",
        "운영 모드에서 DB 미설정 local reading 생성 차단이 정상 작동하여 런타임 cat 페이지 생성 검사를 건너뜁니다.",
        {
          url: "/api/readings",
          issue: "CatMascot cat result",
          file: "app/api/readings/route.ts, app/result/free/[readingId]/page.tsx",
        },
      );
    } else {
      addResult(
        "캐릭터 검사",
        "cat 결과에 CatMascot 렌더링",
        false,
        `cat reading 생성 실패: status ${catReading.status}`,
        {
          url: "/api/readings",
          issue: "CatMascot cat result",
          file: "app/api/readings/route.ts, app/result/free/[readingId]/page.tsx",
        },
      );
    }
  } else {
    addResult(
      "캐릭터 검사",
      "cat 결과에 CatMascot 렌더링 소스 보장",
      freeResultSource.includes("species={reading.species}") &&
        premiumResultSource.includes("species={reading.species}") &&
        petMascotSource.includes("CatMascot"),
      "원격 QA 대상에서는 데이터 생성을 피하고 소스 연결로 확인",
      {
        url: "/result/free/[readingId], /result/premium/[readingId]",
        issue: "CatMascot cat result source integration",
        file: "app/result/free/[readingId]/page.tsx, app/result/premium/[readingId]/page.tsx, components/mascot/PetMascot.tsx",
      },
    );
  }

  if (checkout.status === 200) {
    addResult(
      "UI 고도화",
      "체크아웃 페이지에 결제용 캐릭터 일러스트 존재",
      countOccurrences(checkout.text, /data-mascot=/g) >= 3,
      `status ${checkout.status}`,
      {
        url: checkoutPath,
        issue: "결제용 PetMascot",
        file: "app/checkout/[readingId]/page.tsx, components/payment/CheckoutExperience.tsx",
      },
    );
  } else {
    addSkip(
      "UI 고도화",
      "체크아웃 페이지에 결제용 캐릭터 일러스트 존재",
      `status ${checkout.status}. 현재 접근 상태에서는 체크아웃이 리다이렉트될 수 있습니다.`,
      {
        url: checkoutPath,
        issue: "결제용 PetMascot",
        file: "app/checkout/[readingId]/page.tsx, components/payment/CheckoutExperience.tsx",
      },
    );
  }

  let premium = null;
  if (isDemoMode) {
    premium = await get(premiumPath);
    addResult(
      "UI 고도화",
      "프리미엄 결과 페이지에 사이드바 캐릭터 초상 존재",
      premium.status === 200 && countOccurrences(premium.text, /data-mascot=/g) >= 4,
      `status ${premium.status}`,
      {
        url: premiumPath,
        issue: "사이드바 캐릭터 초상",
        file: "app/result/premium/[readingId]/page.tsx",
      },
    );
    addResult(
      "캐릭터 검사",
      "프리미엄 결과에 텍스트형 강아지 아바타 없음",
      !hasStandaloneTextToken(premium.text, forbiddenCopy.dogTextAvatar),
      hasStandaloneTextToken(premium.text, forbiddenCopy.dogTextAvatar)
        ? "standalone dog text avatar found"
        : "",
      {
        url: premiumPath,
        issue: "dog text avatar",
        file: "app/result/premium/[readingId]/page.tsx, components/mascot/PetMascot.tsx",
      },
    );
    addResult(
      "캐릭터 검사",
      "dog 프리미엄 결과에 DogMascot 렌더링",
      hasMascotSpecies(premium.text, "dog"),
      hasMascotSpecies(premium.text, "dog") ? "dog mascot marker found" : "dog mascot marker missing",
      {
        url: premiumPath,
        issue: "DogMascot premium result",
        file: "app/result/premium/[readingId]/page.tsx, components/mascot/DogMascot.tsx",
      },
    );
  } else {
    addSkip(
      "UI 고도화",
      "프리미엄 결과 페이지에 사이드바 캐릭터 초상 존재",
      "현재 서버가 DEMO_MODE=true가 아니라서 승인된 프리미엄 샘플을 열 수 없습니다.",
      {
        url: premiumPath,
        issue: "사이드바 캐릭터 초상",
        file: "app/result/premium/[readingId]/page.tsx",
      },
    );
  }

  const premiumText = premium?.text || "";
  const forbiddenPremiumPatterns = [
    phrase("몽이", " 의"),
    forbiddenCopy.awkwardPlaySuffix,
    ".도 잘 맞습니다",
    phrase("금의 기운은 ", "기준을 세우고"),
    forbiddenCopy.strangerMetalPrefix,
    forbiddenCopy.fireYearPrefix,
    forbiddenCopy.hookYaPeriodSpacing,
    forbiddenCopy.hookYaSeparatedPeriod,
    forbiddenCopy.hookAegyoSpacing,
    forbiddenCopy.hookSensitivitySpacing,
  ];

  if (premiumText) {
    forbiddenPremiumPatterns.forEach((pattern) => {
      addResult(
        "문장 품질",
        `"${pattern}" 문구 없음`,
        !premiumText.includes(pattern),
        premiumText.includes(pattern) ? `forbidden phrase found: ${pattern}` : "",
        {
          url: premiumPath,
          issue: pattern,
          file: "lib/saju/premiumReportGenerator.ts, app/result/premium/[readingId]/page.tsx",
        },
      );
    });
  } else {
    forbiddenPremiumPatterns.forEach((pattern) => {
      addSkip(
        "문장 품질",
        `"${pattern}" 문구 없음`,
        "프리미엄 샘플 페이지가 열리지 않아 렌더링 문구 검사를 건너뜁니다.",
        {
          url: premiumPath,
          issue: pattern,
          file: "lib/saju/premiumReportGenerator.ts, app/result/premium/[readingId]/page.tsx",
        },
      );
    });
  }

  const renderedTextBundle = [
    home.text,
    input.text,
    free.text,
    checkout.text,
    premiumText,
    review.text,
    sample.text,
  ].join("\n");
  const operationalTextBundle = [
    home.text,
    input.text,
    free.text,
    checkout.text,
    premiumText,
  ].join("\n");
  const petHookCardSource = readProjectFile("components/report/PetHookCard.tsx");
  const gptReviewSummarySource = readProjectFile("gpt-review/summary.json");
  const snapshotHasPetHookCard = gptReviewSummarySource.includes(
    '"hasPetHookCard": true',
  );
  const snapshotHasHookCopy = gptReviewSummarySource.includes(
    '"hasHookCopy": true',
  );
  const petHookRendered =
    free.text.includes('data-testid="pet-hook-card"') ||
    sample.text.includes('data-testid="pet-hook-card"') ||
    review.text.includes('data-testid="pet-hook-card"') ||
    premiumText.includes('data-testid="pet-hook-card"');
  const renderedPlainText = stripHtml(renderedTextBundle);
  const hasHookCopy =
    renderedTextBundle.includes('data-has-hook-copy="true"') &&
    /(몽이는|나비는|우리 강아지는|우리 고양이는)\s+.{8,80}야\./.test(
      renderedPlainText,
    );

  addResult(
    "UI 고도화",
    "PetHookCard 렌더링 확인",
    petHookCardSource.includes('data-testid="pet-hook-card"') &&
      (petHookRendered || snapshotHasPetHookCard),
    petHookRendered || snapshotHasPetHookCard
      ? "hook card rendered or verified in latest snapshot"
      : "hook card not found in rendered pages",
    {
      url: "무료/샘플/리뷰/프리미엄",
      issue: "PetHookCard",
      file: "components/report/PetHookCard.tsx, app/result/free/[readingId]/page.tsx, app/sample/page.tsx, app/review/page.tsx, app/result/premium/[readingId]/page.tsx",
    },
  );

  addResult(
    "UI 고도화",
    "hasHookCopy true",
    hasHookCopy || snapshotHasHookCopy,
    hasHookCopy || snapshotHasHookCopy
      ? "hook copy is visible or verified in latest snapshot"
      : "hook copy pattern not found in rendered pages",
    {
      url: "무료/샘플/리뷰/프리미엄",
      issue: "몽이는/우리 강아지는/우리 고양이는 ...야.",
      file: "lib/saju/petHookGenerator.ts, components/report/PetHookCard.tsx, app/result/free/[readingId]/page.tsx, app/result/premium/[readingId]/page.tsx",
    },
  );

  addResult(
    "UI 고도화",
    "무료/프리미엄 결과 상단 PetHookCard 연결",
    freeResultSource.includes("<PetHookCard") &&
      premiumResultSource.includes("<PetHookCard"),
    "free and premium result pages include PetHookCard",
    {
      url: "/result/free/[readingId], /result/premium/[readingId]",
      issue: "PetHookCard page integration",
      file: "app/result/free/[readingId]/page.tsx, app/result/premium/[readingId]/page.tsx",
    },
  );

  addResult(
    "UI 고도화",
    "DogMascot/CatMascot 렌더링 확인",
    petMascotSource.includes("DogMascot") &&
      petMascotSource.includes("CatMascot") &&
      (renderedTextBundle.includes('data-mascot="dog"') ||
        renderedTextBundle.includes('data-mascot="both"')) &&
      (renderedTextBundle.includes('data-mascot="cat"') ||
        renderedTextBundle.includes('data-mascot="both"')),
    "PetMascot delegates to dog/cat components and pages render mascot markers",
    {
      url: "주요 UI 경로 전체",
      issue: "DogMascot/CatMascot",
      file: "components/mascot/PetMascot.tsx, components/mascot/DogMascot.tsx, components/mascot/CatMascot.tsx",
    },
  );

  const premiumTabsSource = readProjectFile(
    "components/report/PremiumReportTabs.tsx",
  );
  const expectedPremiumTabHashes = [
    "overview",
    "elements",
    "attachment",
    "routine",
    "yearly",
    "guardian",
    "input",
    "report",
  ];
  const hasPremiumTabs =
    premiumResultSource.includes("<PremiumReportTabs") &&
    premiumTabsSource.includes('data-testid="premium-report-tabs"') &&
    premiumTabsSource.includes('data-report-mode="continuous"') &&
    premiumTabsSource.includes("순서대로 읽는 심층 리포트");

  addResult(
    "UI 고도화",
    "프리미엄 결과 연속형 심층 리포트 구조",
    hasPremiumTabs,
    hasPremiumTabs
      ? "PremiumReportTabs renders a continuous premium report"
      : "PremiumReportTabs continuous report integration missing",
    {
      url: "/result/premium/[readingId]",
      issue: "premium continuous report",
      file: "app/result/premium/[readingId]/page.tsx, components/report/PremiumReportTabs.tsx",
    },
  );

  addResult(
    "UI 고도화",
    "프리미엄 탭 권한 체크 우회 없음",
    premiumResultSource.indexOf("checkPaymentAccess") <
      premiumResultSource.indexOf("<PremiumReportTabs") &&
      premiumResultSource.includes('checkPaymentAccess(readingId, "premium_report")'),
    "payment access check appears before tab rendering",
    {
      url: "/result/premium/[readingId]",
      issue: "premium tab authorization",
      file: "app/result/premium/[readingId]/page.tsx, lib/payment/checkPaymentAccess.ts",
    },
  );

  const tabInsightCardSource = readProjectFile(
    "components/report/TabInsightCard.tsx",
  );
  const tabInsightGeneratorSource = readProjectFile(
    "lib/report/tabInsightGenerator.ts",
  );
  const expectedTabInsightIds = expectedPremiumTabHashes;
  const hasTabInsightCards =
    premiumTabsSource.includes("<TabInsightCard") &&
    premiumTabsSource.includes("createTabInsights") &&
    tabInsightCardSource.includes('data-testid="tab-insight-card"') &&
    expectedTabInsightIds.every((tabId) =>
      tabInsightGeneratorSource.includes(`tabId: "${tabId}"`),
    );

  addResult(
    "UI 고도화",
    "각 프리미엄 탭 보조 해석 카드",
    hasTabInsightCards,
    hasTabInsightCards
      ? "TabInsightCard is connected to all 8 tab insights"
      : "TabInsightCard or tab insight generator missing",
    {
      url: "/result/premium/[readingId]",
      issue: "tab insight cards",
      file: "components/report/TabInsightCard.tsx, components/report/PremiumReportTabs.tsx, lib/report/tabInsightGenerator.ts",
    },
  );

  const customerGenerationForbiddenTerms = [
    { label: "AI", pattern: /(^|[^A-Za-z])AI([^A-Za-z]|$)/ },
    { label: "인공지능", pattern: /인공지능/ },
    { label: "Gemini", pattern: /Gemini/ },
    { label: "API", pattern: /(^|[^A-Za-z])API([^A-Za-z]|$)/ },
    { label: "프롬프트", pattern: /프롬프트/ },
    { label: "모델 응답", pattern: /모델 응답/ },
    { label: "자동 생성", pattern: /자동 생성/ },
    { label: "규칙 기반 엔진", pattern: /규칙 기반 엔진/ },
  ];
  const customerGenerationForbiddenFound =
    customerGenerationForbiddenTerms.filter(({ pattern }) =>
      pattern.test(stripHtml(operationalTextBundle)),
    );

  addResult(
    "UI 고도화",
    "고객 화면 기술 생성 방식 문구 미노출",
    customerGenerationForbiddenFound.length === 0 &&
      !premiumTabsSource.includes("TabAiComment"),
    customerGenerationForbiddenFound.length > 0
      ? `found: ${customerGenerationForbiddenFound.map(({ label }) => label).join(", ")}`
      : "customer-facing pages do not expose implementation wording",
    {
      url: "/, /input, /result/free, /checkout, /result/premium",
      issue: "customer-facing implementation wording",
      file: "components/report/PremiumReportTabs.tsx, components/report/TabInsightCard.tsx, lib/report/tabInsightGenerator.ts",
    },
  );

  const reviewExportBundle = readReviewExportTextHtmlBundle();
  const reviewExportForbiddenFound =
    reviewExportBundle === null
      ? []
      : customerGenerationForbiddenTerms.filter(({ pattern }) =>
          pattern.test(stripHtml(reviewExportBundle)),
        );

  if (reviewExportBundle === null) {
    addSkip(
      "UI 고도화",
      "review:export txt/html 기술 문구 미노출",
      "gpt-review folder not found. Run npm run review:export to check exported txt/html.",
      {
        url: "gpt-review/*.txt, gpt-review/*.html",
        issue: "review export implementation wording",
        file: "scripts/export-gpt-review.ts, scripts/qa-check.ts",
      },
    );
  } else {
    addResult(
      "UI 고도화",
      "review:export txt/html 기술 문구 미노출",
      reviewExportForbiddenFound.length === 0,
      reviewExportForbiddenFound.length > 0
        ? `found: ${reviewExportForbiddenFound.map(({ label }) => label).join(", ")}`
        : "exported txt/html files do not expose implementation wording",
      {
        url: "gpt-review/*.txt, gpt-review/*.html",
        issue: "review export implementation wording",
        file: "scripts/export-gpt-review.ts, scripts/qa-check.ts",
      },
    );
  }

  const uiSourceBundle = [
    "app/page.tsx",
    "app/input/page.tsx",
    "app/result/free/[readingId]/page.tsx",
    "app/checkout/[readingId]/page.tsx",
    "app/result/premium/[readingId]/page.tsx",
    "components/payment/CheckoutExperience.tsx",
    "components/report/PdfDownloadButton.tsx",
    "lib/products/catalog.ts",
  ]
    .map((filePath) => readProjectFile(filePath))
    .join("\n");

  const mascotSourceBundle = [
    "components/mascot/PetMascot.tsx",
    "components/mascot/DogMascot.tsx",
    "components/mascot/CatMascot.tsx",
    "components/mascot/PawPattern.tsx",
    "components/mascot/FloatingPets.tsx",
  ]
    .map((filePath) => readProjectFile(filePath))
    .join("\n");

  const forbiddenDecorationText = [
    {
      label: "사주 사주",
      found: renderedTextBundle.includes("사주 사주"),
    },
    {
      label: "별자리 카드 리포트 카드 작은 달력**",
      found:
        renderedTextBundle.includes("별자리 카드 리포트 카드 작은 달력**") ||
        (renderedTextBundle.includes("별자리 카드") &&
          renderedTextBundle.includes("리포트 카드") &&
          renderedTextBundle.includes("작은 달력")),
    },
    {
      label: "단독 ?",
      found: />\s*\?\s*</.test(renderedTextBundle),
    },
    {
      label: "의미 없는 숫자 14",
      found: />\s*14\s*</.test(renderedTextBundle),
    },
    {
      label: forbiddenCopy.checkoutPixelMascot,
      found: renderedTextBundle.includes(forbiddenCopy.checkoutPixelMascot),
    },
    {
      label: forbiddenCopy.dogFaceIllustration,
      found: renderedTextBundle.includes(forbiddenCopy.dogFaceIllustration),
    },
    {
      label: forbiddenCopy.catFaceIllustration,
      found: renderedTextBundle.includes(forbiddenCopy.catFaceIllustration),
    },
    {
      label: forbiddenCopy.reportCardTogetherCharacter,
      found: renderedTextBundle.includes(forbiddenCopy.reportCardTogetherCharacter),
    },
  ];

  forbiddenDecorationText.forEach(({ label, found }) => {
    addResult(
      "장식 텍스트",
      `"${label}" 금지 텍스트 미노출`,
      !found,
      found ? `forbidden decoration text found: ${label}` : "",
      {
        url: "주요 UI 경로 전체",
        issue: label,
        file: "components/mascot/*, app/page.tsx, app/input/page.tsx",
      },
    );
  });

  addResult(
    "장식 텍스트",
    "mascot SVG 내부에 텍스트 노드 없음",
    !mascotSourceBundle.includes("<text"),
    mascotSourceBundle.includes("<text") ? "SVG text tag found" : "",
    {
      url: "mascot components",
      issue: "<text>",
      file: "components/mascot/DogMascot.tsx, components/mascot/CatMascot.tsx",
    },
  );

  const forbiddenPriceCopies = [
    ["2", ",", "900"].join(""),
    ["1", ",", "000"].join(""),
    ["4", ",", "900"].join(""),
    ["5", ",", "900"].join(""),
    ["3", ",", "900"].join(""),
    forbiddenCopy.legacyPdfKeepsakeCopy,
    forbiddenCopy.legacyPaidPdfCopy,
    forbiddenCopy.legacyPdfExtraProductCopy,
    ["4", ",", "900원"].join(""),
    ["2", ",", "900원"].join(""),
    ["1", ",", "000원"].join(""),
    forbiddenCopy.legacyPaidPdfCopyWithWon,
    ["PDF 추가 ", "결제"].join(""),
  ];

  forbiddenPriceCopies.forEach((pattern) => {
    const displayPattern = describeForbiddenPattern(pattern);

    addResult(
      "가격 정책",
      `"${displayPattern}" 문구 없음`,
      !renderedTextBundle.includes(pattern) && !uiSourceBundle.includes(pattern),
      renderedTextBundle.includes(pattern) || uiSourceBundle.includes(pattern)
        ? `forbidden price copy found: ${displayPattern}`
        : "",
      {
        url: "주요 UI 경로 전체",
        issue: displayPattern,
        file: "lib/products/catalog.ts, app/result/free/[readingId]/page.tsx, app/checkout/[readingId]/page.tsx, app/result/premium/[readingId]/page.tsx",
      },
    );
  });

  const customerRenderedPlainText = stripHtml(renderedTextBundle);
  const launchRiskChecks = [
    {
      label: "standalone 멍",
      found: hasStandaloneTextToken(renderedTextBundle, "멍"),
      file: "components/mascot/*, app/result/free/[readingId]/page.tsx, app/result/premium/[readingId]/page.tsx",
    },
    {
      label: "PDF 소장본",
      found: renderedTextBundle.includes("PDF 소장본") || uiSourceBundle.includes("PDF 소장본"),
      file: "app/page.tsx, app/result/premium/[readingId]/page.tsx, components/report/*",
    },
    {
      label: "PDF 소장본 추가 1,000원",
      found:
        renderedTextBundle.includes("PDF 소장본 추가 1,000원") ||
        uiSourceBundle.includes("PDF 소장본 추가 1,000원"),
      file: "app/result/premium/[readingId]/page.tsx, components/report/*",
    },
    {
      label: "PDF 다운로드 추가 상품",
      found:
        renderedTextBundle.includes("PDF 다운로드 추가 상품") ||
        uiSourceBundle.includes("PDF 다운로드 추가 상품"),
      file: "app/result/premium/[readingId]/page.tsx, components/report/*",
    },
    {
      label: "4,900원",
      found: renderedTextBundle.includes("4,900원") || uiSourceBundle.includes("4,900원"),
      file: "lib/products/catalog.ts, app/**/*.tsx",
    },
    {
      label: "5,900원",
      found: renderedTextBundle.includes("5,900원") || uiSourceBundle.includes("5,900원"),
      file: "lib/products/catalog.ts, app/**/*.tsx",
    },
    {
      label: "3,900원",
      found: renderedTextBundle.includes("3,900원") || uiSourceBundle.includes("3,900원"),
      file: "lib/products/catalog.ts, app/**/*.tsx",
    },
    {
      label: "2,900원",
      found: renderedTextBundle.includes("2,900원") || uiSourceBundle.includes("2,900원"),
      file: "lib/products/catalog.ts, app/**/*.tsx",
    },
    {
      label: "1,000원",
      found: renderedTextBundle.includes("1,000원") || uiSourceBundle.includes("1,000원"),
      file: "lib/products/catalog.ts, app/**/*.tsx",
    },
    {
      label: "심층 리포트 페이지 바로 보기",
      found: renderedTextBundle.includes("심층 리포트 페이지 바로 보기"),
      file: "app/result/free/[readingId]/page.tsx",
    },
    {
      label: "테스트 결제 성공 처리",
      found: renderedTextBundle.includes("테스트 결제 성공 처리"),
      file: "components/payment/CheckoutExperience.tsx, app/checkout/[readingId]/page.tsx",
    },
    {
      label: "카카오페이 실패 화면 보기",
      found: renderedTextBundle.includes("카카오페이 실패 화면 보기"),
      file: "app/checkout/[readingId]/page.tsx",
    },
    {
      label: "페이팔 실패 화면 보기",
      found: renderedTextBundle.includes("페이팔 실패 화면 보기"),
      file: "app/checkout/[readingId]/page.tsx",
    },
    {
      label: "데모 PDF 미리보기",
      found: renderedTextBundle.includes("데모 PDF 미리보기"),
      file: "components/report/PdfDownloadButton.tsx, app/result/premium/[readingId]/page.tsx",
    },
    {
      label: "몽이 의",
      found: renderedTextBundle.includes("몽이 의"),
      file: "lib/korean/postposition.ts, lib/reports/sanitizeReportText.ts",
    },
    {
      label: "잘 맞아요.도",
      found: renderedTextBundle.includes("잘 맞아요.도"),
      file: "lib/reports/sanitizeReportText.ts, lib/saju/premiumReportGenerator.ts",
    },
    {
      label: "낯선 자극을 만났을 때는 금의 기운은",
      found: renderedTextBundle.includes("낯선 자극을 만났을 때는 금의 기운은"),
      file: "lib/reports/sanitizeReportText.ts, lib/saju/premiumReportGenerator.ts",
    },
    {
      label: "화의 기운은 올해는",
      found: renderedTextBundle.includes("화의 기운은 올해는"),
      file: "lib/reports/sanitizeReportText.ts, lib/saju/premiumReportGenerator.ts",
    },
    {
      label: "이런 방향을 함께 보여줘요",
      found: renderedTextBundle.includes("이런 방향을 함께 보여줘요"),
      file: "lib/reports/sanitizeReportText.ts, lib/saju/premiumReportGenerator.ts",
    },
    {
      label: "고객 화면 AI",
      found: /(^|[^A-Za-z])AI([^A-Za-z]|$)/.test(customerRenderedPlainText),
      file: "components/report/*, app/**/*.tsx",
    },
    {
      label: "고객 화면 인공지능",
      found: customerRenderedPlainText.includes("인공지능"),
      file: "components/report/*, app/**/*.tsx",
    },
    {
      label: "고객 화면 Gemini",
      found: customerRenderedPlainText.includes("Gemini"),
      file: "components/report/*, app/**/*.tsx",
    },
    {
      label: "고객 화면 API",
      found: /(^|[^A-Za-z])API([^A-Za-z]|$)/.test(customerRenderedPlainText),
      file: "components/report/*, app/**/*.tsx",
    },
    {
      label: "고객 화면 프롬프트",
      found: customerRenderedPlainText.includes("프롬프트"),
      file: "components/report/*, app/**/*.tsx",
    },
    {
      label: "고객 화면 모델 응답",
      found: customerRenderedPlainText.includes("모델 응답"),
      file: "components/report/*, app/**/*.tsx",
    },
    {
      label: "고객 화면 자동 생성",
      found: customerRenderedPlainText.includes("자동 생성"),
      file: "components/report/*, app/**/*.tsx",
    },
    {
      label: "고객 화면 규칙 기반 엔진",
      found: customerRenderedPlainText.includes("규칙 기반 엔진"),
      file: "components/report/*, app/**/*.tsx",
    },
  ];

  launchRiskChecks.forEach(({ label, found, file }) => {
    addResult(
      "출시 리스크",
      `"${label}" 고객 화면 미노출`,
      !found,
      found ? `launch risk phrase found: ${label}` : "",
      {
        url: "주요 고객 화면 렌더링 번들",
        issue: label,
        file,
      },
    );
  });

  const expectedProductPrices = {
    premium_report: 1990,
    guardian_match: 990,
    two_pet_match: 990,
    yearly_fortune: 990,
    pdf_report: 0,
  };

  Object.entries(expectedProductPrices).forEach(([productType, expectedPrice]) => {
    const actualPrice = getProductPriceFromCatalog(productType);

    addResult(
      "가격 정책",
      `${productType} 서버 가격 ${expectedPrice}원`,
      actualPrice === expectedPrice,
      `catalog price ${actualPrice}`,
      {
        issue: productType,
        file: "lib/products/catalog.ts",
      },
    );
  });

  const checkoutExperienceSource = readProjectFile(
    "components/payment/CheckoutExperience.tsx",
  );
  const freeSource = readProjectFile("app/result/free/[readingId]/page.tsx");
  const premiumSource = readProjectFile("app/result/premium/[readingId]/page.tsx");
  const pdfButtonSource = readProjectFile("components/report/PdfDownloadButton.tsx");

  addResult(
    "운영 노출",
    "production 모드에서 테스트 결제 버튼 미노출",
    isDemoMode
      ? checkoutExperienceSource.includes("demoModeEnabled ?") &&
          checkoutExperienceSource.includes("DemoPaymentButton")
      : !checkout.text.includes(forbiddenCopy.testPaymentSuccess),
    isDemoMode
      ? "현재 서버는 데모 모드라 소스 조건부 렌더링으로 확인"
      : `status ${checkout.status}`,
    {
      url: checkoutPath,
      issue: forbiddenCopy.testPaymentSuccess,
      file: "components/payment/CheckoutExperience.tsx",
    },
  );

  addResult(
    "운영 노출",
    "production 모드에서 프리미엄 직행 버튼 미노출",
    isDemoMode
      ? freeSource.includes("demoModeEnabled") &&
          freeSource.includes("DemoPremiumDirectButton")
      : free.status !== 200 ||
          (!free.text.includes(forbiddenCopy.premiumDirect) &&
            !free.text.includes("데모 검수용 프리미엄 바로 보기")),
    isDemoMode
      ? "현재 서버는 데모 모드라 소스 조건부 렌더링으로 확인"
      : `status ${free.status}`,
    {
      url: freePath,
      issue: forbiddenCopy.premiumDirect,
      file: "app/result/free/[readingId]/page.tsx",
    },
  );

  addResult(
    "운영 노출",
    "production 모드에서 데모 PDF 버튼 미노출",
    isDemoMode
      ? !premiumSource.includes(forbiddenCopy.demoPdfPreview) &&
          !pdfButtonSource.includes(forbiddenCopy.demoPdfPreview)
      : !operationalTextBundle.includes(forbiddenCopy.demoPdfPreview),
    isDemoMode
      ? "현재 서버는 데모 모드라 소스에서 데모 PDF 문구 부재 확인"
      : "운영 경로 렌더링 문구 확인",
    {
      url: premiumPath,
      issue: forbiddenCopy.demoPdfPreview,
      file: "app/result/premium/[readingId]/page.tsx, components/report/PdfDownloadButton.tsx",
    },
  );
}

function runPaymentAuthorizationSourceChecks() {
  const premiumSource = readProjectFile("app/result/premium/[readingId]/page.tsx");
  const pdfRouteSource = readProjectFile("app/api/pdf/[readingId]/route.ts");
  const accessSource = readProjectFile("lib/payment/checkPaymentAccess.ts");
  const checkoutSource = readProjectFile("app/checkout/[readingId]/page.tsx");
  const checkoutExperienceSource = readProjectFile(
    "components/payment/CheckoutExperience.tsx",
  );
  const sampleSource = readProjectFile("app/sample/page.tsx");
  const adminSource = readProjectFile("app/admin/page.tsx");
  const adminDashboardSource = readProjectFile("lib/admin/dashboard.ts");

  addResult(
    "payment-auth-source",
    "premium page checks approved premium_report access on the server",
    premiumSource.includes('checkPaymentAccess(readingId, "premium_report")') &&
      premiumSource.includes("?productType=premium_report"),
    "",
    {
      issue: "premium_report approved access",
      file: "app/result/premium/[readingId]/page.tsx",
    },
  );

  addResult(
    "payment-auth-source",
    "payment access query requires product_type and approved status",
    accessSource.includes('.eq("product_type", productType)') &&
      accessSource.includes('.eq("status", "approved")'),
    "",
    {
      issue: "product_type/status approved guard",
      file: "lib/payment/checkPaymentAccess.ts",
    },
  );

  addResult(
    "payment-auth-source",
    "mock payments are accepted only through demo-mode local payments",
    accessSource.includes("demoModeEnabled") &&
      accessSource.includes("getLocalApprovedPayment") &&
      accessSource.includes('data.provider === "mock" && !demoModeEnabled') &&
      accessSource.includes("hasAccess: false"),
    "",
    {
      issue: "mock payment production block",
      file: "lib/payment/checkPaymentAccess.ts",
    },
  );

  addResult(
    "payment-auth-source",
    "PDF API requires premium_report access and has no demo bypass",
    pdfRouteSource.includes('checkPaymentAccess(readingId, "premium_report")') &&
      !pdfRouteSource.includes("demoPdfAccess") &&
      !pdfRouteSource.includes("isDemoReadingId") &&
      !pdfRouteSource.includes("isDemoModeEnabled"),
    "",
    {
      issue: "PDF premium_report authorization",
      file: "app/api/pdf/[readingId]/route.ts",
    },
  );

  addResult(
    "payment-auth-source",
    "checkout test payment UI is gated by demoModeEnabled",
    checkoutSource.includes("demoModeEnabled") &&
      checkoutExperienceSource.includes("demoModeEnabled ?") &&
      checkoutExperienceSource.includes("DemoPaymentButton"),
    "",
    {
      issue: "test payment production visibility",
      file: "app/checkout/[readingId]/page.tsx, components/payment/CheckoutExperience.tsx",
    },
  );

  addResult(
    "payment-auth-source",
    "sample page has no premium direct link or mock payment controls",
    !sampleSource.includes("DemoPremiumDirectButton") &&
      !sampleSource.includes("DemoPaymentButton") &&
      !sampleSource.includes('href="/result/premium') &&
      !sampleSource.includes('href="/checkout'),
    "",
    {
      issue: "sample free-only policy",
      file: "app/sample/page.tsx",
    },
  );

  addResult(
    "payment-auth-source",
    "admin page is ADMIN_PASSWORD protected and has production operations",
    adminSource.includes("hasAdminSession") &&
      adminSource.includes("isAdminPasswordConfigured") &&
      adminSource.includes("getAdminDashboardData") &&
      adminSource.includes("regeneratePremiumReportAction") &&
      adminSource.includes("recheckFailedPaymentAction") &&
      adminSource.includes("rawResponse") &&
      adminSource.includes("pdfDownloadAllowed") &&
      !adminSource.includes("DemoPaymentButton") &&
      !adminSource.includes("createLocalApprovedPayment"),
    "",
    {
      issue: "admin production operations",
      file: "app/admin/page.tsx",
    },
  );

  addResult(
    "payment-auth-source",
    "admin PDF status follows approved premium_report access",
    adminDashboardSource.includes("premiumReportApproved") &&
      adminDashboardSource.includes("pdfDownloadAllowed: premiumPaymentApproved") &&
      adminDashboardSource.includes('row.provider !== "mock" || demoModeEnabled'),
    "",
    {
      issue: "admin PDF permission status",
      file: "lib/admin/dashboard.ts",
    },
  );
}

async function runOperationalFeatureChecks() {
  const health = await get("/api/health");
  const invalidFeedback = await postJson("/api/feedback", {
    rating: 5,
    message: "",
  });
  const healthSource = readProjectFile("app/api/health/route.ts");
  const feedbackRouteSource = readProjectFile("app/api/feedback/route.ts");
  const testPageSource = readProjectFile("app/test/page.tsx");
  const feedbackFormSource = readProjectFile(
    "components/feedback/AnonymousFeedbackForm.tsx",
  );
  const databaseTypes = readProjectFile("types/database.ts");
  const feedbackMigration = readProjectFile(
    "supabase/migrations/20260517000000_create_feedbacks_table.sql",
  );
  const adminSource = readProjectFile("app/admin/page.tsx");

  let healthJson = {};
  try {
    healthJson = JSON.parse(health.text);
  } catch {
    healthJson = {};
  }

  addResult(
    "운영 기능",
    "/api/health 200 및 안전한 상태 응답",
    health.status === 200 &&
      healthJson.status === "ok" &&
      typeof healthJson.demoMode === "boolean" &&
      Boolean(healthJson.database) &&
      Boolean(healthJson.paymentProviders) &&
      !health.text.includes("SECRET") &&
      !health.text.includes("SERVICE_ROLE") &&
      !health.text.includes("CLIENT_SECRET"),
    `status ${health.status}`,
    {
      url: "/api/health",
      issue: "health response without secrets",
      file: "app/api/health/route.ts",
    },
  );

  addResult(
    "운영 기능",
    "health API가 secret 값을 응답하지 않음",
    healthSource.includes("configured") &&
      !healthSource.includes("process.env.KAKAOPAY_SECRET_KEY,") &&
      !healthSource.includes("process.env.PAYPAL_CLIENT_SECRET,") &&
      !healthSource.includes("SUPABASE_SERVICE_ROLE_KEY,"),
    "",
    {
      issue: "secret exposure",
      file: "app/api/health/route.ts",
    },
  );

  addResult(
    "운영 기능",
    "/test 익명 피드백 폼 렌더링",
    testPageSource.includes("AnonymousFeedbackForm") &&
      feedbackFormSource.includes('fetch("/api/feedback"') &&
      feedbackFormSource.includes("data-testid=\"anonymous-feedback-form\""),
    "",
    {
      url: "/test",
      issue: "anonymous feedback form",
      file: "app/test/page.tsx, components/feedback/AnonymousFeedbackForm.tsx",
    },
  );

  addResult(
    "운영 기능",
    "/api/feedback 유효성 검사",
    invalidFeedback.status === 400 &&
      invalidFeedback.text.includes("피드백을 조금만 더 자세히"),
    `status ${invalidFeedback.status}`,
    {
      url: "/api/feedback",
      issue: "feedback validation",
      file: "app/api/feedback/route.ts",
    },
  );

  addResult(
    "운영 기능",
    "feedbacks 테이블 저장 구조 존재",
    feedbackMigration.includes("create table if not exists feedbacks") &&
      feedbackMigration.includes("rating integer") &&
      feedbackMigration.includes("message text") &&
      databaseTypes.includes("feedbacks:") &&
      feedbackRouteSource.includes('.from("feedbacks")'),
    "",
    {
      issue: "feedbacks table",
      file: "supabase/migrations/20260517000000_create_feedbacks_table.sql, types/database.ts, app/api/feedback/route.ts",
    },
  );

  addResult(
    "운영 기능",
    "admin에서 최근 피드백 확인 가능",
    adminSource.includes("FeedbackCard") &&
      adminSource.includes("dashboard?.feedbacks") &&
      adminSource.includes("베타 테스트 의견"),
    "",
    {
      url: "/admin",
      issue: "admin feedback list",
      file: "app/admin/page.tsx, lib/admin/dashboard.ts",
    },
  );
}

const reportQualityForbiddenPatterns = [
  phrase("몽이", " 의"),
  phrase("몽이", " 이"),
  phrase("나비", "이"),
  forbiddenCopy.awkwardPlaySuffix,
  ".도 잘 맞습니다",
  phrase("기운은 ", "기운은"),
  phrase("금의 기운은 ", "기준을 세우고"),
  forbiddenCopy.fireYearPrefix,
  forbiddenCopy.strangerMetalPrefix,
  phrase("이런 방향을 ", "함께 보여줘요"),
  forbiddenCopy.hookYaPeriodSpacing,
  forbiddenCopy.hookYaSeparatedPeriod,
  forbiddenCopy.hookYaWordSpacing,
  forbiddenCopy.hookAegyoSpacing,
  forbiddenCopy.hookSensitivitySpacing,
  ["4", ",", "900"].join(""),
  ["4", ",", "900원"].join(""),
  ["5", ",", "900"].join(""),
  ["3", ",", "900"].join(""),
  forbiddenCopy.legacyPdfKeepsakeCopy,
  forbiddenCopy.legacyPaidPdfCopy,
  forbiddenCopy.legacyPaidPdfCopyWithWon,
  forbiddenCopy.legacyPdfExtraProductCopy,
];

async function importProjectModule(filePath) {
  return import(pathToFileURL(path.join(rootDir, filePath)).href);
}

function addReportQualityPatternChecks({ label, text, url, file }) {
  reportQualityForbiddenPatterns.forEach((pattern) => {
    const displayPattern = describeForbiddenPattern(pattern);

    addResult(
      "리포트 문장 품질",
      `${label}: "${displayPattern}" 없음`,
      !text.includes(pattern),
      text.includes(pattern) ? `forbidden report pattern found: ${displayPattern}` : "",
      {
        url,
        issue: displayPattern,
        file,
      },
    );
  });
}

const requiredCatBehaviorTerms = [
  {
    label: "자기 자리",
    variants: ["자기 자리"],
  },
  {
    label: "창밖 관찰",
    variants: ["창밖 관찰", "창가 관찰"],
  },
  {
    label: "느린 눈맞춤",
    variants: ["느린 눈맞춤", "눈을 느리게"],
  },
  {
    label: "짧은 사냥놀이",
    variants: ["짧은 사냥놀이", "짧은 사냥 놀이"],
  },
  {
    label: "꼬리 움직임",
    variants: ["꼬리 움직임", "꼬리의 작은 움직임", "꼬리 끝"],
  },
  {
    label: "캣타워",
    variants: ["캣타워"],
  },
  {
    label: "숨숨집",
    variants: ["숨숨집"],
  },
  {
    label: "조용히 곁에 머무르기",
    variants: ["조용히 곁에 머무르", "같은 방에 머무르"],
  },
  {
    label: "먼저 다가올 때까지 기다리기",
    variants: ["먼저 다가올 때까지 기다"],
  },
];

const dogOnlyBehaviorPhrases = [
  "부르면 시선을 맞추",
  "부르면 돌아보기",
  "산책 전후",
  "산책 욕구",
  "하네스",
  "산책길",
  "노즈워크",
];

const allowedSensitiveSafetyNoticeProbe = [
  "질병이나 수명을 예측하지 않아요",
  "사고를 단정하지 않아요",
  "건강, 수명, 사고를 예측하거나 의학적 판단을 제공하지 않습니다",
  "치료 조언을 제공하지 않습니다",
].join("\n");

function hasAnyVariant(text, variants) {
  return variants.some((variant) => text.includes(variant));
}

function describeForbiddenPattern(pattern) {
  if (
    pattern === forbiddenCopy.legacyPdfKeepsakeCopy ||
    pattern === forbiddenCopy.legacyPaidPdfCopy ||
    pattern === forbiddenCopy.legacyPaidPdfCopyWithWon ||
    pattern === forbiddenCopy.legacyPdfExtraProductCopy ||
    pattern === ["PDF 추가 ", "결제"].join("")
  ) {
    return "예전 유료 PDF 문구";
  }

  return pattern;
}

function splitKoreanSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。요다])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 18);
}

function sentenceOverlapRatio(left, right) {
  const leftSentences = new Set(splitKoreanSentences(left));
  const rightSentences = splitKoreanSentences(right);

  if (rightSentences.length === 0) {
    return 0;
  }

  const overlapped = rightSentences.filter((sentence) =>
    leftSentences.has(sentence),
  ).length;

  return overlapped / rightSentences.length;
}

async function runReportQualityChecks() {
  const demoInput = {
    name: "몽이",
    type: "dog",
    birthDate: "2021-05-14",
    birthTime: null,
    birthTimeUnknown: true,
    adoptionDate: "2021-08-20",
    lifestyle: {
      livingEnvironment: ["with_family", "mostly_indoor"],
      dailyActivityFrequency: "once",
      aloneTime: "one_to_three",
      strangerReaction: "observes_carefully",
      guardianDistance: "moderately_close",
      favoriteActivities: ["walk", "treat_search"],
      guardianQuestions: ["personality", "bond", "routine"],
    },
  };
  const catInput = {
    name: "나비",
    type: "cat",
    birthDate: "2022-03-04",
    birthTime: null,
    birthTimeUnknown: true,
    adoptionDate: "2022-05-01",
    lifestyle: {
      livingEnvironment: ["single_household", "mostly_indoor"],
      dailyActivityFrequency: "twice",
      aloneTime: "four_to_six",
      strangerReaction: "hides_or_avoids",
      guardianDistance: "depends_on_mood",
      favoriteActivities: ["window_watch", "short_hunt_play", "sleeping"],
      guardianQuestions: ["bond", "routine", "sensitive_moments"],
    },
  };
  const sanitizeSource = readProjectFile("lib/reports/sanitizeReportText.ts");
  const freeEngineSource = readProjectFile("lib/saju/petSajuEngine.ts");
  const premiumSource = readProjectFile("lib/saju/premiumReportGenerator.ts");
  const freeSummarySource = readProjectFile("lib/reports/free-summary.ts");
  const contentSource = readProjectFile("lib/readings/content.ts");

  addResult(
    "리포트 문장 품질",
    "sanitizeReportText 공통 함수 존재",
    sanitizeSource.includes("export function sanitizeReportText") &&
      sanitizeSource.includes("forbiddenReportPatterns"),
    "",
    {
      issue: "sanitizeReportText",
      file: "lib/reports/sanitizeReportText.ts",
    },
  );

  addResult(
    "리포트 문장 품질",
    "production에서 금지 패턴 리포트 차단",
    sanitizeSource.includes("isProductionRuntime()") &&
      sanitizeSource.includes("throw new Error") &&
      sanitizeSource.includes("Report quality check failed in production"),
    "",
    {
      issue: "production report quality gate",
      file: "lib/reports/sanitizeReportText.ts",
    },
  );

  addResult(
    "리포트 문장 품질",
    "조사 오류 금지 패턴은 petName 기반 동적 검사",
    sanitizeSource.includes("getPetNameSpacingPatterns") &&
      sanitizeSource.includes("findForbiddenReportPatterns(text, petName") &&
      !sanitizeSource.includes('joinPhrase("몽이", " 의")') &&
      !sanitizeSource.includes('joinPhrase("몽이", " 이")'),
    "몽이 전용 하드코딩 대신 petName 기반 공백 조사 검사",
    {
      issue: "dynamic petName postposition quality gate",
      file: "lib/reports/sanitizeReportText.ts",
    },
  );

  addResult(
    "리포트 문장 품질",
    "무료/유료/미리보기 생성기가 sanitizer를 사용",
    freeEngineSource.includes("sanitizeReportText") &&
      premiumSource.includes("sanitizeReportText") &&
      freeSummarySource.includes("sanitizeReportText") &&
      contentSource.includes("sanitizeReportText"),
    "",
    {
      issue: "generator sanitizer integration",
      file: "lib/saju/petSajuEngine.ts, lib/saju/premiumReportGenerator.ts, lib/reports/free-summary.ts, lib/readings/content.ts",
    },
  );

  const { createFreeSummary } = await importProjectModule(
    "lib/reports/free-summary.ts",
  );
  const {
    createFreeInsightSections,
    createPremiumPreviewSections,
  } = await importProjectModule("lib/readings/content.ts");
  const { generatePremiumReport } = await importProjectModule(
    "lib/saju/premiumReportGenerator.ts",
  );
  const { sanitizeReportText, assertReportTextQuality } =
    await importProjectModule("lib/reports/sanitizeReportText.ts");
  const { findForbiddenSensitiveTerms, forbiddenSensitivePatterns } =
    await importProjectModule("lib/reports/sensitiveTerms.ts");

  const freeSummary = createFreeSummary(demoInput);
  const premiumReport = generatePremiumReport({
    ...demoInput,
    freeSummary,
  }).report;
  const catFreeSummary = createFreeSummary(catInput);
  const catPremiumReport = generatePremiumReport({
    ...catInput,
    freeSummary: catFreeSummary,
  }).report;
  const freeSections = createFreeInsightSections({
    ...demoInput,
    freeSummary,
  })
    .map((section) => `${section.title}\n${section.body}`)
    .join("\n\n");
  const catFreeSections = createFreeInsightSections({
    ...catInput,
    freeSummary: catFreeSummary,
  })
    .map((section) => `${section.title}\n${section.body}`)
    .join("\n\n");
  const premiumPreview = createPremiumPreviewSections({
    ...demoInput,
    freeSummary,
  })
    .map((section) => `${section.title}\n${section.body}`)
    .join("\n\n");
  const catPremiumPreview = createPremiumPreviewSections({
    ...catInput,
    freeSummary: catFreeSummary,
  })
    .map((section) => `${section.title}\n${section.body}`)
    .join("\n\n");
  const sanitizedProbe = sanitizeReportText(
    [
      phrase("몽이", " 의"),
      ` 흐름은 ${forbiddenCopy.awkwardPlaySuffix} 잘 맞습니다. `,
      `${forbiddenCopy.fireYearPrefix} 부드럽게 살아나요.`,
    ].join(""),
    {
      context: "qa_probe",
      petName: "몽이",
    },
  );
  const samplePage = await get("/sample");
  const reviewPage = await get("/review");
  const homePage = await get("/");
  const termsPage = await get("/terms");
  const refundPage = await get("/refund");

  addReportQualityPatternChecks({
    label: "freeReportGenerator",
    text: freeSummary,
    url: "generated:free_summary",
    file: "lib/reports/free-summary.ts, lib/saju/petSajuEngine.ts",
  });
  addReportQualityPatternChecks({
    label: "premiumReportGenerator",
    text: premiumReport,
    url: "generated:premium_report",
    file: "lib/saju/premiumReportGenerator.ts",
  });
  addReportQualityPatternChecks({
    label: "cat freeReportGenerator",
    text: catFreeSummary,
    url: "generated:free_summary_cat",
    file: "lib/reports/free-summary.ts, lib/saju/petSajuEngine.ts",
  });
  addReportQualityPatternChecks({
    label: "cat premiumReportGenerator",
    text: catPremiumReport,
    url: "generated:premium_report_cat",
    file: "lib/saju/premiumReportGenerator.ts",
  });
  addReportQualityPatternChecks({
    label: "review preview",
    text: [freeSections, premiumPreview, reviewPage.text].join("\n"),
    url: "/review",
    file: "app/review/page.tsx, lib/readings/content.ts",
  });
  addReportQualityPatternChecks({
    label: "sample page",
    text: samplePage.text,
    url: "/sample",
    file: "app/sample/page.tsx, lib/readings/content.ts",
  });
  addReportQualityPatternChecks({
    label: "sanitize probe",
    text: sanitizedProbe,
    url: "generated:sanitize_probe",
    file: "lib/reports/sanitizeReportText.ts",
  });

  const allowedSensitiveMatches = findForbiddenSensitiveTerms(
    allowedSensitiveSafetyNoticeProbe,
  );
  const forbiddenSensitiveProbe = forbiddenSensitivePatterns.join("\n");
  const forbiddenSensitiveMatches =
    findForbiddenSensitiveTerms(forbiddenSensitiveProbe);
  const publicSafetyBundle = [
    homePage.text,
    termsPage.text,
    refundPage.text,
    samplePage.text,
    reviewPage.text,
    freeSummary,
    premiumReport,
    catFreeSummary,
    catPremiumReport,
  ].join("\n\n");
  const publicSensitiveMatches =
    findForbiddenSensitiveTerms(publicSafetyBundle);

  addResult(
    "리포트 문장 품질",
    "안전 고지는 민감어 실패로 보지 않음",
    allowedSensitiveMatches.length === 0,
    allowedSensitiveMatches.length > 0
      ? `matches: ${allowedSensitiveMatches.join(", ")}`
      : "허용 고지 문구는 통과",
    {
      issue: "contextual sensitive safety notices",
      file: "lib/reports/sensitiveTerms.ts",
    },
  );
  addResult(
    "리포트 문장 품질",
    "실제 민감 금지 표현은 감지",
    forbiddenSensitiveMatches.length === forbiddenSensitivePatterns.length,
    `detected: ${forbiddenSensitiveMatches.join(", ")}`,
    {
      issue: "forbidden sensitive patterns",
      file: "lib/reports/sensitiveTerms.ts",
    },
  );
  addResult(
    "리포트 문장 품질",
    "공개 화면과 생성 리포트에 민감 금지 표현 없음",
    publicSensitiveMatches.length === 0,
    publicSensitiveMatches.length > 0
      ? `matches: ${publicSensitiveMatches.join(", ")}`
      : "footer/terms/refund/disclaimer 안전 고지는 허용",
    {
      issue: "contextual sensitive terms",
      file: "lib/reports/sensitiveTerms.ts, components/layout/SiteFooter.tsx, app/terms/page.tsx, app/refund/page.tsx",
    },
  );

  const catGeneratedBundle = [
    catFreeSummary,
    catFreeSections,
    catPremiumPreview,
    catPremiumReport,
  ].join("\n\n");
  const dogGeneratedBundle = [
    freeSummary,
    freeSections,
    premiumPreview,
    premiumReport,
  ].join("\n\n");
  const missingCatTerms = requiredCatBehaviorTerms
    .filter(({ variants }) => !hasAnyVariant(catGeneratedBundle, variants))
    .map(({ label }) => label);
  const catDogPhrases = dogOnlyBehaviorPhrases.filter((phrase) =>
    catGeneratedBundle.includes(phrase),
  );
  const dogCatOverlap = sentenceOverlapRatio(dogGeneratedBundle, catGeneratedBundle);

  addResult(
    "종별 문장 분리",
    "고양이 결과에 고양이 행동 언어 반영",
    missingCatTerms.length === 0,
    missingCatTerms.length > 0
      ? `missing: ${missingCatTerms.join(", ")}`
      : "자기 자리/창밖 관찰/느린 눈맞춤/사냥놀이/캣타워/숨숨집 등 포함",
    {
      issue: "cat behavior vocabulary",
      file: "lib/readings/content.ts, lib/saju/petSajuEngine.ts, lib/saju/premiumReportGenerator.ts",
    },
  );
  addResult(
    "종별 문장 분리",
    "고양이 결과에 강아지식 행동 문구 없음",
    catDogPhrases.length === 0,
    catDogPhrases.length > 0
      ? `dog-like phrases found: ${catDogPhrases.join(", ")}`
      : "",
    {
      issue: "dog-only behavior in cat copy",
      file: "lib/readings/content.ts, lib/saju/petSajuEngine.ts, lib/saju/premiumReportGenerator.ts",
    },
  );
  addResult(
    "종별 문장 분리",
    "dog/cat 생성 문장 구조 반복 낮음",
    dogCatOverlap <= 0.2,
    `exact sentence overlap ratio ${dogCatOverlap.toFixed(2)}`,
    {
      issue: "dog/cat copy similarity",
      file: "lib/readings/content.ts, lib/saju/petSajuEngine.ts, lib/saju/premiumReportGenerator.ts",
    },
  );

  try {
    assertReportTextQuality(
      [
        freeSummary,
        premiumReport,
        freeSections,
        premiumPreview,
        catFreeSummary,
        catPremiumReport,
        catFreeSections,
        catPremiumPreview,
      ].join("\n"),
      "qa_generated_reports",
    );
    addResult(
      "리포트 문장 품질",
      "생성 리포트 통합 금지 패턴 검사 통과",
      true,
      "demo-mong-2026/sample/review preview generator bundle",
      {
        issue: "forbidden report patterns",
        file: "lib/reports/sanitizeReportText.ts",
      },
    );
  } catch (error) {
    addResult(
      "리포트 문장 품질",
      "생성 리포트 통합 금지 패턴 검사 통과",
      false,
      error instanceof Error ? error.message : String(error),
      {
        issue: "forbidden report patterns",
        file: "lib/reports/sanitizeReportText.ts",
      },
    );
  }
}

function runReportActionChecks() {
  const actionButtonsSource = readProjectFile(
    "components/report/ReportActionButtons.tsx",
  );
  const copySource = readProjectFile("lib/report/copyReportText.ts");
  const printSource = readProjectFile("lib/report/openPrintableReport.ts");
  const pdfRouteSource = readProjectFile("app/api/pdf/[readingId]/route.ts");
  const pdfSource = readProjectFile("lib/pdf/createPremiumReportPdf.ts");
  const sourceBundle = [
    actionButtonsSource,
    copySource,
    printSource,
    pdfRouteSource,
    pdfSource,
  ].join("\n");
  const forbiddenReportActionLabels = [
    "AI 결과 복사",
    "AI 보고서 인쇄",
    "AI 리포트 저장",
    "자동 생성 리포트 저장",
    "AI 종합 보고서",
    "AI 심층 리포트 생성하기",
    "AI 분석 결과 보기",
    "인공지능 리포트 생성",
  ];

  addResult(
    "보고서 액션",
    "복사/인쇄/PDF/다시 입력 버튼 문구 존재",
    ["텍스트 복사", "인쇄하기", "PDF로 저장하기", "다시 입력하기"].every(
      (label) => actionButtonsSource.includes(label),
    ),
    "",
    {
      issue: "report action labels",
      file: "components/report/ReportActionButtons.tsx",
    },
  );

  addResult(
    "보고서 액션",
    "복사 기능 Clipboard API + textarea fallback 적용",
    copySource.includes("navigator.clipboard") &&
      copySource.includes("document.createElement(\"textarea\")") &&
      copySource.includes("document.execCommand(\"copy\")"),
    "",
    {
      issue: "copy fallback",
      file: "lib/report/copyReportText.ts",
    },
  );

  addResult(
    "보고서 액션",
    "복사 성공/실패 토스트 문구 적용",
    actionButtonsSource.includes("리포트 내용이 복사되었어요.") &&
      actionButtonsSource.includes("복사에 실패했어요. 다시 시도해 주세요."),
    "",
    {
      issue: "copy toast",
      file: "components/report/ReportActionButtons.tsx",
    },
  );

  addResult(
    "보고서 액션",
    "인쇄 기능 Blob 새 탭과 인쇄용 CSS 적용",
    printSource.includes("new Blob") &&
      printSource.includes("window.open") &&
      printSource.includes("@page") &&
      printSource.includes("size: A4") &&
      printSource.includes("onclick=\"window.print()\""),
    "",
    {
      issue: "printable report",
      file: "lib/report/openPrintableReport.ts",
    },
  );

  addResult(
    "보고서 액션",
    "PDF API premium_report 권한 검사 유지",
    pdfRouteSource.includes("checkPaymentAccess(readingId, \"premium_report\")") &&
      pdfRouteSource.includes("status: 403"),
    "",
    {
      issue: "pdf authorization",
      file: "app/api/pdf/[readingId]/route.ts",
    },
  );

  addResult(
    "보고서 액션",
    "PDF 파일명 정책 적용",
    pdfSource.includes("_사주리포트.pdf") &&
      pdfRouteSource.includes("filename*=UTF-8"),
    "",
    {
      issue: "pdf filename",
      file: "lib/pdf/createPremiumReportPdf.ts, app/api/pdf/[readingId]/route.ts",
    },
  );

  addResult(
    "보고서 액션",
    "PDF 포함 내용 문구 확인",
    ["표지", "반려동물", "한 장 요약", "오행 밸런스", "종합 리포트", "생성일"].every(
      (label) => pdfSource.includes(label),
    ),
    "",
    {
      issue: "pdf content sections",
      file: "lib/pdf/createPremiumReportPdf.ts",
    },
  );

  forbiddenReportActionLabels.forEach((label) => {
    addResult(
      "보고서 액션",
      `고객 화면 금지 문구 "${label}" 없음`,
      !sourceBundle.includes(label),
      sourceBundle.includes(label) ? "forbidden label found" : "",
      {
        issue: label,
        file: "components/report/ReportActionButtons.tsx, lib/report/openPrintableReport.ts, lib/pdf/createPremiumReportPdf.ts",
      },
    );
  });
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
  await runRuntimeAuthorizationChecks(isDemoMode);
  runPaymentAuthorizationSourceChecks();
  await runOperationalFeatureChecks();
  await runPremiumChecks(isDemoMode);
  await runPdfChecks(isDemoMode);
  await runUiEnhancementChecks(isDemoMode);
  runGptReviewSnapshotChecks();
  runReportActionChecks();
  await runReportQualityChecks();

  console.table(results);

  const failed = results.filter((result) => result.결과 === "FAIL");
  const skipped = results.filter((result) => result.결과 === "SKIP");

  if (failed.length > 0) {
    console.log("\n실패 상세: 아래 URL, 문구/요소, 확인 파일을 먼저 확인하세요.");
    console.table(
      failed.map((result) => ({
        구간: result.구간,
        점검: result.점검,
        URL: result.URL,
        "문구/요소": result["문구/요소"],
        "확인 파일": result["확인 파일"],
        상세: result.상세,
      })),
    );
  }

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
