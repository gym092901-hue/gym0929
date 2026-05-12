import { NextResponse } from "next/server";
import { getCoupangConfigStatus } from "@/lib/coupang/open-api";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getCoupangConfigStatus());
}
