import { describe, expect, it } from "vitest";
import { normalizeProductUrl } from "@/lib/utils/url";

describe("normalizeProductUrl", () => {
  it("adds https when a pasted product URL has no protocol", () => {
    expect(normalizeProductUrl("smartstore.naver.com/store/products/123")).toBe(
      "https://smartstore.naver.com/store/products/123"
    );
  });

  it("keeps valid https URLs", () => {
    expect(normalizeProductUrl("https://example.com/item?x=1")).toBe("https://example.com/item?x=1");
  });

  it("extracts src from pasted iframe snippets", () => {
    expect(
      normalizeProductUrl(
        '<iframe src="https://coupa.ng/cmPYDP" width="120" height="240" frameborder="0"></iframe>'
      )
    ).toBe("https://coupa.ng/cmPYDP");
  });

  it("rejects non-web protocols", () => {
    expect(() => normalizeProductUrl("javascript:alert(1)")).toThrow("http 또는 https");
  });
});
