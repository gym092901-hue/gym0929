import { postposition } from "@/lib/korean/postposition";
import { getProductCatalogItem } from "@/lib/products/catalog";
import type { ProductType } from "@/types/database";

export function createPlaceholderReport({
  petName,
  productType,
}: {
  petName: string;
  productType: Exclude<ProductType, "premium_report" | "pdf_report">;
}) {
  const product = getProductCatalogItem(productType);

  return [
    {
      title: `${product.name} 준비 중`,
      body: `${postposition.object(petName)} 위한 ${product.name} 콘텐츠가 열렸습니다. 현재는 결제와 접근 제어 구조를 먼저 붙인 단계라, 이 영역에는 간단한 placeholder가 표시됩니다.`,
    },
    {
      title: "포함 예정 내용",
      body: product.includedItems.map((item) => `- ${item}`).join("\n"),
    },
    {
      title: "다음 구현 방향",
      body: "이후 단계에서 premium_report처럼 전용 생성 엔진을 붙이면, 상품별로 독립적인 리포트를 저장하고 다시 조회할 수 있습니다.",
    },
  ];
}
