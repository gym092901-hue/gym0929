import { PageShell } from "@/components/layout/PageShell";
import { PrimaryLink } from "@/components/ui/PrimaryLink";

type PaypalFailPageProps = {
  searchParams: Promise<{
    readingId?: string;
  }>;
};

export default async function PaypalFailPage({
  searchParams,
}: PaypalFailPageProps) {
  const { readingId } = await searchParams;
  const retryHref = readingId ? `/checkout/${readingId}` : "/input";

  return (
    <PageShell
      eyebrow="PayPal"
      title="페이팔 카드 결제가 완료되지 않았습니다"
      description="결제수단을 다시 확인하거나 다른 결제수단을 선택할 수 있습니다."
      narrow
    >
      <div className="warm-panel rounded-[2rem] p-6 sm:p-8">
        <PrimaryLink href={retryHref} tone="moss" className="w-full">
          결제 다시 시도하기
        </PrimaryLink>
      </div>
    </PageShell>
  );
}
