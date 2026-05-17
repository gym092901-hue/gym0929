import "server-only";

import { isProductionRuntime } from "@/lib/demo/config";

const blockedProductionHosts = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
]);

function isDisallowedTunnelHost(hostname: string) {
  return hostname === "loca.lt" || hostname.endsWith(".loca.lt");
}

function isBlockedProductionHost(hostname: string) {
  return (
    blockedProductionHosts.has(hostname) ||
    isDisallowedTunnelHost(hostname) ||
    hostname === "localtunnel.me" ||
    hostname.endsWith(".localtunnel.me")
  );
}

export function getSiteUrl() {
  const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!rawSiteUrl) {
    return null;
  }

  let siteUrl: URL;

  try {
    siteUrl = new URL(rawSiteUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an absolute URL.");
  }

  if (isProductionRuntime()) {
    if (siteUrl.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_SITE_URL must use https in production.");
    }

    if (isBlockedProductionHost(siteUrl.hostname)) {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL must be a Vercel production URL or custom domain in production.",
      );
    }
  }

  return siteUrl.toString().replace(/\/$/, "");
}

export function getRequiredSiteUrl() {
  const siteUrl = getSiteUrl();

  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required.");
  }

  return siteUrl;
}

export function isSiteUrlConfigured() {
  try {
    return Boolean(getSiteUrl());
  } catch {
    return false;
  }
}
