import { NextResponse } from "next/server";
import { isDemoModeEnabled } from "@/lib/demo/config";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function hasEnv(...keys: string[]) {
  return keys.every((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function getRuntimeEnv() {
  return {
    nodeEnv: process.env.NODE_ENV ?? "development",
    vercelEnv: process.env.VERCEL_ENV ?? null,
  };
}

function getPaymentProviderStatus() {
  return {
    kakaopay: {
      configured: hasEnv(
        "KAKAOPAY_CLIENT_ID",
        "KAKAOPAY_SECRET_KEY",
        "KAKAOPAY_CID",
        "KAKAOPAY_BASE_URL",
        "NEXT_PUBLIC_SITE_URL",
      ),
    },
    paypal: {
      configured: hasEnv(
        "PAYPAL_CLIENT_ID",
        "PAYPAL_CLIENT_SECRET",
        "PAYPAL_BASE_URL",
        "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
        "NEXT_PUBLIC_SITE_URL",
      ),
    },
  };
}

async function checkDatabaseConnection() {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .limit(1);

    return !error;
  } catch (error) {
    console.error("Health check database connection failed", { error });
    return false;
  }
}

export async function GET() {
  const databaseConnected = await checkDatabaseConnection();

  return NextResponse.json(
    {
      status: "ok",
      env: getRuntimeEnv(),
      demoMode: isDemoModeEnabled(),
      database: {
        connected: databaseConnected,
      },
      paymentProviders: getPaymentProviderStatus(),
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
