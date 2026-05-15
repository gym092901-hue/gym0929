import type { Json } from "@/types/database";
import type {
  ApproveProviderPaymentInput,
  ApproveProviderPaymentResult,
  CreateProviderPaymentInput,
  CreateProviderPaymentResult,
  PaymentProviderAdapter,
} from "@/lib/payment/types";

type PayPalTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type PayPalOrderResponse = {
  id?: string;
  status?: string;
  links?: Json;
  purchase_units?: Json;
};

type PayPalCaptureResponse = {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
      }>;
    };
  }>;
};

export class PayPalApiError extends Error {
  status: number;
  rawResponse: Json;

  constructor(message: string, status: number, rawResponse: Json) {
    super(message);
    this.name = "PayPalApiError";
    this.status = status;
    this.rawResponse = rawResponse;
  }
}

function getPayPalConfig() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const baseUrl =
    process.env.PAYPAL_BASE_URL ?? "https://api-m.sandbox.paypal.com";

  if (!clientId || !clientSecret) {
    throw new Error(
      "PayPal server credentials are missing. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
    );
  }

  return {
    clientId,
    clientSecret,
    baseUrl: baseUrl.replace(/\/$/, ""),
  };
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

function asObject(value: Json) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  return null;
}

async function getAccessToken() {
  const config = getPayPalConfig();
  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`,
  ).toString("base64");

  const response = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const rawResponse = await readJsonResponse(response);
  const tokenResponse = asObject(rawResponse) as PayPalTokenResponse | null;

  if (!response.ok || !tokenResponse?.access_token) {
    throw new PayPalApiError("PayPal OAuth token request failed", response.status, {
      oauth: rawResponse,
    });
  }

  return {
    accessToken: tokenResponse.access_token,
    baseUrl: config.baseUrl,
  };
}

function zeroDecimalCurrency(currency: string) {
  return ["JPY", "KRW", "VND"].includes(currency.toUpperCase());
}

function formatAmount(amount: number, currency: string) {
  return zeroDecimalCurrency(currency)
    ? String(amount)
    : (amount / 100).toFixed(2);
}

function getPayloadOrderId(payload: Json | undefined) {
  if (
    payload &&
    typeof payload === "object" &&
    !Array.isArray(payload) &&
    typeof payload.orderId === "string"
  ) {
    return payload.orderId;
  }

  return null;
}

function getCaptureId(captureResponse: PayPalCaptureResponse) {
  return captureResponse.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
}

export const paypalProvider: PaymentProviderAdapter = {
  provider: "paypal",

  async createPayment(
    input: CreateProviderPaymentInput,
  ): Promise<CreateProviderPaymentResult> {
    const { accessToken, baseUrl } = await getAccessToken();
    const currency = input.currency.toUpperCase();
    const value = formatAmount(input.amount, currency);
    const productName = input.productName ?? "멍냥사주 프리미엄 리포트";
    const requestBody = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.readingId,
          invoice_id: input.paymentId,
          custom_id: input.paymentId,
          description: productName,
          amount: {
            currency_code: currency,
            value,
          },
        },
      ],
    };

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `create-${input.paymentId}`,
      },
      body: JSON.stringify(requestBody),
    });
    const rawResponse = await readJsonResponse(response);
    const orderResponse = asObject(rawResponse) as PayPalOrderResponse | null;

    if (!response.ok || !orderResponse?.id) {
      throw new PayPalApiError("PayPal create order failed", response.status, {
        create_order: rawResponse,
        request: requestBody as Json,
      });
    }

    return {
      providerOrderId: orderResponse.id,
      providerTid: null,
      providerPaymentId: null,
      redirectUrl: null,
      rawResponse: {
        create_order: rawResponse,
        request: requestBody as Json,
      },
    };
  },

  async approvePayment(
    input: ApproveProviderPaymentInput,
  ): Promise<ApproveProviderPaymentResult> {
    const orderId = getPayloadOrderId(input.providerPayload);

    if (!orderId || orderId !== input.providerOrderId) {
      throw new PayPalApiError("PayPal order id does not match payment", 400, {
        capture_order: {
          error: "order id mismatch",
          orderId,
          providerOrderId: input.providerOrderId,
        },
      });
    }

    const { accessToken, baseUrl } = await getAccessToken();
    const response = await fetch(
      `${baseUrl}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": `capture-${input.paymentId}`,
        },
      },
    );
    const rawResponse = await readJsonResponse(response);
    const captureResponse = asObject(rawResponse) as PayPalCaptureResponse | null;

    if (!response.ok || captureResponse?.status !== "COMPLETED") {
      throw new PayPalApiError("PayPal capture order failed", response.status, {
        capture_order: rawResponse,
      });
    }

    return {
      status: "approved",
      providerPaymentId: getCaptureId(captureResponse) ?? orderId,
      rawResponse: {
        capture_order: rawResponse,
      },
    };
  },

  getMockSuccessUrl({ paymentId, readingId }) {
    return `/payment/paypal/success?paymentId=${paymentId}&readingId=${readingId}`;
  },
};
