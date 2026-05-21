"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductType } from "@/types/database";

type PayPalCheckoutProps = {
  readingId: string;
  productType: ProductType;
  currency: string;
  disabled: boolean;
};

type CreateOrderResponse = {
  orderId?: string;
  paymentId?: string;
  resultUrl?: string;
  alreadyApproved?: boolean;
  error?: string;
};

type CaptureOrderResponse = {
  resultUrl?: string;
  premiumUrl?: string;
  error?: string;
};

type CardFieldsInstance = {
  submit: () => Promise<void>;
};

function loadPayPalSdk(clientId: string, currency: string) {
  const existingScript = document.querySelector<HTMLScriptElement>(
    "script[data-meongnyang-paypal-sdk='true']",
  );

  if (existingScript) {
    return Promise.resolve();
  }

  const params = new URLSearchParams({
    "client-id": clientId,
    currency,
    intent: "capture",
    components: "buttons,card-fields",
    "enable-funding": "card",
  });

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    script.async = true;
    script.dataset.meongnyangPaypalSdk = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("PayPal 결제창을 불러오지 못했습니다."));
    document.body.appendChild(script);
  });
}

export function PayPalCheckout({
  readingId,
  productType,
  currency,
  disabled,
}: PayPalCheckoutProps) {
  const router = useRouter();
  const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const cardNameRef = useRef<HTMLDivElement>(null);
  const cardNumberRef = useRef<HTMLDivElement>(null);
  const cardExpiryRef = useRef<HTMLDivElement>(null);
  const cardCvvRef = useRef<HTMLDivElement>(null);
  const activePaymentIdRef = useRef<string | null>(null);
  const cardFieldsRef = useRef<CardFieldsInstance | null>(null);
  const renderedRef = useRef(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("PayPal 결제 모듈을 준비하고 있습니다.");
  const [cardEligible, setCardEligible] = useState(false);
  const [isSubmittingCard, setIsSubmittingCard] = useState(false);

  const createOrder = useCallback(async () => {
    if (disabled) {
      throw new Error("결제 전 확인 항목을 먼저 선택해주세요.");
    }

    setError("");
    setStatus("PayPal 주문을 생성하고 있습니다.");

    const response = await fetch("/api/payments/paypal/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        readingId,
        productType,
      }),
    });
    const result = (await response.json()) as CreateOrderResponse;

    if (result.resultUrl) {
      setStatus("이미 구매한 리포트로 이동합니다.");
      router.push(result.resultUrl);
      throw new Error("이미 구매한 리포트로 이동합니다.");
    }

    if (!response.ok || !result.orderId || !result.paymentId) {
      throw new Error(result.error ?? "PayPal 주문을 생성하지 못했습니다.");
    }

    activePaymentIdRef.current = result.paymentId;
    setStatus("PayPal 승인 대기 중입니다.");

    return result.orderId;
  }, [disabled, productType, readingId, router]);

  const captureOrder = useCallback(async (orderId: string) => {
    const paymentId = activePaymentIdRef.current;

    if (!paymentId) {
      throw new Error("결제 식별자를 찾을 수 없습니다.");
    }

    setStatus("PayPal 결제를 승인하고 있습니다.");

    const response = await fetch("/api/payments/paypal/capture-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId,
        paymentId,
      }),
    });
    const result = (await response.json()) as CaptureOrderResponse;

    const nextUrl = result.resultUrl ?? result.premiumUrl;

    if (!response.ok || !nextUrl) {
      throw new Error(result.error ?? "PayPal 결제를 승인하지 못했습니다.");
    }

    router.push(nextUrl);
  }, [router]);

  useEffect(() => {
    if (!paypalClientId) {
      setStatus("");
      setError("NEXT_PUBLIC_PAYPAL_CLIENT_ID가 설정되지 않았습니다.");
      return;
    }

    if (renderedRef.current) {
      return;
    }

    let canceled = false;

    loadPayPalSdk(paypalClientId, currency)
      .then(() => {
        if (canceled || renderedRef.current) {
          return;
        }

        if (!window.paypal?.Buttons || !buttonContainerRef.current) {
          throw new Error("PayPal Buttons를 초기화할 수 없습니다.");
        }

        renderedRef.current = true;

        window.paypal.Buttons({
          style: {
            layout: "vertical",
            shape: "rect",
            label: "paypal",
          },
          createOrder,
          onApprove: async (data) => {
            const orderId = data.orderID ?? data.orderId;

            if (!orderId) {
              throw new Error("PayPal order id를 찾을 수 없습니다.");
            }

            await captureOrder(orderId);
          },
          onCancel: () => {
            setStatus("PayPal 결제가 취소되었습니다.");
          },
          onError: (sdkError) => {
            console.error("PayPal Buttons error", sdkError);
            setError("PayPal 결제 처리 중 오류가 발생했습니다.");
          },
        }).render(buttonContainerRef.current);

        if (
          window.paypal.CardFields &&
          cardNameRef.current &&
          cardNumberRef.current &&
          cardExpiryRef.current &&
          cardCvvRef.current
        ) {
          const cardFields = window.paypal.CardFields({
            createOrder,
            onApprove: async (data) => {
              const orderId = data.orderID ?? data.orderId;

              if (!orderId) {
                throw new Error("PayPal order id를 찾을 수 없습니다.");
              }

              await captureOrder(orderId);
            },
            onError: (sdkError) => {
              console.error("PayPal Card Fields error", sdkError);
              setError("PayPal 카드 결제 처리 중 오류가 발생했습니다.");
            },
          });

          if (cardFields.isEligible()) {
            cardFields.NameField().render(cardNameRef.current);
            cardFields.NumberField().render(cardNumberRef.current);
            cardFields.ExpiryField().render(cardExpiryRef.current);
            cardFields.CVVField().render(cardCvvRef.current);
            cardFieldsRef.current = cardFields;
            setCardEligible(true);
          }
        }

        setStatus("");
      })
      .catch((sdkError) => {
        console.error("PayPal checkout load/render failed", sdkError);
        setStatus("");
        setError("PayPal 결제 모듈을 준비하지 못했습니다.");
      });

    return () => {
      canceled = true;
    };
  }, [captureOrder, createOrder, currency, paypalClientId, productType, readingId]);

  async function submitCardFields() {
    if (!cardFieldsRef.current) {
      return;
    }

    setError("");
    setIsSubmittingCard(true);

    try {
      await cardFieldsRef.current.submit();
    } catch (submitError) {
      console.error("PayPal Card Fields submit failed", submitError);
      setError("카드 결제를 완료하지 못했습니다.");
    } finally {
      setIsSubmittingCard(false);
    }
  }

  return (
    <div className="mt-6 rounded-[2rem] border border-[#003087]/15 bg-[#f5f8ff] p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-ink">PayPal 카드로 결제하기</h3>
          <p className="mt-2 text-sm leading-6 text-ink/65">
            PayPal 결제창에서 카드 정보를 안전하게 처리합니다. 카드 번호와 CVV는 멍냥사주 서버에 저장되거나 전송되지 않습니다.
          </p>
        </div>
        <span className="rounded-full bg-[#003087] px-3 py-1 text-xs font-black text-white">
          PayPal
        </span>
      </div>

      {status && <p className="mt-4 text-sm font-semibold text-moss">{status}</p>}

      <div
        className={disabled ? "pointer-events-none opacity-50" : undefined}
        aria-disabled={disabled}
      >
        <div ref={buttonContainerRef} className="mt-4" />
      </div>

      {cardEligible && (
        <div className="mt-5 grid gap-3">
          <div className="grid gap-2">
            <span className="text-sm font-bold text-ink">카드 명의</span>
            <div ref={cardNameRef} className="min-h-12 rounded-2xl border border-berry/20 bg-white px-4 py-3" />
          </div>
          <div className="grid gap-2">
            <span className="text-sm font-bold text-ink">카드 번호</span>
            <div ref={cardNumberRef} className="min-h-12 rounded-2xl border border-berry/20 bg-white px-4 py-3" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <span className="text-sm font-bold text-ink">만료일</span>
              <div ref={cardExpiryRef} className="min-h-12 rounded-2xl border border-berry/20 bg-white px-4 py-3" />
            </div>
            <div className="grid gap-2">
              <span className="text-sm font-bold text-ink">CVV</span>
              <div ref={cardCvvRef} className="min-h-12 rounded-2xl border border-berry/20 bg-white px-4 py-3" />
            </div>
          </div>
          <button
            type="button"
            onClick={submitCardFields}
            disabled={disabled || isSubmittingCard}
            className="focus-ring mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#003087] px-6 py-3 text-sm font-black text-white transition hover:bg-[#00286f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PawDecoration />
            {isSubmittingCard ? "카드 결제 승인 중" : "카드로 결제하기"}
          </button>
        </div>
      )}

      {!cardEligible && !status && !error && (
        <p className="mt-4 text-sm leading-6 text-ink/60">
          현재 계정 또는 브라우저 환경에서는 PayPal 카드 필드가 표시되지 않아 PayPal 버튼만 사용할 수 있습니다.
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-2xl border border-berry/20 bg-berry/10 px-4 py-3 text-sm font-semibold leading-6 text-berry">
          {error}
        </p>
      )}
    </div>
  );
}

function PawDecoration() {
  return (
    <span aria-hidden className="mr-2 grid h-5 w-5 grid-cols-2 gap-0.5">
      <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
      <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
      <span className="col-span-2 mx-auto h-2.5 w-3.5 rounded-full bg-white/85" />
    </span>
  );
}
