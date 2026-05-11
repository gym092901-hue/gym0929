export function normalizeProductUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("상품 URL을 입력하세요.");
  }

  const withoutSpaces = trimmed.replace(/\s+/g, "");
  const withProtocol = withoutSpaces.startsWith("//")
    ? `https:${withoutSpaces}`
    : /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(withoutSpaces)
      ? withoutSpaces
      : `https://${withoutSpaces}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("올바른 상품 URL을 입력하세요.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("http 또는 https 상품 URL만 사용할 수 있습니다.");
  }

  if (!parsed.hostname.includes(".")) {
    throw new Error("상품 URL의 도메인을 확인하세요.");
  }

  return parsed.toString();
}
