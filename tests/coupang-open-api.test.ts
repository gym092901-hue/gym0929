import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  buildCoupangAuthorizationHeader,
  formatCoupangSignedDate,
  getCoupangConfigStatus
} from "@/lib/coupang/open-api";
import { normalizeSellerProductId } from "@/lib/services/coupang-service";

describe("Coupang Open API signing", () => {
  it("formats signed-date in Coupang's yyMMddTHHmmssZ form", () => {
    expect(formatCoupangSignedDate(new Date(Date.UTC(2026, 4, 12, 0, 1, 2)))).toBe("260512T000102Z");
  });

  it("builds a deterministic HMAC authorization header", () => {
    const signedDate = "260512T000102Z";
    const path = "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products/123";
    const queryString = "vendorId=A00474586";
    const signature = createHmac("sha256", "secret")
      .update(`${signedDate}GET${path}${queryString}`)
      .digest("hex");

    expect(
      buildCoupangAuthorizationHeader({
        method: "GET",
        path,
        queryString,
        accessKey: "access",
        secretKey: "secret",
        signedDate
      })
    ).toBe(`CEA algorithm=HmacSHA256, access-key=access, signed-date=${signedDate}, signature=${signature}`);
  });
});

describe("Coupang Open API config", () => {
  it("reports missing environment variables", () => {
    expect(getCoupangConfigStatus({}).missing).toEqual([
      "COUPANG_ACCESS_KEY",
      "COUPANG_SECRET_KEY",
      "COUPANG_VENDOR_ID"
    ]);
  });

  it("accepts numeric sellerProductId values only", () => {
    expect(normalizeSellerProductId(" 12345 ")).toBe("12345");
    expect(() => normalizeSellerProductId("https://www.coupang.com/vp/products/1")).toThrow("숫자만");
  });
});
