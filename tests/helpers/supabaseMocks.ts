import { vi } from "vitest";

type QueryResult<T> = {
  data: T | null;
  error: unknown;
};

export function createInsertSingleTableMock<TData>({
  data,
  inserts,
  table,
}: {
  data: TData;
  inserts: Array<{ table: string; payload: unknown }>;
  table: string;
}) {
  return {
    insert: vi.fn((payload: unknown) => {
      inserts.push({ table, payload });

      return {
        select: vi.fn(() => ({
          single: vi.fn(async (): Promise<QueryResult<TData>> => ({
            data,
            error: null,
          })),
        })),
      };
    }),
  };
}

export function createSelectMaybeSingleMock<TData>(
  result: QueryResult<TData>,
  conditions: Array<{ method: string; column: string; value: unknown }> = [],
) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn((column: string, value: unknown) => {
      conditions.push({ method: "eq", column, value });
      return builder;
    }),
    maybeSingle: vi.fn(async () => result),
    limit: vi.fn(() => builder),
  };

  return builder;
}
