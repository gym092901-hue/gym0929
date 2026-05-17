import { notFound, redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { PrimaryLink } from "@/components/ui/PrimaryLink";
import { postposition } from "@/lib/korean/postposition";
import { checkPaymentAccess } from "@/lib/payment/checkPaymentAccess";
import { getProductCatalogItem, isProductType } from "@/lib/products/catalog";
import { createPlaceholderReport } from "@/lib/products/placeholderReports";
import { getReading } from "@/lib/readings";
import type { ProductType } from "@/types/database";

type AddonResultPageProps = {
  params: Promise<{
    readingId: string;
    productType: string;
  }>;
};

type AddonProductType = Exclude<ProductType, "premium_report" | "pdf_report">;

function isAddonProductType(value: string): value is AddonProductType {
  return (
    isProductType(value) &&
    value !== "premium_report" &&
    value !== "pdf_report"
  );
}

export default async function AddonResultPage({ params }: AddonResultPageProps) {
  const { readingId, productType } = await params;

  if (!isAddonProductType(productType)) {
    notFound();
  }

  const access = await checkPaymentAccess(readingId, productType);

  if (!access.hasAccess) {
    redirect(`/checkout/${readingId}?productType=${productType}`);
  }

  const reading = await getReading(readingId);

  if (!reading) {
    notFound();
  }

  const product = getProductCatalogItem(productType);
  const petNamePossessive = postposition.possessive(reading.petName);
  const sections = createPlaceholderReport({
    petName: reading.petName,
    productType,
  });

  return (
    <PageShell
      eyebrow="추가 리포트"
      title={`${petNamePossessive} ${product.name}`}
      description="추가 리포트 엔진이 연결될 자리입니다. 현재는 상품별 결제와 접근 제어 흐름을 확인할 수 있는 placeholder를 보여줍니다."
      mascotType={reading.species}
    >
      <div className="grid gap-5">
        {sections.map((section, index) => (
          <article key={section.title} className="warm-panel rounded-[2rem] p-5 sm:p-7">
            <p className="text-sm font-black text-persimmon">
              추가 해석 {String(index + 1).padStart(2, "0")}
            </p>
            <h2 className="mt-2 text-2xl font-black text-ink">{section.title}</h2>
            <p className="mt-4 whitespace-pre-line text-base leading-8 text-ink/75">
              {section.body}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-[2rem] border border-moss/20 bg-white/60 p-5">
        <p className="text-sm leading-6 text-ink/70">
          이 결과는 결제 상품별 접근 제어를 위한 임시 화면입니다. 다음 단계에서 각 상품에 맞춘 전용 리포트 생성기를 붙이면 됩니다.
        </p>
        <PrimaryLink href={`/result/free/${readingId}`} tone="moss" className="mt-5">
          무료 결과로 돌아가기
        </PrimaryLink>
      </div>
    </PageShell>
  );
}
