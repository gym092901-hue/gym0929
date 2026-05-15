import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PetElementBalance } from "@/components/report/PetElementBalance";
import { PdfDownloadButton } from "@/components/report/PdfDownloadButton";
import { PrimaryLink } from "@/components/ui/PrimaryLink";
import { isDemoModeEnabled, isDemoReadingId } from "@/lib/demo/config";
import { checkPaymentAccess } from "@/lib/payment/checkPaymentAccess";
import { getProductCatalogItem } from "@/lib/products/catalog";
import { getOrCreatePremiumReading } from "@/lib/readings";
import { calculatePetFiveElements } from "@/lib/saju/petSajuEngine";

type PremiumResultPageProps = {
  params: Promise<{
    readingId: string;
  }>;
};

export default async function PremiumResultPage({
  params,
}: PremiumResultPageProps) {
  const { readingId } = await params;

  if (isDemoReadingId(readingId) && !isDemoModeEnabled()) {
    notFound();
  }

  const premiumAccess = await checkPaymentAccess(readingId, "premium_report");

  if (!premiumAccess.hasAccess) {
    redirect(`/checkout/${readingId}?productType=premium_report`);
  }

  const reading = await getOrCreatePremiumReading(readingId);

  if (!reading) {
    notFound();
  }

  const pdfAccess = await checkPaymentAccess(reading.id, "pdf_report");
  const pdfProduct = getProductCatalogItem("pdf_report");
  const pdfPrice = pdfProduct.price.toLocaleString("ko-KR");
  const demoModeEnabled = isDemoModeEnabled();
  const elementProfile = calculatePetFiveElements({
    name: reading.petName,
    type: reading.species,
    birthDate: reading.birthDate || reading.metDate || null,
    birthTime: reading.birthTime,
    birthTimeUnknown: !reading.birthTime,
    adoptionDate: reading.metDate || null,
  });

  return (
    <PageShell
      eyebrow="프리미엄 리포트"
      title={`${reading.petName}의 심층 사주 리포트`}
      description="서버에서 approved 결제 내역을 확인한 뒤 열리는 심층 리포트입니다. 모든 내용은 규칙 기반 엔진으로 생성되며, 반려동물을 더 다정하게 이해하기 위한 엔터테인먼트 콘텐츠입니다."
    >
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="h-fit rounded-[2rem] border border-berry/10 bg-white/70 p-5 lg:sticky lg:top-6">
          <div className="grid place-items-center rounded-[1.5rem] bg-berry/10 p-6 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-[1.5rem] bg-white text-2xl font-black text-berry shadow-soft">
              {reading.species === "dog" ? "멍" : "냥"}
            </div>
            <h2 className="mt-4 text-xl font-black text-ink">
              {reading.petName}
            </h2>
            <p className="mt-1 text-sm font-semibold text-ink/55">
              {reading.metDate || reading.birthDate} 기준 리포트
            </p>
          </div>

          <nav className="mt-5" aria-label="프리미엄 리포트 목차">
            <p className="text-sm font-black uppercase text-persimmon">
              심층 리포트 목차
            </p>
            <ol className="mt-3 grid grid-cols-1 gap-3">
              {reading.premiumSections.map((section, index) => {
                const sectionId = `premium-section-${index + 1}`;

                return (
                  <li key={`${section.title}-${index}`} className="min-w-0">
                    <a
                      href={`#${sectionId}`}
                      className="focus-ring group flex w-full items-start gap-3 rounded-2xl border border-berry/10 bg-cream/70 px-4 py-3 text-left transition hover:border-berry/35 hover:bg-white"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-berry shadow-sm transition group-hover:bg-berry group-hover:text-white">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 whitespace-normal break-keep text-sm font-black leading-5 text-ink/75 group-hover:text-berry">
                        {section.title}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="mt-5 rounded-[1.75rem] border border-moss/20 bg-moss/10 p-4">
            <div className="rounded-[1.25rem] bg-white/85 p-4">
              <p className="text-sm font-black text-moss">
                심층 리포트 구매자 전용
              </p>
              <h3 className="mt-2 break-keep text-xl font-black leading-tight text-ink">
                PDF 소장본으로 오래 보관하기
              </h3>
              <p className="mt-3 text-sm leading-6 text-ink/65">
                웹에서 보는 심층 리포트를 표지와 요약 카드가 포함된 PDF 파일로
                정리해 소장할 수 있습니다.
              </p>
              <div className="mt-4 rounded-2xl bg-moss/10 px-4 py-3">
                <p className="text-xs font-black text-moss">추가 상품 가격</p>
                <p className="mt-1 text-2xl font-black text-ink">
                  PDF 소장본 추가 {pdfPrice}원
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm font-black text-ink">포함 내용</p>
              <ul className="mt-3 grid gap-2 text-sm font-semibold text-ink/70">
                {pdfProduct.includedItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 rounded-2xl bg-white/70 px-3 py-2"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-moss/15 text-xs font-black text-moss">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {pdfAccess.hasAccess ? (
              <div className="mt-4">
                <PdfDownloadButton
                  readingId={reading.id}
                  petName={reading.petName}
                  label="PDF 다운로드"
                />
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <PrimaryLink
                  href={`/checkout/${reading.id}?productType=pdf_report`}
                  tone="moss"
                  className="w-full"
                >
                  PDF 소장본 추가 {pdfPrice}원
                </PrimaryLink>
                {demoModeEnabled ? (
                  <PdfDownloadButton
                    readingId={reading.id}
                    petName={reading.petName}
                    label="데모 PDF 미리보기"
                    loadingLabel="데모 PDF 준비 중"
                    tone="light"
                    demoPreview
                  />
                ) : null}
              </div>
            )}
          </div>
        </aside>

        <div className="grid gap-5">
          <PetElementBalance
            petName={reading.petName}
            species={reading.species}
            scores={elementProfile.scores}
          />

          {reading.premiumSections.map((section, index) => (
            <article
              id={`premium-section-${index + 1}`}
              key={`${section.title}-${index}`}
              className="warm-panel scroll-mt-28 rounded-[2rem] p-5 sm:scroll-mt-32 sm:p-7"
            >
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-persimmon/10 text-sm font-black text-persimmon">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-sm font-black uppercase text-persimmon">
                    심층 해석
                  </p>
                  <h2 className="mt-1 text-2xl font-black leading-tight text-ink">
                    {section.title}
                  </h2>
                </div>
              </div>
              <p className="mt-5 whitespace-pre-line text-base leading-8 text-ink/75">
                {section.body}
              </p>
            </article>
          ))}

          <div className="rounded-[2rem] border border-moss/20 bg-white/60 p-5">
            <p className="text-sm leading-6 text-ink/70">
              이 리포트는 반려생활 이해를 위한 엔터테인먼트 콘텐츠입니다. 질병,
              수명, 사고 예언이나 치료 조언을 제공하지 않습니다.
            </p>
            <PrimaryLink href="/input" tone="moss" className="mt-5">
              다른 아이도 보기
            </PrimaryLink>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
