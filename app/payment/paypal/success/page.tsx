import { PageShell } from "@/components/layout/PageShell";
import { PrimaryLink } from "@/components/ui/PrimaryLink";

type PaymentSuccessPageProps = {
  searchParams: Promise<{
    readingId?: string;
  }>;
};

export default async function PaypalSuccessPage({
  searchParams,
}: PaymentSuccessPageProps) {
  const { readingId } = await searchParams;
  const retryHref = readingId ? `/checkout/${readingId}` : "/input";

  return (
    <PageShell
      eyebrow="PayPal"
      title="PayPal 결제 확인이 필요합니다"
      description="PayPal 결제 승인은 checkout 페이지의 PayPal SDK onApprove 흐름에서 서버 capture API로 처리됩니다."
      narrow
    >
      <div className="warm-panel rounded-[2rem] p-6 sm:p-8">
        <p className="text-base leading-7 text-ink/70">
          이 페이지는 예비 안내 화면입니다. 실제 결제 완료 처리는
          /api/payments/paypal/capture-order에서 서버 검증 후 진행됩니다.
        </p>
        <PrimaryLink href={retryHref} tone="moss" className="mt-5 w-full">
          결제 화면으로 돌아가기
        </PrimaryLink>
      </div>
    </PageShell>
  );
}
