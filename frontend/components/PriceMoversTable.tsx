"use client";

import { RankRow } from "@/types";
import Badge from "./ui/Badge";
import DataTable, { Column } from "./ui/DataTable";

interface PriceMoversTableProps {
  rows: RankRow[];
}

export default function PriceMoversTable({ rows }: PriceMoversTableProps) {
  const formatPercent = (value: unknown) => {
    const num = Number(value);
    if (isNaN(num)) return "-";
    const percent = (num * 100).toFixed(1);
    return `${num >= 0 ? "+" : ""}${percent}%`;
  };

  const columns: Column<RankRow>[] = [
    {
      key: "market_id",
      header: "Market",
      render: (value) => (
        <span className="font-mono text-xs text-muted-foreground">
          {String(value).slice(0, 12)}...
        </span>
      ),
    },
    {
      key: "abs_move_1m",
      header: "1m Move",
      width: "100px",
      align: "right",
      render: (value) => {
        const num = Number(value);
        const isPositive = num >= 0;
        return (
          <span className={`font-mono text-sm ${isPositive ? "text-success" : "text-destructive"}`}>
            {formatPercent(value)}
          </span>
        );
      },
    },
    {
      key: "abs_move_5m",
      header: "5m Move",
      width: "100px",
      align: "right",
      render: (value) => {
        const num = Number(value);
        const isPositive = num >= 0;
        return (
          <span className={`font-mono text-sm ${isPositive ? "text-success" : "text-destructive"}`}>
            {formatPercent(value)}
          </span>
        );
      },
    },
    {
      key: "trend",
      header: "Trend",
      width: "60px",
      align: "center",
      render: (_, row) => {
        const move1m = Number(row.abs_move_1m || 0);
        const move5m = Number(row.abs_move_5m || 0);
        const accelerating = Math.abs(move1m) > Math.abs(move5m) / 5;
        return accelerating ? (
          <svg className="w-4 h-4 text-warning mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-muted-foreground mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15" />
          </svg>
        );
      },
    },
  ];

  return (
    <div className="card">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Price Movers</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Markets with significant price changes
          </p>
        </div>
        <Badge variant="muted">{rows.length} markets</Badge>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        showIndex
        maxHeight="280px"
        emptyMessage="No significant price movements"
      />
    </div>
  );
}
