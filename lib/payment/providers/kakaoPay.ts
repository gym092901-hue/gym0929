import type { Json } from "@/types/database";
import type {
  ApproveProviderPaymentInput,
  ApproveProviderPaymentResult,
  CreateProviderPaymentInput,
  CreateProviderPaymentResult,
  PaymentProviderAdapter,
} from "@/lib/payment/types";

type KakaoPayReadyResponse = {
  tid: string;
  next_redirect_app_url?: string;
  next_redirect_mobile_url?: string;
  next_redirect_pc_url?: string;
  android_app_scheme?: string;
  ios_app_scheme?: string;
  created_at?: string;
};

type KakaoPayApproveResponse = {
  aid?: string;
  tid?: string;
  cid?: string;
  partner_order_id?: string;
  partner_user_id?: string;
  payment_method_type?: string;
  item_name?: string;
  quantity?: number;
  amount?: Json;
  approved_at?: string;
};

export class KakaoPayApiError extends Error {
  status: number;
  rawResponse: Json;

  constructor(message: string, status: number, rawResponse: Json) {
    super(message);
    this.name = "KakaoPayApiError";
    this.status = status;
    this.rawResponse = rawResponse;
  }
}

function getKakaoPayConfig() {
  const cid = process.env.KAKAOPAY_CID;
  const secretKey = process.env.KAKAOPAY_SECRET_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const baseUrl = process.env.KAKAOPAY_BASE_URL ?? "https://open-api.kakaopay.com";

  if (!cid || !secretKey || !siteUrl) {
    throw new Error(
      "KakaoPay server credentials are missing. Set KAKAOPAY_CID, KAKAOPAY_SECRET_KEY, and NEXT_PUBLIC_SITE_URL.",
    );
  }

  return {
    cid,
    secretKey,
    siteUrl: siteUrl.replace(/\/$/, ""),
    baseUrl: baseUrl.replace(/\/$/, ""),
  };
}

function endpoint(baseUrl: string, action: "ready" | "approve") {
  if (baseUrl.endsWith(`/online/v1/payment/${action}`)) {
    return baseUrl;
  }

  if (baseUrl.endsWith("/online/v1/payment")) {
    return `${baseUrl}/${action}`;
  }

  return `${baseUrl}/online/v1/payment/${action}`;
}

async function readJsonResponse(response: Response): Promise<Json> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as Json;
  } catch {
    return { rawText: text };
  }
}

function isReadyResponse(value: Json): value is KakaoPayReadyResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof value.tid === "string",
  );
}

function isApproveResponse(value: Json): value is KakaoPayApproveResponse {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getPgToken(payload: Json | undefined) {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    typeof payload.pg_token === "string"
  ) {
    return payload.pg_token;
  }

  return null;
}

export const kakaoPayProvider: PaymentProviderAdapter = {
  provider: "kakaopay",

  async createPayment(
    input: CreateProviderPaymentInput,
  ): Promise<CreateProviderPaymentResult> {
    const config = getKakaoPayConfig();
    const productName = input.productName ?? "멍냥사주 프리미엄 리포트";
    const approvalUrl = `${config.siteUrl}/payment/kakao/success?paymentId=${input.paymentId}&readingId=${input.readingId}`;
    const cancelUrl = `${config.siteUrl}/payment/kakao/cancel?paymentId=${input.paymentId}&readingId=${input.readingId}`;
    const failUrl = `${config.siteUrl}/payment/kakao/fail?paymentId=${input.paymentId}&readingId=${input.readingId}`;

    const body = {
      cid: config.cid,
      partner_order_id: input.paymentId,
      partner_user_id: input.readingId,
      item_name: productName,
      quantity: 1,
      total_amount: input.amount,
      tax_free_amount: 0,
      approval_url: approvalUrl,
      cancel_url: cancelUrl,
      fail_url: failUrl,
    };

    const response = await fetch(endpoint(config.baseUrl, "ready"), {
      method: "POST",
      headers: {
        Authorization: `SECRET_KEY ${config.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const rawResponse = await readJsonResponse(response);

    if (!response.ok || !isReadyResponse(rawResponse)) {
      throw new KakaoPayApiError(
        "KakaoPay ready API failed",
        response.status,
        {
          ready: rawResponse,
          request: {
            ...body,
            cid: config.cid,
          },
        },
      );
    }

    return {
      providerOrderId: input.paymentId,
      providerTid: rawResponse.tid,
      providerPaymentId: null,
      redirectUrl:
        rawResponse.next_redirect_pc_url ??
        rawResponse.next_redirect_mobile_url ??
        null,
      rawResponse: {
        ready: rawResponse,
        request: {
          partner_order_id: input.paymentId,
          partner_user_id: input.readingId,
          item_name: productName,
          quantity: 1,
          total_amount: input.amount,
          tax_free_amount: 0,
          approval_url: approvalUrl,
          cancel_url: cancelUrl,
          fail_url: failUrl,
        },
      },
    };
  },

  async approvePayment(
    input: ApproveProviderPaymentInput,
  ): Promise<ApproveProviderPaymentResult> {
    const config = getKakaoPayConfig();
    const pgToken = getPgToken(input.providerPayload);

    if (!input.providerTid || !input.providerOrderId || !pgToken) {
      throw new KakaoPayApiError("KakaoPay approve params are missing", 400, {
        approve: {
          error: "missing required approve params",
          hasTid: Boolean(input.providerTid),
          hasPartnerOrderId: Boolean(input.providerOrderId),
          hasPgToken: Boolean(pgToken),
        },
      });
    }

    const body = {
      cid: config.cid,
      tid: input.providerTid,
      partner_order_id: input.providerOrderId,
      partner_user_id: input.providerPayload &&
        typeof input.providerPayload === "object" &&
        !Array.isArray(input.providerPayload) &&
        typeof input.providerPayload.readingId === "string"
          ? input.providerPayload.readingId
          : "",
      pg_token: pgToken,
    };

    const response = await fetch(endpoint(config.baseUrl, "approve"), {
      method: "POST",
      headers: {
        Authorization: `SECRET_KEY ${config.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const rawResponse = await readJsonResponse(response);

    if (!response.ok || !isApproveResponse(rawResponse)) {
      throw new KakaoPayApiError(
        "KakaoPay approve API failed",
        response.status,
        {
          approve: rawResponse,
          request: {
            partner_order_id: input.providerOrderId,
            partner_user_id: body.partner_user_id,
            tid: input.providerTid,
          },
        },
      );
    }

    return {
      status: "approved",
      providerPaymentId:
        typeof rawResponse.aid === "string"
          ? rawResponse.aid
          : input.providerPaymentId,
      rawResponse: {
        approve: rawResponse,
      },
    };
  },

  getMockSuccessUrl({ paymentId, readingId }) {
    return `/payment/kakao/success?paymentId=${paymentId}&readingId=${readingId}`;
  },
};
