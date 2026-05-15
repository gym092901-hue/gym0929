import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { DemoPremiumDirectButton } from "@/components/demo/DemoPremiumDirectButton";
import { FreeReadingExplorer } from "@/components/report/FreeReadingExplorer";
import { PrimaryLink } from "@/components/ui/PrimaryLink";
import { isDemoModeEnabled } from "@/lib/demo/config";
import { postposition } from "@/lib/korean/postposition";
import { getProductCatalogItem } from "@/lib/products/catalog";
import { getReading, getSpeciesLabel } from "@/lib/readings";

type FreeResultPageProps = {
  params: Promise<{
    readingId: string;
  }>;
};

export default async function FreeResultPage({ params }: FreeResultPageProps) {
  const { readingId } = await params;
  const demoModeEnabled = isDemoModeEnabled();

  const reading = await getReading(readingId);

  if (!reading) {
    notFound();
  }

  const petPossessive = postposition.possessive(reading.petName);
  const petObject = postposition.object(reading.petName);
  const freeCards = reading.freeSections.slice(0, 5);
  const headlineTitle = `${petPossessive} 한 줄 성향`;
  const premiumCtaText = `${reading.petName} 심층 리포트 보기`;
  const premiumProduct = getProductCatalogItem("premium_report");
  const premiumPrice = premiumProduct.price.toLocaleString("ko-KR");
  const lockedItems = [
    "오행 밸런스 전체 분석",
    "예민해지기 쉬운 상황",
    "보호자에게 사랑을 표현하는 방식",
    "올해의 흐름",
    "월별 생활 체크리스트",
    "PDF 소장본 추가 옵션",
  ];

  return (
    <PageShell
      eyebrow="무료 사주 맛보기"
      title={`${petPossessive} 무료 사주 맛보기`}
      description="한국식 사주와 오행 콘셉트를 반려동물 성향 콘텐츠로 풀어낸 무료 결과입니다. 한 줄 성향부터 보호자와의 교감, 생활 루틴 조언까지 카드로 가볍게 확인해보세요."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="warm-panel rounded-[2rem] p-5 sm:p-8">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-persimmon/10 px-4 py-2 text-sm font-bold text-persimmon">
              {getSpeciesLabel(reading.species)}
            </span>
            <span className="rounded-full bg-moss/10 px-4 py-2 text-sm font-bold text-moss">
              만난 날 {reading.metDate || "미입력"}
            </span>
            <span className="rounded-full bg-berry/10 px-4 py-2 text-sm font-bold text-berry">
              태어난 시간 {reading.birthTime ?? "모름"}
            </span>
          </div>

          <div className="mt-7 grid gap-5 rounded-[2rem] border border-berry/10 bg-white/60 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="grid h-24 w-24 place-items-center rounded-[2rem] bg-berry/10 text-3xl font-black text-berry shadow-soft">
              {reading.species === "dog" ? "멍" : "냥"}
            </div>
            <div>
              <p className="text-sm font-black text-persimmon">
                오늘의 미니 리딩
              </p>
              <h2 className="mt-1 break-keep text-2xl font-black text-ink">
                {headlineTitle}
              </h2>
              <p className="mt-3 text-base leading-8 text-ink/75">
                {freeCards[0]?.body ??
                  `${reading.petName}의 무료 사주 결과를 카드별로 정리했어요.`}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <FreeReadingExplorer
              petName={reading.petName}
              sections={freeCards.slice(1)}
            />
          </div>
        </section>

        <aside className="h-fit rounded-[2rem] border border-moss/20 bg-moss/10 p-5 sm:p-6 lg:sticky lg:top-6">
          <div className="rounded-[1.5rem] bg-white/85 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-moss">심층 리포트</p>
                <h2 className="mt-2 break-keep text-xl font-black text-ink">
                  {petObject} 더 깊게 이해하는 리포트
                </h2>
              </div>
              <div className="shrink-0 rounded-2xl bg-berry/10 px-4 py-3 text-right">
                <p className="text-xs font-black text-berry">가격</p>
                <p className="mt-1 text-2xl font-black text-berry">
                  {premiumPrice}원
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-6 text-ink/70">
              무료 결과에서 보인 오행 흐름을 바탕으로 실제 생활에서 알아차리기
              좋은 신호를 더 자세히 풀어드립니다.
            </p>

            <div className="mt-5 rounded-[1.25rem] border border-berry/10 bg-cream/65 p-4">
              <p className="text-sm font-black text-ink">결제 후 열리는 내용</p>
              <ul className="mt-3 grid gap-2">
                {lockedItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 rounded-2xl bg-white/75 px-3 py-2 text-sm font-bold text-ink/70"
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink/5 text-xs text-ink/45">
                      잠금
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <PrimaryLink
            href={`/checkout/${reading.id}?productType=premium_report`}
            className="mt-6 w-full"
          >
            {premiumCtaText}
          </PrimaryLink>
          <p className="mt-3 text-center text-xs font-semibold leading-5 text-ink/50">
            결제 후 즉시 열람할 수 있어요.
          </p>
          <p className="mt-4 rounded-2xl border border-moss/20 bg-white/65 px-4 py-3 text-sm font-semibold leading-6 text-ink/60">
            무서운 예언이 아니라 반려생활을 더 다정하게 이해하기 위한
            콘텐츠입니다.
          </p>

          {demoModeEnabled ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-center">
                <span className="rounded-full bg-berry/10 px-3 py-1 text-xs font-black text-berry">
                  데모 검수용
                </span>
              </div>
              <DemoPremiumDirectButton readingId={reading.id} />
            </div>
          ) : null}
        </aside>
      </div>
    </PageShell>
  );
}
