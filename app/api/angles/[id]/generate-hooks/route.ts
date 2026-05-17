import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AngleRow = {
  id: string;
};

function createFallbackHooks(id: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${id}-hook-${index + 1}`,
    text:
      index === 0
        ? "\uCC98\uC74C \uC77D\uB294 \uC21C\uAC04 \uBC14\uB85C \uACF5\uAC10\uD560 \uC218 \uC788\uB294 \uD55C \uBB38\uC7A5 \uD6C5\uC744 \uC900\uBE44\uD588\uC5B4\uC694."
        : "\uBC18\uB824\uB3D9\uBB3C\uC758 \uD589\uB3D9 \uC5B8\uC5B4\uAC00 \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uB5A0\uC624\uB974\uB3C4\uB85D \uBD80\uB4DC\uB7FD\uAC8C \uB2E4\uB4EC\uC740 \uD6C5\uC774\uC5D0\uC694.",
  }));
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: "id\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." },
      { status: 400 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      count?: unknown;
    };
    const count =
      typeof body.count === "number" && Number.isFinite(body.count)
        ? Math.min(Math.max(Math.floor(body.count), 1), 5)
        : 3;

    // Keep DB access inside the handler so Next.js build does not execute it
    // while collecting route metadata.
    const angleRows = await prisma.$queryRawUnsafe<AngleRow[]>(
      'select "id" from "angles" where "id" = $1 limit 1',
      id,
    );

    if (angleRows.length === 0) {
      return NextResponse.json(
        {
          error:
            "\uB300\uC0C1\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      id,
      hooks: createFallbackHooks(id, count),
    });
  } catch (error) {
    console.error("[generate-hooks] error", error);

    return NextResponse.json(
      {
        error:
          "\uD6C5 \uC0DD\uC131 \uC911 \uBB38\uC81C\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.",
      },
      { status: 500 },
    );
  }
}
