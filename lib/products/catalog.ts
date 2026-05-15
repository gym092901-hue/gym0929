import type { ProductType } from "@/types/database";

export type ProductCatalogItem = {
  productType: ProductType;
  name: string;
  price: number;
  currency: string;
  description: string;
  includedItems: string[];
  prerequisite?: ProductType;
};

export const productCatalog: Record<ProductType, ProductCatalogItem> = {
  premium_report: {
    productType: "premium_report",
    name: "우리 아이 심층 사주 리포트",
    price: 4900,
    currency: "KRW",
    description: "오행 기질, 관계 흐름, 루틴 조언을 담은 기본 유료 리포트",
    includedItems: [
      "성향 심층 분석",
      "오행 밸런스",
      "보호자와의 관계 해석",
      "올해의 흐름",
      "생활 루틴 조언",
    ],
  },
  guardian_match: {
    productType: "guardian_match",
    name: "보호자와 우리 아이 궁합 리포트",
    price: 2900,
    currency: "KRW",
    description: "보호자와 반려동물의 관계 스타일을 다정하게 읽는 추가 리포트",
    includedItems: [
      "보호자와 아이의 관계 성향",
      "애착 방식 해석",
      "서로 편해지는 소통법",
      "갈등을 줄이는 루틴",
      "함께 깊어지는 조언",
    ],
  },
  two_pet_match: {
    productType: "two_pet_match",
    name: "두 마리 궁합 리포트",
    price: 5900,
    currency: "KRW",
    description: "두 반려동물의 관계 흐름과 생활 공간 조율 포인트",
    includedItems: [
      "두 아이의 기질 차이",
      "놀이와 거리감 해석",
      "공간 분리 조언",
      "함께 지내는 루틴",
      "관계 관찰 포인트",
    ],
  },
  yearly_fortune: {
    productType: "yearly_fortune",
    name: "2026년 연간 흐름 리포트",
    price: 3900,
    currency: "KRW",
    description: "2026년의 계절별 생활 흐름과 월별 조언",
    includedItems: [
      "2026년 전체 흐름",
      "계절별 생활 포인트",
      "월별 조언",
      "놀이와 휴식 리듬",
      "보호자를 위한 체크리스트",
    ],
  },
  pdf_report: {
    productType: "pdf_report",
    name: "PDF 소장본",
    price: 1000,
    currency: "KRW",
    description: "심층 리포트를 보관하기 좋은 PDF 다운로드 추가 상품",
    includedItems: [
      "표지",
      "반려동물 정보",
      "한 장 요약 카드",
      "오행 밸런스",
      "전체 심층 리포트",
      "생성일",
    ],
    prerequisite: "premium_report",
  },
};

export const productTypes = Object.keys(productCatalog) as ProductType[];

export function isProductType(value: unknown): value is ProductType {
  return typeof value === "string" && value in productCatalog;
}

export function getProductCatalogItem(productType: ProductType) {
  return productCatalog[productType];
}

export function getProductResultUrl(readingId: string, productType: ProductType) {
  if (productType === "premium_report") {
    return `/result/premium/${readingId}`;
  }

  if (productType === "pdf_report") {
    return `/result/premium/${readingId}`;
  }

  return `/result/addon/${readingId}/${productType}`;
}
