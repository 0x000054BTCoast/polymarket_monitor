"use client";

import { useState } from "react";

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: unknown, row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  maxHeight?: string;
  showIndex?: boolean;
}

export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data available",
  maxHeight = "400px",
  showIndex = false,
}: DataTableProps<T>) {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="data-table">
        <thead>
          <tr>
            {showIndex && (
              <th style={{ width: "48px" }} className="text-center">
                #
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              onClick={() => onRowClick?.(row)}
              onMouseEnter={() => setHoveredRow(index)}
              onMouseLeave={() => setHoveredRow(null)}
              className={onRowClick ? "cursor-pointer" : ""}
              style={{
                backgroundColor: hoveredRow === index ? "hsl(var(--muted) / 0.5)" : undefined,
              }}
            >
              {showIndex && (
                <td className="text-center text-muted-foreground font-mono text-xs">
                  {index + 1}
                </td>
              )}
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}
                >
                  {col.render
                    ? col.render(row[col.key], row, index)
                    : String(row[col.key] ?? "-")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
