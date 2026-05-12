import { createHmac } from "crypto";

const DEFAULT_BASE_URL = "https://api-gateway.coupang.com";

export type CoupangOpenApiConfig = {
  accessKey: string;
  secretKey: string;
  vendorId: string;
  baseUrl: string;
  market: string;
};

export type CoupangConfigStatus = {
  configured: boolean;
  missing: string[];
};

export type CoupangOpenApiResponse<T> = {
  code?: string;
  message?: string;
  data?: T;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  config?: CoupangOpenApiConfig;
};

type EnvLike = Record<string, string | undefined>;

export function getCoupangConfigStatus(env: EnvLike = process.env): CoupangConfigStatus {
  const required = ["COUPANG_ACCESS_KEY", "COUPANG_SECRET_KEY", "COUPANG_VENDOR_ID"] as const;
  const missing = required.filter((key) => !env[key]?.trim());
  return {
    configured: missing.length === 0,
    missing
  };
}

export function getCoupangOpenApiConfig(env: EnvLike = process.env): CoupangOpenApiConfig {
  const status = getCoupangConfigStatus(env);
  if (!status.configured) {
    throw new CoupangOpenApiConfigError(status.missing);
  }

  return {
    accessKey: env.COUPANG_ACCESS_KEY!.trim(),
    secretKey: env.COUPANG_SECRET_KEY!.trim(),
    vendorId: env.COUPANG_VENDOR_ID!.trim(),
    baseUrl: (env.COUPANG_API_BASE_URL || DEFAULT_BASE_URL).trim().replace(/\/$/, ""),
    market: (env.COUPANG_MARKET || "KR").trim()
  };
}

export class CoupangOpenApiConfigError extends Error {
  constructor(readonly missing: string[]) {
    super(`쿠팡 WING Open API 환경변수가 필요합니다: ${missing.join(", ")}`);
    this.name = "CoupangOpenApiConfigError";
  }
}

export class CoupangOpenApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly responseBody: string
  ) {
    super(message);
    this.name = "CoupangOpenApiRequestError";
  }
}

export function formatCoupangSignedDate(date = new Date()): string {
  const iso = date.toISOString();
  return iso.replace(/\.\d{3}Z$/, "Z").replace(/[-:]/g, "").slice(2);
}

export function buildCoupangAuthorizationHeader(input: {
  method: string;
  path: string;
  queryString?: string;
  accessKey: string;
  secretKey: string;
  signedDate?: string;
}): string {
  const signedDate = input.signedDate ?? formatCoupangSignedDate();
  const queryString = input.queryString ?? "";
  const message = `${signedDate}${input.method.toUpperCase()}${input.path}${queryString}`;
  const signature = createHmac("sha256", input.secretKey).update(message).digest("hex");

  return [
    "CEA algorithm=HmacSHA256",
    `access-key=${input.accessKey}`,
    `signed-date=${signedDate}`,
    `signature=${signature}`
  ].join(", ");
}

export async function requestCoupangOpenApi<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const config = options.config ?? getCoupangOpenApiConfig();
  const queryString = buildQueryString(options.query);
  const authorization = buildCoupangAuthorizationHeader({
    method,
    path,
    queryString,
    accessKey: config.accessKey,
    secretKey: config.secretKey
  });
  const url = `${config.baseUrl}${path}${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: authorization,
      "X-MARKET": config.market,
      "content-type": "application/json;charset=UTF-8"
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const responseText = await response.text();

  if (!response.ok) {
    throw new CoupangOpenApiRequestError(
      `쿠팡 WING Open API 요청이 실패했습니다. (${response.status}) ${responseText || response.statusText}`,
      response.status,
      responseText
    );
  }

  const parsed = parseJsonResponse<CoupangOpenApiResponse<T> | T>(responseText);
  if (isWrappedCoupangResponse<T>(parsed)) {
    if (parsed.code && parsed.code !== "SUCCESS") {
      throw new CoupangOpenApiRequestError(
        `쿠팡 WING Open API 오류: ${parsed.message || parsed.code}`,
        response.status,
        responseText
      );
    }
    return parsed.data as T;
  }

  return parsed as T;
}

export async function getCoupangSellerProduct(sellerProductId: string, config?: CoupangOpenApiConfig) {
  const cleanId = sellerProductId.trim();
  const path = `/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/${encodeURIComponent(cleanId)}`;
  return requestCoupangOpenApi<unknown>(path, { method: "GET", config });
}

function buildQueryString(query?: Record<string, string | number | boolean | undefined>): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    params.append(key, String(value));
  }
  return params.toString();
}

function parseJsonResponse<T>(text: string): T {
  if (!text.trim()) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new CoupangOpenApiRequestError("쿠팡 WING Open API 응답을 JSON으로 해석할 수 없습니다.", 200, text);
  }
}

function isWrappedCoupangResponse<T>(value: unknown): value is CoupangOpenApiResponse<T> {
  return Boolean(value && typeof value === "object" && ("code" in value || "data" in value || "message" in value));
}
