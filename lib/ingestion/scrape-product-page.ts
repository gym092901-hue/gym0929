export type ScrapedImage = {
  url: string;
  altText?: string;
  width?: number;
  height?: number;
};

export type ScrapedLink = {
  url: string;
  label: string;
};

export type ScrapedPage = {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  html: string;
  text: string;
  images: ScrapedImage[];
  links: ScrapedLink[];
  metadata: Record<string, string>;
};

const MAX_TEXT_LENGTH = 60_000;
const MAX_HTML_LENGTH = 500_000;

export class ProductPageBlockedError extends Error {
  constructor(hostname: string, requestedUrl?: string, finalUrl?: string) {
    super(buildBlockedMessage(hostname, requestedUrl, finalUrl));
    this.name = "ProductPageBlockedError";
  }
}

export async function scrapeProductPage(url: string): Promise<ScrapedPage> {
  let page: ScrapedPage;
  try {
    page = await scrapeWithPlaywright(url);
  } catch (error) {
    page = await scrapeWithFetch(url, error instanceof Error ? error.message : String(error));
  }
  assertProductPageIsUsable(page);
  return page;
}

async function scrapeWithPlaywright(url: string): Promise<ScrapedPage> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1365, height: 1800 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);

    const result = await page.evaluate(() => {
      const absoluteUrl = (value: string | null) => {
        if (!value) return "";
        try {
          return new URL(value, location.href).href;
        } catch {
          return "";
        }
      };

      const metadata: Record<string, string> = {};
      document.querySelectorAll("meta").forEach((meta) => {
        const key = meta.getAttribute("property") || meta.getAttribute("name");
        const value = meta.getAttribute("content");
        if (key && value) metadata[key] = value;
      });

      const images = Array.from(document.images)
        .map((image) => ({
          url: absoluteUrl(image.currentSrc || image.src),
          altText: image.alt || undefined,
          width: image.naturalWidth || image.width || undefined,
          height: image.naturalHeight || image.height || undefined
        }))
        .filter((image) => image.url)
        .slice(0, 80);

      const links = Array.from(document.querySelectorAll("a[href]"))
        .map((anchor) => ({
          url: absoluteUrl(anchor.getAttribute("href")),
          label: (anchor.textContent || anchor.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ")
        }))
        .filter((link) => link.url)
        .slice(0, 120);

      return {
        finalUrl: location.href,
        title: document.title || metadata["og:title"] || "",
        html: document.documentElement.outerHTML,
        text: document.body.innerText || "",
        images,
        links,
        metadata
      };
    });

    return {
      requestedUrl: url,
      finalUrl: result.finalUrl,
      title: cleanText(result.title),
      html: result.html.slice(0, MAX_HTML_LENGTH),
      text: cleanText(result.text).slice(0, MAX_TEXT_LENGTH),
      images: dedupeByUrl(result.images),
      links: dedupeByUrl(result.links),
      metadata: result.metadata
    };
  } finally {
    await browser.close();
  }
}

async function scrapeWithFetch(url: string, reason: string): Promise<ScrapedPage> {
  const response = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
    }
  });
  const html = await response.text();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return {
    requestedUrl: url,
    finalUrl: response.url || url,
    title: cleanText(decodeEntities(title)),
    html: html.slice(0, MAX_HTML_LENGTH),
    text: `${cleanText(decodeEntities(text)).slice(0, MAX_TEXT_LENGTH)}\n\n수집 참고: Playwright 실패 후 fetch fallback 사용 (${reason})`,
    images: extractImagesFromHtml(html, response.url || url),
    links: extractLinksFromHtml(html, response.url || url),
    metadata: {}
  };
}

function extractImagesFromHtml(html: string, baseUrl: string): ScrapedImage[] {
  const images: ScrapedImage[] = [];
  const matches = html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
  for (const match of matches) {
    const url = toAbsoluteUrl(match[1], baseUrl);
    if (url) images.push({ url });
  }
  return dedupeByUrl(images).slice(0, 80);
}

function extractLinksFromHtml(html: string, baseUrl: string): ScrapedLink[] {
  const links: ScrapedLink[] = [];
  const matches = html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
  for (const match of matches) {
    const url = toAbsoluteUrl(match[1], baseUrl);
    if (url) links.push({ url, label: cleanText(match[2].replace(/<[^>]+>/g, " ")) });
  }
  return dedupeByUrl(links).slice(0, 120);
}

function toAbsoluteUrl(value: string, baseUrl: string): string {
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return "";
  }
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function dedupeByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

export function isBlockedProductPage(page: Pick<ScrapedPage, "title" | "text" | "html" | "finalUrl">): boolean {
  const haystack = `${page.title}\n${page.text}\n${page.html}\n${page.finalUrl}`.toLowerCase();
  return [
    "access denied",
    "you don't have permission to access",
    "errors.edgesuite.net",
    "akamai",
    "captcha",
    "robot or human",
    "unusual traffic",
    "403 forbidden"
  ].some((signal) => haystack.includes(signal));
}

function assertProductPageIsUsable(page: ScrapedPage) {
  if (!isBlockedProductPage(page)) {
    return;
  }
  const hostname = new URL(page.finalUrl || page.requestedUrl).hostname;
  throw new ProductPageBlockedError(hostname, page.requestedUrl, page.finalUrl);
}

function buildBlockedMessage(hostname: string, requestedUrl?: string, finalUrl?: string): string {
  const isCoupang =
    hostname.endsWith("coupang.com") ||
    hostname.endsWith("coupangcorp.com") ||
    Boolean(requestedUrl && new URL(requestedUrl).hostname.endsWith("coupang.com")) ||
    Boolean(finalUrl && new URL(finalUrl).hostname.endsWith("coupang.com"));

  if (!isCoupang) {
    return `${hostname}에서 자동 수집 요청을 차단했습니다. URL 형식은 맞지만 현재 이 상세페이지는 직접 수집할 수 없습니다.`;
  }

  return [
    "쿠팡 공개 상세페이지가 자동 수집 요청을 차단했습니다.",
    "link.coupang.com 단축 링크는 최종 상품 페이지로 이동은 되지만 상세페이지 본문, 이미지, 가격을 안정적으로 읽을 수 없습니다.",
    "판매자 상품이면 WING Open API의 sellerProductId로 조회하세요."
  ].join(" ");
}
