import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "mn_admin_session";
const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 8;
const ADMIN_COOKIE_PATH = "/";

function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD;
  return password && password.trim().length > 0 ? password : null;
}

function hashAdminValue(value: string) {
  return createHash("sha256")
    .update(`meongnyang-admin:${value}`)
    .digest("hex");
}

function getExpectedSessionToken() {
  const password = getAdminPassword();
  return password ? hashAdminValue(password) : null;
}

export function isAdminPasswordConfigured() {
  return Boolean(getAdminPassword());
}

export function verifyAdminPassword(input: string) {
  const password = getAdminPassword();

  if (!password) {
    return false;
  }

  const expected = Buffer.from(hashAdminValue(password));
  const actual = Buffer.from(hashAdminValue(input));

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function hasAdminSession() {
  const expectedToken = getExpectedSessionToken();

  if (!expectedToken) {
    return false;
  }

  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE_NAME)?.value === expectedToken;
}

export async function setAdminSessionCookie() {
  const expectedToken = getExpectedSessionToken();

  if (!expectedToken) {
    throw new Error("ADMIN_PASSWORD is not configured.");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, expectedToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_COOKIE_MAX_AGE,
    path: ADMIN_COOKIE_PATH,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  const clearOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  } as const;

  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    ...clearOptions,
    path: ADMIN_COOKIE_PATH,
  });
  cookieStore.set(ADMIN_COOKIE_NAME, "", {
    ...clearOptions,
    path: "/admin",
  });
}
