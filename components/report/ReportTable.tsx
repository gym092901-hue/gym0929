import type { ReactNode } from "react";

type ReportTableProps = {
  caption?: string;
  columns: string[];
  rows: ReactNode[][];
};

export function ReportTable({ caption, columns, rows }: ReportTableProps) {
  return (
    <div className="overflow-x-auto rounded-[1.35rem] border border-berry/10 bg-white">
      <table className="min-w-full border-collapse text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="bg-cream/85 text-xs font-black text-ink/65">
          <tr>
            {columns.map((column) => (
              <th key={column} scope="col" className="px-4 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-berry/10">
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className="align-top">
              {row.map((cell, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className="px-4 py-3 font-semibold leading-6 text-ink/72"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
