export {};

type HealthTarget = {
  label: string;
  path: string;
  validate: (result: FetchResult) => {
    ok: boolean;
    detail: string;
  };
};

type FetchResult = {
  path: string;
  initialStatus: number;
  finalStatus: number;
  finalUrl: string;
  redirected: boolean;
  statusChain: number[];
  text: string;
};

const baseUrl = normalizeBaseUrl(process.env.PRODUCTION_BASE_URL);
const phrase = (...parts: string[]) => parts.join("");

const forbiddenPhrases = [
  phrase("테스트 결제 성공 ", "처리"),
  phrase("심층 리포트 페이지 ", "바로 보기"),
  phrase("데모 PDF ", "미리보기"),
  phrase("몽이", " 의"),
  phrase("잘 맞아요", ".도"),
  ".도 잘 맞습니다",
  phrase("기운은 ", "기운은"),
  phrase("금의 기운은 ", "기준을 세우고"),
  phrase("화의 기운은 ", "올해는"),
  phrase("낯선 자극을 만났을 때는 ", "금의 기운은"),
  phrase(" ", "야."),
  phrase("애교쟁이", " 야"),
  phrase("감수성러", " 야"),
  phrase("PDF ", "\uc18c\uc7a5\ubcf8"),
  phrase("PDF ", "\uc18c\uc7a5\ubcf8 추가"),
  phrase("PDF다운로드 추가 ", "상품"),
  phrase("PDF 다운로드 추가 ", "상품"),
  phrase("픽셀 ", "캐릭터"),
  phrase("강아지 얼굴 ", "일러스트"),
  phrase("고양이 얼굴 ", "일러스트"),
  phrase("리포트 카드를 함께 보는 ", "캐릭터"),
  "GPT 점검용",
  "검토용 통합 페이지",
];

const targets: HealthTarget[] = [
  {
    label: "홈",
    path: "/",
    validate: expectFinalStatus(200),
  },
  {
    label: "Health API",
    path: "/api/health",
    validate(result) {
      let body: { status?: string } = {};

      try {
        body = JSON.parse(result.text) as { status?: string };
      } catch {
        return {
          ok: false,
          detail: "/api/health JSON 응답을 파싱하지 못했습니다.",
        };
      }

      const containsSecret =
        result.text.includes("SECRET") ||
        result.text.includes("SERVICE_ROLE") ||
        result.text.includes("CLIENT_SECRET");
      const ok =
        result.finalStatus === 200 && body.status === "ok" && !containsSecret;

      return {
        ok,
        detail: ok
          ? "status ok, secret 미노출"
          : "/api/health는 200 status ok이고 secret 문구가 없어야 합니다.",
      };
    },
  },
  {
    label: "입력",
    path: "/input",
    validate: expectFinalStatus(200),
  },
  {
    label: "테스터 안내 production 숨김",
    path: "/test",
    validate(result) {
      const redirectedToSample = result.finalUrl.endsWith("/sample");
      const ok =
        [307, 308].includes(result.initialStatus) &&
        result.finalStatus === 200 &&
        redirectedToSample;

      return {
        ok,
        detail: ok
          ? "/test는 production에서 /sample로 redirect"
          : "production /test는 공개되지 않고 /sample로 redirect되어야 합니다.",
      };
    },
  },
  {
    label: "데모 무료 결과 production 차단",
    path: "/result/free/demo-mong-2026",
    validate(result) {
      const redirectedToSample = result.finalUrl.endsWith("/sample");
      const accessBlocked = [404, 410].includes(result.finalStatus);
      const ok =
        (result.initialStatus !== 200 && redirectedToSample) || accessBlocked;

      return {
        ok,
        detail: ok
          ? "demo free result는 /sample redirect 또는 차단"
          : "production에서 demo free result가 직접 열리면 안 됩니다.",
      };
    },
  },
  {
    label: "체크아웃",
    path: "/checkout/demo-mong-2026?productType=premium_report&forceCheckout=1",
    validate(result) {
      const ok =
        result.initialStatus === 200 ||
        (result.redirected && result.finalStatus >= 200 && result.finalStatus < 400);

      return {
        ok,
        detail: ok
          ? "200 또는 정상 redirect"
          : "체크아웃은 200 또는 정상 redirect여야 합니다.",
      };
    },
  },
  {
    label: "데모 프리미엄 직접 접근",
    path: "/result/premium/demo-mong-2026",
    validate(result) {
      const redirectedToCheckout = result.finalUrl.includes(
        "/checkout/demo-mong-2026",
      );
      const accessBlocked = [401, 403, 404].includes(result.finalStatus);
      const ok =
        result.initialStatus !== 200 && (redirectedToCheckout || accessBlocked);

      return {
        ok,
        detail: ok
          ? "프리미엄 직접 접근 차단"
          : "production에서 demo premium 직접 접근이 200이면 안 됩니다.",
      };
    },
  },
  {
    label: "관리자 검토",
    path: "/review",
    validate(result) {
      const passwordLogin =
        result.text.includes("관리자 비밀번호") &&
        result.text.includes("검토 페이지 열기");
      const disabledNotice =
        result.text.includes("관리자 검토 페이지입니다") &&
        result.text.includes("검토 내용을 표시하지 않습니다");
      const ok =
        result.finalStatus === 200 &&
        (passwordLogin || disabledNotice);

      return {
        ok,
        detail: ok
          ? "/review 관리자 보호 화면"
          : "production /review는 관리자 비밀번호 입력 또는 보호 안내 화면이어야 합니다.",
      };
    },
  },
  {
    label: "이용약관",
    path: "/terms",
    validate: expectFinalStatus(200),
  },
  {
    label: "개인정보처리방침",
    path: "/privacy",
    validate: expectFinalStatus(200),
  },
  {
    label: "환불정책",
    path: "/refund",
    validate: expectFinalStatus(200),
  },
];

function normalizeBaseUrl(value: string | undefined) {
  if (!value) {
    console.error("PRODUCTION_BASE_URL 환경변수를 설정해 주세요.");
    console.error(
      "예: PRODUCTION_BASE_URL=https://your-domain.vercel.app npm run health:prod",
    );
    process.exit(1);
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      console.error("PRODUCTION_BASE_URL은 https 운영 URL이어야 합니다.");
      process.exit(1);
    }

    if (isBlockedProductionHost(url.hostname)) {
      console.error(
        "PRODUCTION_BASE_URL에는 localhost나 로컬 터널 주소를 사용할 수 없습니다.",
      );
      process.exit(1);
    }

    return url.toString().replace(/\/$/, "");
  } catch {
    console.error(`PRODUCTION_BASE_URL 형식이 올바르지 않습니다: ${value}`);
    process.exit(1);
  }
}

function isBlockedProductionHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "loca.lt" ||
    hostname.endsWith(".loca.lt") ||
    hostname === "localtunnel.me" ||
    hostname.endsWith(".localtunnel.me")
  );
}

function expectFinalStatus(expectedStatus: number) {
  return (result: FetchResult) => ({
    ok: result.finalStatus === expectedStatus,
    detail:
      result.finalStatus === expectedStatus
        ? `status ${expectedStatus}`
        : `expected ${expectedStatus}, got ${result.finalStatus}`,
  });
}

function isRedirectStatus(status: number) {
  return [301, 302, 303, 307, 308].includes(status);
}

function normalizeHtml(text: string) {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

function findForbiddenPhrases(text: string) {
  return forbiddenPhrases.filter((phrase) => text.includes(phrase));
}

async function fetchWithRedirects(path: string): Promise<FetchResult> {
  const statusChain: number[] = [];
  let currentUrl = new URL(path, baseUrl).toString();
  let finalUrl = currentUrl;
  let text = "";
  let initialStatus = 0;
  let finalStatus = 0;
  let redirected = false;

  for (let index = 0; index < 8; index += 1) {
    const response = await fetch(currentUrl, {
      redirect: "manual",
      headers: {
        "User-Agent": "meongnyang-production-health-check/1.0",
      },
    });

    if (index === 0) {
      initialStatus = response.status;
    }

    statusChain.push(response.status);
    finalStatus = response.status;
    finalUrl = currentUrl;

    const location = response.headers.get("location");

    if (isRedirectStatus(response.status) && location) {
      redirected = true;
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    text = normalizeHtml(await response.text());
    break;
  }

  return {
    path,
    initialStatus,
    finalStatus,
    finalUrl,
    redirected,
    statusChain,
    text,
  };
}

async function run() {
  console.log(`멍냥사주 production health check: ${baseUrl}`);

  const rows = [];

  for (const target of targets) {
    try {
      const result = await fetchWithRedirects(target.path);
      const validation = target.validate(result);
      const forbidden = findForbiddenPhrases(result.text);
      const ok = validation.ok && forbidden.length === 0;

      rows.push({
        구간: target.label,
        URL: target.path,
        "status chain": result.statusChain.join(" -> "),
        "final status": result.finalStatus,
        "final URL": result.finalUrl,
        "금지 문구": forbidden.length > 0 ? forbidden.join(", ") : "없음",
        결과: ok ? "PASS" : "FAIL",
        상세: forbidden.length > 0 ? "금지 문구 발견" : validation.detail,
      });
    } catch (error) {
      rows.push({
        구간: target.label,
        URL: target.path,
        "status chain": "-",
        "final status": "-",
        "final URL": "-",
        "금지 문구": "-",
        결과: "FAIL",
        상세:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      });
    }
  }

  console.table(rows);

  const failedRows = rows.filter((row) => row.결과 === "FAIL");
  console.log(`요약: PASS ${rows.length - failedRows.length}, FAIL ${failedRows.length}`);

  if (failedRows.length > 0) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error("production health check 실행 중 오류가 발생했습니다.");
  console.error(error);
  process.exit(1);
});
