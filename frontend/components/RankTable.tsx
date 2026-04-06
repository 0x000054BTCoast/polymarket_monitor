import { RankRow } from "@/types";

export default function RankTable({
  title,
  rows,
  onRowClick
}: {
  title: string;
  rows: RankRow[];
  onRowClick?: (row: RankRow) => void;
}) {
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <section className="panel p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold tracking-wide">{title}</h3>
        <span className="text-[11px] muted">{rows.length} rows</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-[12px] muted py-6 text-center">No data yet.</div>
      ) : (
        <div className="overflow-x-auto max-h-[320px]">
          <table className="w-full text-[12px] dense-table">
            <thead className="sticky top-0 bg-[#0c1628] z-10">
              <tr className="text-left muted border-b border-[#21304c]">
                {cols.map((c) => (
                  <th key={c} className="pr-3 font-medium">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-[#16243b] hover:bg-[#121e34]/80 cursor-pointer"
                  onClick={() => onRowClick?.(r)}
                >
                  {cols.map((c) => (
                    <td key={c} className="pr-3 whitespace-nowrap">{String((r as any)[c])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
