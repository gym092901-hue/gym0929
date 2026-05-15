import { PageShell } from "@/components/layout/PageShell";
import { PrimaryLink } from "@/components/ui/PrimaryLink";
import { updatePaymentStatus } from "@/lib/payment/updatePaymentStatus";

type KakaoCancelPageProps = {
  searchParams: Promise<{
    paymentId?: string;
    readingId?: string;
  }>;
};

export default async function KakaoCancelPage({
  searchParams,
}: KakaoCancelPageProps) {
  const { paymentId, readingId } = await searchParams;
  const retryHref = readingId ? `/checkout/${readingId}` : "/input";
  const freeResultHref = readingId ? `/result/free/${readingId}` : "/input";

  if (paymentId && readingId) {
    try {
      await updatePaymentStatus({
        paymentId,
        readingId,
        status: "canceled",
        rawResponse: {
          cancel: {
            provider: "kakaopay",
            reason: "redirected_to_cancel_url",
          },
        },
      });
    } catch (error) {
      console.error("KakaoPay cancel status update failed", {
        paymentId,
        readingId,
        error,
      });
    }
  }

  return (
    <PageShell
      eyebrow="KakaoPay"
      title="카카오페이 결제가 취소되었습니다"
      description="결제를 취소해도 무료 맛보기 결과는 계속 확인할 수 있습니다."
      narrow
    >
      <div className="warm-panel rounded-[2rem] p-6 sm:p-8">
        <div className="grid gap-3 sm:grid-cols-2">
          <PrimaryLink href={retryHref} className="w-full">
            다시 결제하기
          </PrimaryLink>
          <PrimaryLink href={freeResultHref} tone="light" className="w-full">
            무료 결과로 돌아가기
          </PrimaryLink>
        </div>
      </div>
    </PageShell>
  );
}
