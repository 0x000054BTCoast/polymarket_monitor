"use client";

import { RankRow } from "@/types";
import Badge from "./ui/Badge";
import DataTable, { Column } from "./ui/DataTable";

interface HotEventsTableProps {
  rows: RankRow[];
  onRowClick?: (row: RankRow) => void;
}

export default function HotEventsTable({ rows, onRowClick }: HotEventsTableProps) {
  const formatScore = (score: unknown) => {
    const num = Number(score);
    if (isNaN(num)) return "-";
    return num.toFixed(2);
  };

  const getHotLevel = (score: number): "destructive" | "warning" | "info" | "muted" => {
    if (score >= 0.9) return "destructive";
    if (score >= 0.7) return "warning";
    if (score >= 0.5) return "info";
    return "muted";
  };

  const columns: Column<RankRow>[] = [
    {
      key: "title",
      header: "Event",
      render: (_, row) => {
        const title = String(row.title || row.event_id || "-");
        const category = String(row.category || "");
        return (
          <div className="max-w-[300px]">
            <p className="font-medium text-foreground truncate">{title}</p>
            {category && (
              <p className="text-xs text-muted-foreground mt-0.5">{category}</p>
            )}
          </div>
        );
      },
    },
    {
      key: "hot_score",
      header: "Hot Score",
      width: "120px",
      align: "right",
      render: (value) => {
        const score = Number(value);
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(score * 100, 100)}%` }}
              />
            </div>
            <span className="font-mono text-sm">{formatScore(value)}</span>
          </div>
        );
      },
    },
    {
      key: "level",
      header: "Level",
      width: "80px",
      align: "center",
      render: (_, row) => {
        const score = Number(row.hot_score || 0);
        const level = getHotLevel(score);
        const labels = {
          destructive: "Hot",
          warning: "Warm",
          info: "Active",
          muted: "Low",
        };
        return <Badge variant={level}>{labels[level]}</Badge>;
      },
    },
    {
      key: "derived",
      header: "Source",
      width: "80px",
      align: "center",
      render: (value) => (
        <Badge variant="muted" size="sm">
          {value ? "Derived" : "Live"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="card">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Hot Events</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Events ranked by engagement and activity
          </p>
        </div>
        <Badge variant="muted">{rows.length} events</Badge>
      </div>
      <DataTable
        columns={columns}
        data={rows}
        onRowClick={onRowClick}
        showIndex
        maxHeight="360px"
        emptyMessage="No hot events at the moment"
      />
    </div>
  );
}
