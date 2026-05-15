import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInsertSingleTableMock } from "../helpers/supabaseMocks";

const { getSupabaseAdminMock, isSupabaseConfiguredMock } = vi.hoisted(() => ({
  getSupabaseAdminMock: vi.fn(),
  isSupabaseConfiguredMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

describe("POST /api/readings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores pet data, creates a free reading, and returns readingId", async () => {
    const inserts: Array<{ table: string; payload: unknown }> = [];
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "pets") {
          return createInsertSingleTableMock({
            data: { id: "pet-1" },
            inserts,
            table,
          });
        }

        if (table === "readings") {
          return createInsertSingleTableMock({
            data: { id: "reading-1" },
            inserts,
            table,
          });
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    isSupabaseConfiguredMock.mockReturnValue(true);
    getSupabaseAdminMock.mockReturnValue(supabase);

    const { POST } = await import("@/app/api/readings/route");
    const response = await POST(
      new Request("http://test.local/api/readings", {
        method: "POST",
        body: JSON.stringify({
          name: "Momo",
          type: "cat",
          birth_date: "2022-04-12",
          birth_time: "11:30",
          birth_time_unknown: true,
          adoption_date: "2022-06-01",
          owner_email: "GUARDIAN@EXAMPLE.COM",
        }),
      }) as never,
    );

    await expect(response.json()).resolves.toEqual({
      readingId: "reading-1",
      petId: "pet-1",
    });
    expect(response.status).toBe(200);
    expect(inserts[0]).toMatchObject({
      table: "pets",
      payload: {
        name: "Momo",
        type: "cat",
        birth_date: "2022-04-12",
        birth_time: null,
        birth_time_unknown: true,
        adoption_date: "2022-06-01",
        owner_email: "guardian@example.com",
      },
    });
    expect(inserts[1].table).toBe("readings");
    expect(inserts[1].payload).toMatchObject({
      pet_id: "pet-1",
      premium_report: null,
      status: "free_created",
    });
    expect(String((inserts[1].payload as { free_summary: string }).free_summary)).toContain(
      "Momo",
    );
  });

  it("returns a local reading immediately when Supabase is not configured", async () => {
    isSupabaseConfiguredMock.mockReturnValue(false);

    const { POST } = await import("@/app/api/readings/route");
    const response = await POST(
      new Request("http://test.local/api/readings", {
        method: "POST",
        body: JSON.stringify({
          name: "Mong",
          type: "dog",
          birth_date: "2021-05-14",
          birth_time: "",
          birth_time_unknown: true,
          adoption_date: "2021-08-20",
          owner_email: "test@example.com",
        }),
      }) as never,
    );

    const result = (await response.json()) as {
      readingId: string;
      petId: string;
      storage: string;
    };

    expect(response.status).toBe(200);
    expect(result.readingId).toMatch(/^local-/);
    expect(result.petId).toMatch(/^local-pet-/);
    expect(result.storage).toBe("local");
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });

  it("allows birth date and owner email to be omitted when met date is provided", async () => {
    const inserts: Array<{ table: string; payload: unknown }> = [];
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === "pets") {
          return createInsertSingleTableMock({
            data: { id: "pet-2" },
            inserts,
            table,
          });
        }

        if (table === "readings") {
          return createInsertSingleTableMock({
            data: { id: "reading-2" },
            inserts,
            table,
          });
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    isSupabaseConfiguredMock.mockReturnValue(true);
    getSupabaseAdminMock.mockReturnValue(supabase);

    const { POST } = await import("@/app/api/readings/route");
    const response = await POST(
      new Request("http://test.local/api/readings", {
        method: "POST",
        body: JSON.stringify({
          name: "몽이",
          type: "dog",
          birth_date: "",
          birth_date_unknown: true,
          birth_time: "",
          birth_time_unknown: true,
          adoption_date: "2021-08-20",
          owner_email: "",
        }),
      }) as never,
    );

    await expect(response.json()).resolves.toEqual({
      readingId: "reading-2",
      petId: "pet-2",
    });
    expect(response.status).toBe(200);
    expect(inserts[0]).toMatchObject({
      table: "pets",
      payload: {
        name: "몽이",
        type: "dog",
        birth_date: null,
        birth_time: null,
        birth_time_unknown: true,
        adoption_date: "2021-08-20",
        owner_email: null,
      },
    });
  });

  it("rejects future dates with a gentle message", async () => {
    isSupabaseConfiguredMock.mockReturnValue(false);
    const futureYear = new Date().getFullYear() + 1;

    const { POST } = await import("@/app/api/readings/route");
    const response = await POST(
      new Request("http://test.local/api/readings", {
        method: "POST",
        body: JSON.stringify({
          name: "몽이",
          type: "dog",
          birth_date: `${futureYear}-01-01`,
          birth_time_unknown: true,
          adoption_date: "2021-08-20",
          owner_email: "",
        }),
      }) as never,
    );

    await expect(response.json()).resolves.toEqual({
      error: "미래 날짜는 사용할 수 없어요.",
    });
    expect(response.status).toBe(400);
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });

  it("rejects overly long names and email addresses before storing data", async () => {
    isSupabaseConfiguredMock.mockReturnValue(false);

    const { POST } = await import("@/app/api/readings/route");
    const longNameResponse = await POST(
      new Request("http://test.local/api/readings", {
        method: "POST",
        body: JSON.stringify({
          name: "몽".repeat(31),
          type: "dog",
          birth_date: "2021-05-14",
          birth_time_unknown: true,
          adoption_date: "2021-08-20",
          owner_email: "",
        }),
      }) as never,
    );

    await expect(longNameResponse.json()).resolves.toEqual({
      error: "이름은 30자 이내로 입력해 주세요.",
    });
    expect(longNameResponse.status).toBe(400);

    const longEmailResponse = await POST(
      new Request("http://test.local/api/readings", {
        method: "POST",
        body: JSON.stringify({
          name: "몽이",
          type: "dog",
          birth_date: "2021-05-14",
          birth_time_unknown: true,
          adoption_date: "2021-08-20",
          owner_email: `${"a".repeat(245)}@example.com`,
        }),
      }) as never,
    );

    await expect(longEmailResponse.json()).resolves.toEqual({
      error: "이메일 주소가 너무 길어요. 다시 확인해 주세요.",
    });
    expect(longEmailResponse.status).toBe(400);
    expect(getSupabaseAdminMock).not.toHaveBeenCalled();
  });
});
