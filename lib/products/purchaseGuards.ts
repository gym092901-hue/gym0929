import "server-only";

import { checkPaymentAccess } from "@/lib/payment/checkPaymentAccess";
import { getProductCatalogItem } from "@/lib/products/catalog";
import type { ProductType } from "@/types/database";

export async function ensureProductPurchaseAllowed(
  readingId: string,
  productType: ProductType,
) {
  const product = getProductCatalogItem(productType);

  if (!product.prerequisite) {
    return {
      allowed: true,
      message: null,
    };
  }

  const access = await checkPaymentAccess(readingId, product.prerequisite);

  if (access.hasAccess) {
    return {
      allowed: true,
      message: null,
    };
  }

  const prerequisite = getProductCatalogItem(product.prerequisite);

  return {
    allowed: false,
    message:
      product.price === 0
        ? `${product.name}은 ${prerequisite.name} 결제 후 이용할 수 있습니다.`
        : `${product.name}은 ${prerequisite.name} 결제 후 구매할 수 있습니다.`,
  };
}
