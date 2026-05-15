"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  clearAdminSessionCookie,
  hasAdminSession,
  setAdminSessionCookie,
  verifyAdminPassword,
} from "@/lib/admin/auth";
import { recordFailedPaymentRecheck } from "@/lib/admin/paymentRecheck";
import { regeneratePremiumReport } from "@/lib/admin/reports";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function adminReturnTo(formData: FormData) {
  const value = readString(formData, "returnTo");

  if (!value.startsWith("/admin")) {
    return "/admin";
  }

  return value;
}

function withNotice(returnTo: string, key: "message" | "error", value: string) {
  const url = new URL(returnTo, "http://admin.local");
  url.searchParams.set(key, value);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

async function assertAdminSession() {
  if (!(await hasAdminSession())) {
    redirect("/admin?error=session_required");
  }
}

export async function loginAdminAction(formData: FormData) {
  const password = readString(formData, "password");

  if (!verifyAdminPassword(password)) {
    redirect("/admin?error=invalid_password");
  }

  await setAdminSessionCookie();
  redirect("/admin");
}

export async function logoutAdminAction() {
  await clearAdminSessionCookie();
  redirect("/admin");
}

export async function recheckFailedPaymentAction(formData: FormData) {
  await assertAdminSession();

  const paymentId = readString(formData, "paymentId");
  const returnTo = adminReturnTo(formData);
  let target = withNotice(returnTo, "message", "payment_rechecked");

  try {
    await recordFailedPaymentRecheck(paymentId);
    revalidatePath("/admin");
  } catch (error) {
    console.error("Admin payment recheck failed", { paymentId, error });
    target = withNotice(returnTo, "error", "payment_recheck_failed");
  }

  redirect(target);
}

export async function regeneratePremiumReportAction(formData: FormData) {
  await assertAdminSession();

  const readingId = readString(formData, "readingId");
  const returnTo = adminReturnTo(formData);
  let target = withNotice(returnTo, "message", "premium_report_regenerated");

  try {
    await regeneratePremiumReport(readingId);
    revalidatePath("/admin");
    revalidatePath(`/result/premium/${readingId}`);
  } catch (error) {
    console.error("Admin premium report regeneration failed", {
      readingId,
      error,
    });
    target = withNotice(returnTo, "error", "premium_report_regenerate_failed");
  }

  redirect(target);
}
