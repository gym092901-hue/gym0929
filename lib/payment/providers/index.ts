import { kakaoPayProvider } from "@/lib/payment/providers/kakaoPay";
import { mockPaymentProvider } from "@/lib/payment/providers/mock";
import { paypalProvider } from "@/lib/payment/providers/paypal";
import type {
  PaymentProvider,
  PaymentProviderAdapter,
} from "@/lib/payment/types";

const providers: Record<PaymentProvider, PaymentProviderAdapter> = {
  kakaopay: kakaoPayProvider,
  paypal: paypalProvider,
  mock: mockPaymentProvider,
};

export function getPaymentProvider(provider: PaymentProvider) {
  return providers[provider];
}
